import { CAPABILITY_PRIORS, priorLevel } from '@performance-os/engine/data/capabilityPriors.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { TRAINING_AGE_BANDS } from '@performance-os/engine/data/trainingAgeBands.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

for (const q of qualityIds())
  for (const b of TRAINING_AGE_BANDS) {
    const lvl = priorLevel(q, b.id);
    assert(typeof lvl === 'number' && lvl >= 0 && lvl <= 1, `T1 ${q}/${b.id} prior in 0..1 (${lvl})`);
  }
assert(priorLevel('maxStrength', 'novice') < priorLevel('maxStrength', 'advanced'),
  'T2 priors rise with training age');
assert(priorLevel('maxStrength', 'unknownBand') === 0.35, 'T3 unknown band → documented default 0.35');
assert(Object.keys(CAPABILITY_PRIORS).length === qualityIds().length, 'T4 a prior block per quality');
