import { resolvePeriodization } from './plan/periodization.js';

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

// LOCAL YYYY-MM-DD for a date (defaults to now). Mirrors PlanService.localISO —
// the rest of the engine compares against local dates, so plan_start_date must be
// the local day too. Using toISOString().slice(0,10) here stored the UTC day,
// which near midnight is off by one and made "today's" first session look missed.
export function localISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A complete, empty answer set — every caller seeds from this.
export const BLANK_ANSWERS = {
  name: '', age: '', sex: '', bodyweight_kg: '',
  goalType: '',                 // 'build' | 'sport'
  strengthStyle: 'strength',    // build: 'strength' | 'bodybuilding' | 'functional'
  sport: '',                    // sport: 'run' | 'cycle' | 'swim'
  sportIntent: '',              // 'compete' | 'recreational' | 'build_base'
  runDiscipline: '',            // run only: 'sprint' | 'middle' | 'long'
  eventDate: '',                // optional ISO date YYYY-MM-DD
  experienceLevel: 'intermediate',
  lifts: { squat: '', bench: '', deadlift: '' },
  daysPerWeek: null, sessionMinutes: 60, days: [],
  strengthAccess: '',           // legacy access tier — still accepted, superseded by `equipment`
  equipment: [],                // equipment keys: barbell/dumbbell/machine/cable/band/kettlebell/bodyweight
  injuries: [], notes: ''
};

// Legacy access tiers → equipment sets (kept so older answer seeds + saved
// profiles still resolve). Mirrors availableEquip() in data/strengthExercises.js.
const TIER_EQUIP = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  home_weights: ['barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight'],
  none: ['bodyweight', 'band']
};

export function answersToProfilePatch(a) {
  const today = localISODate();
  const isBuild = a.goalType === 'build';
  const isSport = a.goalType === 'sport';
  // Prefer the granular equipment array; fall back to the legacy tier for older seeds.
  const equipment = (a.equipment && a.equipment.length)
    ? a.equipment
    : (a.strengthAccess ? (TIER_EQUIP[a.strengthAccess] || []) : []);
  const hasBarbell = equipment.includes('barbell');
  const access = equipment;

  return {
    plan_start_date: today,
    plan_weeks: (() => {
      const pseudo = {
        goal_type: a.goalType || null,
        strength_style: isBuild ? (a.strengthStyle || 'strength') : null,
        sport: isSport ? (a.sport || null) : null,
        sport_intent: isSport ? (a.sportIntent || 'recreational') : null,
        event_date: isSport && a.eventDate ? a.eventDate : null,
        run_discipline: isSport && a.sport === 'run' ? (a.runDiscipline || null) : null
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
    sport: isSport ? (a.sport || null) : null,
    sport_intent: isSport ? (a.sportIntent || 'recreational') : null,
    event_date: isSport && a.eventDate ? a.eventDate : null,
    sport_season: null,  // no longer set during onboarding; deriveSeason() computes it on demand
    run_discipline: isSport && a.sport === 'run' ? (a.runDiscipline || null) : null,

    experience: { gym: a.experienceLevel || 'intermediate' },
    lifts: hasBarbell
      ? { squat: numOrNull(a.lifts.squat), bench: numOrNull(a.lifts.bench), deadlift: numOrNull(a.lifts.deadlift) }
      : null,

    availability: {
      days_per_week: a.daysPerWeek,
      session_minutes: a.sessionMinutes,
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
