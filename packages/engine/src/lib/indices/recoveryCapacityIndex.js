/**
 * Recovery Capacity Index — the slow-moving TRAIT: how much training load this
 * athlete can absorb. Unlike the daily indices it changes weekly/monthly and is
 * meant to MODULATE the ceiling (acceptable chronic load, deload sensitivity), not
 * drive the daily call. Pure, no IO.
 *
 * Inputs (all already in the app): a chronic HRV baseline's level + stability (CV),
 * chronic sleep adequacy vs the athlete sleep floor, a fitness proxy (0–100, e.g.
 * from fitnessAge / strength standing, passed in by the caller to keep the engine
 * dependency-free), and age. (knowledge base: index.recovery_capacity,
 * physio.hrv.metric, physio.sleep.targets.)
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.7.
 */
import { mean, clamp100, coefficientOfVariation } from '../baseline.js';
import { makeIndex } from './contract.js';
import kb from '../knowledge/kb.js';

const SLEEP = kb.value('physio.sleep.targets'); // { athleteFloorHours, ... }

/**
 * @param {object} inputs
 * @param {object[]} [inputs.history]   daily_metrics rows (chronic window; for HRV/sleep baselines)
 * @param {object}   [inputs.profile]   { age, sex, bodyweight_kg }
 * @param {number|null} [inputs.fitnessScore]  0–100 fitness proxy (optional)
 * @returns index contract
 */
export function recoveryCapacityIndex({ history = [], profile = {}, fitnessScore = null } = {}) {
  const hrvSeries = history.map(d => d.hrv_ms).filter(v => v != null);
  const sleepSeries = history.map(d => d.sleep_duration_min).filter(v => v != null);

  // HRV stability: a steadier day-to-day baseline (lower CV) reflects more capacity.
  const cv = coefficientOfVariation(hrvSeries);
  const stabilityScore = cv == null ? null : clamp100(100 - cv * 5); // CV 0% → 100, 20% → 0

  // Chronic sleep adequacy vs the athlete sleep floor (~8 h).
  const target = (SLEEP.athleteFloorHours || 8) * 60;
  const sleepMean = mean(sleepSeries);
  const chronicSleepScore = sleepMean == null ? null : clamp100((sleepMean / target) * 100);

  // Age: younger recovers faster (mild, transparent).
  const age = Number(profile.age);
  const ageScore = Number.isFinite(age) ? clamp100(100 - Math.max(0, age - 25) * 0.8) : null;

  const scored = [
    [stabilityScore, 3], [chronicSleepScore, 2], [fitnessScore, 2], [ageScore, 1]
  ].filter(([v]) => v != null);
  const value = scored.length
    ? Math.round(scored.reduce((s, [v, w]) => s + v * w, 0) / scored.reduce((s, [, w]) => s + w, 0))
    : null;

  const parts = [
    { name: 'hrv_stability', present: stabilityScore != null, value: stabilityScore != null ? Math.round(stabilityScore) : null, weight: 3, source: 'manual', baselineMaturity: Math.min(1, hrvSeries.length / 14) },
    { name: 'chronic_sleep', present: chronicSleepScore != null, value: chronicSleepScore != null ? Math.round(chronicSleepScore) : null, weight: 2, source: 'manual', baselineMaturity: Math.min(1, sleepSeries.length / 14) },
    { name: 'fitness', present: fitnessScore != null, value: fitnessScore, weight: 2, source: 'manual', baselineMaturity: 1 },
    { name: 'age', present: ageScore != null, value: Number.isFinite(age) ? age : null, weight: 1, source: 'manual', baselineMaturity: 1 }
  ];

  return makeIndex({ value, parts });
}

export default { recoveryCapacityIndex };
