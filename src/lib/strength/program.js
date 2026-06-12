/**
 * program — resolves a user's GOAL into the parameters the gym engine programs to.
 * Single source of truth read by targets.js (volume) and the allocator (selection).
 *
 * Returns:
 *   { goalType, style, emphasis:{muscle:×}, volumeScalar, power, sport, season, level,
 *     exercisePriority: string[] }
 *   - exercisePriority  ordered exercise IDs that score ×1.35 in the allocator.
 *     Based on the strongest evidence for each goal (see design spec 2026-06-12).
 */

const SPORT_EMPHASIS = {
  run:   { quads: 1.15, hamstrings: 1.25, glutes: 1.2, calves: 1.3, core: 1.2, back: 0.9, shoulders: 0.8, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  cycle: { quads: 1.3, glutes: 1.25, hamstrings: 1.15, calves: 1.0, core: 1.15, back: 0.9, shoulders: 0.7, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  swim:  { back: 1.3, shoulders: 1.25, triceps: 1.15, biceps: 1.1, core: 1.2, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5 }
};

// Science-backed priority lists.
// Run: Blagrove 2018 (heavy RT + economy), Petersen 2011 (nordic), Berryman 2018 (plyos).
// Cycle: Rønnestad 2010/2015 (SL strength, posterior chain), hip stability for Q-angle.
// Swim: Batalha 2012/2015 (ER:IR ratio deficit), shoulder health, lat/core.
// Hypertrophy (RP / Israetel): stretched-position isolation, compounds near MRV.
// Strength: competition lifts + close variants.
// Functional: Janda crossed syndromes, McGill spine, desk-job counterbalance.
const SPORT_PRIORITY = {
  run: [
    'nordic_curl', 'double_leg_pogo', 'sl_pogo_jump', 'bounding_a_skip',
    'split_squat', 'rdl', 'trap_bar_dl', 'glute_bridge_single_leg',
    'tibialis_raise', 'lateral_band_walk', 'sl_hip_abduction',
    'copenhagen', 'pallof', 'sl_calf', 'sl_hinge', 'step_up'
  ],
  cycle: [
    'sl_leg_press', 'split_squat', 'hip_thrust', 'glute_bridge_single_leg',
    'lateral_band_walk', 'rdl', 'sl_hinge', 'goblet_squat',
    'copenhagen', 'thoracic_foam_roller', 'hip_flexor_90_90',
    'prone_hip_extension', 'pallof'
  ],
  swim: [
    'face_pull', 'band_face_pull', 'sl_ext_rotation', 'cable_ext_rotation_90',
    'reverse_pec_deck', 'prone_y_raise', 'prone_t_raise', 'prone_w_raise',
    'serratus_punch_cable', 'serratus_wall_slide', 'band_pull_apart',
    'straight_arm_pd', 'lat_pulldown', 'cable_woodchop',
    'hip_thrust', 'cable_woodchop', 'glute_ham_raise', 'plank', 'side_plank'
  ]
};

const GOAL_PRIORITY = {
  bodybuilding: [
    'incline_db_curl', 'spider_curl', 'overhead_cable_ext', 'low_high_cable_fly',
    'seated_leg_curl', 'heel_elevated_goblet', 'reverse_pec_deck',
    'prone_y_raise', 'prone_t_raise', 'prone_w_raise', 'db_pullover',
    'leg_curl', 'leg_ext', 'chest_fly', 'lateral_raise', 'rear_fly',
    'biceps_curl', 'triceps_pushdown', 'overhead_ext'
  ],
  strength: [
    'back_squat', 'deadlift', 'bench', 'pause_squat', 'rack_pull',
    'deficit_deadlift', 'jm_press', 'close_grip_bench', 'floor_press',
    'barbell_row', 'ohp', 'trap_bar_dl', 'front_squat', 'hip_thrust',
    'farmer_carry', 'ab_wheel', 'seated_box_jump'
  ],
  functional: [
    'bird_dog', 'dead_bug', 'pallof', 'side_plank', 'ab_wheel',
    'suitcase_carry', 'farmer_carry', 'split_squat', 'step_up',
    'serratus_wall_slide', 'serratus_punch_cable', 'half_kneeling_pallof',
    'tall_kneeling_landmine', 'seated_box_jump', 'bounding_a_skip',
    'hip_flexor_90_90', 'glute_bridge_activation', 'band_pull_apart',
    'thoracic_foam_roller', 'prone_hip_extension'
  ]
};

function gymLevel(profile) {
  const e = profile.experience || {};
  return e.gym || e.strength_functional || e.strength_physique || 'intermediate';
}

export function resolveProgram(profile = {}) {
  const level = gymLevel(profile);
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const season = profile.sport_season || 'off';
    return {
      goalType: 'sport', style: 'sport',
      emphasis: SPORT_EMPHASIS[sport] || {},
      volumeScalar: season === 'in' ? 0.6 : 1.0,
      power: true, sport, season, level,
      exercisePriority: SPORT_PRIORITY[sport] || []
    };
  }

  let style = profile.strength_style;
  if (!style) style = (profile.focus || []).includes('strength_physique') ? 'bodybuilding' : 'functional';
  if (!['strength', 'bodybuilding', 'functional'].includes(style)) style = 'strength';

  const emphasis = {};
  if (style === 'bodybuilding') { emphasis.shoulders = 1.1; emphasis.biceps = 1.1; emphasis.triceps = 1.1; }
  if (style === 'functional') { emphasis.core = 1.2; }

  return {
    goalType: 'build', style, emphasis, volumeScalar: 1.0, power: style === 'functional',
    sport: null, season: null, level,
    exercisePriority: GOAL_PRIORITY[style] || []
  };
}

export default { resolveProgram };
