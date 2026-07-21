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

console.log(process.exitCode ? 'runner-steps FAILURES' : `PASS: runner-steps — ${pass} assertions`);
