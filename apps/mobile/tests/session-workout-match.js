import { matchWorkoutToSession, sessionPhysiologyFromWorkout } from '../src/lib/sessionWorkoutMatch.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const iso = (h, m = 0) => `2026-06-19T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`;

const runSession = { startedAt: iso(18), completedAt: iso(19), discipline: 'run' };
const workouts = [
  { id: 'w-run', type: 'run',  start_time: iso(18, 5), end_time: iso(18, 55) }, // overlaps, compatible
  { id: 'w-ride', type: 'ride', start_time: iso(18, 0), end_time: iso(19, 0) },  // overlaps but wrong type for a run
  { id: 'w-run-late', type: 'run', start_time: iso(20), end_time: iso(21) }      // compatible but no overlap
];

assert(matchWorkoutToSession(runSession, workouts)?.id === 'w-run', 'T1 picks the compatible, overlapping run');
assert(matchWorkoutToSession({ ...runSession, discipline: 'gym' }, workouts) === null, 'T2 gym session matches no cardio workout');
assert(matchWorkoutToSession({ startedAt: null, completedAt: iso(19), discipline: 'run' }, workouts) === null, 'T3 no window → null');
assert(matchWorkoutToSession({ ...runSession, discipline: 'cycle' }, workouts)?.id === 'w-ride', 'T4 cycle discipline maps to ride');

// largest overlap wins on ties
const two = [
  { id: 'small', type: 'run', start_time: iso(18, 50), end_time: iso(19, 30) }, // 10 min overlap
  { id: 'big',   type: 'run', start_time: iso(18, 0),  end_time: iso(18, 50) }  // 50 min overlap
];
assert(matchWorkoutToSession(runSession, two)?.id === 'big', 'T5 largest overlap wins');

const phys = sessionPhysiologyFromWorkout({ avg_hr: 150, max_hr: 178, calories: 600 });
assert(phys.avg_hr === 150 && phys.max_hr === 178 && phys.calories === 600 && phys.hr_source === 'strava', 'T6 physiology from workout');
