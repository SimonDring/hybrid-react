/**
 * Cardiovascular Recovery Index — autonomic / parasympathetic recovery state.
 *
 * HRV (vs a personal rolling baseline) is the PRIMARY marker; resting HR (vs
 * baseline) is corroborating and weighted below it; respiratory-rate availability
 * is a minor contributor. Mirrors Readiness.deriveScore's HRV/RHR scaling via the
 * shared baseline helpers, so it stays consistent with the objective readiness the
 * Recovery Index already uses. (knowledge base: physio.hrv.metric, physio.rhr.role.)
 * Pure, no IO. See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.2.
 */
import { mean, deviationScore, baselineMaturity } from '../baseline.js';
import { makeIndex } from './contract.js';

/**
 * @param {object}   latest  today's daily_metrics row
 * @param {object[]} prior   earlier rows (for the personal baseline); order ignored
 * @returns index contract
 */
export function cardiovascularRecoveryIndex(latest = {}, prior = []) {
  const hrvBase = mean(prior.map(d => d.hrv_ms));
  const rhrBase = mean(prior.map(d => d.resting_hr));

  // HRV: higher than baseline is better. No baseline yet → a present HRV is neutral-ish (60).
  const hrvScore = latest.hrv_ms != null
    ? (hrvBase ? deviationScore(latest.hrv_ms, hrvBase, { higherIsBetter: true }) : 60)
    : null;
  // RHR: lower than baseline is better. No baseline yet → slightly conservative (55).
  const rhrScore = latest.resting_hr != null
    ? (rhrBase ? deviationScore(latest.resting_hr, rhrBase, { higherIsBetter: false }) : 55)
    : null;

  const vals = [hrvScore, rhrScore].filter(v => v != null);
  const value = vals.length ? Math.round(mean(vals)) : null;

  const src = latest.source;
  const parts = [
    { name: 'hrv', present: latest.hrv_ms != null, value: latest.hrv_ms ?? null, weight: 3, source: src, baselineMaturity: baselineMaturity(prior.filter(d => d.hrv_ms != null).length) },
    { name: 'rhr', present: latest.resting_hr != null, value: latest.resting_hr ?? null, weight: 1, source: src, baselineMaturity: baselineMaturity(prior.filter(d => d.resting_hr != null).length) },
    { name: 'respiratory_rate', present: latest.breathing_rate != null, value: latest.breathing_rate ?? null, weight: 1, source: src, baselineMaturity: 1 }
  ];
  return makeIndex({ value, parts });
}

export default { cardiovascularRecoveryIndex };
