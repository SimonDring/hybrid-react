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

import { deriveSeason } from '../plan/periodization.js';
import { getGymLevel } from '../Utils.js';
import sports from '../sports/index.js';
import { DEFAULT_SEASON_VOLUME } from '../sports/_schema.js';

// Sport emphasis vectors, priority-exercise lists and season volume scalars now live
// in the pluggable sport modules (src/lib/sports/) behind a registry — adding a sport
// no longer touches this file. The build-style priority lists stay here (below).
//
// Build-style priority lists (science-backed):
//   Hypertrophy (RP / Israetel): stretched-position isolation, compounds near MRV.
//   Strength: competition lifts + close variants.
//   Functional: Janda crossed syndromes, McGill spine, desk-job counterbalance.
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

export function resolveProgram(profile = {}) {
  // Programme resolution defaults an unset experience to 'intermediate'.
  const level = getGymLevel(profile, 'intermediate');
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const mod = sports.get(sport);   // undefined for an unknown sport → generic defaults
    // Season: an explicit override wins, else derive from event date / intent.
    const season = profile.sport_season || deriveSeason(profile) || 'off';
    // Run sub-disciplines (sprint/middle/long) override the module's defaults.
    const disc = sport === 'run' ? profile.run_discipline : null;
    const byD = disc && mod && mod.byDiscipline ? mod.byDiscipline[disc] : null;
    return {
      goalType: 'sport', style: 'sport',
      emphasis: (byD && byD.emphasis) || (mod && mod.emphasis) || {},
      volumeScalar: ((mod && mod.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0,
      power: mod ? !!mod.power : true, sport, season, level,
      exercisePriority: (byD && byD.priorityExercises) || (mod && mod.priorityExercises) || []
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
