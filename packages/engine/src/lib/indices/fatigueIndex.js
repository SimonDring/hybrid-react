/**
 * Fatigue Index — accumulated fatigue / overreaching risk, as FRESHNESS
 * (100 = fresh, low = fatigued) so its band reads like the others (green = good).
 *
 * No single objective marker reliably detects overreaching, so this is a composite
 * (knowledge base: index.fatigue.markers): the autonomic recovery state, the blended
 * recovery score, and recent in-session recovery ratings; illness caps it low. It is
 * a SURFACED, diagnostic signal in this build — the runtime deload decision still
 * runs through deloadRecommendation with its own corroborated inputs, so behaviour
 * is unchanged. Pure, no IO. See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.5.
 */
import { mean, clamp100 } from '../baseline.js';
import { computeConfidence, bandFromValue } from './contract.js';

/**
 * @param {object} inputs
 * @param {object|null} inputs.recovery        Recovery Index result
 * @param {object|null} inputs.cardio          Cardiovascular Recovery Index result
 * @param {number|null} inputs.recentRecovery  mean recent session recovery rating (1–5)
 * @param {boolean} inputs.illness
 * @returns index contract (+ interpretation in extra)
 */
export function fatigueIndex({ recovery = null, cardio = null, recentRecovery = null, illness = false } = {}) {
  const recentScore = recentRecovery != null ? clamp100(((recentRecovery - 1) / 4) * 100) : null;
  const signals = [recovery && recovery.value, cardio && cardio.value, recentScore].filter(v => v != null);
  let value = signals.length ? Math.round(mean(signals)) : null;
  if (illness && value != null) value = Math.min(value, 30); // illness → clear fatigue

  const parts = [
    { name: 'recovery', present: !!(recovery && recovery.value != null), value: recovery ? recovery.value : null, weight: 2, source: 'manual', baselineMaturity: 1 },
    { name: 'cardio', present: !!(cardio && cardio.value != null), value: cardio ? cardio.value : null, weight: 2, source: 'manual', baselineMaturity: 1 },
    { name: 'recent_session_recovery', present: recentScore != null, value: recentRecovery, weight: 1, source: 'manual', baselineMaturity: 1 }
  ];

  const interpretation = value == null ? null : value >= 70 ? 'fresh' : value >= 50 ? 'moderate' : 'fatigued';
  return {
    value: value == null ? null : Math.round(value),
    confidence: computeConfidence(parts),
    band: bandFromValue(value),
    contributors: parts.filter(p => p.present).map(p => ({ name: p.name, value: p.value })),
    missingInputs: parts.filter(p => !p.present).map(p => p.name),
    illness,
    interpretation
  };
}

export default { fatigueIndex };
