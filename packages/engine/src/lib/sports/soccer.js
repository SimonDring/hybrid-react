// src/lib/sports/soccer.js
/**
 * Soccer / football — SCAFFOLD (Team-package seed). Not yet selectable in onboarding;
 * proves zero-core-edit extensibility. First-pass emphasis/priority: posterior chain
 * + change-of-direction strength, with the strongly-evidenced groin (Copenhagen,
 * Harøy 2019) and hamstring (Nordic) prevention staples. Refine with a sport SME.
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const soccer = {
  id: 'soccer',
  label: 'Soccer',
  power: true,
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  emphasis: { hamstrings: 1.30, glutes: 1.25, quads: 1.15, calves: 1.10, core: 1.20, back: 1.0, shoulders: 0.85, chest: 0.7, biceps: 0.7, triceps: 0.7 },
  priorityExercises: [
    'nordic_curl', 'copenhagen', 'split_squat', 'rdl', 'hip_thrust',
    'lateral_band_walk', 'broad_jump', 'sl_pogo_jump', 'pallof', 'sl_calf'
  ],

  movementDemands: ['repeated sprint', 'cutting/change-of-direction', 'kicking'],
  injuryPatterns: ['hamstring', 'groin', 'acl', 'ankle'],
  keyMuscles: ['hamstrings', 'glutes', 'adductors', 'quads'],
  performanceDeterminants: ['repeated sprint ability', 'change-of-direction', 'eccentric hamstring strength'],
  commonDeficiencies: ['eccentric hamstring strength', 'adductor strength'],
  conditioningPriorities: ['repeated-sprint', 'high-intensity intermittent']
};

export default soccer;
