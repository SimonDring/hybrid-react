import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const P = (o) => ({ goal_type: 'build', strength_style: 'strength', experience: { gym: 'advanced' }, access: o.access });

const full = resolveProgram(P({ access: ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'] }));
assert(full.exercisePriority[0] === 'back_squat', `full-gym strength still leads back_squat (got ${full.exercisePriority[0]})`);
assert(full.priorityByIntent instanceof Map, 'priorityByIntent is a Map');

const db = resolveProgram(P({ access: ['dumbbell','bodyweight'] }));
assert(db.exercisePriority.length >= 8, `DB strength priority no longer ~1 (got ${db.exercisePriority.length})`);
assert(db.exercisePriority.includes('db_bench') && !db.exercisePriority.includes('bench'), 'DB strength uses db_bench, not bench');

console.log(process.exitCode ? 'program-intents FAILURES' : `PASS: program-intents — ${pass} assertions`);
