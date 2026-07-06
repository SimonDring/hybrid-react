// apps/mobile/tests/performance-demand.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

const sport = createAthleteModel({ sportingContext: { primarySport: 'cycling', position: 'GC / Climber (road)' } });
const pm = derivePerformanceModel(sport, ASOF);
assert(Array.isArray(pm.demandProfile) && pm.demandProfile.length > 0, 'T1 sport athlete → demandProfile populated');
assert(pm.demandProfile.some(d => d.qualityId === 'aerobicCapacity'), 'T2 cycling demand includes aerobicCapacity');
assert(pm.capabilities.length > 0, 'T3 capabilities still derived (unchanged)');

// WP-42a: a non-sport model resolves the GOAL's demand profile (EDS D2 goal-as-sport).
const build = createAthleteModel({ goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] });
const bdp = derivePerformanceModel(build, ASOF).demandProfile;
assert(Array.isArray(bdp) && bdp.length > 0 && bdp.every((d) => d.source === 'goal'), 'T4 non-sport → goal demand profile (source: goal)');

const pm2 = derivePerformanceModel(sport, ASOF);
assert(JSON.stringify(pm) === JSON.stringify(pm2), 'T5 deterministic');
