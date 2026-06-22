/**
 * rules — the single, tunable source of truth for input limits. Pure data.
 * Numbers are [min, max]; `int:true` requires a whole number. Enum lists mirror
 * the values the UI already offers. Text caps are max character lengths.
 */
export const LIMITS = {
  age:                { min: 13, max: 120, int: true },
  bodyweight_kg:      { min: 30, max: 300 },
  lift:               { min: 0,  max: 500 },          // squat / bench / deadlift / ohp / pull (kg e1RM)
  pullupReps:         { min: 0,  max: 100, int: true }, // max pull-up reps (UI-side, before → kg e1RM)
  daysPerWeek:        { min: 1,  max: 7, int: true },
  rating:             { min: 1,  max: 5, int: true }, // quality/energy/recovery/soreness/mood/severity
  rpe:                { min: 1,  max: 10 },
  resting_hr:         { min: 30, max: 220 },
  hrv_ms:             { min: 1,  max: 400 },
  spo2_pct:           { min: 50, max: 100 },
  sleep_score:        { min: 0,  max: 100 },
  sleep_duration_min: { min: 0,  max: 1440 },
};

export const SESSION_MINUTES = [20, 30, 45, 60, 75, 90];

export const ENUMS = {
  goal_type:      ['build', 'sport'],
  strength_style: ['strength', 'bodybuilding', 'functional'],
  sport:          ['run', 'cycle', 'swim'],
  sport_intent:   ['compete', 'recreational', 'build_base'],
  run_discipline: ['sprint', 'middle', 'long'],
  experience:     ['beginner', 'returning', 'intermediate', 'advanced'],
  equipment:      ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  injury_status:  ['active', 'rehabbing', 'recovered', 'monitoring'],
};

export const TEXT_MAX = {
  name: 80, title: 120, notes: 2000, description: 2000,
  rehab_plan: 2000, prevention_notes: 2000, markers: 2000,
};
