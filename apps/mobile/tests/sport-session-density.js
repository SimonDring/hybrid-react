// tests/sport-session-density.js — sport sessions stay lean (≤6 working items).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const FULL = ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', experienceLevel: 'intermediate', sex: 'male', bodyweight_kg: 80, daysPerWeek: 3, days: ['mon','wed','fri'], equipment: FULL, lifts: { squat: 95, bench: 70, deadlift: 100, ohp: 50, pull: 2 }, pullMode: 'reps', ...o });
let fails = 0; let maxWork = 0;
const plan = generatePlan(answersToProfile(A({ sportIntent: 'recreational', sportGoal: 'build_base', sportDays: ['tue','thu','sat'] })));
for (const ph of plan.phases) for (const wk of ph.weeks) for (const s of wk.sessions) {
  const work = (s.items || []).filter(it => it.tag !== 'mobility' && (it.volumeFactor ?? 1) > 0).length;
  maxWork = Math.max(maxWork, work);
}
const ok = maxWork <= 6;
console.log((ok ? 'PASS' : 'FAIL') + `: no sport session exceeds 6 working items (max seen ${maxWork})`);
if (!ok) fails++;
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
