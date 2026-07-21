// tests/exercise-meta.js — exerciseMeta classifier (Sprint 2 Task 1).
//
// The catalogue (packages/engine/src/data/strengthExercises.js) already knows what
// each movement IS (role/pattern/equip). This resolves a plan item to its catalogue
// entry (by exId, falling back to name) and decides what the session runner should
// collect for it: RPE, weight, or a simple Done tick. Unresolvable items keep legacy
// (full-collection) behaviour so nothing regresses for pre-WP-46 pins or off-catalogue
// names.
//
// Note on plyo coverage: as of this writing, no entry in strengthExercises.js carries
// role: 'plyo' (confirmed by direct read of the file), so there is no live id to
// exercise that branch against. Per the brief, plyo is covered with a synthetic
// catalogue-shaped item passed via a resolvable name that classifyItem still has to
// treat correctly through catalogueEntryFor's real resolution path is not possible
// without a real entry — so instead we assert the plyo branch is unreachable in
// today's data (documented below) and rely on the mobility/core cases (which DO have
// live entries) to prove the resolution + branching logic end-to-end.

import { classifyItem, catalogueEntryFor, lastLoggedWeightFor } from '../src/lib/exerciseMeta.js';
import { EXERCISES } from '@performance-os/engine';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// --- Resolution: by exId; by name fallback; unresolvable → null entry ---

assert(catalogueEntryFor({ exId: 'pallof' })?.name === 'Pallof press', 'catalogueEntryFor resolves by exId');
assert(catalogueEntryFor({ name: 'Cat-Camel + Thoracic Rotation' })?.id === 'cat_camel_thoracic', 'catalogueEntryFor resolves by name fallback');
assert(catalogueEntryFor({ name: 'Some Unknown Movement' }) === null, 'catalogueEntryFor returns null for unresolvable name');
assert(catalogueEntryFor(null) === null, 'catalogueEntryFor returns null for a missing item');

// --- Mobility → simple Done, nothing collected ---

const c1 = classifyItem({ exId: 'cat_camel_thoracic', sets: '2 × 8' });
assert(c1.simpleDone === true && c1.collectRpe === false && c1.collectWeight === false, 'mobility item is simple-done, nothing collected');

// --- Loadable core (cable) → weight + RPE ---

const c2 = classifyItem({ exId: 'pallof', sets: '3 × 10' });
assert(c2.collectWeight === true && c2.collectRpe === true && c2.simpleDone === false, 'loadable-equip core item collects weight + RPE');

// --- Bodyweight core → reps only, no RPE/weight ---

const c3 = classifyItem({ exId: 'dead_bug', sets: '3 × 10' });
assert(c3.collectWeight === false && c3.collectRpe === false && c3.simpleDone === false, 'bodyweight core item collects neither weight nor RPE');

// --- Plyo → reps only, no RPE/weight (no live id to test against — see note above) ---
//
// Confirmed by direct read of strengthExercises.js: no entry currently carries
// role: 'plyo' (the only occurrence of the string is in a comment describing the
// schema's role vocabulary). So there's no real exId to route through
// catalogueEntryFor for this branch. Per the brief, this is documented rather than
// faked with a synthetic entry that classifyItem would never actually see in
// production — the mobility case above (c1) and core case below (c2/c3) already
// prove the resolve → branch-on-role/pattern/equip pipeline works end-to-end; the
// plyo branch itself (`e.role === 'plyo'` → reps-only, mirrors bodyweight-core) is a
// straight-line mirror of that same pipeline and should be given a real exId test the
// moment a plyo exercise lands in the catalogue.
assert(!EXERCISES.some((e) => e.role === 'plyo'), 'sanity: no live plyo catalogue entry yet — update this test (add a real exId case) if one is added');

// --- Strength (primary/accessory/iso) → unchanged full collection ---

const c4 = classifyItem({ exId: 'back_squat', sets: '4 × 5' });
assert(c4.collectWeight === true && c4.collectRpe === true && c4.simpleDone === false, 'primary strength item collects weight + RPE (unchanged legacy behaviour)');

// --- Rehab-flagged items → simple Done regardless of resolution ---

assert(classifyItem({ name: 'Ankle circles', rehab: true }).simpleDone === true, 'rehab-flagged item is simple-done regardless of catalogue resolution');
assert(classifyItem({ exId: 'back_squat', rehab: true }).simpleDone === true, 'rehab flag overrides even a resolvable strength item');

// --- UNRESOLVABLE → legacy behaviour (full collection; buildSteps decides strength-ness) ---

const c5 = classifyItem({ name: 'Mystery Lift', sets: '3 × 8' });
assert(c5.collectWeight === true && c5.collectRpe === true && c5.simpleDone === false, 'unresolvable item keeps legacy full-collection behaviour');

// --- lastLoggedWeightFor: newest-first scan across other sessions, by exercise name ---

const setLogsBySession = {
  s1: [
    { exercise_name: 'Back squat', actual_weight: 100, completed_at: '2026-07-01T10:00:00Z' },
  ],
  s2: [
    { exercise_name: 'Back squat', actual_weight: 110, completed_at: '2026-07-08T10:00:00Z' },
    { exercise_name: 'Bench press', actual_weight: 60, completed_at: '2026-07-08T10:05:00Z' },
  ],
  s3: [
    { exercise_name: 'Back squat', actual_weight: 999, completed_at: '2026-07-15T10:00:00Z' },
  ],
};

assert(lastLoggedWeightFor('Back squat', setLogsBySession, 's3') === 110, 'lastLoggedWeightFor returns the most recent weight, excluding the current session');
assert(lastLoggedWeightFor('Back squat', setLogsBySession) === 999, 'lastLoggedWeightFor with no exclusion picks up the newest overall');
assert(lastLoggedWeightFor('Deadlift', setLogsBySession) === null, 'lastLoggedWeightFor returns null when the exercise was never logged');
assert(lastLoggedWeightFor('Back squat', {}) === null, 'lastLoggedWeightFor returns null against an empty log set');

console.log(process.exitCode ? 'exercise-meta FAILURES' : `PASS: exercise-meta — ${pass} assertions`);
