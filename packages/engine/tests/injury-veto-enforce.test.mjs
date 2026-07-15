// tests/injury-veto-enforce.test.mjs — M4a Task 2 (🔒 5 / I5): the injury-veto ENFORCES.
//
// 13-VALIDATION-STRATEGY §8.2 seeded-defect (true-positive) proof for the tier-1
// SAFETY & LAW gate now that ENFORCE_INJURY_VETOES is ON at the app layer. A
// contraindicated exercise SMUGGLED into a shipped week must be vetoed at the safety
// tier, with a reason, and REMOVED from what ships. The veto keys on exercise
// IDENTITY (exId → id/pattern via the governed contraindication vocabulary, M4a T2 /
// TR-10), never the display name — a rename or a novel exercise cannot slip past.
//
// Engine-only imports (run-engine.mjs convention): no app layer, no clock, no random.

import { validateWeek, applyInjuryVetoes } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A knee injury (severity 4, protect) contraindicates the SQUAT movement pattern.
// Back squat (id back_squat, pattern squat) is unsafe; bench (hpush) + barbell row
// (hpull) are safe. Items carry exId exactly as generatePlan stamps them.
const kneeInjury = () => [{ id: 'i1', body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active', body_part: 'Knee', side: 'left' }];

const item = (exId, name, extra = {}) => ({ num: 'A1', name, exId, sets: '4 × 5', rpe: 'RPE 8', restSec: 180, ...extra });

// ── (a) a contraindicated exercise smuggled into a week is VETOED at the safety tier ──
{
  const week = {
    num: 1,
    sessions: [{
      title: 'Monday · Gym — Full body', discipline: 'gym', duration: '60 min',
      items: [
        item('back_squat', 'Back squat'),               // squat pattern — contraindicated
        item('bench', 'Bench press', { num: 'B1' }),    // hpush — safe
        item('barbell_row', 'Barbell row', { num: 'C1' }) // hpull — safe
      ]
    }]
  };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });

  // NOTE: after enforcement the FINAL report is re-proved on the shipped week, so the
  // veto lives in report.enforced (what was removed), not in the clean re-run findings.
  const rm = (report.enforced.removed || [])[0] || {};
  assert(report.enforced.removed.length === 1, 'a1 exactly one contraindicated item vetoed');
  assert(rm.item === 'Back squat', 'a2 the vetoed item is recorded BY NAME (safety-tier report)');
  assert(!!rm.reason && /contraindicated/i.test(rm.reason), 'a3 the veto carries a reason');
  assert(!report.week.sessions[0].items.some((it) => it.name === 'Back squat'), 'a4 the smuggled item is REMOVED from the shipped week');
  assert(report.counts.veto === 0, 'a5 the shipped week carries no residual veto');
}

// ── (a′) IDENTITY, not name: a RENAMED item (same exId) is still caught ──────
{
  // Display name deliberately dodges any squat name-regex, but exId pins the truth.
  const week = { num: 1, sessions: [{ title: 'Gym', discipline: 'gym', items: [item('back_squat', 'Posterior-chain builder 3000')] }] };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 1, 'a′1 a renamed item is vetoed by exId (rename-proof)');
}

// ── (a″) NOVEL exercise of a contraindicated pattern is caught by its pattern ──
{
  // No such catalogue id — resolves by name to nothing, so the validator sees no
  // exId match; to prove the PATTERN path we hand the finding to the gate directly
  // via a real catalogue squat variant the name-regex never listed.
  const week = { num: 1, sessions: [{ title: 'Gym', discipline: 'gym', items: [item('box_squat', 'Box squat')] }] };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 1, 'a″1 a squat-pattern variant is caught by movement pattern');
}

// ── (b) injured athlete WITH safe alternatives keeps a valid session ─────────
{
  const week = {
    num: 1,
    sessions: [{
      title: 'Monday · Gym — Upper body', discipline: 'gym', duration: '60 min',
      items: [
        item('bench', 'Bench press'),                    // hpush — safe for a knee
        item('barbell_row', 'Barbell row', { num: 'B1' }), // hpull — safe
        item('db_bench', 'DB bench press', { num: 'C1' })  // hpush — safe
      ]
    }]
  };
  const report = validateWeek(week, { injuries: kneeInjury(), enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 0, 'b1 no safe item is vetoed');
  assert(report.week === week, 'b2 the week ships untouched (no clone when nothing moves)');
  assert(report.week.sessions[0].items.length === 3, 'b3 the injured athlete keeps a full, valid session');
  assert(report.pass === true, 'b4 the safe session validates clean');
}

// ── (c) FALSE-POSITIVE guard: a clean/uninjured plan is NOT vetoed ───────────
{
  const week = {
    num: 1,
    sessions: [{
      title: 'Monday · Gym — Full body', discipline: 'gym', duration: '60 min',
      items: [item('back_squat', 'Back squat'), item('bench', 'Bench press', { num: 'B1' })]
    }]
  };
  const report = validateWeek(week, { enforceInjuryVetoes: true }); // NO injuries
  assert(report.enforced.removed.length === 0, 'c1 an uninjured plan removes nothing (no false positive)');
  assert(report.week.sessions[0].items.some((it) => it.name === 'Back squat'), 'c2 the squat ships — it is only unsafe WITH the injury');
  assert(report.pass === true, 'c3 the clean plan passes');
}

// ── (d) IDENTITY-KEYING: a duplicate-title / duplicate-item week removes EXACTLY
//        the flagged occurrence (the applyInjuryVetoes chip) ────────────────────
const vetoFinding = (sessionTitle, sessionIndex, itemName, itemIndex) => ({
  validatorId: 'injury.contraindication', tier: 1, verdict: 'veto', authority: 'gate',
  reason: `${sessionTitle}: "${itemName}" is contraindicated by an active injury`,
  detail: { session: sessionTitle, sessionIndex, item: itemName, itemIndex }
});

{
  // Two sessions share a title; only the SECOND session's item is flagged — the
  // first session's same-name/same-id item must survive.
  const week = {
    num: 1,
    sessions: [
      { title: 'Gym — Full body', discipline: 'gym', items: [item('back_squat', 'Back squat'), item('bench', 'Bench press', { num: 'B1' })] },
      { title: 'Gym — Full body', discipline: 'gym', items: [item('back_squat', 'Back squat')] }
    ]
  };
  const { week: gated, removed } = applyInjuryVetoes(week, [vetoFinding('Gym — Full body', 1, 'Back squat', 0)]);
  assert(removed.length === 1, 'd1 exactly one removal — the occurrence the report named');
  assert(gated.sessions[0].items.some((it) => it.name === 'Back squat'), 'd2 the same-title/same-id twin in the un-flagged session survives');
  assert(gated.sessions[1].items.length === 0, 'd3 only the flagged occurrence came out');
}

{
  // One session, two identical items; the report names the SECOND — exactly one
  // comes out, its twin ships (position-keyed, not name/id-keyed removal).
  const week = {
    num: 1,
    sessions: [{
      title: 'Gym — Lower body', discipline: 'gym', items: [
        item('back_squat', 'Back squat', { num: 'A1' }),
        item('back_squat', 'Back squat', { num: 'B1' }),
        item('bench', 'Bench press', { num: 'C1' })
      ]
    }]
  };
  const { week: gated, removed } = applyInjuryVetoes(week, [vetoFinding('Gym — Lower body', 0, 'Back squat', 1)]);
  assert(removed.length === 1, 'd4 exactly one of the duplicate items removed');
  const nums = gated.sessions[0].items.map((it) => it.num).join('|');
  assert(nums === 'A1|C1', 'd5 the EXACT occurrence the report named (B1) came out; its twin (A1) ships');
}

// ── (e) lawfulness class enforces via the SAME tier-1 gate (mechanism proof) ──
{
  // A hand-built LAW-class veto (tier 1, a different validator id) disposes through
  // the identical gate — enforcement is class-based (tier 1 = SAFETY & LAW), not
  // hardcoded to injury.contraindication.
  const week = { num: 1, sessions: [{ title: 'Gym', discipline: 'gym', items: [item('back_squat', 'Back squat'), item('bench', 'Bench press', { num: 'B1' })] }] };
  const lawVeto = { validatorId: 'law.some-lawfulness-rule', tier: 1, verdict: 'veto', authority: 'gate', reason: 'unlawful prescription', detail: { session: 'Gym', sessionIndex: 0, item: 'Back squat', itemIndex: 0 } };
  const { removed } = applyInjuryVetoes(week, [lawVeto]);
  assert(removed.length === 1, 'e1 a tier-1 lawfulness veto disposes through the same gate (class-based)');

  // A NON-safety veto (tier 4) is report-only — the gate never removes it.
  const nonSafety = { validatorId: 'session.equipment-available', tier: 4, verdict: 'veto', authority: 'gate', reason: 'no equipment', detail: { session: 'Gym', sessionIndex: 0, item: 'Back squat', itemIndex: 0 } };
  const { removed: r2 } = applyInjuryVetoes(week, [nonSafety]);
  assert(r2.length === 0, 'e2 a non-safety (tier 4) veto is report-only — never disposed');
}
