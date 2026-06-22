import { generatePlan } from '../src/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Past start + no event → deloads are purely periodisation-defined (no taper).
const base = {
  focus: ['gym'], plan_start_date: '2026-01-05',
  availability: { days_per_week: 4, session_minutes: 60 },
  experience: { gym: 'intermediate' },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight']
};
const deloadWeeks = (p) => generatePlan({ ...base, ...p }).phases.flatMap(ph => ph.weeks).filter(w => w.deload).map(w => w.num);

// The bug this fixes: short blocks (≤3-week phases) never hit winp%4, so they
// never deloaded. Each profile now declares its deload weeks.
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'bodybuilding' }), [6]), 'T1 hypertrophy deloads @6 (was never deloading)');
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'strength' }), [5, 10]), 'T2 strength deloads @5,10');
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'functional' }), [4, 8]), 'T3 functional deloads @4,8');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'recreational' }), [6]), 'T4 run-sprint off deloads @6 (was never)');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_intent: 'recreational' }), [4, 8]), 'T5 run-middle off deloads @4,8');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'cycle', sport_intent: 'compete' }), []), 'T6 in-season (4wk maintenance) has no auto-deload');

// Deload weeks must drop volume: their gym sessions should be lighter than the
// surrounding loading weeks (targets.js sends deloads to ~MEV).
const bbPlan = generatePlan({ ...base, goal_type: 'build', strength_style: 'bodybuilding' });
const wk = bbPlan.phases.flatMap(ph => ph.weeks);
const setsOf = (w) => w.sessions.reduce((a, s) => a + s.items.filter(i => /\d+\s*[×x]/.test(i.sets || '')).length, 0);
assert(setsOf(wk[5]) < setsOf(wk[3]), 'T7 hypertrophy deload week (6) is lighter than a loading week (4)');
