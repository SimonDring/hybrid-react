/**
 * priors — the typed learned-priors READ-PATH (WP-37; the TAS learning seam).
 *
 * Every prior the engine falls back on when it has no athlete-specific
 * measurement, read through ONE typed interface that carries per-prior
 * provenance ({ value, source, confidence }). NO WRITER EXISTS — D16 (the
 * learning system) is a future stage: today every read resolves to the
 * population default, so live output is byte-identical. But the seam is real:
 * an athlete model that CARRIES a learned prior changes the decision now
 * (proven in tests), which is exactly the slot D16 will write into.
 *
 * Two families:
 *   capabilityPrior(qualityId, band, learnedPriors)
 *     D1 — the assumed capability level for an unmeasured quality. A learned
 *     override may be per-band ({ novice: {...} }) or band-agnostic.
 *   dosePrior(name, learnedPriors)
 *     D12 — dose-shaping multipliers (schema: volumeTolerance, recoveryRate;
 *     both default 1). volumeTolerance is read by resolveProgram (it scales the
 *     volume scalar the whole dose chain inherits — plan AND reflow, one seam).
 *     recoveryRate is typed + readable but not yet consumed: its consumer is
 *     the runtime recovery layer, wired when D16 gives it real values.
 */
import { priorLevel } from '../data/capabilityPriors.js';

const typed = (value, source, confidence) => ({ value, source, confidence });

/** The capability level assumed for an unmeasured quality (D1). */
export function capabilityPrior(qualityId, band, learnedPriors = null) {
  const cap = learnedPriors && learnedPriors.capability && learnedPriors.capability[qualityId];
  const hit = cap && (typeof cap.value === 'number' ? cap : (band && cap[band] && typeof cap[band].value === 'number' ? cap[band] : null));
  if (hit) return typed(hit.value, hit.source || 'learned', hit.confidence || 'low');
  return typed(priorLevel(qualityId, band), 'population', 'low');
}

/** A dose-shaping multiplier prior (D12). Unknown names read as a neutral 1. */
export function dosePrior(name, learnedPriors = null) {
  const lp = learnedPriors && learnedPriors[name];
  if (lp && typeof lp.value === 'number') return typed(lp.value, lp.source || 'population', lp.confidence || 'low');
  return typed(1, 'population', 'low');
}

export default { capabilityPrior, dosePrior };
