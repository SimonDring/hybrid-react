// tests/stretch-bias.js — lengthened-position bias steers hypertrophy selection.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const stretchNames = new Set(EXERCISES.filter(e => e.stretchBias).map(e => e.name));
const plan = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a }));
const names = (p) => p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions).flatMap(s => s.items).map(it => it.name);
const stretchCount = (p) => names(p).filter(n => stretchNames.has(n)).length;

// (1) seed exercises carry the flag.
const has = (id) => !!(EXERCISES.find(e => e.id === id) || {}).stretchBias;
assert(has('rdl') && has('incline_db_curl') && has('overhead_ext') && has('chest_fly') && has('seated_leg_curl'), 'seed exercises carry stretchBias');
assert(!has('leg_curl') && !has('spider_curl') && !has('triceps_pushdown'), 'shortened-position work is NOT stretch-biased');

// (2) a bodybuilding plan selects more stretch-biased work than a strength plan.
const bb = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5 });
const st = plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5 });
assert(stretchCount(bb) > stretchCount(st), `bodybuilding leans stretch-biased (bb ${stretchCount(bb)} > st ${stretchCount(st)})`);

// (3) frequency unaffected (reads targets, not selection).
const before = suggestOptimalFrequency(answersToProfile({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced' })).optimalDays;
assert(before >= 5 && before <= 6, `optimal frequency unchanged for advanced hypertrophy (got ${before})`);

console.log('stretch-bias done');
