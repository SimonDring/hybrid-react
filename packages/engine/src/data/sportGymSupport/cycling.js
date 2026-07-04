// src/lib/sports/cycling.js
/**
 * Cycling — gym strength support. Heavy max-strength + single-leg work improves
 * cycling economy (Rønnestad & Sunde 2010); hip stability addresses Q-angle.
 * Values migrated verbatim from the former program.js maps (behaviour unchanged).
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const cycling = {
  id: 'cycle',
  label: 'Cycling',
  power: true,
  systemicFactor: 0.95,   // moderate leg load → mild extra gym pullback
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  emphasis: { quads: 1.3, glutes: 1.25, hamstrings: 1.15, calves: 1.0, core: 1.15, back: 0.9, shoulders: 0.7, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  priorityExercises: [
    'sl_leg_press', 'split_squat', 'hip_thrust', 'glute_bridge_single_leg',
    'lateral_band_walk', 'rdl', 'sl_hinge', 'goblet_squat',
    'copenhagen', 'thoracic_foam_roller', 'hip_flexor_90_90',
    'prone_hip_extension', 'pallof'
  ],

  movementDemands: ['sustained hip/knee extension', 'fixed posture trunk endurance'],
  injuryPatterns: ['knee', 'low_back'],
  keyMuscles: ['quads', 'glutes', 'hamstrings'],
  performanceDeterminants: ['maximal leg strength', 'cycling economy', 'hip stability']
};

export default cycling;
