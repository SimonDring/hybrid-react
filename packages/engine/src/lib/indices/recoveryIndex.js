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
import { baselineMaturity, recencyFactor } from '../baseline.js';

// daily_metrics fields that make a prior row count toward each half's personal
// baseline (the objective half is what Readiness.computeReadiness consumes).
const SUBJECTIVE_FIELDS = ['sleep_quality', 'soreness', 'mood', 'stress', 'energy'];
const OBJECTIVE_FIELDS = ['hrv_ms', 'resting_hr', 'sleep_duration_min', 'sleep_score'];
const hasAny = (row, fields) => !!row && fields.some((f) => row[f] != null);

/**
 * @param {object} inputs
 * @param {number|null} inputs.objectiveScore  0..100 wearable readiness (Readiness.computeReadiness)
 * @param {object|null} inputs.subjective       { sleepQuality, soreness, mood, stress, energy } (1–5)
 * @param {string} [inputs.source]              daily_metrics.source of the objective half
 * @param {object[]} [inputs.prior]             earlier daily_metrics rows — the personal history
 *                                              that matures the confidence (TR-13). When OMITTED the
 *                                              legacy neutral (fully-mature) is kept, so existing
 *                                              no-history callers are byte-identical.
 * @param {string} [inputs.asOf]                today (local YYYY-MM-DD) — for the driving row's recency
 * @param {string} [inputs.date]                the driving row's date — a STALE row is down-weighted
 * @returns index contract
 */
export function recoveryIndex({ objectiveScore = null, subjective = null, source, prior, asOf = null, date = null } = {}) {
  const subj = subjective ? subjectiveScore(subjective) : null;

  let value = null;
  if (subj != null && objectiveScore != null) value = Math.round(0.6 * subj + 0.4 * objectiveScore);
  else if (subj != null) value = subj;
  else if (objectiveScore != null) value = objectiveScore;

  // TR-13: when the caller supplies prior rows, baseline maturity is REAL — the count of
  // prior observations of each half against the days a stable baseline needs (as the
  // cardiovascular index already does), scaled by the driving row's recency so a single
  // un-baselined OR stale wellness entry reports LOW confidence, not full. No prior array
  // (legacy callers) → the neutral 1, so their confidence is unchanged. The confidence
  // consumer (recoveryFromScore) bounds the volume cut by exactly this number.
  const hasHistory = Array.isArray(prior);
  const recency = recencyFactor(asOf, date);
  const subjMaturity = hasHistory ? baselineMaturity(prior.filter((r) => hasAny(r, SUBJECTIVE_FIELDS)).length) * recency : 1;
  const objMaturity = hasHistory ? baselineMaturity(prior.filter((r) => hasAny(r, OBJECTIVE_FIELDS)).length) * recency : 1;

  const parts = [
    { name: 'subjective', present: subj != null, value: subj, weight: 6, source: 'manual', baselineMaturity: subjMaturity },
    { name: 'objective', present: objectiveScore != null, value: objectiveScore, weight: 4, source, baselineMaturity: objMaturity }
  ];
  return makeIndex({ value, parts });
}

export default { recoveryIndex };
