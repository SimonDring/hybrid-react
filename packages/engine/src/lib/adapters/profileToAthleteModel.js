// Builds an Athlete Model from an existing legacy users.profile (for existing users, and as
// the source side of the round-trip golden master). Preserves everything the engine reads.
import { buildAthleteModel } from '../athlete/buildAthleteModel.js';
import { legacyToOutcome } from './goalMapping.js';
import { skbSportIdOf } from '../sportKnowledge/index.js';

export function profileToAthleteModel(profile = {}, asOf) {
  const p = profile || {};
  const outcome = legacyToOutcome(p.goal_type, p.strength_style, p.sport);

  // The dual-written stored model rides the profile (users.profile.athlete_model — the
  // #94/#101 pattern). Fields the legacy profile can't carry are read from it below so every
  // read path (plan, reflow, Atlas) sees them. Absent model → identical output to before.
  const am = p.athlete_model || {};
  const amSc = am.sportingContext || {};
  const amTh = am.trainingHistory || {};
  const storedMetrics = Array.isArray(am.performanceMetrics) ? am.performanceMetrics : [];

  const performanceMetrics = [];
  const L = p.lifts || {};
  for (const [k, metric] of [['squat', '1rm_squat'], ['bench', '1rm_bench'], ['deadlift', '1rm_deadlift'],
                             ['ohp', '1rm_ohp'], ['pull', '1rm_pull']]) {
    if (L[k] == null) continue;
    // A stored metric's measuredAt is trusted only while the profile value still matches it —
    // a changed 1RM means re-measured at an unknown date (honestly null).
    const stored = storedMetrics.find((m) => m && m.metric === metric && m.value === L[k]);
    performanceMetrics.push({ id: metric, metric, value: L[k], unit: 'kg', source: 'self', confidence: 'moderate',
                              measuredAt: (stored && stored.measuredAt) || null });
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
      primarySport: skbSportIdOf(p),
      position: amSc.position || null,
      seasonPhase: p.sport_season || null,
      competitionCalendar: p.event_date ? [{ label: 'event', date: p.event_date }] : [],
      weeklySportSchedule,
    },
    trainingHistory: {
      selfRatedLevel: (p.experience && p.experience.gym) || null,
      resistanceTrainingYears: amTh.resistanceTrainingYears ?? null,
      sportYears: amTh.sportYears ?? null,
    },
    constraints: {
      equipment: p.access || [],
      availableDays: (p.availability && p.availability.days) || [],
      daysPerWeek: (p.availability && p.availability.days_per_week) ?? null,
      // Resolved-injury history rides the dual-written model on the profile (synced by
      // AthleteModelService.syncInjuryHistory) — it feeds the D4 injuryRisk seam (WP-36).
      injuryHistory: (p.athlete_model && p.athlete_model.constraints && p.athlete_model.constraints.injuryHistory) || [],
    },
    performanceMetrics,
    meta: { source: 'migration', planStartDate: p.plan_start_date || null, enginePassthrough },
  };
  return buildAthleteModel(inputs, asOf);
}
