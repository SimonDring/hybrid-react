// apps/mobile/tests/athlete-estimation.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { estimateCapability, bandForModel } from '@performance-os/engine/lib/performance/estimation.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

// Inferred path — no measurements.
const bare = createAthleteModel({ trainingHistory: { resistanceTrainingYears: 0.5 } });
const inf = estimateCapability('maxStrength', bare, ASOF);
assert(inf.source === 'inferred' && inf.confidence === 'low', 'T1 no data → inferred, low confidence');
assert(inf.level >= 0 && inf.level <= 1, 'T2 inferred level in 0..1');

// Measured path — recent squat 1RM.
const measured = createAthleteModel({
  identity: { biologicalSex: 'male', bodyMassKg: 80 },
  performanceMetrics: [{ id: 'm', metric: '1rm_squat', value: 160, unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: '2026-06-20' }],
});
const meas = estimateCapability('maxStrength', measured, ASOF);
assert(meas.source === 'measured', 'T3 recent 1RM → measured');
assert(meas.confidence === 'high' || meas.confidence === 'moderate', 'T4 measured → ≥ moderate confidence');
assert(meas.level > inf.level, 'T5 a strong measured lift outranks a novice prior');

// Band resolution.
assert(bandForModel(createAthleteModel({ trainingHistory: { resistanceTrainingYears: 4 } })) === 'advanced', 'T6 years → band');
assert(bandForModel(createAthleteModel({ trainingHistory: { selfRatedLevel: 'beginner' } })) === 'novice', 'T7 self-rated → band');
assert(bandForModel(createAthleteModel()) === 'intermediate', 'T8 unknown → intermediate default');

// Never throws + always confident.
for (const q of ['hypertrophy', 'reactiveStrength', 'aerobicCapacity', 'mobility', 'robustness']) {
  const c = estimateCapability(q, createAthleteModel(), ASOF);
  assert(c.confidence && c.level != null, `T9 ${q} always yields level + confidence`);
}

// never-throw on partial / null models (no createAthleteModel backfill).
let t1 = false;
try { const c = estimateCapability('maxStrength', { performanceMetrics: [{ metric: '1rm_squat', value: 150 }] }, ASOF); assert(c.source && c.level != null, 'T10 partial model (no identity) still yields a capability'); }
catch { t1 = true; }
assert(!t1, 'T10b never throws on a model missing identity');

let t2 = false;
try { const c = estimateCapability('maxStrength', null, ASOF); assert(c.confidence, 'T11 null model → inferred capability'); }
catch { t2 = true; }
assert(!t2, 'T11b never throws on null model');
assert(bandForModel(null) === 'intermediate', 'T12 bandForModel(null) → intermediate default');
