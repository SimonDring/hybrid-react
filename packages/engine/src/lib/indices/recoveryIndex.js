/**
 * Recovery Index — overall recovered-ness: the autonomic + sleep state (objective)
 * blended with perceived wellness (subjective), weighting subjective ≥ objective
 * (0.6 / 0.4 — Saw 2016, knowledge base: readiness.subjective_priority).
 *
 * This is the single source of truth for the score that recovery.js's
 * `assessRecovery` adapts into its RecoveryOutput, so the blend MUST match exactly:
 * `round(0.6·subjective + 0.4·objective)` when both are present, else whichever is.
 * That guarantees behaviour parity through the cut-over. Pure, no IO.
 *
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.3.
 */
import { subjectiveScore } from './wellnessIndex.js';
import { makeIndex } from './contract.js';

/**
 * @param {object} inputs
 * @param {number|null} inputs.objectiveScore  0..100 wearable readiness (Readiness.computeReadiness)
 * @param {object|null} inputs.subjective       { sleepQuality, soreness, mood, stress, energy } (1–5)
 * @param {string} [inputs.source]              daily_metrics.source of the objective half
 * @returns index contract
 */
export function recoveryIndex({ objectiveScore = null, subjective = null, source } = {}) {
  const subj = subjective ? subjectiveScore(subjective) : null;

  let value = null;
  if (subj != null && objectiveScore != null) value = Math.round(0.6 * subj + 0.4 * objectiveScore);
  else if (subj != null) value = subj;
  else if (objectiveScore != null) value = objectiveScore;

  const parts = [
    { name: 'subjective', present: subj != null, value: subj, weight: 6, source: 'manual', baselineMaturity: 1 },
    { name: 'objective', present: objectiveScore != null, value: objectiveScore, weight: 4, source, baselineMaturity: 1 }
  ];
  return makeIndex({ value, parts });
}

export default { recoveryIndex };
