import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

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
// WP-49 T4c: build deloads now come from the DISCIPLINE periodisation (hypertrophy @5,10;
// powerlifting @4,9). strength needs a barbell to reach powerlifting (else it falls back to hypertrophy).
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'bodybuilding' }), [5, 10]), 'T1 bodybuilding → hypertrophy deloads @5,10');
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'strength', access: ['barbell'] }), [4, 9]), 'T2 strength → powerlifting deloads @4,9');
assert(eq(deloadWeeks({ goal_type: 'build', strength_style: 'functional' }), [5, 10]), 'T3 functional → hypertrophy deloads @5,10');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'recreational' }), [6]), 'T4 run-sprint off deloads @6 (was never)');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_intent: 'recreational' }), [4, 8]), 'T5 run-middle off deloads @4,8');
assert(eq(deloadWeeks({ goal_type: 'sport', sport: 'cycle', sport_intent: 'compete' }), []), 'T6 in-season (4wk maintenance) has no auto-deload');

// Deload weeks must drop volume: their gym sessions should be lighter than the
// surrounding loading weeks (targets.js sends deloads to ~MEV).
const bbPlan = generatePlan({ ...base, goal_type: 'build', strength_style: 'bodybuilding' });
const wk = bbPlan.phases.flatMap(ph => ph.weeks);
// WP-49 flip (build→discipline): the hypertrophy discipline PADS a deload week with mobility/primer
// items (foam roller, hip-flexor stretch, prone raises), so a raw ITEM count actually goes UP on the
// deload — the old setsOf() was fooled by that padding. The true deload IS lighter: the working mains
// drop from 4×10 to 2×5 (472 → 132 total reps; 46 → 24 working sets). Measure WORKING volume only
// (exclude mobility/primer) so the comparison reflects the real load drop, not the padding.
const isMob = (i) => i.tag === 'mobility' || i.section === 'primer';
const workReps = (w) => w.sessions.reduce((a, s) => a + s.items.filter(i => !isMob(i)).reduce((b, i) => {
  const m = /(\d+)\s*[×x]\s*(\d+)/.exec(i.sets || ''); return b + (m ? Number(m[1]) * Number(m[2]) : 0);
}, 0), 0);
// WP-49 T4c: hypertrophy deloads are now weeks 5 & 10 — compare the week-5 deload (wk[4]) against a
// week-3 loading week (wk[2]).
assert(workReps(wk[4]) < workReps(wk[2]), `T7 hypertrophy deload week (5) is lighter than a loading week (3) — working reps ${workReps(wk[4])} < ${workReps(wk[2])}`);
