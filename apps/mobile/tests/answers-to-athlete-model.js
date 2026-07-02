// apps/mobile/tests/answers-to-athlete-model.js
import { answersToAthleteModelInputs, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

const m = answersToAthleteModelInputs(A({
  name: 'Jo', age: 27, sex: 'male', bodyweight_kg: 80,
  goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate',
  daysPerWeek: 4, equipment: ['barbell', 'dumbbell'],
}), ASOF);

assert(m.schemaVersion === 1, 'T1 produces a v1 athlete model');
assert(m.identity.age === 27 && m.identity.biologicalSex === 'male', 'T2 identity from answers');
assert(m.goals[0].outcome === 'build_muscle', 'T3 build/bodybuilding → build_muscle outcome');
assert(m.constraints.equipment.includes('barbell') && m.constraints.daysPerWeek === 4, 'T4 constraints from answers');
assert(m.trainingHistory.selfRatedLevel === 'intermediate', 'T5 experience → self-rated level');
assert(m.meta.source === 'onboarding' || m.meta.source === 'migration', 'T6 meta.source set');
