/**
 * Consistency Index — behavioural reliability, and a confidence multiplier.
 *
 * High adherence + complete data + a regular routine means the plan can progress and
 * the signals can be trusted; low means bias conservative. A rolling weekly trait.
 * The caller supplies counts (completed/planned sessions, days logged) derived from
 * the runtime session state + daily_metrics, keeping the engine dependency-free.
 * Routine-regularity (sleep/training timing variance) is a future input — flagged
 * missing until captured. Pure, no IO. (knowledge base: index.consistency.)
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.8.
 */
import { clamp100 } from '../baseline.js';
import { makeIndex } from './contract.js';

/**
 * @param {object} inputs
 * @param {number} [inputs.completed]    sessions completed in the window
 * @param {number} [inputs.planned]      sessions planned in the window
 * @param {number} [inputs.loggedDays]   days with a daily_metrics row / check-in
 * @param {number} [inputs.windowDays]   the window length (default 14)
 * @returns index contract
 */
export function consistencyIndex({ completed = 0, planned = 0, loggedDays = 0, windowDays = 14 } = {}) {
  const adherence = planned > 0 ? clamp100((completed / planned) * 100) : null;
  const completeness = windowDays > 0 ? clamp100((loggedDays / windowDays) * 100) : null;

  const scored = [[adherence, 3], [completeness, 2]].filter(([v]) => v != null);
  const value = scored.length
    ? Math.round(scored.reduce((s, [v, w]) => s + v * w, 0) / scored.reduce((s, [, w]) => s + w, 0))
    : null;

  const parts = [
    { name: 'adherence', present: adherence != null, value: adherence != null ? Math.round(adherence) : null, weight: 3, source: 'manual', baselineMaturity: 1 },
    { name: 'data_completeness', present: completeness != null, value: completeness != null ? Math.round(completeness) : null, weight: 2, source: 'manual', baselineMaturity: 1 },
    { name: 'routine_regularity', present: false, weight: 1, source: 'manual', baselineMaturity: 1 } // future: sleep/training timing variance
  ];

  return makeIndex({ value, parts });
}

export default { consistencyIndex };
