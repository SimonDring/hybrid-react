/**
 * onboardingModel — the pure (non-UI) part of onboarding: the answer shape and
 * the mapping from answers → users.profile shape that the plan engines consume.
 *
 * Kept separate from OnboardingWizard.jsx (the UI) so it can be unit-tested and
 * reused without React. Both the production Onboarding screen and the /dev
 * tester convert answers through these helpers, so the written profile and the
 * dev-generated plan always agree.
 */

import { focusToDisciplines } from './PlanGenerator.js';

export function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// A complete, empty answer set — every caller seeds from this.
export const BLANK_ANSWERS = {
  name: '', age: '', sex: '', height_cm: '', bodyweight_kg: '',
  focus: [], primary: '', strengthStyle: 'functional',
  lifts: { squat: '', bench: '', deadlift: '' },
  experience: {},
  runGoal: { distance: '', currentDistance: '5k', currentTime: '' },
  swimGoal: { distance_m: 2000, currentPace: '', currentDistance: '' },
  goals: [{ label: '', target_date: '' }],
  // Timing: start date + either an event date or a block length (weeks).
  startDate: '', hasEvent: false, eventDate: '', planWeeks: 16,
  daysPerWeek: null, sessionMinutes: 60, days: [], allocation: {},
  longRunDay: 'sat', doubles: true,
  access: [], poolLengthM: 25, injuries: [], notes: ''
};

export function answersToProfilePatch(a) {
  const today = new Date().toISOString().slice(0, 10);
  const disciplines = focusToDisciplines(a.focus);
  const hasGym = disciplines.includes('gym');
  const hasRun = disciplines.includes('run');
  const hasSwim = disciplines.includes('swim');
  const multi = disciplines.length > 1;
  const runTime = (a.runGoal.currentTime || '').trim();
  const swimPace = (a.swimGoal.currentPace || '').trim();
  const runCurrent = runTime
    ? { distance: a.runGoal.currentDistance || a.runGoal.distance || '5k', time: runTime } : null;
  const swimCurrent = (swimPace || a.swimGoal.currentDistance)
    ? { pace_per_100: swimPace || null, distance_m: numOrNull(a.swimGoal.currentDistance) } : null;
  // Event date (if any) anchors the goal target; otherwise the block length drives it.
  const target = a.hasEvent ? (a.eventDate || '') : '';
  return {
    plan_start_date: a.startDate || today,
    plan_weeks: a.hasEvent ? null : (numOrNull(a.planWeeks) || 16),
    name: a.name.trim(), age: numOrNull(a.age), sex: a.sex || null,
    height_cm: numOrNull(a.height_cm), bodyweight_kg: numOrNull(a.bodyweight_kg),
    focus: a.focus,
    primary: a.primary || disciplines[0] || null,
    strength_style: hasGym ? a.strengthStyle : null,
    lifts: hasGym ? { squat: numOrNull(a.lifts.squat), bench: numOrNull(a.lifts.bench), deadlift: numOrNull(a.lifts.deadlift) } : null,
    experience: a.experience,
    run_goal: hasRun ? { distance: a.runGoal.distance || null, target_date: target, current: runCurrent } : null,
    swim_goal: hasSwim ? { distance_m: a.swimGoal.distance_m, target_date: target, current: swimCurrent } : null,
    availability: {
      days_per_week: a.daysPerWeek, session_minutes: a.sessionMinutes, days: a.days,
      allocation: multi ? a.allocation : (disciplines.length === 1 ? { [disciplines[0]]: a.daysPerWeek } : {})
    },
    long_run_day: a.longRunDay || 'sat',
    doubles: a.doubles !== false,
    access: a.access,
    pool_length_m: a.access.includes('pool') ? numOrNull(a.poolLengthM) : null,
    markers: a.notes.trim(),
    onboarded: true
  };
}

export function answersToGoalRows(a) {
  return a.goals.filter(g => g.label.trim()).map((g, i) => ({
    rank: i + 1, label: g.label.trim(), target_date: g.target_date || ''
  }));
}

export function answersToInjuries(a) {
  const today = new Date().toISOString().slice(0, 10);
  return a.injuries.filter(i => i.title.trim()).map(inj => ({
    title: inj.title.trim(), body_part: (inj.body_part || '').trim(), status: 'active', date_occurred: today
  }));
}

// Full profile object (patch + goals merged) — what generatePlan() consumes.
export function answersToProfile(a) {
  return { ...answersToProfilePatch(a), goals: answersToGoalRows(a) };
}
