/**
 * Utils — pure domain helper functions.
 *
 * No dependencies on other modules. All functions deterministic.
 *
 * WP-26: the UI-side helpers that used to live here (escapeHtml, chevronRight,
 * parseExercise, formatDuration) moved to the app (apps/mobile/src/lib/uiHelpers.js)
 * or were deleted as dead code; weekKey was a duplicate of plan/reflow.js
 * sessionKey. The engine ships coaching logic, not presentation.
 */

/** Round to the nearest half (…, 4.5, 5, 5.5). Used for weekly set-count targets. */
export const roundHalf = (x) => Math.round(x * 2) / 2;

/**
 * Resolve a profile's gym experience level, tolerating legacy focus keys
 * (strength_functional / strength_physique). The `fallback` differs by caller:
 * programme resolution defaults to 'intermediate', everywhere else 'beginner'.
 */
export function getGymLevel(profile, fallback = 'beginner') {
  const e = (profile && profile.experience) || {};
  return e.gym || e.strength_functional || e.strength_physique || fallback;
}

// Default export for namespace-style imports
export default { roundHalf, getGymLevel };
