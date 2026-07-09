// tests/season-schema.js — season-phased SKB: validation of the seasonalModel.programming block.
import { validateSportProfile } from '@performance-os/engine/lib/sportKnowledge/schema.js';
import { sportKnowledge as skb } from '@performance-os/engine';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

const clone = () => JSON.parse(JSON.stringify(skb.get('running_middle')));
const validBlock = () => ({
  muscleEmphasis: { quads: 1.15, chest: 0.9, back: 1.0 },
  roundOutSessionsPerWeek: 1,
  roundOut: { mode: 'derive', dose: 'develop' },
  movementPolicy: { require: ['squat', 'hinge', 'horizontal_push'], maintainOnly: [], deprioritize: ['bilateral_spinal_loading'] },
  confidence: 'moderate', evidenceLevel: 'L3', source: 'test',
});
const errsFor = (mutate) => { const p = clone(); mutate(p); return validateSportProfile(p); };

// baseline: the real profile (no programming blocks) validates
assert(validateSportProfile(skb.get('running_middle')).length === 0, 'T0 unmigrated profile is valid (scaffold)');

// a well-formed block validates
assert(errsFor((p) => { p.seasonalModel.offSeason.programming = validBlock(); }).length === 0, 'T1 valid programming block passes');

// out-of-range emphasis fails
assert(errsFor((p) => { const b = validBlock(); b.muscleEmphasis.chest = 3; p.seasonalModel.offSeason.programming = b; })
  .some((e) => /muscleEmphasis\.chest/.test(e)), 'T2 emphasis > 2.0 fails');

// bad roundOut.mode fails
assert(errsFor((p) => { const b = validBlock(); b.roundOut.mode = 'x'; p.seasonalModel.offSeason.programming = b; })
  .some((e) => /roundOut\.mode/.test(e)), 'T3 roundOut.mode outside vocabulary fails');

// unknown movement-policy token fails
assert(errsFor((p) => { const b = validBlock(); b.movementPolicy.require = ['bogus']; p.seasonalModel.offSeason.programming = b; })
  .some((e) => /unknown token "bogus"/.test(e)), 'T4 unknown movementPolicy token fails');

// explicit mode with no targets fails
assert(errsFor((p) => { const b = validBlock(); b.roundOut = { mode: 'explicit', dose: 'develop' }; p.seasonalModel.offSeason.programming = b; })
  .some((e) => /explicit mode needs/.test(e)), 'T5 explicit mode without targets fails');

// missing provenance fails
assert(errsFor((p) => { const b = validBlock(); delete b.source; p.seasonalModel.offSeason.programming = b; })
  .some((e) => /source/.test(e)), 'T6 missing provenance fails');

// whole real registry still validates
assert(skb.validate().ok, 'T7 real SKB registry still valid');
