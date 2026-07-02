// apps/mobile/tests/adapter-sport-position.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const ASOF = '2026-07-02';

// Legacy run → SKB id on the model; exact legacy fields preserved for the engine.
const m = profileToAthleteModel({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', access: ['full_gym'], availability: { days_per_week: 3, days: [] } }, ASOF);
assert(m.sportingContext.primarySport === 'running_sprint', 'T1 legacy run/sprint → SKB primarySport running_sprint');
assert(m.meta.enginePassthrough.sport === 'run' && m.meta.enginePassthrough.run_discipline === 'sprint', 'T2 exact legacy sport+discipline preserved in passthrough');
const e = athleteModelToEngineInput(m);
assert(e.sport === 'run' && e.run_discipline === 'sprint', 'T3 round-trip → legacy engine run/sprint (exact)');

// New onboarding path: only SKB id + position, no passthrough → derive engine sport via binding.
const fresh = createAthleteModel({ goals: [{ id: 'g', outcome: 'improve_sport_performance', priority: 1 }], sportingContext: { primarySport: 'cycling', position: 'Sprinter (road)' } });
const ef = athleteModelToEngineInput(fresh);
assert(ef.sport === 'cycle', 'T4 new path: cycling → engine sport cycle via binding');
assert(ef.goal_type === 'sport', 'T5 sport goal preserved');

// cycle legacy round-trips
const mc = profileToAthleteModel({ goal_type: 'sport', sport: 'cycle', access: ['full_gym'], availability: { days_per_week: 3, days: [] } }, ASOF);
assert(mc.sportingContext.primarySport === 'cycling', 'T6 legacy cycle → cycling');
assert(athleteModelToEngineInput(mc).sport === 'cycle', 'T7 cycle round-trips exactly');
