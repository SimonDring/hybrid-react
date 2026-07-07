// WP-49 (Plan 2 T2): a profile carrying `discipline` gets a discipline-driven program from
// resolveProgram — priority lifts led by the discipline's own priorityLifts (not the legacy
// style-based BUILD_INTENTS list), and `power` derived from the discipline's demand vector
// (explosiveStrength/power >= 0.6), not the legacy `style === 'functional'` rule.
//
// Profiles WITHOUT `discipline` must fall through to the unchanged legacy branch — that's
// checked at the golden-master level (byte-identical for every existing archetype), not here.
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

// --- return shape parity: same keys as the legacy build branch, plus `discipline` ---
const legacyBuild = resolveProgram({ ...base, strength_style: 'strength' });
const legacyKeys = Object.keys(legacyBuild).sort();
const discKeys = Object.keys(pl).filter(k => k !== 'discipline').sort();
assert(JSON.stringify(legacyKeys) === JSON.stringify(discKeys),
  `discipline branch keys (minus 'discipline') must match legacy branch keys.\n  legacy: ${JSON.stringify(legacyKeys)}\n  disc:   ${JSON.stringify(discKeys)}`);

// --- opt-in guard: no discipline field -> untouched legacy branch (no `discipline` key at all) ---
assert(!('discipline' in legacyBuild), 'a profile without `discipline` must not gain a discipline key (legacy branch untouched)');

console.log(process.exitCode ? 'wp49-discipline-program FAILURES' : `PASS: wp49-discipline-program — ${pass} assertions`);
