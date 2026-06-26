// tests/quality-gate.js — power work is gated to goals that want it.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const powerNames = new Set(EXERCISES.filter(e => e.quality === 'power').map(e => e.name));
const plan = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a }));
const allItemNames = (p) => p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions).flatMap(s => s.items).map(it => it.name);
const hasPower = (p) => allItemNames(p).some(n => powerNames.has(n));

assert(!hasPower(plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5 })), 'bodybuilding plan has NO power work');
assert(!hasPower(plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5 })), 'strength plan has NO power work');
assert(hasPower(plan({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 4 })), 'sprint plan DOES contain power work');

// Hip-thrust regression: general exercise with sportTags is never gated.
const bb = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6 });
assert(allItemNames(bb).includes('Hip thrust'), 'hip thrust (general) still appears for a bodybuilder');

console.log('quality-gate done');
