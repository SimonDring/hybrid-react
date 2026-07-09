// movementPatternMap — the ONE bridge between the SKB's friendly movement vocabulary
// (used in seasonalModel.programming.movementPolicy and in the round-out derivation) and the
// exercise catalogue's internal `pattern` field (data/strengthExercises.js). Season-phased SKB
// programming (docs/superpowers/specs/2026-07-09-season-phased-skb-design.md).
//
// Why a friendly layer: an SKB author should say "horizontal_push" / "single_leg", not the
// catalogue's "hpush" / "lunge". This module is the single place that reconciles them, so the
// SKB vocabulary and the engine's pattern names can evolve independently.

// The friendly tokens an SKB movementPolicy may use, and that the round-out derivation emits.
// Group tokens (bilateral_spinal_loading) expand to a predicate rather than a pattern list.
export const MOVEMENT_POLICY_TOKENS = new Set([
  'squat', 'hinge', 'single_leg', 'vertical_pull', 'horizontal_pull',
  'vertical_push', 'horizontal_push', 'calf', 'anti_rotation', 'anti_extension',
  'hip_stability', 'carry', 'bilateral_spinal_loading',
]);

// muscle → the friendly movement pattern(s) that primarily train it. Used by the round-out
// derivation: a sport's under-developed muscles map to the patterns the round-out must cover.
// (Unlisted muscles contribute no pattern.)
export const PATTERN_FOR_MUSCLE = {
  chest: ['horizontal_push'],
  shoulders: ['vertical_push'],
  triceps: ['horizontal_push'],
  back: ['vertical_pull', 'horizontal_pull'],
  lats: ['vertical_pull'],
  biceps: ['horizontal_pull'],
  quads: ['squat'],
  hamstrings: ['hinge'],
  glutes: ['hinge'],
  calves: ['calf'],
  core: ['anti_rotation'],
};

// friendly token → concrete catalogue `pattern` value(s), OR a predicate flag for group tokens.
// The allocator uses this to test whether a catalogue exercise satisfies a policy token.
const TOKEN_TO_CATALOGUE = {
  squat: ['squat'],
  hinge: ['hinge'],
  single_leg: ['lunge'],
  vertical_pull: ['vpull'],
  horizontal_pull: ['hpull'],
  vertical_push: ['vpush'],
  horizontal_push: ['hpush'],
  calf: ['calf'],
  anti_rotation: ['core'],
  anti_extension: ['core'],
  hip_stability: ['iso'],
  carry: ['carry'],
};

/**
 * Expand a friendly policy token to something the allocator can test against a catalogue
 * exercise. Returns either { patterns: string[] } (match ex.pattern) or { flag: 'axialLoad' }
 * (match a heavy bilateral spinal lift). Unknown token → empty patterns (no-op, never throws).
 */
export function expandPolicyToken(token) {
  if (token === 'bilateral_spinal_loading') return { flag: 'axialLoad' };
  return { patterns: TOKEN_TO_CATALOGUE[token] || [] };
}

/** Does a catalogue exercise (with .pattern and optional .axialLoad) satisfy a friendly token? */
export function exerciseMatchesToken(ex, token) {
  const e = expandPolicyToken(token);
  if (e.flag) return !!ex[e.flag];
  return e.patterns.includes(ex.pattern);
}

export default { MOVEMENT_POLICY_TOKENS, PATTERN_FOR_MUSCLE, expandPolicyToken, exerciseMatchesToken };
