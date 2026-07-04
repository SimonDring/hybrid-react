// Builds an Athlete Model from an existing legacy users.profile (for existing users, and as
// the source side of the round-trip golden master). Preserves everything the engine reads.
import { buildAthleteModel } from '../athlete/buildAthleteModel.js';
import { legacyToOutcome } from './goalMapping.js';
import { skbSportIdFor } from '../sportKnowledge/index.js';

// Legacy engine sport (+ run discipline) → SKB profile id. ONE derivation, shared with the
// reflow decision rules (sportKnowledge/index.js skbSportIdFor): running splits by
// discipline, defaulting to running_middle when none was stated (deliberate 2026-07-04).
const toSkbSportId = skbSportIdFor;

export function profileToAthleteModel(profile = {}, asOf) {
  const p = profile || {};
  const outcome = legacyToOutcome(p.goal_type, p.strength_style, p.sport);

  const performanceMetrics = [];
  const L = p.lifts || {};
  for (const [k, metric] of [['squat', '1rm_squat'], ['bench', '1rm_bench'], ['deadlift', '1rm_deadlift'],
                             ['ohp', '1rm_ohp'], ['pull', '1rm_pull']]) {
    if (L[k] != null) performanceMetrics.push({ id: metric, metric, value: L[k], unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: null });
  }

  const sportDays = Array.isArray(p.sport_days) ? p.sport_days : [];
  const weeklySportSchedule = sportDays.map((day) => ({ day, type: 'sport' }));

  // Sport-shape values the live engine reads but that Plan 1 does not yet model first-class
  // (Plan 2 promotes them to outcome goals / competitive level) travel as an explicit bridge.
  const enginePassthrough = {};
  if (p.plan_weeks != null) enginePassthrough.plan_weeks = p.plan_weeks;
  if (p.sport_intent != null) enginePassthrough.sport_intent = p.sport_intent;
  if (p.sport_goal != null) enginePassthrough.sport_goal = p.sport_goal;
  if (p.run_discipline != null) enginePassthrough.run_discipline = p.run_discipline;
  if (p.sport != null) enginePassthrough.sport = p.sport;

  const inputs = {
    identity: { age: p.age ?? null, biologicalSex: p.sex ?? null, bodyMassKg: p.bodyweight_kg ?? null, heightCm: p.height_cm ?? null },
    goals: [{ id: 'primary', outcome, priority: 1, sportRef: p.sport || null }],
    sportingContext: {
      primarySport: toSkbSportId(p.sport, p.run_discipline),
      seasonPhase: p.sport_season || null,
      competitionCalendar: p.event_date ? [{ label: 'event', date: p.event_date }] : [],
      weeklySportSchedule,
    },
    trainingHistory: { selfRatedLevel: (p.experience && p.experience.gym) || null },
    constraints: {
      equipment: p.access || [],
      availableDays: (p.availability && p.availability.days) || [],
      daysPerWeek: (p.availability && p.availability.days_per_week) ?? null,
    },
    performanceMetrics,
    meta: { source: 'migration', planStartDate: p.plan_start_date || null, enginePassthrough },
  };
  return buildAthleteModel(inputs, asOf);
}
