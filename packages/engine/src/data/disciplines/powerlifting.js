// Powerlifting discipline module (WP-49 Plan 1). Demand vector, priority lifts, periodisation,
// dose character, and accessory patterns per docs/superpowers/specs/2026-07-07-build-discipline-
// engine-design.md §2.2. Seed content drafted from standard powerlifting S&C practice
// (Rippetoe/RTS/Sheiko lineage); ships needsReview:false per Simon's 2026-07-07 approval (§9.1) —
// treated as accepted for v1.
//
// Lead quality (maxStrength 1.0) is definitional — evidence:'goal'. Supporting weights
// (hypertrophy/robustness/stability/mobility) are coaching judgement, confidence:'low',
// needsReview:true — they inform emphasis but are not load-bearing the way the lead is.
export default {
  id: 'powerlifting',
  label: 'Powerlifting',
  demand: {
    maxStrength: 1.0,     // definitional — the competition lift is 1RM strength, full stop.
    hypertrophy: 0.6,     // CSA base: more muscle raises the strength ceiling.
    robustness: 0.5,      // durability under near-maximal axial/joint load across a long block.
    stability: 0.4,       // bracing/positional control under the bar (squat/bench/deadlift setup).
    mobility: 0.35,        // enough hip/ankle/shoulder ROM to hit competition depth/rack positions.
  },
  // Competition lifts + their most common variant/weak-point accessories. Ordered: competition
  // lifts first, then variants used to attack sticking points.
  priorityLifts: [
    'back_squat', 'bench', 'deadlift',
    'front_squat', 'pause_squat', 'box_squat', 'pin_squat',
    'close_grip_bench', 'board_press', 'floor_press',
    'deficit_deadlift', 'rack_pull',
  ],
  periodization: {
    // Build has no season; 'off' is the default full development macrocycle: accumulation →
    // intensification → peak/taper.
    off: {
      totalWeeks: 12,
      split: [
        { intent: 'base', weeks: 4 },
        { intent: 'build', weeks: 6 },
        { intent: 'peak', weeks: 2 },
      ],
      deloads: [4, 9],
    },
    // Meet-date overlay (reuses the proven event taper: volume down, intensity held).
    pre: {
      totalWeeks: 6,
      split: [
        { intent: 'build', weeks: 4 },
        { intent: 'peak', weeks: 2 },
      ],
      deloads: [4],
    },
    in: {
      totalWeeks: 4,
      split: [{ intent: 'peak', weeks: 4 }],
      deloads: [],
    },
    transition: {
      totalWeeks: 4,
      split: [{ intent: 'base', weeks: 4 }],
      deloads: [],
    },
  },
  doseCharacter: {
    main: { reps: '1-5', rpe: 'RPE 7-9', restSec: 180 },
    accessory: { reps: '6-10', rpe: 'RPE 7-8', restSec: 120 },
  },
  // Weak-point pattern model: attack the lagging competition lift with its own variant, then
  // shore up the chain that supports it.
  accessoryPatterns: ['weak_lift_variant', 'posterior_chain', 'pressing_support'],
  provenance: {
    source: 'standard powerlifting practice (Rippetoe/RTS/Sheiko lineage)',
    evidenceLevel: 'L5',
    needsReview: false,
  },
};
