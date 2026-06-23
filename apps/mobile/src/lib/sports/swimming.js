// src/lib/sports/swimming.js
/**
 * Swimming — gym strength support. Lat/back + scapular & rotator-cuff health address
 * the ER:IR deficit (Batalha 2012/2015); core for streamline. Generic dry-land
 * strength transfers best when swim-specific (Crowley 2017). Values migrated verbatim
 * from the former program.js maps (behaviour unchanged).
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

/** @type {import('./_schema.js').SportModule} */
export const swimming = {
  id: 'swim',
  label: 'Swimming',
  power: true,
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,

  emphasis: { back: 1.3, shoulders: 1.25, triceps: 1.15, biceps: 1.1, core: 1.2, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5 },
  priorityExercises: [
    'face_pull', 'band_face_pull', 'sl_ext_rotation', 'cable_ext_rotation_90',
    'reverse_pec_deck', 'prone_y_raise', 'prone_t_raise', 'prone_w_raise',
    'serratus_punch_cable', 'serratus_wall_slide', 'band_pull_apart',
    'straight_arm_pd', 'lat_pulldown', 'cable_woodchop',
    'hip_thrust', 'cable_woodchop', 'glute_ham_raise', 'plank', 'side_plank'
  ],

  movementDemands: ['repeated shoulder internal rotation', 'streamline trunk stiffness'],
  injuryPatterns: ['shoulder'],
  keyMuscles: ['back', 'shoulders', 'core'],
  performanceDeterminants: ['lat pull power', 'shoulder health (ER:IR)', 'core stiffness']
};

export default swimming;
