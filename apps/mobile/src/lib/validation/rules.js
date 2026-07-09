/**
 * rules — the single, tunable source of truth for input limits. Numbers are [min, max];
 * `int:true` requires a whole number. Enum lists mirror the values the UI already offers.
 * Text caps are max character lengths.
 *
 * `sport` is DERIVED from the engine's sport binding (not hand-listed) so it can never drift
 * behind a newly-bound flagship sport — the drift that rejected triathlon + the team sports on
 * onboarding save as "not a recognised value" (2026-07-09).
 */
import { ENGINE_SPORT_IDS } from '@performance-os/engine';

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
  sport:          ENGINE_SPORT_IDS,                           // derived: run/cycle/swim/gaa/rugby/soccer/triathlon
  sport_intent:   ['compete', 'recreational', 'build_base'],   // 'build_base' kept for legacy profiles (migrated to recreational on read)
  sport_season:   ['in', 'off'],                               // compete only (engine season keys)
  sport_goal:     ['build_base', 'get_stronger', 'stay_durable'], // recreational training goal
  run_discipline: ['sprint', 'middle', 'long'],
  experience:     ['beginner', 'returning', 'intermediate', 'advanced'],
  equipment:      ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  injury_status:  ['active', 'rehabbing', 'recovered', 'monitoring'],
};

export const TEXT_MAX = {
  name: 80, title: 120, notes: 2000, description: 2000,
  rehab_plan: 2000, prevention_notes: 2000, markers: 2000,
};
