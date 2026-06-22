import { liftGoal, consistencyGoal, goalMomentum } from '../src/lib/goals.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Male, 100kg bw, squat 175 (input → e1rm). ratio 1.75 → intermediate(1.5)→advanced(2.0).
const A = { bodyweight_kg: 100, sex: 'male', lifts: { squat: '175' } };
const sg = liftGoal('squat', A);
assert(sg.current === 175, 'T1 squat current 175');
assert(sg.target === 200, 'T2 next milestone = advanced = 2.0×bw = 200');
assert(sg.pct === 50, 'T3 pct within band = (175-150)/(200-150) = 50');
assert(sg.status === 'building', 'T4 50% → building');
assert(sg.sub === 'Intermediate → Advanced', 'T5 band sub label');

// User-set target overrides the auto milestone.
const B = { bodyweight_kg: 100, sex: 'male', lifts: { squat: '150' }, lift_targets: { squat: 200 } };
const bg = liftGoal('squat', B);
assert(bg.mode === 'target', 'T6 override → mode target');
assert(bg.target === 200 && bg.pct === 75, 'T7 override target 200, pct 75');
assert(bg.status === 'on_track', 'T8 75% → on_track');

// No bodyweight / no lift → nodata, never a fake number.
assert(liftGoal('bench', {}).status === 'nodata', 'T9 no data → nodata');

// Elite caps at 100%.
const E = { bodyweight_kg: 100, sex: 'male', lifts: { squat: '300' } };
assert(liftGoal('squat', E).pct === 100 && liftGoal('squat', E).status === 'on_track', 'T10 >= elite → 100% on_track');

// Consistency vs availability.
const sessions = {}; for (let i = 0; i < 8; i++) sessions['k' + i] = { completed: true };
const cg = consistencyGoal({ availability: { days_per_week: 4 } }, sessions, 2);
assert(cg.target === 4 && cg.current === 4 && cg.pct === 100, 'T11 8 done / 2 wk = 4/wk = 100% of 4');
assert(consistencyGoal({}, sessions, 2).status === 'nodata', 'T12 no availability → nodata');

// Momentum summary — now five tracked lifts (squat/bench/deadlift/ohp/pull) + consistency.
const m = goalMomentum(A, sessions, 2);
assert(m.goals.length === 6, 'T13 momentum has 5 lifts + consistency');
assert(typeof m.onTrack === 'number' && typeof m.tracked === 'number', 'T14 onTrack/tracked counts present');
const keys = m.goals.map(g => g.key);
assert(keys.includes('ohp') && keys.includes('pull'), 'T15 ohp + pull are tracked goals');

// OHP + pull milestones place against their own standards.
const F = { bodyweight_kg: 80, sex: 'male', lifts: { ohp: '60', pull: '90' } };
assert(liftGoal('ohp', F).current === 60 && liftGoal('ohp', F).status !== 'nodata', 'T16 ohp milestone reads the entered max');
assert(liftGoal('pull', F).current === 90 && liftGoal('pull', F).status !== 'nodata', 'T17 pull milestone reads the entered max');
