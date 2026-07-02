import { buildAthleteModel } from '@performance-os/engine/lib/athlete/buildAthleteModel.js';
import * as A from '@performance-os/engine/lib/athlete/index.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ASOF = '2026-07-01';
const m1 = buildAthleteModel({ identity: { age: 25 }, goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] }, ASOF);
assert(m1.identity.age === 25 && m1.goals[0].outcome === 'build_muscle', 'T1 builds from partial inputs');
assert(m1.constraints.equipment.length === 0, 'T2 unspecified sections keep defaults');
assert(m1.meta.onboardedAt === ASOF, 'T3 onboardedAt stamped from injected asOf');

const m2 = buildAthleteModel({ identity: { age: 25 }, goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] }, ASOF);
assert(JSON.stringify(m1) === JSON.stringify(m2), 'T4 deterministic (same inputs + asOf → identical)');

assert(typeof A.buildAthleteModel === 'function' && typeof A.validateAthleteModel === 'function'
  && A.ATHLETE_SCHEMA_VERSION === 1, 'T5 index re-exports public API');

// precedence: an explicit inputs.meta.onboardedAt must win over asOf.
const pinned = buildAthleteModel({ meta: { onboardedAt: '2025-01-01' } }, ASOF);
assert(pinned.meta.onboardedAt === '2025-01-01', 'T6 inputs.meta.onboardedAt wins over asOf');
