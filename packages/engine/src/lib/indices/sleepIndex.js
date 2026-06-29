/**
 * Sleep Index — the night's restorative value (the top recovery lever).
 *
 * Reuses Readiness.sleepScoreFor (duration vs an ~8 h target, blended with
 * deep+REM quality when the stage breakdown is present) so the value is unchanged
 * from today. Stage data is wrist-grade and low-reliability, so it is a secondary
 * contributor — duration carries the weight. (knowledge base: physio.sleep.targets.)
 * Pure, no IO. See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.1.
 */
import { sleepScoreFor } from '../Readiness.js';
import { makeIndex } from './contract.js';

/**
 * @param {object} metric  a daily_metrics row
 * @returns index contract (+ estimated flag)
 */
export function sleepIndex(metric = {}) {
  const r = sleepScoreFor(metric); // { score, estimated } | null
  const value = r ? r.score : null;
  const src = metric.source;
  const parts = [
    { name: 'duration', present: metric.sleep_duration_min != null, value: metric.sleep_duration_min ?? null, weight: 3, source: src, baselineMaturity: 1 },
    { name: 'stages', present: metric.sleep_deep_min != null && metric.sleep_rem_min != null, weight: 1, source: src, baselineMaturity: 1 }
  ];
  return makeIndex({ value, parts, extra: { estimated: r ? r.estimated : false } });
}

export default { sleepIndex };
