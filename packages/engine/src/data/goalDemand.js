// Goal-as-sport demand profiles (WP-42a — EDS D2: "For build goals, resolve the goal's
// quality-importance profile (e.g. 'build muscle' ⇒ hypertrophy-dominant quality weights)";
// Constitution Art 3: the goal is athlete data describing a demand, never a hard-coded mode;
// Art 5/EDS D4: *never* produce no diagnosis — a build athlete has limiters too).
//
// Semantics: for a gym goal, demand ≡ the goal itself — the LEAD quality is definitional
// (a "get stronger" goal demands maxStrength at 1.0 by definition, not by evidence). The
// SUPPORTING weights are coaching judgement, seed-tagged for review (needsReview): they say
// what a good coach ALSO develops in service of that goal — the hypertrophy base under a
// strength goal (Schoenfeld: cross-sectional area is a strength input), tissue robustness
// and mobility as availability insurance (Art 8), broad capacity for a general-fitness goal
// (WHO/ACSM adult guidance: strength + aerobic + mobility breadth).
//
// The diagnosis these produce is MODEL OUTPUT ONLY until the build flip (WP-49): the D11
// gate requires style === 'sport', so no build plan changes. What changes now: D4/D5 rank a
// build athlete's limiters personally (a measured 2×BW squatter's get_stronger limiter moves
// off maxStrength toward the qualities they actually lack).
//
// evidence: 'goal' (definitional lead) — supporting weights confidence 'low', needsReview.

export const GOAL_DEMAND = {
  // goal_type 'build' × strength_style, via legacyToOutcome (adapters/goalMapping.js)
  get_stronger: {
    maxStrength: 1.0,        // definitional
    hypertrophy: 0.6,        // the size base under strength (CSA → force potential)
    robustness: 0.5,         // tissue tolerance — availability insurance for heavy loading
    stability: 0.4,          // trunk/joint control under maximal loads
    mobility: 0.35,          // positions for full-ROM strength (depth, overhead)
  },
  build_muscle: {
    hypertrophy: 1.0,        // definitional
    maxStrength: 0.6,        // progressive tension is the hypertrophy driver
    strengthEndurance: 0.4,  // work capacity to sustain productive volume
    robustness: 0.45,        // tendon/tissue tolerance for high volumes
    mobility: 0.35,          // long-length training positions
  },
  general_fitness: {
    strengthEndurance: 0.8,  // repeatable, everyday capacity
    maxStrength: 0.6,
    hypertrophy: 0.5,
    aerobicCapacity: 0.55,   // gym-supportable engine floor (carries/circuit density)
    mobility: 0.6,
    stability: 0.6,
    robustness: 0.65,        // durability IS the general-fitness promise
  },
};
GOAL_DEMAND.general_health = GOAL_DEMAND.general_fitness;

/** Demand profile (Performance-Model shape) for a build/goal outcome; [] if unknown. */
export function goalDemandProfile(outcome) {
  const vec = GOAL_DEMAND[outcome];
  if (!vec) return [];
  return Object.entries(vec).map(([qualityId, importance]) => ({
    qualityId, importance, source: 'goal', evidence: `goal:${outcome}:${qualityId}`,
  }));
}

export default { GOAL_DEMAND, goalDemandProfile };
