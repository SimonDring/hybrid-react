import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const soon = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
const far  = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);

// ---- season → volume scalar (was always 1.0 before deriveSeason was wired in) ----
assert(resolveProgram({ goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational' }).volumeScalar === 1.0, 'T1 recreational → off-season 1.0×');
assert(resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'compete' }).volumeScalar === 0.6, 'T2 compete (no date) → in-season 0.6×');
const inP = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'compete', event_date: soon });
assert(inP.season === 'in' && inP.volumeScalar === 0.6, 'T3 event in 3wk → in-season 0.6×');
assert(resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'compete', event_date: far }).volumeScalar === 1.0, 'T4 event 200d out → off-season 1.0×');
assert(resolveProgram({ goal_type: 'sport', sport: 'run', sport_intent: 'recreational', sport_season: 'transition' }).volumeScalar === 0.7, 'T5 explicit season override (transition) → 0.7×');

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
