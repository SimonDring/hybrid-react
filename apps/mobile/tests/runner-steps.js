// tests/runner-steps.js — buildSteps gated by the Task-1 classifier (Sprint 2 Task 2).
//
// buildSteps expands a session into runner steps. Mobility/rehab items become a single
// simple "prep" (Done) step instead of per-set steps; loadable core work gets an enabled
// weight stepper + RPE alongside its reps; classic strength is unchanged; items the
// classifier can't resolve keep legacy (full-collection) behaviour. This lives in a plain
// module (not the JSX screen) so it can be exercised under node without a JSX parser.

import { buildSteps } from '../src/lib/runnerSteps.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

const session = {
  items: [
    { name: 'Cat-Camel + Thoracic Rotation', exId: 'cat_camel_thoracic', sets: '2 × 8', section: 'main' },
    { name: 'Pallof press', exId: 'pallof', sets: '3 × 10', section: 'main', restSec: 60 },
    { name: 'Back squat', exId: 'back_squat', sets: '4 × 5', weight: '80 kg', rpe: 'RPE 8', section: 'main', restSec: 180 },
  ],
};

const steps = buildSteps(session);

// --- Mobility item → ONE prep step, not per-set steps ---

const catCamelSteps = steps.filter((s) => s.exerciseName === 'Cat-Camel + Thoracic Rotation');
assert(catCamelSteps.length === 1, 'cat-camel produces exactly one step');
assert(catCamelSteps[0].kind === 'prep', 'cat-camel step is a prep (Done) step, not a set step');

// --- Loadable core (Pallof, cable/band equip) → 3 set steps, weight + RPE collected ---

const pallofSteps = steps.filter((s) => s.exerciseName === 'Pallof press');
assert(pallofSteps.length === 3, 'pallof produces 3 set steps');
assert(pallofSteps.every((s) => s.kind === 'set' && s.collectWeight === true && s.collectRpe === true),
  'pallof set steps collect weight and RPE');

// --- Classic strength (back squat) → 4 set steps, weight + RPE collected (unchanged) ---

const squatSteps = steps.filter((s) => s.exerciseName === 'Back squat');
assert(squatSteps.length === 4, 'back squat produces 4 set steps');
assert(squatSteps.every((s) => s.kind === 'set' && s.collectWeight === true && s.collectRpe === true),
  'back squat set steps collect weight and RPE (unchanged legacy behaviour)');

// --- Off-catalogue item → unresolvable, keeps legacy (full-collection) behaviour ---

const legacySession = { items: [{ name: 'Mystery Lift', sets: '3 × 8', section: 'main' }] };
const legacySteps = buildSteps(legacySession);
assert(legacySteps.length === 3, 'off-catalogue item still produces 3 legacy set steps');
assert(legacySteps.every((s) => s.kind === 'set' && s.collectRpe === true && s.collectWeight === true),
  'off-catalogue item keeps legacy full-collection behaviour');

// --- REGRESSION: a simple-done (mobility) member paired into a SUPERSET must not vanish ---
//
// Catalogue mobility items can reach a superset group with an "N × R" dose string
// (they lack loadClass, so structureItems' isSupportive misses them). Before the
// classifier gate they wrongly appeared as strength sets; with the gate, makeSetSteps
// returns [] for them — so the multi-item branch must surface them as ONE prep (Done)
// step and interleave rounds only over the remaining members, never drop them.

const supersetSession = {
  items: [
    { name: 'Cat-Camel + Thoracic Rotation', exId: 'cat_camel_thoracic', sets: '2 × 8', section: 'main', superset: true, group: 'A' },
    { name: 'Single-arm dumbbell row', sets: '3 × 10', section: 'main', superset: true, group: 'A', restSec: 90 },
  ],
};
const ssSteps = buildSteps(supersetSession);

const ssMobility = ssSteps.filter((s) => s.exerciseName === 'Cat-Camel + Thoracic Rotation');
assert(ssMobility.length === 1, 'superset-paired mobility member surfaces exactly once (not dropped)');
assert(ssMobility[0].kind === 'prep', 'superset-paired mobility member surfaces as a prep (Done) step');

const ssRows = ssSteps.filter((s) => s.exerciseName === 'Single-arm dumbbell row');
assert(ssRows.length === 3, 'remaining superset member still produces its 3 set steps');
assert(ssRows.every((s) => s.kind === 'set' && s.restSec === 90),
  'effectively-solo superset member keeps its own rest on every round (last-of-round rule)');

console.log(process.exitCode ? 'runner-steps FAILURES' : `PASS: runner-steps — ${pass} assertions`);
