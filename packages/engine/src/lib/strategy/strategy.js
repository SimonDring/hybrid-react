/**
 * strategy — D6 · Training Strategy (M-STRAT). A PURE function that turns the D5 diagnosis
 * (priority qualities + deferred limiters) into a typed `Strategy {value, confidence, rationale}`:
 * the develop/maintain map at INTERVENTION-CLASS granularity + the sequencing/interference rules +
 * the concurrency model. EDS §20 D6; 02 §2.6.
 *
 * This is a TYPING of D6's ratified output, not a new decision — it names, in one typed object, the
 * macro-strategy the block objective (D7) already expresses piecemeal (develop one quality, maintain
 * the rest, defer the incompatible limiters). The one addition per ruling R1: each develop target
 * carries its committed intervention class (data/interventionClass.js), so a future D9/endurance
 * layer inherits a managed-concurrency plan, not a calendar template.
 *
 * ROLLOUT — v0 is ADVISORY / PARALLEL (the same safe seam D4/D5/D7 shipped on): this object steers
 * NOTHING yet — resolvePeriodization + sessionBuilder produce the actual plan. It exists to be
 * inspected/tested and to be the object D8 (microcycle) + Stage-7 endurance later consume, behind a
 * reviewed flip. Because it is not emitted into the plan, every golden is byte-identical. Pure: no
 * I/O, no clock (Art 18).
 */
import { interventionClassFor } from '../../data/interventionClass.js';

/**
 * @param {object} args
 *   priorityQualities — D5 output: [{ qualityId, magnitude?, order?, tracesToLimiter? }]
 *   limitingFactors   — D4 output: [{ qualityId, magnitude }] (deferred = positive-magnitude limiters
 *                       that did NOT make the compatible priority set — the interference signal)
 * @returns {{ value: object, confidence: string, rationale: string }}
 */
export function deriveStrategy({ priorityQualities = [], limitingFactors = [] } = {}) {
  const priorities = Array.isArray(priorityQualities) ? priorityQualities.filter((p) => p && p.qualityId) : [];

  if (!priorities.length) {
    return {
      value: { developMaintainMap: [], sequencingRules: [], concurrencyModel: 'template' },
      confidence: 'low',
      rationale: 'no diagnosis — the legacy template governs strategy (no develop/maintain commitments).',
    };
  }

  // The develop sequence: each priority quality is developed (in D5 order), carrying its committed
  // intervention class. While any one is developed the OTHERS are maintained — that maintain
  // relationship IS the managed concurrency (concurrencyModel below), not a separate map entry.
  const developMaintainMap = priorities.map((p, i) => {
    const ic = interventionClassFor(p.qualityId);
    return {
      quality: p.qualityId,
      role: 'develop',
      order: p.order ?? i + 1,
      interventionClass: ic.klass,
      classConfidence: ic.confidence,
      tracesTo: p.tracesToLimiter || p.qualityId,
    };
  });

  // Sequencing / interference rules: the limiters D5 DEFERRED (positive magnitude, not in the
  // compatible priority set) — develop them in a later block because they conflict with a higher
  // priority this block. This is D6's interference-managed sequencing (Art 15 — recorded, not silent).
  const chosen = new Set(priorities.map((p) => p.qualityId));
  const deferred = (Array.isArray(limitingFactors) ? limitingFactors : [])
    .filter((f) => f && f.qualityId && f.magnitude > 0 && !chosen.has(f.qualityId));
  const sequencingRules = deferred.map((f) => ({
    quality: f.qualityId,
    action: 'defer',
    magnitude: f.magnitude,
    reason: 'conflicts with a higher-priority quality this block — develop in a later block (interference).',
  }));

  return {
    value: {
      developMaintainMap,
      sequencingRules,
      // Develop the priority sequence one quality at a time; MAINTAIN the non-active priorities —
      // the interference-managed concurrency the block sequence (D7) inherits.
      concurrencyModel: 'sequenced-develop-maintain',
    },
    confidence: 'low', // v0 seed; the concurrent-training evidence base firms this over time (Art 13)
    rationale: `develop ${priorities.length} priority quality${priorities.length === 1 ? '' : 'ies'} in sequence `
      + `(${developMaintainMap.map((d) => `${d.quality}→${d.interventionClass}`).join(', ')}), maintaining the rest; `
      + `${deferred.length} limiter${deferred.length === 1 ? '' : 's'} deferred for interference.`,
  };
}

export default { deriveStrategy };
