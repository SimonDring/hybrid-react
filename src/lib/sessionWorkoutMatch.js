/**
 * Pure matching of an in-app session to an external (Strava) workout by
 * overlapping time window + compatible activity type. No IO.
 */

// session discipline (PlanService) -> compatible workout.type values.
const COMPAT = {
  run:   ['run'],
  cycle: ['ride'],
  swim:  ['swim'],
  brick: ['run', 'ride'],
  gym:   []
};

const ms = (s) => (s ? new Date(s).getTime() : NaN);

// Overlap in milliseconds between [aS,aE] and [bS,bE], 0 if none.
function overlapMs(aS, aE, bS, bE) {
  return Math.max(0, Math.min(aE, bE) - Math.max(aS, bS));
}

// The compatible workout with the largest positive overlap with the session
// window, or null. Null when the session has no usable window.
export function matchWorkoutToSession(session, workouts = []) {
  const s = ms(session?.startedAt);
  const e = ms(session?.completedAt);
  if (isNaN(s) || isNaN(e) || e <= s) return null;
  const compatible = COMPAT[session.discipline] || [];
  if (!compatible.length) return null;

  let best = null;
  let bestOverlap = 0;
  for (const w of workouts) {
    if (!compatible.includes(w.type)) continue;
    const ws = ms(w.start_time);
    const we = ms(w.end_time);
    if (isNaN(ws) || isNaN(we)) continue;
    const o = overlapMs(s, e, ws, we);
    if (o > bestOverlap) { best = w; bestOverlap = o; }
  }
  return best;
}

// The session_log physiology fields a linked cardio workout supplies.
export function sessionPhysiologyFromWorkout(workout) {
  return {
    avg_hr: workout?.avg_hr ?? null,
    max_hr: workout?.max_hr ?? null,
    calories: workout?.calories ?? null,
    hr_source: 'strava'
  };
}

export default { matchWorkoutToSession, sessionPhysiologyFromWorkout };
