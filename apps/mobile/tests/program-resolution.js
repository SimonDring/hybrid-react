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
// Season-phased SKB (2026-07-09): the sport-SPECIFIC narrow vector now lives IN-SEASON
// (off-season rounds the emphasis out — see tests/season-*.js), so pin the season to 'in'.
const rl = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational', sport_season: 'in' });
assert(rl.style === 'sport', 'T6 sport goal → style "sport"');
assert(rl.emphasis.calves === 1.4 && rl.emphasis.chest === 0.45, 'T7 run-long IN-SEASON emphasis: calves up (1.4), chest down (0.45)');
assert(rl.exercisePriority.includes('nordic_curl'), 'T8 run-long prioritises nordic curl');
const sw = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_intent: 'recreational', access: ['full_gym'] });
assert(sw.emphasis.back === 1.3 && sw.exercisePriority.includes('face_pull'), 'T9 swim emphasises back + prioritises face pull');

// ---- build goals → DISCIPLINE style (WP-49 flip: build→discipline), full volume, priority present ----
// WP-49 flip: 'bodybuilding' build now routes to the hypertrophy discipline (was legacy style 'bodybuilding').
const bb = resolveProgram({ goal_type: 'build', strength_style: 'bodybuilding', access: ['full_gym'] });
assert(bb.style === 'hypertrophy' && bb.discipline === 'hypertrophy' && bb.volumeScalar === 1.0, 'T10 bodybuilding → hypertrophy discipline, full volume');
assert(bb.exercisePriority.length > 0, 'T11 hypertrophy has an exercise-priority list (from priorityLifts)');
// WP-49 flip: 'strength' WITH literal barbell → powerlifting discipline; WITHOUT barbell → hypertrophy fallback.
assert(resolveProgram({ goal_type: 'build', strength_style: 'strength', access: ['barbell'] }).style === 'powerlifting', 'T12 strength + barbell → powerlifting discipline');
assert(resolveProgram({ goal_type: 'build', strength_style: 'strength' }).style === 'hypertrophy', 'T12b strength WITHOUT barbell → hypertrophy fallback');
// WP-49 flip: 'functional' maps to the hypertrophy discipline (interim; conditioning secondary is future).
// The old per-style core 1.2 emphasis no longer exists — assert the discipline mapping instead.
assert(resolveProgram({ goal_type: 'build', strength_style: 'functional' }).style === 'hypertrophy', 'T13 functional → hypertrophy discipline (interim)');
