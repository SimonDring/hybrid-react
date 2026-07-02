// tests/quality-movement-map.js — Sprint 7: quality → movement-requirement knowledge (D10 input).
import { QUALITY_MOVEMENT, CARDIO_GYM_SUPPORT, GYM_TRAINABLE, movementRequirementsFor } from '@performance-os/engine/data/qualityMovementMap.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { FORCE_VELOCITY } from '@performance-os/engine/data/exerciseQualities.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const PATTERN_VOCAB = new Set(EXERCISES.map((e) => e.pattern));

// Every quality is mapped.
for (const q of qualityIds()) {
  const e = movementRequirementsFor(q);
  assert(e, `${q} has a movement-requirement entry`);
  if (!e) continue;
  assert(Array.isArray(e.movementPatterns) && e.movementPatterns.length > 0, `${q} has movement patterns`);
  for (const p of e.movementPatterns) assert(PATTERN_VOCAB.has(p), `${q} pattern "${p}" is a real exercise pattern`);
  assert(FORCE_VELOCITY.includes(e.forceVelocity), `${q} forceVelocity "${e.forceVelocity}" is in the vocab`);
  assert(typeof e.contraction === 'string' && e.contraction.length, `${q} has a contraction emphasis`);
  assert(e.evidence && e.evidence.needsReview === true, `${q} carries honest seed evidence`);
}

// Cardio qualities carry a gym-support note and a translation to gym-trainable qualities.
for (const c of ['aerobicCapacity', 'anaerobicCapacity']) {
  assert(Array.isArray(CARDIO_GYM_SUPPORT[c]) && CARDIO_GYM_SUPPORT[c].length, `${c} translates to gym-support qualities`);
  for (const s of CARDIO_GYM_SUPPORT[c]) assert(GYM_TRAINABLE.has(s), `${c} support "${s}" is gym-trainable`);
}

// GYM_TRAINABLE is exactly the 8 non-cardio qualities.
assert(GYM_TRAINABLE.size === 8 && !GYM_TRAINABLE.has('aerobicCapacity') && !GYM_TRAINABLE.has('anaerobicCapacity'),
  'GYM_TRAINABLE excludes the two cardio qualities');

// Spot-checks tying to the EDS runner/sprinter prescription.
assert(movementRequirementsFor('robustness').contraction === 'eccentric-emphasis', 'robustness → eccentric emphasis');
assert(movementRequirementsFor('explosiveStrength').forceVelocity === 'strength-speed', 'explosive → strength-speed');
assert(CARDIO_GYM_SUPPORT.aerobicCapacity.includes('robustness'), 'aerobic support includes robustness (durability/economy)');

assert(movementRequirementsFor('not_a_quality') === null, 'unknown quality → null');
