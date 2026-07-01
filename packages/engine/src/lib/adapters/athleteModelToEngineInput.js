// Maps the Athlete Model back to exactly the profile fields generatePlan reads (the engine
// read-set). Proven byte-identical to the legacy path by the adapter golden-master test.
// This adapter is NOT in the live path this sprint — it exists to prove the model can drive
// the engine.
import { OUTCOME_TO_LEGACY } from './goalMapping.js';

const LEVELS = new Set(['beginner', 'returning', 'intermediate', 'advanced']);

export function athleteModelToEngineInput(model) {
  model = model || {}; // never throw on a null/partial model
  const goals = [...(model.goals || [])].sort((a, b) => (a.priority || 1) - (b.priority || 1));
  const primary = goals[0] || { outcome: 'get_stronger' };
  const legacy = OUTCOME_TO_LEGACY[primary.outcome] || OUTCOME_TO_LEGACY.get_stronger;
  const isSport = legacy.goal_type === 'sport';

  const sc = model.sportingContext || {};
  const th = model.trainingHistory || {};
  const cn = model.constraints || {};
  const id = model.identity || {};
  const pass = (model.meta && model.meta.enginePassthrough) || {};

  const gym = LEVELS.has(th.selfRatedLevel) ? th.selfRatedLevel : 'intermediate';

  // 1RM metrics → lifts
  const metric = (name) => {
    const m = (model.performanceMetrics || []).find((x) => x.metric === name && x.value > 0);
    return m ? m.value : null;
  };
  const lifts = {
    squat: metric('1rm_squat'), bench: metric('1rm_bench'),
    deadlift: metric('1rm_deadlift'), ohp: metric('1rm_ohp'), pull: metric('1rm_pull'),
  };
  const anyLift = Object.values(lifts).some((v) => v != null);

  const event = (sc.competitionCalendar && sc.competitionCalendar[0]) ? sc.competitionCalendar[0].date : null;
  const sportDays = (sc.weeklySportSchedule || []).map((s) => s.day);
  // pure scheduling passthroughs (e.g. plan_weeks); sport-shape passthroughs are read explicitly below
  const passExtras = { ...pass };
  delete passExtras.sport_intent; delete passExtras.sport_goal; delete passExtras.run_discipline;

  return {
    age: id.age ?? null,
    sex: id.biologicalSex ?? null,
    bodyweight_kg: id.bodyMassKg ?? null,

    goal_type: legacy.goal_type,
    strength_style: legacy.strength_style,
    focus: ['gym'], primary: 'gym',

    sport: isSport ? (sc.primarySport || primary.sportRef || null) : null,
    sport_intent: isSport ? (pass.sport_intent || 'recreational') : null,
    sport_goal: isSport ? (pass.sport_goal || null) : null,
    sport_season: isSport ? (sc.seasonPhase || null) : null,
    run_discipline: isSport && (sc.primarySport === 'run') ? (pass.run_discipline || null) : null,
    event_date: isSport ? event : null,
    sport_days: isSport ? sportDays : null,

    experience: { gym },
    lifts: anyLift ? lifts : null,

    availability: { days_per_week: cn.daysPerWeek ?? null, days: cn.availableDays || [],
                    allocation: { gym: cn.daysPerWeek ?? null } },
    access: cn.equipment || [],

    plan_start_date: (model.meta && model.meta.planStartDate) || null,
    ...passExtras,
  };
}
