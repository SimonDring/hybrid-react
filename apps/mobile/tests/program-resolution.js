import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Event windows are measured from plan_start_date, never the clock (Art 18).
const anchor = '2026-07-06';
const soon = '2026-07-27';   // 21 days after the anchor
const far  = '2027-01-22';   // 200 days after the anchor

// ---- season → sport-load volume scalar (now season base × goal × sport-days × sport
// systemic factor, clamped/rounded; see strength/sportLoad.js). No sport_days here →
// dayFactor 1.0, so the values below are seasonBase × systemicFactor. ----
assert(resolveProgram({ goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational' }).volumeScalar === 0.855, 'T1 recreational cycle off → 0.90×0.95 = 0.855');
assert(resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'compete' }).volumeScalar === 0.54, 'T2 compete (no date) run → in-season 0.60×0.90 = 0.54');
const inP = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'compete', plan_start_date: anchor, event_date: soon });
assert(inP.season === 'in' && inP.volumeScalar === 0.57, 'T3 event in 3wk swim → in-season 0.60×0.95 = 0.57');
assert(resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'compete', plan_start_date: anchor, event_date: far }).volumeScalar === 0.855, 'T4 event 200d out swim → off-season 0.90×0.95 = 0.855');
assert(resolveProgram({ goal_type: 'sport', sport: 'run', sport_intent: 'recreational', sport_season: 'transition' }).volumeScalar === 0.63, 'T5 explicit transition override run → 0.70×0.90 = 0.63');

// ---- sport goal → sport style + discipline emphasis + priority ----
const rl = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational' });
assert(rl.style === 'sport', 'T6 sport goal → style "sport"');
assert(rl.emphasis.calves === 1.4 && rl.emphasis.chest === 0.45, 'T7 run-long emphasis: calves up (1.4), chest down (0.45)');
assert(rl.exercisePriority.includes('nordic_curl'), 'T8 run-long prioritises nordic curl');
const sw = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'recreational', access: ['full_gym'] });
assert(sw.emphasis.back === 1.3 && sw.exercisePriority.includes('face_pull'), 'T9 swim emphasises back + prioritises face pull');

// ---- build goals → correct style, full volume, priority present ----
const bb = resolveProgram({ goal_type: 'build', strength_style: 'bodybuilding', access: ['full_gym'] });
assert(bb.style === 'bodybuilding' && bb.volumeScalar === 1.0, 'T10 bodybuilding style, full volume');
assert(bb.exercisePriority.length > 0, 'T11 bodybuilding has an exercise-priority list');
assert(resolveProgram({ goal_type: 'build', strength_style: 'strength' }).style === 'strength', 'T12 strength style');
assert(resolveProgram({ goal_type: 'build', strength_style: 'functional' }).emphasis.core === 1.2, 'T13 functional emphasises core');
