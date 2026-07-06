// tests/first-learning-loop.js — WP-59: the first honest learning loop.
//
// EDS FR5 ("the engine learns from athlete response"); Constitution Art 12 (athlete
// response validates science), Art 13 (a single low-confidence signal never acts
// alone), Art 16 (learn, don't assume). Two pure modules under test:
//   • learning/blockOutcome — did the athlete respond to the block's diagnosis?
//     per-D5-priority verdicts + at most ONE conservative, DOWNWARD candidate prior.
//   • indices/readinessValidation — does our readiness index predict the athlete's
//     own session experience? (the validation WP-44 named as owed for readiness-v2).
//
// The candidate prior is STAGED, never engine-consumed — this suite proves the pure
// verdict logic; the app-side staging path (AthleteModelService) writes model.stagedPriors.
import { blockOutcome } from '@performance-os/engine/lib/learning/blockOutcome.js';
import { readinessValidation } from '@performance-os/engine/lib/indices/readinessValidation.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Build a monotone lift series: `perWeek` kg/week over `weeks` weekly points.
function liftSeries(start, perWeek, weeks) {
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const d = new Date(Date.UTC(2026, 0, 5 + w * 7)).toISOString().slice(0, 10);
    out.push({ date: d, e1rm: start + perWeek * w });
  }
  return out;
}
function recSeries(start, perWeek, weeks) {
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const d = new Date(Date.UTC(2026, 0, 5 + w * 7)).toISOString().slice(0, 10);
    out.push({ date: d, recovery: start + perWeek * w });
  }
  return out;
}
const WIN = { startISO: '2026-01-01', endISO: '2026-03-01' };
const STRENGTH = [{ qualityId: 'maxStrength' }];

// T1 — a responding block: rising e1RM → 'responded', and NO candidate prior
// (we never auto-escalate; a good block leaves dose unchanged).
{
  const r = blockOutcome({ priorityQualities: STRENGTH, liftLog: liftSeries(100, 2, 5), sessionRecoveries: recSeries(4, 0, 5), ...WIN });
  assert(r.verdicts[0].verdict === 'responded', `T1a rising e1RM → responded (${r.verdicts[0].verdict})`);
  assert(r.candidatePriors.length === 0, `T1b a responding block stages NO prior (${r.candidatePriors.length})`);
}

// T2 — corroborated struggle: falling e1RM AND declining, low recovery → ONE
// downward volumeTolerance candidate (Art 13 corroboration; Art 16 conservative).
{
  const r = blockOutcome({ priorityQualities: STRENGTH, liftLog: liftSeries(120, -1.5, 5), sessionRecoveries: recSeries(3.4, -0.15, 5), ...WIN });
  assert(r.verdicts[0].verdict === 'declined', `T2a falling e1RM → declined (${r.verdicts[0].verdict})`);
  assert(r.candidatePriors.length === 1 && r.candidatePriors[0].type === 'volumeTolerance', 'T2b corroborated struggle stages a volumeTolerance candidate');
  assert(r.candidatePriors[0].value === 0.9 && r.candidatePriors[0].value < 1, 'T2c the candidate is DOWNWARD (0.9)');
  assert(r.candidatePriors[0].source === 'learned' && r.candidatePriors[0].confidence === 'low', 'T2d candidate is source:learned, confidence:low');
  assert(/e1RM|recovery/.test(r.candidatePriors[0].evidence || ''), 'T2e candidate carries a cited evidence string (explainability)');
}

// T3 — Art 13 in force: ONE signal alone never acts. Lifts stall but recovery is
// fine → verdict reflects lifts, but NO candidate (single signal insufficient).
{
  const r = blockOutcome({ priorityQualities: STRENGTH, liftLog: liftSeries(120, -1.5, 5), sessionRecoveries: recSeries(4.5, 0, 5), ...WIN });
  assert(r.verdicts[0].verdict === 'declined', 'T3a lifts still read as declined');
  assert(r.candidatePriors.length === 0, `T3b lifts alone (recovery fine) stages NO prior — corroboration required (${r.candidatePriors.length})`);
}

// T4 — honest about ignorance: too few points → 'insufficient-data', no candidate.
{
  const r = blockOutcome({ priorityQualities: STRENGTH, liftLog: liftSeries(100, 2, 2), sessionRecoveries: recSeries(3, -0.5, 2), ...WIN });
  assert(r.verdicts[0].verdict === 'insufficient-data', `T4a <3 points → insufficient-data (${r.verdicts[0].verdict})`);
  assert(r.candidatePriors.length === 0, 'T4b no candidate on insufficient data');
}

// T5 — the window is respected (no clock reads): points outside [start,end] excluded.
{
  const lifts = [...liftSeries(100, 2, 5), { date: '2025-06-01', e1rm: 999 }, { date: '2027-01-01', e1rm: 1 }];
  const r = blockOutcome({ priorityQualities: STRENGTH, liftLog: lifts, sessionRecoveries: recSeries(4, 0, 5), ...WIN });
  assert(r.verdicts[0].verdict === 'responded', 'T5 out-of-window points are excluded (still responded, not skewed)');
}

// T6 — a capacity quality (non-strength) is judged on the recovery trend, not e1RM.
{
  const r = blockOutcome({ priorityQualities: [{ qualityId: 'aerobicCapacity' }], liftLog: [], sessionRecoveries: recSeries(3, 0.2, 5), ...WIN });
  assert(r.verdicts[0].metric === 'session-recovery trend', 'T6a capacity quality uses the recovery-trend metric');
  assert(r.verdicts[0].verdict === 'responded', `T6b rising recovery → responded (${r.verdicts[0].verdict})`);
}

// --- readinessValidation ---

// T7 — a readiness index that tracks session experience → positive verdict.
{
  const pairs = [];
  for (let i = 0; i < 8; i++) { const v = 40 + i * 7; pairs.push({ readiness: v, quality: 1 + Math.round(i / 2), recovery: 1 + Math.round(i / 2) }); }
  const v = readinessValidation(pairs);
  assert(v.n === 8 && v.rQuality > 0.5, `T7a correlated readiness → strong r (${v.rQuality})`);
  assert(/predicts|earning/.test(v.verdict), `T7b verdict states the index is earning its keep (${v.verdict})`);
}

// T8 — honest about too little data (<5 pairs) → insufficient, null correlations.
{
  const v = readinessValidation([{ readiness: 50, quality: 3, recovery: 3 }, { readiness: 60, quality: 4, recovery: 4 }]);
  assert(v.n === 2 && v.rQuality === null && /insufficient/.test(v.verdict), `T8 <5 pairs → insufficient, no false correlation (${v.verdict})`);
}

// T9 — no predictive signal (flat noise) → the readout SAYS so (doesn't oversell).
{
  const pairs = [
    { readiness: 30, quality: 3, recovery: 4 }, { readiness: 45, quality: 5, recovery: 2 },
    { readiness: 55, quality: 2, recovery: 5 }, { readiness: 65, quality: 4, recovery: 1 },
    { readiness: 80, quality: 1, recovery: 3 }, { readiness: 90, quality: 3, recovery: 2 },
  ];
  const v = readinessValidation(pairs);
  assert(v.n === 6 && /no predictive|weak/.test(v.verdict), `T9 uncorrelated data → honest "not validated" readout (${v.verdict})`);
}

console.log('first-learning-loop: done');
