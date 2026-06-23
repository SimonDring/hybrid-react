// src/lib/sports/gaa.js
/**
 * Gaelic football / hurling (GAA) — SCAFFOLD (Team-package seed, Irish clubs are a
 * target market). Not yet selectable in onboarding; proves zero-core-edit
 * extensibility. First-pass: like soccer (repeated sprint + cutting, hamstring/groin
 * prevention) with added shoulder/grip for the catch and the hurley. Refine with SME.
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const gaa = {
  id: 'gaa',
  label: 'Gaelic football / Hurling',
  power: true,
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  emphasis: { hamstrings: 1.30, glutes: 1.25, quads: 1.15, calves: 1.10, core: 1.20, back: 1.05, shoulders: 1.0, chest: 0.8, biceps: 0.8, triceps: 0.8 },
  priorityExercises: [
    'nordic_curl', 'copenhagen', 'split_squat', 'trap_bar_dl', 'hip_thrust',
    'broad_jump', 'sl_pogo_jump', 'farmer_carry', 'pallof', 'sl_calf'
  ],

  movementDemands: ['repeated sprint', 'cutting/change-of-direction', 'jump/catch', 'overhead strike'],
  injuryPatterns: ['hamstring', 'groin', 'acl', 'ankle'],
  keyMuscles: ['hamstrings', 'glutes', 'adductors', 'quads'],
  performanceDeterminants: ['repeated sprint ability', 'change-of-direction', 'jump power'],
  commonDeficiencies: ['eccentric hamstring strength', 'adductor strength'],
  conditioningPriorities: ['repeated-sprint', 'high-intensity intermittent']
};

export default gaa;
