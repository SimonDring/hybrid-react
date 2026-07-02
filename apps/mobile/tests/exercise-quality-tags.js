// tests/exercise-quality-tags.js — Sprint 5: every exercise is tagged by physical
// quality/adaptation + force-velocity + fatigue cost. PARALLEL knowledge (nothing in
// generatePlan reads it) — see the golden masters for the "unchanged live plan" proof.
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { exerciseQualities, FORCE_VELOCITY } from '@performance-os/engine/data/exerciseQualities.js';
import { exerciseQualities as barrelAccessor } from '@performance-os/engine';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { adaptationIds } from '@performance-os/engine/data/adaptations.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const QSET = new Set(qualityIds());
const ASET = new Set(adaptationIds());
const COST_LEVELS = new Set(['low', 'moderate', 'high']);

// Coverage: every exercise resolves, with at least one PRIMARY quality.
let covered = 0;
for (const ex of EXERCISES) {
  const t = exerciseQualities(ex.id);
  assert(t !== null, `${ex.id} is tagged`);
  if (!t) continue;
  covered++;
  assert(Array.isArray(t.qualities) && t.qualities.some((q) => q.role === 'primary'),
    `${ex.id} has ≥1 primary quality`);
  for (const q of t.qualities) assert(QSET.has(q.id), `${ex.id} quality "${q.id}" is a real quality`);
  for (const a of t.adaptations) assert(ASET.has(a), `${ex.id} adaptation "${a}" is a real adaptation`);
  assert(FORCE_VELOCITY.includes(t.forceVelocity), `${ex.id} forceVelocity "${t.forceVelocity}" is in the vocab`);
  assert(t.fatigueCost && COST_LEVELS.has(t.fatigueCost.neural) && COST_LEVELS.has(t.fatigueCost.metabolic) && COST_LEVELS.has(t.fatigueCost.mechanical),
    `${ex.id} fatigueCost is a valid {neural,metabolic,mechanical}`);
  assert(t.evidence && t.evidence.needsReview === true && t.evidence.level === 'seed',
    `${ex.id} carries honest seed evidence (needsReview)`);
}
assert(covered === EXERCISES.length, `all ${EXERCISES.length} exercises covered (got ${covered})`);

// Determinism: two calls are byte-identical (pure).
const sample = EXERCISES[0].id;
assert(JSON.stringify(exerciseQualities(sample)) === JSON.stringify(exerciseQualities(sample)),
  'accessor is deterministic');

// Null-safe on an unknown id.
assert(exerciseQualities('not_a_real_exercise') === null, 'unknown id → null');

// The barrel re-exports the same accessor.
assert(JSON.stringify(barrelAccessor(sample)) === JSON.stringify(exerciseQualities(sample)),
  'barrel export matches the module accessor');

// Spot-checks: the diagnosis must be able to find these.
assert(exerciseQualities('back_squat').qualities[0].id === 'maxStrength', 'back squat → maxStrength primary');
assert(exerciseQualities('depth_jump').qualities[0].id === 'reactiveStrength', 'depth jump → reactiveStrength primary');
assert(exerciseQualities('plank').qualities[0].id === 'stability', 'plank → stability primary');
assert(exerciseQualities('calf_raise').qualities[0].id === 'strengthEndurance', 'calf raise → strengthEndurance primary');
assert(exerciseQualities('biceps_curl').qualities[0].id === 'hypertrophy', 'biceps curl → hypertrophy primary');
