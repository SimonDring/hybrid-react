// Region ↔ quality risk map (WP-36) — how an athlete's INJURY HISTORY amplifies the
// priority of the qualities that protect that region. Previous injury is the single
// most consistent risk factor for re-injury (Hägglund 2006; Fulton 2014 systematic
// review), and the protective qualities are tissue-specific: eccentric/tissue capacity
// (robustness) for muscle-tendon strains, control (stability) for joints and the
// spine, tendon-stiffness work (reactiveStrength) where the stretch-shortening cycle
// loads the tissue, range (mobility) where restriction feeds the overload.
//
// Values are MULTIPLIERS on the D4 limiting-factor magnitude (1.0 = neutral). They
// re-rank priorities; they never gate. Keys are injuryTaxonomy part keys.
// Evidence: consensus priors anchored on the re-injury literature (L3/L4).

export const REGION_QUALITY_RISK = {
  hamstring:  { robustness: 1.25, reactiveStrength: 1.10 },
  calf:       { robustness: 1.25, reactiveStrength: 1.15 },
  ankle:      { stability: 1.20, reactiveStrength: 1.10 },
  knee:       { stability: 1.20, robustness: 1.15 },
  hip_groin:  { mobility: 1.15, robustness: 1.10 },
  quad:       { robustness: 1.15 },
  lower_back: { stability: 1.25, mobility: 1.10 },
  shoulder:   { stability: 1.20, mobility: 1.15 },
  elbow:      { robustness: 1.10 },
  wrist_hand: { robustness: 1.05 },
  neck:       { stability: 1.15 },
};

// Tolerant entry-shape reader: injuryHistory items may be strings or objects from
// different eras of the model ({ body_part } / { bodyPart } / { region } / { part }).
function partOf(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry.body_part || entry.bodyPart || entry.part || entry.region || null;
}

/**
 * The magnitude multiplier for a quality given the athlete's injury history.
 * Multiple relevant histories take the MAX boost (risk doesn't stack linearly —
 * the flag is "this quality protects previously injured tissue").
 * @returns {number} ≥ 1.0
 */
export function riskBoostFor(qualityId, injuryHistory = []) {
  let boost = 1.0;
  for (const entry of Array.isArray(injuryHistory) ? injuryHistory : []) {
    const part = partOf(entry);
    const m = part && REGION_QUALITY_RISK[part];
    if (m && m[qualityId]) boost = Math.max(boost, m[qualityId]);
  }
  return boost;
}

export default { REGION_QUALITY_RISK, riskBoostFor };
