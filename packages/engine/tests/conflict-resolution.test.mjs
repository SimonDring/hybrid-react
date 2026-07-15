// tests/conflict-resolution.test.mjs — M4a Task 3 (C1): the conflict-order pass.
//
// 13-VALIDATION-STRATEGY §5.2 property suite for the explicit resolution pass inside
// D14 (02-COACHING-PIPELINE §3; Constitution "When principles conflict"; EDS §37).
// At the audit pin the tier order lived nowhere as code — "the winner is whichever
// line runs later" (engine-audit 02 §3). This proves the pass now resolves by tier:
//   (a) a SAFETY-tier verdict ALWAYS beats a lower-tier one regardless of confidence;
//   (b) the pass NEVER resolves across tiers by confidence (absolute-across-tiers);
//   (c) a resolution record EXISTS whenever ≥2 verdicts conflicted on one slot;
//   (d) WITHIN a tier, confidence breaks the tie (then conservatism at equal conf).
//
// Engine-only imports (run-engine.mjs convention): no app layer, no clock, no random.

import { resolveConflicts, validateWeek } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A tier-tagged finding on a shared item slot (same session + item → same slot key).
const F = (tier, verdict, confidence, source, extra = {}) => ({
  validatorId: source || `v.tier${tier}`, tier, verdict, confidence,
  reason: `${source || 'v'} says ${verdict}`,
  detail: { session: 'Gym', item: 'Back squat', ...extra },
});

// ── (a) a low-confidence SAFETY verdict beats a high-confidence OPTIMISATION one ──
{
  const findings = [
    F(1, 'veto', 'low', 'injury.contraindication'),   // SAFETY & LAW, tier 1, LOW conf
    F(6, 'trim', 'high', 'balance.optimisation'),      // OPTIMISATION, tier 6, HIGH conf
  ];
  const [rec] = resolveConflicts(findings);
  assert(!!rec, 'a1 a conflict on the same slot produces a resolution record');
  assert(rec.winner.tier === 1, 'a2 the SAFETY (tier 1) verdict wins despite its LOW confidence');
  assert(rec.winner.source === 'injury.contraindication', 'a3 the safety verdict is the recorded winner');
  assert(rec.rule === 'across-tier', 'a4 the win is by TIER (across-tier), not confidence');
  assert(/wins absolutely/.test(rec.why), 'a5 the record explains WHY (tier is absolute)');
}

// ── (b) the pass NEVER resolves across tiers by confidence (the invariant) ──────
{
  const tiers = [1, 2, 3, 4, 5, 6];
  const confs = ['low', 'moderate', 'high'];
  let violations = 0, checked = 0;
  for (const ta of tiers) for (const tb of tiers) {
    if (ta === tb) continue;
    for (const ca of confs) for (const cb of confs) {
      const findings = [F(ta, 'veto', ca, `a.t${ta}`), F(tb, 'veto', cb, `b.t${tb}`)];
      const [rec] = resolveConflicts(findings);
      checked++;
      // The winner must ALWAYS be the lower tier NUMBER — confidence can never flip it.
      if (rec.winner.tier !== Math.min(ta, tb)) violations++;
    }
  }
  assert(checked === 270, `b1 exercised every cross-tier pair × confidence combo (${checked})`);
  assert(violations === 0, 'b2 across EVERY combo the lower tier won — confidence never crossed the boundary');
}

// ── (c) a resolution record exists iff ≥2 verdicts conflicted on a slot ─────────
{
  // One finding on a slot → no conflict, no record.
  assert(resolveConflicts([F(1, 'veto', 'high', 'solo')]).length === 0, 'c1 a lone verdict produces no record');
  // 'pass' findings never count as conflicts.
  assert(resolveConflicts([F(1, 'pass', 'high', 'p1'), F(5, 'pass', 'high', 'p2')]).length === 0, 'c2 pass verdicts never conflict');
  // Two different slots, one verdict each → no record.
  const twoSlots = [F(1, 'veto', 'high', 'x', { item: 'Squat' }), F(5, 'trim', 'high', 'y', { item: 'Bench' })];
  assert(resolveConflicts(twoSlots).length === 0, 'c3 verdicts on DIFFERENT slots do not conflict');
  // Two verdicts on the SAME slot → exactly one record.
  assert(resolveConflicts([F(1, 'veto', 'low', 'a'), F(5, 'trim', 'high', 'b')]).length === 1, 'c4 ≥2 on one slot → a record exists');
  // Three verdicts on one slot → still exactly one record (one resolution per slot).
  assert(resolveConflicts([F(1, 'veto', 'low', 'a'), F(3, 'trim', 'high', 'b'), F(5, 'trim', 'high', 'c')]).length === 1, 'c5 one record per contested slot');
}

// ── (d) WITHIN a tier, confidence breaks the tie ────────────────────────────────
{
  const findings = [
    F(3, 'trim', 'low', 'mrv.weak'),       // RECOVERABILITY, tier 3, LOW
    F(3, 'trim', 'high', 'mrv.strong'),    // RECOVERABILITY, tier 3, HIGH
  ];
  const [rec] = resolveConflicts(findings);
  assert(rec.winner.source === 'mrv.strong', 'd1 within tier 3 the HIGHER-confidence verdict wins');
  assert(rec.rule === 'within-tier-confidence', 'd2 the rule is within-tier-confidence');
  assert(rec.tier === 3, 'd3 the winning tier is recorded (3)');
}

// ── (d′) within a tier at EQUAL confidence → the conservative (more severe) verdict ──
{
  const findings = [
    F(3, 'trim', 'moderate', 'a.trim'),
    F(3, 'veto', 'moderate', 'b.veto'),    // veto > trim → the conservative choice
  ];
  const [rec] = resolveConflicts(findings);
  assert(rec.winner.verdict === 'veto', 'd′1 equal confidence → the more conservative (veto > trim) wins');
  assert(rec.rule === 'within-tier-conservative', 'd′2 the rule is within-tier-conservative');
}

// ── determinism / purity: same input → identical records, twice ─────────────────
{
  const findings = [F(1, 'veto', 'low', 'a'), F(5, 'trim', 'high', 'b'), F(3, 'trim', 'moderate', 'c', { item: 'Deadlift' }), F(3, 'veto', 'moderate', 'd', { item: 'Deadlift' })];
  const r1 = JSON.stringify(resolveConflicts(findings));
  const r2 = JSON.stringify(resolveConflicts(findings));
  assert(r1 === r2, 'p1 the pass is deterministic (identical output for identical input)');
  const before = JSON.stringify(findings);
  resolveConflicts(findings);
  assert(JSON.stringify(findings) === before, 'p2 the pass never mutates its input findings (Art 18 purity)');
}

// ── composition with T2: an ENFORCED tier-1 removal is recorded across-tier ──────
{
  // A knee injury (severity 4) contraindicates the squat pattern; back_squat is
  // vetoed and REMOVED when enforcement is on. That removal must leave a resolution
  // record showing SAFETY (tier 1) beat the item's objective-fidelity claim to ship.
  const kneeInjury = [{ id: 'i1', body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active' }];
  const week = { num: 1, sessions: [{ title: 'Gym', discipline: 'gym', items: [
    { num: 'A1', name: 'Back squat', exId: 'back_squat', sets: '4 × 5' },
    { num: 'B1', name: 'Bench press', exId: 'bench', sets: '4 × 5' },
  ] }] };
  const report = validateWeek(week, { injuries: kneeInjury, enforceInjuryVetoes: true });
  assert(report.enforced.removed.length === 1, 't1 the contraindicated squat is enforced-removed');
  const safetyRec = (report.resolutions || []).find((r) => r.tier === 1 && r.rule === 'across-tier');
  assert(!!safetyRec, 't2 the enforced removal is recorded as an across-tier resolution');
  assert(safetyRec.winner.verdict === 'veto' && /construction\.ship/.test(JSON.stringify(safetyRec.conflict)), 't3 the record names the safety veto beating the ship proposal');
}

// ── report shape: resolutions is always present on a report ──────────────────────
{
  const report = validateWeek({ num: 1, sessions: [] }, {});
  assert(Array.isArray(report.resolutions), 'r1 every report carries a resolutions array (present even when empty)');
}
