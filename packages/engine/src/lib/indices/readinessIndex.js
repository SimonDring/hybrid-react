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
export function readinessIndex({ metric = {}, prior = [], objectiveScore = null, recentRecovery = null, dl = null, asOf = null, setLogs = [], capacity = null, consistency = null } = {}) {
  const subjective = {
    sleepQuality: metric.sleep_quality, soreness: metric.soreness,
    mood: metric.mood, stress: metric.stress, energy: metric.energy
  };

  const sleep = sleepIndex(metric);
  const cardio = cardiovascularRecoveryIndex(metric, prior);
  const wellness = wellnessIndex(subjective);
  const recovery = recoveryIndex({ objectiveScore, subjective, source: metric.source });
  const fatigue = fatigueIndex({ recovery, cardio, recentRecovery, illness: !!metric.illness });

  const sub = { sleep, cardio, wellness, recovery, fatigue };
  if (dl && asOf) sub.trainingLoad = trainingLoadIndex({ dl, asOf, setLogs });
  if (capacity) sub.recoveryCapacity = recoveryCapacityIndex(capacity);   // trait ceiling (optional)
  if (consistency) sub.consistency = consistencyIndex(consistency);       // behavioural reliability (optional)

  // Parity: the integrated value is the Recovery score that drives adaptation today.
  const value = recovery.value;

  return {
    value: value == null ? null : Math.round(value),
    confidence: recovery.confidence,
    band: bandFromValue(value),
    contributors: Object.entries(sub).map(([name, ix]) => ({ name, value: ix.value, confidence: ix.confidence, band: ix.band })),
    missingInputs: [...new Set(Object.values(sub).flatMap(ix => ix.missingInputs || []))],
    indices: sub
  };
}

export default { readinessIndex };
