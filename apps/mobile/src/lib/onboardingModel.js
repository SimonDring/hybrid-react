import { resolvePeriodization, pullupE1RM, profileToAthleteModel, bindingFor } from '@performance-os/engine';

/**
 * onboardingModel — the pure (non-UI) part of onboarding: the answer shape and
 * the mapping from answers → users.profile shape that the engine consumes.
 *
 * The app is strength/gym focused. The plan is ALWAYS a gym plan; the goal forks:
 *   • Build me   → strength_style (strength | bodybuilding | functional)
 *   • Support a sport → sport (run | cycle | swim) + season (in | off), which
 *     biases the strength program (heavier, lower-volume, sport-specific emphasis).
 *
 * Kept separate from OnboardingWizard.jsx (the UI) so it can be unit-tested and
 * reused (the production Onboarding screen + the /dev tester both go through here).
 */

export function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// The pull lift is captured as EITHER max pull-up reps OR a lat-pulldown 1RM (kg).
// Both normalise to a single kg e1RM stored at profile.lifts.pull, so the engine has
// one number to drive vertical-pull working weights + place it on the strength scale.
export function normalizePullToKg(value, mode, bodyweightKg, sex) {
  if (value === '' || value == null) return null;
  if (mode === 'reps') {
    const reps = numOrNull(value);
    return reps ? pullupE1RM(reps, bodyweightKg, sex) : null;
  }
  return numOrNull(value);   // 'kg' → lat-pulldown 1RM entered directly
}

// LOCAL YYYY-MM-DD for a date (defaults to now). Mirrors PlanService.localISO —
// the rest of the engine compares against local dates, so plan_start_date must be
// the local day too. Using toISOString().slice(0,10) here stored the UTC day,
// which near midnight is off by one and made "today's" first session look missed.
export function localISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Map the onboarding "when do you want to start?" choice to a local ISO date.
// 'monday' = the soonest Monday today-or-later. 'date' uses the picked day, clamped
// to today if it's blank/invalid/in the past. Anything unknown → today (so old
// answer seeds with no startWhen keep their previous behaviour).
export function resolveStartDate(option, customDate, now = new Date()) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight today
  if (option === 'tomorrow') { base.setDate(base.getDate() + 1); return localISODate(base); }
  if (option === 'monday') {
    base.setDate(base.getDate() + ((8 - base.getDay()) % 7)); // 0 if today is Monday
    return localISODate(base);
  }
  if (option === 'date') {
    const picked = customDate ? new Date(customDate + 'T00:00:00') : null;
    if (!picked || isNaN(picked.getTime()) || picked < base) return localISODate(base);
    return localISODate(picked);
  }
  return localISODate(base); // 'today' and any unknown/blank value
}

// A complete, empty answer set — every caller seeds from this.
export const BLANK_ANSWERS = {
  name: '', age: '', sex: '', bodyweight_kg: '',
  goalType: '',                 // 'build' | 'sport'
  strengthStyle: 'strength',    // build: 'strength' | 'bodybuilding' | 'functional'
  sport: '',                    // sport: 'run' | 'cycle' | 'swim'
  sportIntent: '',              // 'compete' | 'recreational'
  sportSeason: '',              // compete only: 'in_season' | 'off_season'
  sportGoal: '',                // recreational only: 'build_base' | 'get_stronger' | 'stay_durable'
  runDiscipline: '',            // run only: 'sprint' | 'middle' | 'long'
  sportDays: [],                // sport goals: weekday keys the athlete trains their sport
  eventDate: '',                // optional ISO date YYYY-MM-DD
  experienceLevel: 'intermediate',
  // Five tracked lifts. pull is entered as EITHER max pull-up reps OR a lat-pulldown
  // 1RM (kg) — pullMode says which; normalizePullToKg() converts to a kg e1RM.
  lifts: { squat: '', bench: '', deadlift: '', ohp: '', pull: '' },
  pullMode: 'reps',             // 'reps' (pull-ups) | 'kg' (lat-pulldown 1RM)
  liftsMode: 'known',           // 'known' (enter maxes) | 'test' (quick AMRAP test)
  liftsSource: {},              // per-lift provenance: { [key]: 'entered'|'tested' }
  daysPerWeek: null, days: [],
  startWhen: 'today',           // 'today' | 'tomorrow' | 'monday' | 'date'
  startDate: '',                // ISO YYYY-MM-DD, used only when startWhen === 'date'
  strengthAccess: '',           // legacy access tier — still accepted, superseded by `equipment`
  equipment: [],                // equipment keys: barbell/dumbbell/machine/cable/band/kettlebell/bodyweight
  injuries: [], notes: '',
  skbSport: '',                 // SKB profile id (e.g. 'running_sprint' | 'cycling'); preferred over `sport`
  position: '',                 // SKB position name
  sessionDurationMin: null,     // minutes per session
  resistanceTrainingYears: '',  // measurable training age (years)
  sportYears: '',               // years in the sport
  movementCompetency: {}        // { squat|hinge|press|pull: 'novice'|'intermediate'|'advanced' }
};

// Legacy access tiers → equipment sets (kept so older answer seeds + saved
// profiles still resolve). Mirrors availableEquip() in data/strengthExercises.js.
const TIER_EQUIP = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  home_weights: ['barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight'],
  none: ['bodyweight', 'band']
};

export function answersToProfilePatch(a) {
  // Bridge: a new SKB sport selection derives the legacy engine sport + run discipline. Old
  // answer seeds (goalType+sport+runDiscipline) are untouched, so existing callers + the
  // golden-master are byte-identical.
  const bind = a.skbSport ? bindingFor(a.skbSport) : null;
  const legacySport = bind ? bind.engineSport : a.sport;
  const legacyRunDisc = bind ? (bind.discipline || null) : (a.runDiscipline || null);

  const isBuild = a.goalType === 'build';
  const isSport = a.goalType === 'sport';
  // Prefer the granular equipment array; fall back to the legacy tier for older seeds.
  const equipment = (a.equipment && a.equipment.length)
    ? a.equipment
    : (a.strengthAccess ? (TIER_EQUIP[a.strengthAccess] || []) : []);
  const hasBarbell = equipment.includes('barbell');
  const access = equipment;

  // Five tracked lifts. Barbell lifts (squat/bench/deadlift/ohp) only make sense with a
  // barbell; pull is normalised from reps-or-kg. If nothing was entered we store null
  // (preserves the old "skip" behaviour → resolveLifts estimates from level/bodyweight).
  const bw = numOrNull(a.bodyweight_kg);
  const liftsRaw = {
    squat: hasBarbell ? numOrNull(a.lifts.squat) : null,
    bench: hasBarbell ? numOrNull(a.lifts.bench) : null,
    deadlift: hasBarbell ? numOrNull(a.lifts.deadlift) : null,
    ohp: hasBarbell ? numOrNull(a.lifts.ohp) : null,
    // A 'tested' pull is already a computed kg e1RM (the quick test did the Epley);
    // only the user-entered reps/kg path needs normalising.
    pull: (a.liftsSource && a.liftsSource.pull === 'tested')
      ? numOrNull(a.lifts.pull)
      : normalizePullToKg(a.lifts.pull, a.pullMode, bw, a.sex)
  };
  const anyLift = Object.values(liftsRaw).some(v => v != null);
  const lifts = anyLift ? liftsRaw : null;
  // Provenance per lift: a provided value is 'entered' (or 'tested' if the quick test
  // produced it); a blank is 'estimated' (resolveLifts will fill it in).
  const lifts_source = anyLift
    ? Object.fromEntries(Object.keys(liftsRaw).map(k =>
        [k, liftsRaw[k] != null ? ((a.liftsSource && a.liftsSource[k]) || 'entered') : 'estimated']))
    : null;

  // Sport intent / season / goal (new model). Legacy 'build_base' intent migrates to
  // recreational + build_base goal so old answers + saved profiles still resolve.
  let sportIntent = a.sportIntent || null;
  let sportGoal = a.sportGoal || null;
  if (sportIntent === 'build_base') { sportIntent = 'recreational'; sportGoal = sportGoal || 'build_base'; }
  if (sportIntent === 'recreational' && !sportGoal) sportGoal = 'build_base';
  const sportSeasonKey = a.sportSeason === 'in_season' ? 'in' : a.sportSeason === 'off_season' ? 'off' : null;
  const seasonOut = (isSport && sportIntent === 'compete') ? sportSeasonKey : null;
  const goalOut = (isSport && sportIntent === 'recreational') ? sportGoal : null;

  return {
    plan_start_date: resolveStartDate(a.startWhen, a.startDate),
    plan_weeks: (() => {
      const pseudo = {
        goal_type: a.goalType || null,
        strength_style: isBuild ? (a.strengthStyle || 'strength') : null,
        sport: isSport ? (legacySport || null) : null,
        sport_intent: isSport ? (sportIntent || 'recreational') : null,
        sport_season: seasonOut,
        sport_goal: goalOut,
        event_date: isSport && a.eventDate ? a.eventDate : null,
        run_discipline: isSport && legacySport === 'run' ? (legacyRunDisc || null) : null
      };
      return resolvePeriodization(pseudo).totalWeeks;
    })(),
    name: (a.name || '').trim(), age: numOrNull(a.age), sex: a.sex || null,
    bodyweight_kg: numOrNull(a.bodyweight_kg),

    // Goal model
    goal_type: a.goalType || null,
    focus: ['gym'],                          // the plan is always a gym plan now
    primary: 'gym',
    strength_style: isBuild ? (a.strengthStyle || 'strength') : 'strength',
    sport: isSport ? (legacySport || null) : null,
    sport_intent: isSport ? (sportIntent || 'recreational') : null,
    sport_goal: goalOut,                           // recreational training goal | null
    event_date: isSport && a.eventDate ? a.eventDate : null,
    sport_season: seasonOut,  // 'in' | 'off' | null (compete only); deriveSeason() falls back for recreational
    run_discipline: isSport && legacySport === 'run' ? (legacyRunDisc || null) : null,
    sport_days: isSport ? (a.sportDays || []) : null,

    experience: { gym: a.experienceLevel || 'intermediate' },
    lifts,
    lifts_source,

    availability: {
      days_per_week: a.daysPerWeek,
      days: a.days,
      allocation: { gym: a.daysPerWeek }
    },
    access,
    markers: (a.notes || '').trim(),

    // Endurance-era fields explicitly cleared (no longer captured).
    run_goal: null, swim_goal: null, long_run_day: null, doubles: true,
    pool_length_m: null, goals: [],

    onboarded: true
  };
}

export function answersToInjuries(a) {
  const today = localISODate();
  return (a.injuries || []).filter(i => i.title.trim()).map(inj => ({
    title: inj.title.trim(), body_part: (inj.body_part || '').trim(), status: 'active', date_occurred: today
  }));
}

// Full profile object — what generatePlan() consumes (no separate ranked goals now).
export function answersToProfile(a) {
  return { ...answersToProfilePatch(a), goals: [] };
}

// Onboarding answers → Athlete Model. Routes through the SAME legacy profile mapping so the
// model never diverges from the fields the live engine reads, then (Plan 2) enriches with the
// richer question set. asOf keeps it deterministic/testable.
export function answersToAthleteModelInputs(a, asOf) {
  const profile = answersToProfilePatch(a);
  const model = profileToAthleteModel(profile, asOf);
  model.meta = { ...model.meta, source: 'onboarding' };

  // Overlay the richer question set (fields the legacy profile doesn't carry).
  if (a.skbSport) model.sportingContext.primarySport = a.skbSport;
  if (a.position) model.sportingContext.position = a.position;
  if (a.sessionDurationMin != null && a.sessionDurationMin !== '') {
    model.constraints.sessionDurationMin = Number(a.sessionDurationMin);
  }
  const ry = numOrNull(a.resistanceTrainingYears);
  const sy = numOrNull(a.sportYears);
  if (ry != null) model.trainingHistory.resistanceTrainingYears = ry;
  if (sy != null) model.trainingHistory.sportYears = sy;
  if (a.movementCompetency && typeof a.movementCompetency === 'object') {
    model.trainingHistory.movementCompetency = { ...model.trainingHistory.movementCompetency, ...a.movementCompetency };
  }
  return model;
}
