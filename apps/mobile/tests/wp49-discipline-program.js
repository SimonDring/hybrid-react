// WP-49 (Plan 2 T2/T6): a build profile gets a discipline-driven program from resolveProgram —
// priority lifts led by the discipline's own priorityLifts, and `power` derived from the
// discipline's demand vector (explosiveStrength/power >= 0.6). An explicit `discipline` wins;
// otherwise (THE FLIP, T6) it is derived from strength_style (strength→powerlifting,
// bodybuilding/functional→hypertrophy, barbell-gated). EVERY build profile now carries a discipline.
import { resolveProgram } from '@performance-os/engine';

let pass = 0;
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; }

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const base = { goal_type: 'build', access: FULL, experience: { gym: 'advanced' } };

// --- powerlifting: leads with back_squat/bench/deadlift, power === false ---
const pl = resolveProgram({ ...base, discipline: 'powerlifting' });
assert(pl.discipline === 'powerlifting', 'program.discipline carries the discipline id (Task 3 reads this)');
assert(pl.style === 'powerlifting', 'style is set to the discipline id');
assert(pl.goalType === 'build', 'goalType stays build for a discipline profile');
assert(Array.isArray(pl.exercisePriority) && pl.exercisePriority.length > 0, 'exercisePriority is a non-empty list');
const plHead = pl.exercisePriority.slice(0, 3);
assert(plHead.includes('back_squat') && plHead.includes('bench') && plHead.includes('deadlift'),
  `powerlifting priority leads with the competition lifts, got: ${JSON.stringify(plHead)}`);
assert(pl.power === false, 'powerlifting power === false (explosiveStrength/power demand < 0.6)');
assert(pl.priorityByIntent && typeof pl.priorityByIntent.get === 'function', 'priorityByIntent is a Map, same shape resolveIntents produces');
assert(JSON.stringify(pl.emphasis) === '{}', 'emphasis stays {} for v1 (YAGNI — no accessoryPatterns->muscle mapping yet)');

// --- olympic: power === true (explosiveStrength 1.0 >= 0.6) ---
const oly = resolveProgram({ ...base, discipline: 'olympic' });
assert(oly.discipline === 'olympic', 'program.discipline carries olympic');
assert(oly.power === true, 'olympic power === true (explosiveStrength 1.0 >= 0.6)');
assert(oly.exercisePriority[0] === 'snatch', `olympic priority leads with snatch, got: ${oly.exercisePriority[0]}`);

// --- hypertrophy: power === false (no explosiveStrength/power quality in its demand vector) ---
const hyp = resolveProgram({ ...base, discipline: 'hypertrophy' });
assert(hyp.discipline === 'hypertrophy', 'program.discipline carries hypertrophy');
assert(hyp.power === false, 'hypertrophy power === false');

// --- THE FLIP (T6): a build profile with NO explicit discipline still resolves to one, derived
//     from strength_style. strength → powerlifting (has barbell); same return shape as an explicit
//     discipline (every build branch returns identical keys, including `discipline`). ---
const derived = resolveProgram({ ...base, strength_style: 'strength' });
assert(derived.discipline === 'powerlifting', `strength_style 'strength' (with barbell) derives powerlifting, got: ${derived.discipline}`);
assert(JSON.stringify(Object.keys(derived).sort()) === JSON.stringify(Object.keys(pl).sort()),
  `derived-discipline keys match explicit-discipline keys.\n  derived: ${JSON.stringify(Object.keys(derived).sort())}\n  disc:    ${JSON.stringify(Object.keys(pl).sort())}`);

// --- barbell gate (T6): strength (→powerlifting) WITHOUT a barbell falls back to hypertrophy ---
const noBar = resolveProgram({ goal_type: 'build', access: ['dumbbell', 'bodyweight'], experience: { gym: 'advanced' }, strength_style: 'strength' });
assert(noBar.discipline === 'hypertrophy', `a barbell-less strength profile falls back to hypertrophy, got: ${noBar.discipline}`);

// --- bodybuilding + functional both map to hypertrophy (functional's conditioning secondary is future) ---
assert(resolveProgram({ ...base, strength_style: 'bodybuilding' }).discipline === 'hypertrophy', 'bodybuilding → hypertrophy');
assert(resolveProgram({ ...base, strength_style: 'functional' }).discipline === 'hypertrophy', 'functional → hypertrophy');

console.log(process.exitCode ? 'wp49-discipline-program FAILURES' : `PASS: wp49-discipline-program — ${pass} assertions`);
