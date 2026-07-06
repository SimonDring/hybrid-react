import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

const sport = createAthleteModel({ sportingContext: { primarySport: 'cycling', position: 'GC / Climber (road)' } });
const pm = derivePerformanceModel(sport, ASOF);
assert(pm.limitingFactors.length > 0, 'T1 sport → limitingFactors populated');
assert(pm.limitingFactors[0].magnitude >= pm.limitingFactors[1].magnitude, 'T2 ranked descending');
assert(typeof pm.limitingFactors[0].rationale === 'string', 'T3 rationale present');
assert(Array.isArray(pm.priorityAdaptations), 'T4 priorityAdaptations present');
if (pm.priorityAdaptations.length) {
  assert(Array.isArray(pm.priorityAdaptations[0].adaptations) && pm.priorityAdaptations[0].tracesToLimiter, 'T5 priority carries adaptations + trace');
}

// WP-42a: build goals resolve a GOAL demand profile (EDS D2), so the diagnosis is never empty.
const build = createAthleteModel({ goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] });
const pmb = derivePerformanceModel(build, ASOF);
assert(pmb.limitingFactors.length > 0 && pmb.priorityAdaptations.length > 0, 'T6 build → goal-led diagnosis (never empty, WP-42a)');
assert(Array.isArray(pmb.demandProfile) && pmb.demandProfile.find((d) => d.qualityId === 'hypertrophy')?.importance === 1.0,
  'T7 build_muscle demand is hypertrophy-led at 1.0');

assert(JSON.stringify(pm) === JSON.stringify(derivePerformanceModel(sport, ASOF)), 'T8 deterministic');
