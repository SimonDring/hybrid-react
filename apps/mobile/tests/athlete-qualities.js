import { QUALITIES, qualityIds, getQuality } from '@performance-os/engine/data/qualities.js';
import { ADAPTATIONS, adaptationIds } from '@performance-os/engine/data/adaptations.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ids = qualityIds();
assert(ids.includes('maxStrength') && ids.includes('reactiveStrength') && ids.includes('aerobicCapacity'),
  'T1 core qualities present');
assert(QUALITIES.length >= 10, 'T2 at least 10 seed qualities');

const adaptSet = new Set(adaptationIds());
for (const q of QUALITIES) {
  assert(q.id && q.family && Array.isArray(q.adaptations) && q.assessment,
    `T3 ${q.id} has required fields`);
  assert(q.fatigueCost && q.recoveryTimeH != null,
    `T4 ${q.id} has fatigue cost + recovery time`);
  for (const a of q.adaptations)
    assert(adaptSet.has(a), `T5 ${q.id} adaptation "${a}" exists in ADAPTATIONS`);
  for (const p of q.prerequisites)
    assert(ids.includes(p), `T6 ${q.id} prerequisite "${p}" is a valid quality`);
}
assert(getQuality('maxStrength').prerequisites.length === 0, 'T7 maxStrength has no prereqs');
assert(getQuality('reactiveStrength').prerequisites.includes('maxStrength'),
  'T8 reactive strength requires a max-strength base');
