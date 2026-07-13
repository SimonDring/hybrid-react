// tests/injury-veto-gate.js — P0-3 (engine-audit 09): the D14 injury-veto GATE.
//
// EDS §37 tier 1 (SAFETY & LAW) says a contraindicated exercise is dropped even if
// it best serves the objective. Until P0-3 the D14 suite could only OBSERVE that
// violation (report-only); the shipped week kept the item. This gate — behind the
// `enforceInjuryVetoes` ctx option, DEFAULT OFF everywhere (promotion to default is
// Simon's I5 call) — removes items the tier-1 injury validator vetoed, records each
// removal BY NAME in the report, and re-proves the shipped week.
//
// The flag is a PURE input: a ctx option threaded through validateWeek. No env read
// inside packages/engine (purity, Art 18). Flag OFF must be byte-identical to
// today's report-only behaviour — the golden master stays untouched.

import { validateWeek, applyInjuryVetoes } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A knee injury (severity 4, protect) contraindicates squat patterns; bench/row
// are safe. The session reaches D14 with the squat still in it — the slip-through
// case the gate exists for (the injury filter is upstream; D14 is the floor).
const kneeInjury = () => [{ id: 'i1', body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active', body_part: 'Knee', side: 'left' }];
const mixedWeek = () => ({
  num: 1,
  sessions: [{
    title: 'Monday · Gym — Full body',
    discipline: 'gym',
    duration: '60 min',
    items: [
      { num: 'A1', name: 'Back squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 },
      { num: 'B1', name: 'Bench press', sets: '3 × 8', rpe: 'RPE 7', restSec: 120 },
      { num: 'C1', name: 'Barbell row', sets: '3 × 10', rpe: 'RPE 7', restSec: 90 },
    ]
  }]
});

// ── 1 · flag OFF (the default): report-only, byte-identical to today ─────────

{
  const week = mixedWeek();
  const before = JSON.stringify(week);
  const report = validateWeek(week, { injuries: kneeInjury() });

  const veto = report.findings.find((f) => f.validatorId === 'injury.contraindication' && f.verdict === 'veto');
  assert(!!veto && /Back squat/.test(veto.reason || ''), 'OFF-1 contraindicated item is REPORTED (today\'s behaviour)');
  assert(!('enforced' in report) && !('week' in report), 'OFF-2 report carries no enforcement keys — shape unchanged');
  assert(JSON.stringify(week) === before, 'OFF-3 input week untouched — the item still ships');
  assert(week.sessions[0].items.some((it) => it.name === 'Back squat'), 'OFF-4 Back squat remains in the shipped session');

  // An explicit false must behave exactly like the omitted default.
  const explicit = validateWeek(mixedWeek(), { injuries: kneeInjury(), enforceInjuryVetoes: false });
  assert(JSON.stringify(explicit) === JSON.stringify(report), 'OFF-5 explicit false ≡ omitted (one code path)');
}

// ── 2 · flag ON: the veto is ENFORCED at D14 ─────────────────────────────────

{
  const week = mixedWeek();
  const before = JSON.stringify(week);
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });

  assert(Array.isArray(report.enforced && report.enforced.removed) && report.enforced.removed.length === 1,
    'ON-1 exactly one enforcement recorded');
  const rm = (report.enforced.removed || [])[0] || {};
  assert(rm.item === 'Back squat', 'ON-2 the removal is recorded BY NAME in the report');
  assert(!!rm.reason && /contraindicated/i.test(rm.reason), 'ON-3 the removal carries the veto\'s reason');

  const shipped = report.week.sessions[0];
  assert(!shipped.items.some((it) => it.name === 'Back squat'), 'ON-4 the contraindicated item is REMOVED from the shipped week');
  assert(shipped.items.some((it) => it.name === 'Bench press') && shipped.items.some((it) => it.name === 'Barbell row'),
    'ON-5 safe work is untouched');

  assert(JSON.stringify(week) === before, 'ON-6 the INPUT week is never mutated (engine purity)');
  assert(!report.findings.some((f) => f.validatorId === 'injury.contraindication' && f.verdict === 'veto'),
    'ON-7 the final report proves the SHIPPED week — no residual contraindication veto');
  assert(report.counts.veto === 0, 'ON-8 the shipped week carries no veto');
}

// ── 3 · flag ON never strands silently: an emptied session is surfaced ───────

{
  const week = {
    num: 1,
    sessions: [{
      title: 'Monday · Gym — Lower body',
      discipline: 'gym',
      duration: '60 min',
      items: [{ num: 'A1', name: 'Back squat', sets: '4 × 5', rpe: 'RPE 8', restSec: 180 }]
    }]
  };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 1, 'EMPTY-1 the lone contraindicated item is removed');
  assert(report.week.sessions[0].items.length === 0, 'EMPTY-2 the shipped session is now empty');
  const emptyVeto = report.findings.find((f) => f.verdict === 'veto' && /shipped empty/i.test(f.reason || ''));
  assert(!!emptyVeto, 'EMPTY-3 the re-run SURFACES the emptied session (Art 15 — never a silent hole)');
}

// ── 4 · exemptions and the no-op path ────────────────────────────────────────

{
  // Items the injury system itself prescribed (tag 'rehab') and pain-free-range
  // work are exempt by construction — the gate must never strip them.
  const week = {
    num: 1,
    sessions: [{
      title: 'Rehab — Left Knee · Rebuild',
      discipline: 'rehab',
      duration: '30 min',
      items: [
        { num: 'A1', name: 'Back squat', tag: 'rehab', sets: '3 × 10 (pain-free range)' },
      ]
    }]
  };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 0, 'EX-1 rehab-prescribed work is exempt from the gate');
  assert(report.week.sessions[0].items.length === 1, 'EX-2 the rehab item still ships');
}

// ── 5 · identity keying: the gate removes EXACTLY what the report named ──────
// Whole-branch review 2026-07-13: removals used to key on (session title, item
// name) — duplicate titles or same-name items widened the removal beyond the
// report. The finding's detail now pins sessionIndex + itemIndex, and the gate
// enforces only those exact positions. applyInjuryVetoes is the gate's contract
// surface (Art 19: the report is authoritative — findings need not come from
// this registry run), so the duplicate cases are proven against it directly.

const vetoFinding = (sessionTitle, sessionIndex, itemName, itemIndex) => ({
  validatorId: 'injury.contraindication', tier: 1, verdict: 'veto', authority: 'gate',
  reason: `${sessionTitle}: "${itemName}" is contraindicated by an active injury`,
  detail: { session: sessionTitle, sessionIndex, item: itemName, itemIndex }
});

{
  // (a) two sessions SHARE a title; the report vetoes the item in the second
  // session only — the first session's same-name item must survive.
  const week = {
    num: 1,
    sessions: [
      { title: 'Gym — Full body', discipline: 'gym', items: [
        { num: 'A1', name: 'Back squat', sets: '4 × 5' },
        { num: 'B1', name: 'Bench press', sets: '3 × 8' }
      ] },
      { title: 'Gym — Full body', discipline: 'gym', items: [
        { num: 'A1', name: 'Back squat', sets: '4 × 5' }
      ] }
    ]
  };
  const { week: gated, removed } = applyInjuryVetoes(week, [vetoFinding('Gym — Full body', 1, 'Back squat', 0)]);
  assert(removed.length === 1, 'DUP-1 exactly one removal — the one the report named');
  assert(gated.sessions[0].items.some((it) => it.name === 'Back squat'),
    'DUP-2 the un-vetoed session with the SAME TITLE keeps its same-name item');
  assert(gated.sessions[1].items.length === 0, 'DUP-3 only the named session loses the item');
}

{
  // (b) ONE session carries two same-name items; the report names the second —
  // exactly one comes out, the other ships.
  const week = {
    num: 1,
    sessions: [{
      title: 'Gym — Lower body', discipline: 'gym', items: [
        { num: 'A1', name: 'Back squat', sets: '4 × 5' },
        { num: 'B1', name: 'Back squat', sets: '3 × 10' },
        { num: 'C1', name: 'Bench press', sets: '3 × 8' }
      ]
    }]
  };
  const { week: gated, removed } = applyInjuryVetoes(week, [vetoFinding('Gym — Lower body', 0, 'Back squat', 1)]);
  assert(removed.length === 1, 'SAME-1 exactly one same-name item removed');
  const names = gated.sessions[0].items.map((it) => `${it.num} ${it.name}`);
  assert(names.join('|') === 'A1 Back squat|C1 Bench press',
    'SAME-2 the EXACT occurrence the report named came out (B1), its twin (A1) ships');
}

{
  // The registry validator stamps the indexes the gate keys on — the end-to-end
  // path (validateWeek, flag ON) still lands on the exact item.
  const report = validateWeek(mixedWeek(), { injuries: kneeInjury(), enforceInjuryVetoes: true });
  const rm = (report.enforced.removed || [])[0] || {};
  assert(rm.item === 'Back squat' && !report.week.sessions[0].items.some((it) => it.name === 'Back squat'),
    'IDX-1 validator-stamped indexes drive the end-to-end enforcement');
}

{
  // Flag ON with nothing to enforce: same findings as flag OFF, zero removals,
  // and the shipped week is the input week itself (no spurious clone).
  const week = mixedWeek();
  const on = validateWeek(week, { enforceInjuryVetoes: true });     // no injuries
  const off = validateWeek(week, {});
  assert(on.enforced && on.enforced.removed.length === 0, 'NOOP-1 flag ON with no vetoes records zero removals');
  assert(on.week === week, 'NOOP-2 shipped week IS the input week (no clone when nothing moved)');
  assert(JSON.stringify(on.findings) === JSON.stringify(off.findings), 'NOOP-3 findings identical to the report-only run');
}
