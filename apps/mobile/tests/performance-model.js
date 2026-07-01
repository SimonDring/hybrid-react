// apps/mobile/tests/performance-model.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

const model = createAthleteModel({ athleteId: 'u1', trainingHistory: { resistanceTrainingYears: 2 } });
const pm = derivePerformanceModel(model, ASOF);
assert(pm.athleteId === 'u1' && pm.derivedAt === ASOF, 'T1 carries id + derivedAt(asOf)');
assert(pm.capabilities.length === qualityIds().length, 'T2 one capability per seed quality');
for (const c of pm.capabilities)
  assert(c.source && c.confidence && c.level != null, `T3 ${c.qualityId} has source+confidence+level`);
assert(Array.isArray(pm.limitingFactors) && pm.limitingFactors.length === 0, 'T4 limiting factors scaffolded empty');
assert(pm.demandProfile === null, 'T5 demand profile scaffolded (not computed this sprint)');

const pm2 = derivePerformanceModel(model, ASOF);
assert(JSON.stringify(pm) === JSON.stringify(pm2), 'T6 deterministic given asOf');
