// tests/explain-validation.test.mjs — M4a Task 4 (TR-02): the render-ready
// validation surface.
//
// 08-EXPLAINABILITY §5 ("the validation report is a first-class renderable")
// and 13-VALIDATION-STRATEGY §8.3 (structural honesty checks) require the D14
// report to be a CONSUMABLE, structured shape a screen can render without
// knowing the validator vocabulary (tier numbers, verdict enums, capVerdict
// internals). `explainValidation` (contract.js) is that pure projection. This
// proves:
//   (a) every trim/veto finding surfaces with its reason + PLAIN-ENGLISH tier
//       name (not just a tier number);
//   (b) an enforced (safety) removal surfaces via `removed`, tier-stamped
//       SAFETY & LAW — the exact "why was this vetoed" case the acceptance
//       criterion names;
//   (c) a resolution record's `why` (already human-authored by T3) survives
//       verbatim, with its tier name attached;
//   (d) 'pass' findings never appear in `notices` (nothing to tell the athlete
//       about a rule with nothing to say);
//   (e) the projection is pure: deterministic, and never mutates its input.
//
// Engine-only imports (run-engine.mjs convention): no app layer, no clock, no random.

import { validateWeek, explainValidation } from '@performance-os/engine/lib/validation/contract.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── (a) + (b) · a real enforced injury veto, end to end ─────────────────────
{
  // Severity-4 knee injury contraindicates the squat pattern (mirrors
  // conflict-resolution.test.mjs's t1 fixture — the same real join).
  const kneeInjury = [{ id: 'i1', body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active' }];
  const week = {
    num: 1,
    sessions: [{ title: 'Gym', discipline: 'gym', items: [
      { num: 'A1', name: 'Back squat', exId: 'back_squat', sets: '4 × 5' },
      { num: 'B1', name: 'Bench press', exId: 'bench', sets: '4 × 5' },
    ] }],
  };
  const report = validateWeek(week, { injuries: kneeInjury, enforceInjuryVetoes: true });
  const explain = explainValidation(report);

  assert(explain.removed.length === 1, 'a1 the enforced safety removal appears in explain.removed');
  const removedSquat = explain.removed[0];
  assert(removedSquat.item === 'Back squat', 'a2 the removed item is named');
  assert(/contraindicated/.test(removedSquat.reason), 'a3 the removal carries its reason');
  assert(removedSquat.tierName === 'SAFETY & LAW', 'a4 the removal is tier-named SAFETY & LAW (plain English, not just tier:1)');
  assert(removedSquat.tier === 1, 'a5 the removal carries the numeric tier too');

  // The enforced removal also leaves an across-tier resolution record (T3) —
  // explainValidation must carry it forward with the same plain-English name.
  const safetyResolution = explain.resolutions.find((r) => r.tier === 1);
  assert(!!safetyResolution, 'a6 the enforced removal is ALSO present as a resolution record');
  assert(safetyResolution.tierName === 'SAFETY & LAW', 'a7 the resolution record is tier-named');
  assert(typeof safetyResolution.why === 'string' && safetyResolution.why.length > 0, 'a8 the resolution carries its human-authored why (T3), verbatim');
  assert(safetyResolution.winner.verdict === 'veto', 'a9 the resolution names the winning verdict');
}

// ── (c) + (d) · a within-tier trim survives as a notice, 'pass' never does ──
{
  const week = { num: 2, sessions: [] };
  // No injuries, no equipment restriction, no sessions — every validator should
  // report 'pass' on an empty week (nothing to judge, nothing to trim).
  const report = validateWeek(week, {});
  const explain = explainValidation(report);
  assert(explain.pass === true, 'd1 a clean report explains as pass');
  assert(explain.notices.length === 0, 'd2 an all-pass report has zero notices (no pass verdicts leak through)');
  assert(explain.removed.length === 0, 'd3 no enforcement ran, so nothing is recorded removed');
  assert(Array.isArray(explain.resolutions) && explain.resolutions.length === 0, 'd4 no conflicts, no resolution records');
}

// ── (e) · purity — deterministic, no mutation ────────────────────────────────
{
  const kneeInjury = [{ id: 'i1', body_part_key: 'knee', severity: 4, rehab_phase: 'protect', status: 'active' }];
  const week = { num: 3, sessions: [{ title: 'Gym', discipline: 'gym', items: [
    { num: 'A1', name: 'Back squat', exId: 'back_squat', sets: '4 × 5' },
  ] }] };
  const report = validateWeek(week, { injuries: kneeInjury, enforceInjuryVetoes: true });
  const before = JSON.stringify(report);
  const e1 = JSON.stringify(explainValidation(report));
  const e2 = JSON.stringify(explainValidation(report));
  assert(e1 === e2, 'e1 explainValidation is deterministic — identical input, identical output');
  assert(JSON.stringify(report) === before, 'e2 explainValidation never mutates the report it was given (Art 18 purity)');
}

// ── shape contract: every field the screen consumer reads is always present ──
{
  const report = validateWeek({ num: 4, sessions: [] }, {});
  const explain = explainValidation(report);
  for (const key of ['pass', 'counts', 'notices', 'resolutions', 'removed']) {
    assert(key in explain, `s1 explain always carries "${key}" (a screen can destructure without guards)`);
  }
  assert(Array.isArray(explain.notices) && Array.isArray(explain.resolutions) && Array.isArray(explain.removed),
    's2 notices/resolutions/removed are always arrays, even when empty');
}
