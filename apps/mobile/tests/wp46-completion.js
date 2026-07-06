// tests/wp46-completion.js — WP-46 (completion): the fuzzy plan-path joins key on exId.
//
// The remaining name-fuzzy joins (matchLift → which barbell lift a set logs against, and the
// allocator's core hold-vs-reps regex) are now governed id-keyed maps (PROGRESSION_LIFTS,
// CORE_HOLDS), keyed by exId so a display-name change can't break top-set tracking or the core
// scheme. Name matching stays as the fallback for un-stamped items. This test pins PARITY (the
// maps reproduce the old matchers EXACTLY — hence byte-identical plans) and rename-resilience.

import { EXERCISES, PROGRESSION_LIFTS, CORE_HOLDS } from '@performance-os/engine/data/strengthExercises.js';
import { matchLift, matchLiftForItem, trackedLiftsInSession } from '@performance-os/engine';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── PARITY (1): PROGRESSION_LIFTS reproduces matchLift over the WHOLE catalogue ──
let progMismatch = 0;
for (const e of EXERCISES) {
  const viaName = matchLift(e.name);
  const viaId = PROGRESSION_LIFTS[e.id] || null;
  const same = (viaName == null && viaId == null) ||
    (viaName && viaId && viaName.key === viaId.key && viaName.factor === viaId.factor);
  if (!same) { progMismatch++; console.error(`  ✗ ${e.id} "${e.name}": name=${JSON.stringify(viaName)} vs id=${JSON.stringify(viaId)}`); }
}
assert(progMismatch === 0, `PROGRESSION_LIFTS reproduces matchLift for all ${EXERCISES.length} exercises (${progMismatch} mismatch)`);

// ── PARITY (2): CORE_HOLDS reproduces the hold regex over the core catalogue ─────
const HOLD_RE = /plank|hold|dead bug|copenhagen|hollow|bird dog/i;
let holdMismatch = 0;
for (const e of EXERCISES) {
  if (e.pattern !== 'core') continue;
  if (CORE_HOLDS.has(e.id) !== HOLD_RE.test(e.name)) { holdMismatch++; console.error(`  ✗ ${e.id} "${e.name}": set=${CORE_HOLDS.has(e.id)} regex=${HOLD_RE.test(e.name)}`); }
}
assert(holdMismatch === 0, `CORE_HOLDS reproduces the hold regex for all core exercises (${holdMismatch} mismatch)`);

// ── rename-resilience: matchLiftForItem follows the exId, not the name ───────────
assert(JSON.stringify(matchLiftForItem({ exId: 'bench', name: 'ZZZ Totally Renamed' })) === JSON.stringify({ key: 'bench', factor: 1 }),
  'matchLiftForItem tracks bench by exId under a renamed name');
assert(JSON.stringify(matchLiftForItem({ exId: 'front_squat', name: 'whatever' })) === JSON.stringify({ key: 'squat', factor: 0.85 }),
  'front squat keeps its 0.85 factor by exId');
// fallback for un-stamped items (no exId) still uses the name matcher.
assert(JSON.stringify(matchLiftForItem({ name: 'Bench press' })) === JSON.stringify(matchLift('Bench press')),
  'un-stamped item falls back to the name matcher');
assert(matchLiftForItem({ exId: 'plank', name: 'Plank' }) === null, 'a non-tracked lift (plank) returns null');

// ── integration: trackedLiftsInSession survives a rename (exId kept) ─────────────
const renamed = { items: [{ exId: 'bench', name: 'ZZZ Renamed Press', sets: '3 × 5', rpe: 'RPE 8' }] };
const tracked = trackedLiftsInSession(renamed);
assert(tracked.length === 1 && tracked[0].key === 'bench' && tracked[0].factor === 1,
  `a renamed bench is still logged as a bench top-set (${JSON.stringify(tracked.map((t) => t.key))})`);

console.log(process.exitCode ? 'wp46-completion FAILURES' : `PASS: wp46-completion — ${pass} assertions`);
