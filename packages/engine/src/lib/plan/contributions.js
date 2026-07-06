/**
 * muscleContribution — how much one set of an exercise contributes to each muscle
 * group. Isolation lifts credit a single mapped group; everything else uses its
 * movement pattern's contribution profile. A pure derivation of the data in
 * src/data/muscleVolume.js, shared by the allocator (exercise selection) and
 * volume.js (set-volume accounting) so the two stay in lockstep.
 *
 *   muscleContribution({ pattern: 'iso', muscle: 'biceps' }) → { arms: 1.0 }
 *   muscleContribution({ pattern: 'horizontal_push' })       → { chest: 1, ... }
 */
import { PATTERN_CONTRIB, ISO_MUSCLE_GROUP, EXERCISE_CONTRIB } from '../../data/muscleVolume.js';

export function muscleContribution(ex) {
  // WP-45: per-exercise corrections outrank the pattern default — accounting and
  // substitution now derive from the ONE muscle table (EXERCISE_MUSCLES).
  if (ex.id && EXERCISE_CONTRIB[ex.id]) return EXERCISE_CONTRIB[ex.id];
  if (ex.pattern === 'iso') {
    const g = ISO_MUSCLE_GROUP[ex.muscle];
    return g ? { [g]: 1.0 } : {};
  }
  return PATTERN_CONTRIB[ex.pattern] || {};
}
