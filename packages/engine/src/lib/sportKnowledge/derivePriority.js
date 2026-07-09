// derivePriority — the sport's ×1.35 priority-exercise list, DERIVED from its own exerciseLibrary
// (2026-07-09, retire-legacy P2). Single source: the exerciseLibrary already rates every movement's
// transfer to the sport, so the priority list is just "the highest-transfer, phase-suitable, catalogue-
// joined movements, best first" — no separate curated list to maintain. Pure.
import * as SKB from './index.js';
import { skbSportIdOf } from './index.js';
import { EXERCISES } from '../../data/strengthExercises.js';

const CATALOGUE = new Set(EXERCISES.map((e) => e.id));
const ratingOf = (e) => (typeof e.transferToSportRating === 'number' ? e.transferToSportRating : 5);

/**
 * @param {object} skbProfile  a resolved SKB profile
 * @param {string} phase       engine phase (off/pre/in/transition) — filters by seasonal suitability
 * @returns {string[]} ordered exercise ids (highest transfer first; empty if no library)
 */
export function derivePriorityExercises(skbProfile, phase = 'off') {
  const lib = skbProfile && skbProfile.exerciseLibrary && skbProfile.exerciseLibrary.exercises;
  if (!Array.isArray(lib) || !lib.length) return [];
  // suitability gate: in-season keeps in-season-suitable; every other phase keeps off-season-suitable.
  const key = phase === 'in' ? 'suitableInSeason' : 'suitableOffSeason';
  const usable = lib.filter((e) => CATALOGUE.has(e.id) && e[key] !== false);
  const pool = usable.length ? usable : lib.filter((e) => CATALOGUE.has(e.id)); // never empty if any join
  return pool
    .slice()
    .sort((a, b) => ratingOf(b) - ratingOf(a) || (a.id < b.id ? -1 : 1))
    .map((e) => e.id);
}

/** Derived priority for a user profile at a phase. Never throws. */
export function derivePriorityFor(profile = {}, phase = 'off') {
  return derivePriorityExercises(SKB.get(skbSportIdOf(profile)), phase);
}

export default { derivePriorityExercises, derivePriorityFor };
