import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const P = (o) => ({ goal_type: 'build', strength_style: 'strength', experience: { gym: 'advanced' }, access: o.access });

// WP-49 flip: BUILD_INTENTS retired. A strength profile WITH barbell resolves to the powerlifting
// discipline; exercisePriority is the powerlifting priorityLifts filtered by equipment (competition
// lifts first), so it still leads back_squat.
const full = resolveProgram(P({ access: ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'] }));
assert(full.style === 'powerlifting', `full-gym strength → powerlifting discipline (got ${full.style})`);
assert(full.exercisePriority[0] === 'back_squat', `full-gym strength still leads back_squat (got ${full.exercisePriority[0]})`);
assert(full.exercisePriority.includes('bench') && full.exercisePriority.includes('deadlift'), 'powerlifting priority is the competition lifts (squat/bench/deadlift)');
assert(full.priorityByIntent instanceof Map, 'priorityByIntent is a Map');

// WP-49 flip: powerlifting's priorityLifts are all barbell, so a dumbbell-only strength profile
// FALLS BACK to the hypertrophy discipline; its priority is the hypertrophy priorityLifts filtered
// to dumbbell/bodyweight equipment (a curated list, NOT a ~1-item stub). There is no BUILD_INTENTS
// equipment-fallback chain, so db_bench is not injected — the discipline simply drops barbell lifts.
const db = resolveProgram(P({ access: ['dumbbell','bodyweight'] }));
assert(db.style === 'hypertrophy', `DB-only strength → hypertrophy fallback (got ${db.style})`);
assert(db.exercisePriority.length >= 6, `DB hypertrophy priority is a curated list, not a stub (got ${db.exercisePriority.length})`);
assert(!db.exercisePriority.includes('bench'), 'DB fallback drops barbell bench (equipment filter)');

// DB-only sport profiles also resolve a priorityByIntent Map, so the de-spine
// fallback chain is available off-barbell too.
const dbSport = resolveProgram({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base', experience: { gym: 'intermediate' }, access: ['dumbbell','bodyweight'] });
assert(dbSport.priorityByIntent instanceof Map, 'DB/sport priorityByIntent is a Map');

console.log(process.exitCode ? 'program-intents FAILURES' : `PASS: program-intents — ${pass} assertions`);
