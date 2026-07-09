// gymSupport — the accessor for a sport's season-INVARIANT gym-support data, relocated verbatim
// from the retired data/sportGymSupport/ layer into each SKB profile's `gymSupport` section
// (docs/superpowers/specs/2026-07-09-retire-legacy-sport-layer-design.md, P1). The SKB is now the
// single source: emphasis fallback, priority (P2 derives it), power, systemicFactor, seasonVolume,
// periodization block templates, keyMuscles. Pure; null for a sport that hasn't authored it.
import * as SKB from './index.js';
import { skbSportIdOf } from './index.js';

/** The gymSupport block for a resolved SKB profile, or null. */
export function gymSupportOf(skbProfile) {
  return (skbProfile && skbProfile.gymSupport) || null;
}

/** The gymSupport block for a user profile (resolves the SKB id), or null. Never throws. */
export function gymSupportFor(profile = {}) {
  return gymSupportOf(SKB.get(skbSportIdOf(profile)));
}

export default { gymSupportFor, gymSupportOf };
