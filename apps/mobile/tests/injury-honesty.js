// tests/injury-honesty.js — P0-2 (engine-audit TR-04 + SR-03): the injury-honesty set.
//
// Three lies the injury pipeline used to tell (2026-07-11 audit, deliverables 06/07):
//  1. Rehab-replaced sessions are stamped discipline:'rehab', and every validator
//     filtered to GYM sessions — so the "shipped empty" veto could never see the
//     exact case it was written for. Rehab sessions must be validator-visible.
//  2. A full replacement for a region with NO rehab content shipped an EMPTY session
//     whose banner claimed "Rehab session for your X injury" — a false claim at the
//     moment of highest duty of care. It must instead be an explicit, surfaced
//     `unservable` outcome (Art 15 — no silent truncation).
//  3. Struck items (substituted:true — hidden at render, never performed) still
//     counted toward weekly volume: phantom volume in MRV checks and progress bars.
//
// Blast radius: injured-athlete paths ONLY. Uninjured plans have no rehab sessions
// and no substituted items, so the golden master must stay byte-identical.

import { applyInjuryRules } from '@performance-os/engine/lib/injury/injuryFilter.js';
import { validateWeek } from '@performance-os/engine/lib/validation/contract.js';
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const lowerSession = () => ({
  title: 'Monday · Gym — Lower body',
  discipline: 'gym',
  focus: 'Lower body strength',
  duration: '60 min',
  intensity: 'hard',
  lowerBody: true,
  items: [
    { num: 'A1', name: 'Squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
    { num: 'B1', name: 'Lunge', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
    { num: 'B2', name: 'Leg press', sets: '3 × 10', rpe: 'RPE 7', restSec: 90 },
    { num: 'C1', name: 'Leg extension', sets: '3 × 12', rpe: 'RPE 7', restSec: 60 },
  ]
});

// ── 1 · rehab sessions are visible to the validator suite ────────────────────

// T1a: an EMPTY rehab-stamped session must draw a veto — before P0-2 the gym-only
// filter made it invisible and the week validated clean.
{
  const week = { num: 1, sessions: [{ title: 'Rehab — Left Knee · Protect & Rest', discipline: 'rehab', duration: '20–30 min', items: [] }] };
  const report = validateWeek(week, {});
  assert(report.pass === false, 'T1a empty rehab session fails validation (was invisible pre-P0-2)');
  const veto = report.findings.find(f => f.verdict === 'veto');
  assert(!!veto, 'T1a empty rehab session draws a veto');
}

// T1b: a LEGITIMATE rehab session (region WITH content) still validates clean —
// visibility must not create false positives on the honest rehab path.
{
  const kneeSevere = { id: 'i1', body_part_key: 'knee', severity: 5, rehab_phase: 'protect', status: 'active', body_part: 'Knee', side: 'left' };
  const week = applyInjuryRules({ num: 1, sessions: [lowerSession()] }, [kneeSevere]);
  assert(week.sessions[0].discipline === 'rehab', 'T1b severe knee → full rehab replacement (region has content)');
  assert(week.sessions[0].items.length > 0, 'T1b knee rehab session has real rehab items');
  const report = validateWeek(week, { injuries: [kneeSevere] });
  assert(report.counts.veto === 0, 'T1b a real rehab session ships without a veto');
}

// ── 2 · a bare region yields an explicit, surfaced `unservable` outcome ──────

// Quad has NO rehab content (one of the audit's 5 bare regions). Severity 5 +
// every working item blocked → full replacement fires with nothing to serve.
{
  const quadSevere = { id: 'i2', body_part_key: 'quad', severity: 5, rehab_phase: 'protect', status: 'active', body_part: 'Quad', side: 'right' };
  const week = applyInjuryRules({ num: 1, sessions: [lowerSession()] }, [quadSevere]);
  const s = week.sessions[0];

  assert(s.unservable === true, 'T2a bare region → session stamped unservable');
  assert(s.injuryBanner && s.injuryBanner.unservable === true, 'T2b banner carries the unservable flag');
  assert(!/rehab session for/i.test((s.injuryBanner && s.injuryBanner.message) || ''),
    'T2c banner no longer claims a rehab replacement that does not exist');
  assert((s.items || []).filter(it => !it.substituted && it.tag !== 'mobility').length === 0,
    'T2d unservable session prescribes no working items');

  const report = validateWeek(week, { injuries: [quadSevere] });
  assert(report.pass === false, 'T2e unservable outcome is SURFACED — the shipped week does not validate clean');
  const veto = report.findings.find(f => f.verdict === 'veto' && /unservable/i.test(f.reason || ''));
  assert(!!veto, 'T2f the validation report names the unservable outcome explicitly');
}

// T2g: the hollow in-place case — severity 3 (no full replacement) but every
// working item struck and no rehab content to append. The athlete would see an
// empty session; it must be the same explicit unservable outcome, not a
// "Modified for your injury" banner over nothing.
{
  const quadModerate = { id: 'i3', body_part_key: 'quad', severity: 3, rehab_phase: 'protect', status: 'active', body_part: 'Quad', side: 'right' };
  const week = applyInjuryRules({ num: 1, sessions: [lowerSession()] }, [quadModerate]);
  const s = week.sessions[0];
  const visibleWorking = (s.items || []).filter(it => !it.substituted && it.tag !== 'mobility' && !it.rehab);
  if (visibleWorking.length === 0) {
    assert(s.unservable === true, 'T2g hollow session (all struck, no rehab) is stamped unservable');
    const report = validateWeek(week, { injuries: [quadModerate] });
    assert(report.pass === false, 'T2g hollow session is surfaced by the validators');
  } else {
    assert(true, 'T2g session still has visible working items — hollow case not triggered (ok)');
  }
}

// T2h: a partially-blocked session for a bare region is NOT unservable — the
// athlete still has real work; in-place substitution remains the right outcome.
{
  const mixed = {
    title: 'Wednesday · Gym — Full body', discipline: 'gym', focus: 'Full body',
    duration: '60 min', intensity: 'hard', lowerBody: true,
    items: [
      { num: 'A1', name: 'Squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
      { num: 'B1', name: 'Bench press', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
      { num: 'C1', name: 'Barbell row', sets: '3 × 10', rpe: 'RPE 7', restSec: 90 },
    ]
  };
  const quadModerate = { id: 'i4', body_part_key: 'quad', severity: 3, rehab_phase: 'protect', status: 'active', body_part: 'Quad', side: 'right' };
  const week = applyInjuryRules({ num: 1, sessions: [mixed] }, [quadModerate]);
  const s = week.sessions[0];
  assert(!s.unservable, 'T2h partially-blocked session is not unservable');
  assert(s.items.some(it => it.substituted), 'T2h blocked item is struck in place');
  assert(s.items.some(it => !it.substituted && !it.rehab), 'T2h real work remains visible');
}

// ── 3 · struck/hidden items do not count toward weekly volume ────────────────

{
  const sessions = [{
    title: 'Monday · Gym — Lower body', discipline: 'gym',
    items: [
      { name: 'Back squat', sets: '4 × 5', substituted: true },  // struck — hidden at render
      { name: 'Bench press', sets: '3 × 8' },                    // real, performed
    ]
  }];
  const { counts, matched } = countWeeklyVolume(sessions);
  assert(matched === 1, 'T3a only the performed item is tallied');
  assert((counts.quads || 0) === 0, 'T3b a struck squat contributes NO quad volume (no phantom volume)');
  assert((counts.chest || 0) > 0, 'T3c the real bench still counts');
}
