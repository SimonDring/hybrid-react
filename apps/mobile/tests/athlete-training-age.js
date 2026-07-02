import { TRAINING_AGE_BANDS, bandForYears, legacyLevelForBand, bandForLegacyLevel }
  from '@performance-os/engine/data/trainingAgeBands.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(TRAINING_AGE_BANDS.length === 4, 'T1 four bands defined');
assert(bandForYears(0.5) === 'novice', 'T2 0.5y → novice');
assert(bandForYears(2) === 'intermediate', 'T3 2y → intermediate');
assert(bandForYears(4) === 'advanced', 'T4 4y → advanced');
assert(bandForYears(8) === 'highlyAdvanced', 'T5 8y → highlyAdvanced');
assert(bandForYears(null) === null, 'T6 unknown years → null (no assumption)');
assert(legacyLevelForBand('novice') === 'beginner', 'T7 novice → beginner');
assert(legacyLevelForBand('highlyAdvanced') === 'advanced', 'T8 highlyAdvanced → advanced');
assert(bandForLegacyLevel('beginner') === 'novice', 'T9 beginner → novice (bijection base)');
assert(bandForLegacyLevel('intermediate') === 'intermediate', 'T10 intermediate → intermediate');
