// src/lib/sports/running.js
/**
 * Running — gym strength support. Sub-disciplines (sprint / middle / long) differ in
 * emphasis, priority work and periodisation; a runner with no declared discipline
 * uses the balanced default below. Evidence: Blagrove 2018 (heavy RT + economy),
 * Petersen/van Dyk (Nordic — conditional, see review §3.5), Berryman 2018 (plyometrics).
 *
 * Values are migrated verbatim from the former program.js maps + periodization.js
 * profiles — behaviour is unchanged (golden-master byte-identical).
 */
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from './_schema.js';

// Run-specific block templates (sprint/middle); seasons not listed fall back to the
// generic SPORT_BLOCKS via the resolver.
const RUN_SPRINT_OFF = { totalWeeks: 6, split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 3 }, { intent: 'peak', weeks: 1 }], deloads: [6] };
const RUN_SPRINT_PRE = { totalWeeks: 4, split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 2 }], deloads: [] };
const RUN_MIDDLE_OFF = { totalWeeks: 10, split: [{ intent: 'base', weeks: 4 }, { intent: 'build', weeks: 4 }, { intent: 'peak', weeks: 2 }], deloads: [4, 8] };

/** @type {import('./_schema.js').SportModule} */
export const running = {
  id: 'run',
  label: 'Running',
  power: true,
  systemicFactor: 0.90,   // high impact + leg overlap → larger gym pullback
  seasonModifiers: DEFAULT_SEASON_VOLUME,
  periodization: SPORT_BLOCKS,            // long + no-discipline use the generic templates

  // Default (no discipline declared) — balanced running-economy support.
  emphasis: { quads: 1.15, hamstrings: 1.25, glutes: 1.20, calves: 1.30, core: 1.20, back: 0.90, shoulders: 0.80, chest: 0.55, biceps: 0.55, triceps: 0.70 },
  priorityExercises: [
    'nordic_curl', 'double_leg_pogo', 'sl_pogo_jump', 'bounding_a_skip',
    'split_squat', 'rdl', 'trap_bar_dl', 'glute_bridge_single_leg',
    'tibialis_raise', 'lateral_band_walk', 'sl_hip_abduction',
    'copenhagen', 'pallof', 'sl_calf', 'sl_hinge', 'step_up'
  ],

  // Descriptive (for future injury/conditioning modules; not yet consumed).
  movementDemands: ['triple extension', 'stiff-spring ground contact', 'hip flexion drive'],
  injuryPatterns: ['hamstring', 'achilles', 'knee', 'shin'],
  keyMuscles: ['hamstrings', 'glutes', 'calves', 'quads'],
  performanceDeterminants: ['running economy', 'maximal sprint power', 'tendon stiffness'],

  byDiscipline: {
    // Sprint (100–400m): power/explosive first. Olympic lifts, plyos, glute power.
    sprint: {
      emphasis: { quads: 1.20, hamstrings: 1.30, glutes: 1.35, calves: 1.20, core: 1.15, back: 1.00, shoulders: 1.10, chest: 0.70, biceps: 0.70, triceps: 0.70 },
      priorityExercises: [
        'hang_clean', 'power_clean', 'depth_jump', 'broad_jump', 'sled_push',
        'back_squat', 'hip_thrust', 'nordic_curl', 'bounding_a_skip',
        'double_leg_pogo', 'sl_pogo_jump', 'split_squat',
        'glute_bridge_single_leg', 'pallof', 'sl_calf'
      ],
      periodization: { off: RUN_SPRINT_OFF, pre: RUN_SPRINT_PRE }   // in/transition → generic
    },
    // Middle distance (800m–5K): mixed economy + speed endurance.
    middle: {
      emphasis: { quads: 1.15, hamstrings: 1.30, glutes: 1.25, calves: 1.20, core: 1.20, back: 0.90, shoulders: 0.80, chest: 0.55, biceps: 0.55, triceps: 0.70 },
      priorityExercises: [
        'nordic_curl', 'split_squat', 'rdl', 'double_leg_pogo', 'sl_pogo_jump',
        'trap_bar_dl', 'step_up', 'lateral_band_walk', 'copenhagen',
        'pallof', 'sl_calf', 'sl_hinge', 'tibialis_raise'
      ],
      periodization: { off: RUN_MIDDLE_OFF }                        // pre/in/transition → generic
    },
    // Long distance (10K+): heavy tendon-loading + injury prevention. No plyos.
    long: {
      emphasis: { quads: 1.10, hamstrings: 1.30, glutes: 1.20, calves: 1.40, core: 1.25, back: 0.90, shoulders: 0.70, chest: 0.45, biceps: 0.50, triceps: 0.65 },
      priorityExercises: [
        'nordic_curl', 'rdl', 'trap_bar_dl', 'split_squat', 'sl_calf',
        'tibialis_raise', 'lateral_band_walk', 'copenhagen', 'pallof',
        'dead_bug', 'sl_hinge', 'glute_bridge_single_leg', 'step_up'
      ]
      // periodization omitted → generic SPORT_BLOCKS (matches the prior "long falls through")
    }
  }
};

export default running;
