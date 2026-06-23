// src/lib/sports/rugby.js
/**
 * Rugby — SCAFFOLD (Team-package seed). Not yet selectable in onboarding; included to
 * prove a new sport plugs in with zero core-engine edits. Emphasis/priority are a
 * sensible first pass (collision sport: max-strength + power, posterior chain, neck/
 * shoulder robustness, groin/hamstring prevention) — to be refined with a sport SME.
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const rugby = {
  id: 'rugby',
  label: 'Rugby',
  power: true,
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  emphasis: { glutes: 1.25, hamstrings: 1.25, quads: 1.15, back: 1.20, shoulders: 1.15, chest: 1.0, core: 1.20, triceps: 0.9, biceps: 0.9, calves: 0.9 },
  priorityExercises: [
    'power_clean', 'hang_clean', 'back_squat', 'trap_bar_dl', 'hip_thrust',
    'nordic_curl', 'copenhagen', 'broad_jump', 'farmer_carry', 'pallof', 'ab_wheel'
  ],

  movementDemands: ['repeated sprint', 'collision/tackle', 'scrum/maul push'],
  injuryPatterns: ['hamstring', 'acl', 'shoulder', 'groin'],
  keyMuscles: ['glutes', 'hamstrings', 'back', 'quads'],
  performanceDeterminants: ['maximal strength', 'repeated sprint ability', 'collision tolerance'],
  commonDeficiencies: ['eccentric hamstring strength', 'adductor strength'],
  conditioningPriorities: ['repeated-sprint', 'high-intensity intermittent']
};

export default rugby;
