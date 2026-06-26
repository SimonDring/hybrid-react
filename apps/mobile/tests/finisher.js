// tests/finisher.js — short sessions gain sport/goal-appropriate factor-0 finishers.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const week1 = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a })).phases[0].weeks[0];

// A beginner runner's (short) session gains supportive finisher work that counts zero.
const runWk = week1({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'recreational', experienceLevel: 'beginner', daysPerWeek: 3 });
const s = runWk.sessions[0];
const finisherItems = s.items.filter(it => it.volumeFactor === 0);
assert(finisherItems.length >= 1, `beginner runner session gains >=1 factor-0 finisher (got ${finisherItems.length})`);
// Finisher items must not change counted volume — they contribute zero.
const before = countWeeklyVolume([{ items: s.items.filter(it => it.volumeFactor !== 0) }]);
const after = countWeeklyVolume([s]);
const total = (c) => Object.values(c.counts).reduce((a, b) => a + b, 0);
assert(Math.abs(total(before) - total(after)) < 0.01, 'finisher items count zero toward volume');

console.log('finisher done');
