// src/lib/injury/index.js
/**
 * Injury registry — the single place the engine looks up injury knowledge. Adding an
 * injury region = a new entry in profiles.js; injuryRules / injuryFilter don't change.
 * `getProfile` returns undefined for an unknown region (callers degrade gracefully).
 */
import { INJURY_PROFILES } from './profiles.js';
import { validateRegistry } from './_schema.js';

export function getProfile(region) { return INJURY_PROFILES[region]; }
export function hasProfile(region) { return region in INJURY_PROFILES; }
export function allRegions() { return Object.keys(INJURY_PROFILES); }
export function allProfiles() { return Object.values(INJURY_PROFILES); }
export function validate() { return validateRegistry(INJURY_PROFILES); }

export default { getProfile, hasProfile, allRegions, allProfiles, validate };
