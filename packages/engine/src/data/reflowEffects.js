// reflowEffects — the runtime reflow's load-response effect magnitudes (KA Domain 7).
//
// When a sport's decisionRules fire at reflow time, `ruleVolumeAdjustment` maps each fired
// effect to a conservative volume multiplier. These are those magnitudes. Relocated VERBATIM
// from lib/sportKnowledge/reflowAdjust.js (closure §3 row 11; commitment C3 / Art 17 — a load
// magnitude is coaching KNOWLEDGE, not engine logic). VALUES UNCHANGED. The arithmetic (min /
// multiply, the ≤1 clamp) stays engine Calculation (KA §2.3); only the weights are knowledge.
//
// Conservative by construction: every effect can only REDUCE volume (≤1) or force a deload —
// never escalate. A sport's authored rule may override a magnitude via `decisionRules`
// `effect.params` (validated on load). Provenance: conservative load-management / taper heuristics
// (Bosquet 2007; Mujika 2010). Confidence: low (heuristic; the D16 outcome loop is the validation
// path, SR-11).
export const REFLOW_EFFECT_MAGNITUDES = {
  minimal_effective_volume: 0.6,  // cap volume at 0.6 of baseline
  taper: 0.55,                    // cap at 0.55 (peaking taper)
  priming_only: 0.4,              // cap at 0.4 (prime, don't load)
  reduce_one_step: 0.85,          // multiply by 0.85 (one step down)
  withhold: 0.2,                  // cap at 0.2 (near-withhold)
};

export default { REFLOW_EFFECT_MAGNITUDES };
