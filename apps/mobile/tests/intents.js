import { BUILD_INTENTS, resolveIntents } from '@performance-os/engine/lib/strength/priorityIntents.js';
import { availableEquip, LEVELS } from '@performance-os/engine/data/strengthExercises.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

const FULL = availableEquip(['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight']);
const DB = availableEquip(['dumbbell','bodyweight']);

// Full-gym strength reproduces today's curated heads, in order.
const CURRENT_STRENGTH = ['back_squat','deadlift','bench','pause_squat','rack_pull','deficit_deadlift','jm_press','close_grip_bench','floor_press','barbell_row','ohp','trap_bar_dl','front_squat','hip_thrust','farmer_carry','ab_wheel','seated_box_jump'];
const full = resolveIntents(BUILD_INTENTS.strength, FULL, LEVELS.advanced);
assert(JSON.stringify(full.list) === JSON.stringify(CURRENT_STRENGTH), `full-gym strength == current list (got ${full.list.join(',')})`);

// DB-only strength: curated DB substitutes, never the barbell heads.
const db = resolveIntents(BUILD_INTENTS.strength, DB, LEVELS.advanced);
assert(db.list.length >= 8, `DB strength resolves a full list (got ${db.list.length})`);
['back_squat','deadlift','bench','barbell_row','ohp'].forEach(id => assert(!db.list.includes(id), `DB list excludes barbell ${id}`));
['goblet_squat','db_rdl','db_bench','db_row','db_ohp'].forEach(id => assert(db.list.includes(id), `DB list includes ${id}`));

// byIntent exposes the full equipment-available chain for axial fallback.
const hpull = db.byIntent.get('h_pull') || [];
assert(hpull.includes('chest_supported_row'), `h_pull byIntent has chest_supported_row (got ${hpull.join(',')})`);

console.log(process.exitCode ? 'intents FAILURES' : `PASS: intents — ${pass} assertions`);
