/**
 * indices/contract — the uniform shape every derived index returns, plus the
 * confidence model shared across them. Pure, no IO.
 *
 *   { value, confidence, band, contributors, missingInputs }
 *
 * value         0–100 (higher = better) or null when no input is present
 * confidence    0–1 — how much to trust the value (input completeness × source
 *               reliability × baseline maturity). Missing inputs LOWER confidence;
 *               they never block the value. (knowledge base: index.confidence.model)
 * band          'green' | 'amber' | 'red' | null  (70 / 50 cut — parity with the
 *               engine's existing readiness mapping)
 * contributors  the present sub-signals: [{ name, value }]
 * missingInputs the absent sub-signals: [name]
 *
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.
 */
import kb from '../knowledge/kb.js';

const REL = kb.value('physio.source.reliability'); // { ecg, chest_strap, finger_ring, wrist_optical, manual }

/**
 * Map a daily_metrics.source string to a per-source reliability weight. These
 * scale CONFIDENCE, never the value. Unknown wearable → wrist-optical (the common
 * case: Fitbit/Garmin/WHOOP wrist); manual / absent → the subjective weight.
 */
export function sourceReliability(source) {
  if (source == null || source === 'manual') return REL.manual;
  if (source === 'oura') return REL.finger_ring;
  if (source === 'polar' || source === 'chest_strap' || source === 'ecg') return REL.chest_strap;
  return REL.wrist_optical; // fitbit / garmin / whoop / apple wrist
}

/** greenCut / 50 cut → green / amber / red; null value → null band. greenCut
 *  defaults to 70 (the legacy mapping); the v2 readiness weighting passes 67. */
export function bandFromValue(v, greenCut = 70) {
  if (v == null) return null;
  if (v >= greenCut) return 'green';
  if (v >= 50) return 'amber';
  return 'red';
}

/**
 * Confidence in [0, 1]: Σ(weight · present · sourceReliability · baselineMaturity) / Σ(weight).
 * Every EXPECTED part counts in the denominator, so absent parts pull confidence down.
 *
 * @param {{name:string, present:boolean, weight?:number, source?:string, baselineMaturity?:number}[]} parts
 */
export function computeConfidence(parts = []) {
  let num = 0, den = 0;
  for (const p of parts) {
    const w = p.weight ?? 1;
    den += w;
    if (p.present) {
      const rel = sourceReliability(p.source);
      const mat = p.baselineMaturity ?? 1;
      num += w * rel * mat;
    }
  }
  if (den === 0) return 0;
  return Math.round((num / den) * 100) / 100;
}

/**
 * Assemble an index result from a value + its declared parts. `parts` drives both
 * the confidence and the contributors / missingInputs breakdown.
 */
export function makeIndex({ value = null, parts = [], extra = {} } = {}) {
  return {
    value: value == null ? null : Math.round(value),
    confidence: computeConfidence(parts),
    band: bandFromValue(value),
    contributors: parts.filter(p => p.present).map(p => ({ name: p.name, value: p.value ?? null })),
    missingInputs: parts.filter(p => !p.present).map(p => p.name),
    ...extra
  };
}

export default { sourceReliability, bandFromValue, computeConfidence, makeIndex };
