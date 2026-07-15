/**
 * Readiness Index — the top-level integrator: the single "can I train hard today?"
 * signal, DERIVED and explainable, never a vendor readiness score.
 *
 * It composes the sub-indices (Sleep, Cardiovascular Recovery, Wellness, Recovery,
 * Fatigue, and — when load history is supplied — Training Load) and exposes each as
 * a contributor with its own value + confidence + band. For behaviour parity through
 * the cut-over its `value` equals the Recovery Index value, i.e. the same blended
 * score that already drives volumeModifier + the deload decision today. Re-weighting
 * the integrator on the framework's evidence (HRV-primary, sleep-heavy) is a
 * deliberate, separately-reviewed follow-on. Pure, no IO.
 *
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.9. (knowledge base: index.readiness.weights.)
 */
import { sleepIndex } from './sleepIndex.js';
import { cardiovascularRecoveryIndex } from './cardiovascularRecoveryIndex.js';
import { wellnessIndex } from './wellnessIndex.js';
import { recoveryIndex } from './recoveryIndex.js';
import { fatigueIndex } from './fatigueIndex.js';
import { trainingLoadIndex } from './trainingLoadIndex.js';
import { recoveryCapacityIndex } from './recoveryCapacityIndex.js';
import { consistencyIndex } from './consistencyIndex.js';
import { bandFromValue } from './contract.js';

/**
 * @param {object} inputs
 * @param {object}   inputs.metric          today's daily_metrics row
 * @param {object[]} [inputs.prior]         earlier rows (for the personal baseline)
 * @param {number|null} [inputs.objectiveScore]  Readiness.computeReadiness score (objective half)
 * @param {number|null} [inputs.recentRecovery]  mean recent session recovery (1–5)
 * @param {{date,load}[]} [inputs.dl]       daily loads (optional — adds Training Load)
 * @param {string} [inputs.asOf]            ISO date for the load window
 * @param {object[]} [inputs.setLogs]       set_logs rows (for volume-load)
 * @param {object} [inputs.capacity]        { history, profile, fitnessScore } → Recovery Capacity (optional)
 * @param {object} [inputs.consistency]     { completed, planned, loggedDays, windowDays } → Consistency (optional)
 * @returns {{ value, confidence, band, contributors, missingInputs, indices }}
 */
// v2 weighting (knowledge base: index.readiness.weights) — subjective is the largest
// single component (Saw 2016), HRV the primary objective marker, sleep heavy; Recovery
// Capacity nudges the ceiling. Returns null if none of the weighted parts are present.
const V2_WEIGHTS = { wellness: 0.40, sleep: 0.25, cardio: 0.25, fatigue: 0.10 };
function readinessV2(sub) {
  let num = 0, den = 0;
  for (const k of Object.keys(V2_WEIGHTS)) {
    const ix = sub[k];
    if (ix && ix.value != null) { num += V2_WEIGHTS[k] * ix.value; den += V2_WEIGHTS[k]; }
  }
  if (den === 0) return null;
  let v = num / den;
  const cap = sub.recoveryCapacity && sub.recoveryCapacity.value;
  if (cap != null) v += (cap - 50) * 0.1; // capacity modulates the ceiling (±5 at the extremes)
  return Math.round(Math.max(0, Math.min(100, v)));
}

export function readinessIndex({ metric = {}, prior = [], objectiveScore = null, recentRecovery = null, dl = null, asOf = null, setLogs = [], capacity = null, consistency = null, v2 = false } = {}) {
  const subjective = {
    sleepQuality: metric.sleep_quality, soreness: metric.soreness,
    mood: metric.mood, stress: metric.stress, energy: metric.energy
  };

  const sleep = sleepIndex(metric);
  const cardio = cardiovascularRecoveryIndex(metric, prior);
  const wellness = wellnessIndex(subjective);
  // Thread the personal history + the driving row's date so the Recovery Index reports
  // an HONEST confidence (TR-13/SR-04): matured by how many prior observations exist and
  // down-weighted when the driving row is stale. This is the confidence that governs the
  // authority of the readiness-driven volume cut downstream (recoveryFromScore).
  const recovery = recoveryIndex({ objectiveScore, subjective, source: metric.source, prior, asOf, date: metric.date });
  const fatigue = fatigueIndex({ recovery, cardio, recentRecovery, illness: !!metric.illness });

  const sub = { sleep, cardio, wellness, recovery, fatigue };
  if (dl && asOf) sub.trainingLoad = trainingLoadIndex({ dl, asOf, setLogs });
  if (capacity) sub.recoveryCapacity = recoveryCapacityIndex(capacity);   // trait ceiling (optional)
  if (consistency) sub.consistency = consistencyIndex(consistency);       // behavioural reliability (optional)

  // v1 (default): the integrated value IS the Recovery score that drives adaptation
  // today (exact parity). v2 (flagged): the evidence-based composition above, with a
  // ≥67 green cut. Off by default so behaviour is unchanged until the flag is set.
  const greenCut = v2 ? 67 : 70;
  const value = v2 ? readinessV2(sub) : recovery.value;

  return {
    value: value == null ? null : Math.round(value),
    confidence: recovery.confidence,
    band: bandFromValue(value, greenCut),
    contributors: Object.entries(sub).map(([name, ix]) => ({ name, value: ix.value, confidence: ix.confidence, band: ix.band })),
    missingInputs: [...new Set(Object.values(sub).flatMap(ix => ix.missingInputs || []))],
    indices: sub
  };
}

export default { readinessIndex };
