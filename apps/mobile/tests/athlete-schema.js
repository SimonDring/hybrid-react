import { createAthleteModel, ATHLETE_SCHEMA_VERSION } from '@performance-os/engine/lib/athlete/schema.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const m = createAthleteModel();
assert(m.schemaVersion === ATHLETE_SCHEMA_VERSION && m.schemaVersion === 1, 'T1 schemaVersion = 1');
for (const sec of ['identity', 'goals', 'sportingContext', 'trainingHistory', 'constraints',
                   'lifestyle', 'assessments', 'performanceMetrics', 'learnedPriors', 'meta'])
  assert(sec in m, `T2 section present: ${sec}`);
assert(Array.isArray(m.goals) && Array.isArray(m.assessments) && Array.isArray(m.performanceMetrics),
  'T3 list sections default to arrays');
assert(m.identity.age === null && m.identity.biologicalSex === null, 'T4 identity defaults null');
assert(m.trainingHistory.selfRatedLevel === null && m.trainingHistory.resistanceTrainingYears === null,
  'T5 training history defaults null');

const o = createAthleteModel({ identity: { age: 30, biologicalSex: 'female' } });
assert(o.identity.age === 30 && o.identity.biologicalSex === 'female', 'T6 override applied');
assert(o.identity.heightCm === null, 'T7 override merges, keeps other identity defaults');
assert(o.constraints.equipment.length === 0, 'T8 constraints default present after override');
