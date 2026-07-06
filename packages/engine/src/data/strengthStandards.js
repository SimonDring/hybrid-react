/**
 * strengthStandards — GOVERNED strength standards (WP-58). The single, versioned
 * home for the per-lift 1RM ÷ bodyweight band table the platform uses to place a
 * lift on a beginner→elite scale and suggest the next milestone. Each value is the
 * LOWER BOUND of that band. These are motivational estimates, NOT verdicts.
 *
 * Previously duplicated app-side (apps/mobile/src/data/strengthStandards.js), OUTSIDE
 * the governed knowledge set. WP-58 brings it under governance: it now lives here with
 * provenance and is versioned by KNOWLEDGE_SET_VERSION; the app re-exports it so there
 * is ONE source. Bump the knowledge-set version on any change to these numbers.
 *
 *   ohp  = barbell overhead-press 1RM ÷ BW.
 *   pull = vertical-pull e1RM ÷ BW (pull-up total-system 1RM or lat-pulldown 1RM).
 *
 * Source: ballpark of common public references (ExRx / StrengthLevel population
 * percentiles). Evidence level: L5 (heuristic, motivational). Confidence: low.
 *
 * NOTE (WP-58, flagged for review): the engine's capability estimator
 * (lib/performance/estimation.js STRONG_BW_MULTIPLE) anchors "level 1.0" per lift and
 * currently ALIGNS with the `advanced` band here for squat/bench/deadlift (both sexes),
 * but DIVERGES for overhead press (anchored at `elite`) and for female deadlift/ohp
 * (independently seeded: 1.9 / 0.7, matching no band here). Those are the parallel-model
 * values that a full unification must reconcile — a deliberate scientific call, left to a
 * reviewed change. tests/wp58-strength-standards.js pins the alignment and documents the
 * exceptions so the two can no longer drift SILENTLY.
 */
export const STRENGTH_BANDS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

export const STRENGTH_STANDARDS = {
  male: {
    squat:    { beginner: 0.75, novice: 1.0,  intermediate: 1.5,  advanced: 2.0,  elite: 2.5 },
    bench:    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
    deadlift: { beginner: 1.0,  novice: 1.5,  intermediate: 2.0,  advanced: 2.5,  elite: 3.0 },
    ohp:      { beginner: 0.35, novice: 0.45, intermediate: 0.6,  advanced: 0.8,  elite: 1.0 },
    pull:     { beginner: 1.0,  novice: 1.17, intermediate: 1.33, advanced: 1.6,  elite: 2.0 }
  },
  female: {
    squat:    { beginner: 0.5,  novice: 0.75, intermediate: 1.0,  advanced: 1.5,  elite: 2.0 },
    bench:    { beginner: 0.3,  novice: 0.5,  intermediate: 0.75, advanced: 1.0,  elite: 1.5 },
    deadlift: { beginner: 0.6,  novice: 1.0,  intermediate: 1.25, advanced: 1.75, elite: 2.5 },
    ohp:      { beginner: 0.2,  novice: 0.3,  intermediate: 0.4,  advanced: 0.55, elite: 0.75 },
    pull:     { beginner: 0.8,  novice: 0.95, intermediate: 1.1,  advanced: 1.35, elite: 1.7 }
  }
};

// The band a ratio (1RM ÷ BW) falls in: the highest band whose lower bound it meets,
// with the next band up (or null at the top). Returns null for an unknown sex/lift.
export function strengthBandFor(sex, lift, ratio) {
  const table = STRENGTH_STANDARDS[sex] && STRENGTH_STANDARDS[sex][lift];
  if (!table || !(ratio >= 0)) return null;
  let cur = null;
  for (const b of STRENGTH_BANDS) if (ratio >= table[b]) cur = b;
  const idx = cur ? STRENGTH_BANDS.indexOf(cur) : -1;
  const next = idx + 1 < STRENGTH_BANDS.length ? STRENGTH_BANDS[idx + 1] : null;
  return { band: cur, next, nextRatio: next ? table[next] : null };
}

export default STRENGTH_STANDARDS;
