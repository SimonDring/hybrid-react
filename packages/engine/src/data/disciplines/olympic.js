// Olympic weightlifting discipline module (WP-49 Plan 1). Demand vector, priority lifts,
// periodisation, dose character, and accessory patterns per docs/superpowers/specs/2026-07-07-
// build-discipline-engine-design.md §2.2. Seed content drafted from standard Olympic-weightlifting
// S&C practice; ships needsReview:false per Simon's 2026-07-07 approval (§9.1) — treated as
// accepted for v1.
//
// Lead quality (explosiveStrength 1.0) is definitional — evidence:'goal'. Supporting weights
// (maxStrength/mobility/stability) are coaching judgement, confidence:'low', needsReview:true —
// mobility is weighted unusually high because overhead/squat positions gate everything else.
//
// Competency note: priorityLifts lists the full classic lifts (snatch, clean_and_jerk, etc.) plus
// their power/hang/pull derivatives. The full classic lifts carry technical-skill demands that
// require minLevel:'intermediate' semantics (mirrors the existing minLevelForPrimary competency
// gate already present on these exercise entries in strengthExercises.js — see snatch/
// clean_and_jerk/power_snatch/hang_snatch/split_jerk/overhead_squat, all minLevelForPrimary:
// 'advanced', and push_press/snatch_pull/clean_pull/muscle_snatch at 'intermediate'). Plan 1 only
// RECORDS this list; the competency gate that enforces it at selection time is wired in Plan 2
// (the flip, per design spec §4 step 6 and §9.2).
export default {
  id: 'olympic',
  label: 'Olympic Weightlifting',
  demand: {
    explosiveStrength: 1.0, // definitional — the classic lifts are a rate-of-force-development sport.
    maxStrength: 0.8,       // strength underpins the lifts (a bigger squat/pull raises the ceiling).
    mobility: 0.7,          // weighted unusually high: overhead/squat positions gate everything.
    stability: 0.5,         // positional control catching/receiving the bar overhead and in the hole.
  },
  // Classic lifts + derivatives, ordered: full classic lifts first (competency-gated, see note
  // above), then the power/hang variants beginners use to build toward them, then the squat/press
  // positions and pulling-strength accessories that support the lifts.
  priorityLifts: [
    'snatch', 'clean_and_jerk',
    'power_snatch', 'hang_snatch', 'muscle_snatch', 'split_jerk',
    'hang_clean', 'power_clean',
    'front_squat', 'overhead_squat', 'push_press',
    'snatch_pull', 'clean_pull',
  ],
  periodization: {
    // Build has no season; 'off' is the default full development macrocycle: technical-power work
    // paired with an underlying strength block, with frequent classic-lift exposure throughout.
    off: {
      totalWeeks: 12,
      split: [
        { intent: 'base', weeks: 4 },
        { intent: 'build', weeks: 6 },
        { intent: 'peak', weeks: 2 },
      ],
      deloads: [4, 9],
    },
    // Meet-date overlay (reuses the proven event taper: volume down, intensity/technical
    // frequency held).
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
    main: { reps: '1-3', rpe: 'RPE 7-8', restSec: 180 },
    accessory: { reps: '3-6', rpe: 'RPE 7-8', restSec: 120 },
  },
  // Diagnosis targets mobility / leg strength / the weaker classic lift: positions (overhead/
  // front-squat mobility and stability), pulling strength (snatch/clean pull derivatives), and
  // overhead stability (jerk/push-press receiving position).
  accessoryPatterns: ['positions', 'pulling_strength', 'overhead_stability'],
  provenance: {
    source: 'standard Olympic-weightlifting S&C practice',
    evidenceLevel: 'L5',
    needsReview: false,
  },
};
