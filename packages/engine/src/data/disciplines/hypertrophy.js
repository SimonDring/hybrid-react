// Hypertrophy discipline module (WP-49 Plan 1). Demand vector, priority lifts, periodisation,
// dose character, and accessory patterns per docs/superpowers/specs/2026-07-07-build-discipline-
// engine-design.md §2.2. Seed content drafted from standard bodybuilding/hypertrophy S&C practice;
// ships needsReview:false per Simon's 2026-07-07 approval (§9.1) — treated as accepted for v1.
//
// Lead quality (hypertrophy 1.0) is definitional — evidence:'goal'. Supporting weights
// (maxStrength/strengthEndurance/robustness/mobility) are coaching judgement, confidence:'low',
// needsReview:true. Diagnosis targets lagging MUSCLE GROUPS; the volume ledger (MEV→MAV→MRV)
// remains the downstream accountant that stays central for this discipline.
export default {
  id: 'hypertrophy',
  label: 'Hypertrophy',
  demand: {
    hypertrophy: 1.0,       // definitional — the goal IS muscle growth.
    maxStrength: 0.6,       // progressive tension overload underpins growth stimulus.
    strengthEndurance: 0.4, // higher-volume, shorter-rest work capacity across a session.
    robustness: 0.45,       // durability across a high-frequency, high-volume training week.
    mobility: 0.35,          // full-ROM / lengthened-position access to maximise stimulus per rep.
  },
  // Balanced compound + isolation set spanning every major muscle group (squat/hinge/push/pull +
  // per-muscle isolation), so the diagnosis has a real lift to target for whichever muscle lags.
  priorityLifts: [
    // compounds — lower body
    'back_squat', 'front_squat', 'deadlift', 'rdl', 'hip_thrust', 'split_squat',
    // compounds — upper body push/pull
    'bench', 'incline_bench', 'ohp', 'barbell_row', 'pullup', 'lat_pulldown',
    // isolation — arms/shoulders/chest
    'lateral_raise', 'rear_fly', 'biceps_curl', 'triceps_pushdown', 'chest_fly', 'leg_curl', 'leg_ext', 'calf_raise',
  ],
  periodization: {
    // Build has no season; 'off' is the default full development macrocycle: volume
    // accumulation ramping toward MRV, then a deload.
    off: {
      totalWeeks: 10,
      split: [
        { intent: 'base', weeks: 3 },
        { intent: 'build', weeks: 7 },   // WP-49 T4c: was 6 — split now sums to totalWeeks (10); deload@10 in range
      ],
      deloads: [5, 10],
    },
    // Hypertrophy athletes don't compete, but accept the same shape if a physique-event date is
    // entered (reuses the proven event taper).
    pre: {
      totalWeeks: 6,
      split: [
        { intent: 'build', weeks: 5 },
      ],
      deloads: [5],
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
    main: { reps: '6-12', rpe: 'RPE 7-8', restSec: 90 },
    accessory: { reps: '10-15', rpe: 'RPE 7-9', restSec: 60 },
  },
  // Per-muscle MEV→MAV balance is the supporting-work model: the diagnosis finds the lagging
  // muscle group(s); accessories fill toward that muscle's landmark, biased toward the
  // lengthened-position stimulus this discipline favours.
  accessoryPatterns: ['muscle_balance', 'lengthened_position_bias', 'isolation_finisher'],
  provenance: {
    source: 'standard bodybuilding/hypertrophy S&C practice',
    evidenceLevel: 'L5',
    needsReview: false,
  },
};
