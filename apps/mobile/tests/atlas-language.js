// tests/atlas-language.js
// atlasLanguage — plain-English rendering of the engine's D4 limiting factor.
// The engine's diagnosis is unchanged; this layer only changes the REGISTER it's
// presented in. The numbers stay available (raw, unsoftened) in `detail` — Art 14.
import { explainFocus } from '../src/lib/atlasLanguage.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const lf = {
  qualityId: 'maxStrength', magnitude: 0.12, demandImportance: 0.9,
  capabilityLevel: 0.67, confidence: 'moderate', trainability: 0.6, injuryRisk: 1,
  rationale: 'demands maxStrength at 0.9; your level is 0.67 (measured) — gap 0.23.',
};
const out = explainFocus(lf, { sportLabel: 'Rugby' });

assert(/strength/i.test(out.headline), 'T1 headline mentions strength');
assert(!/\d\.\d/.test(out.headline), 'T2 headline has no decimals');

assert(typeof out.meaning === 'string' && out.meaning.length > 0, 'T3 meaning is a non-empty sentence');
assert(!out.meaning.includes('0.9'), 'T4 meaning does not leak the raw demandImportance number');
assert(!/demandImportance/.test(out.meaning), 'T5 meaning does not leak the field name');

assert(/rugby/i.test(out.whyItMatters), 'T6 whyItMatters mentions the sport');

assert(out.detail.includes('67') && out.detail.includes('90'), 'T7 detail contains the raw numbers');
assert(/long-term benchmark/.test(out.detail), 'T8 detail contains "long-term benchmark"');

// ---- gap banding ----------------------------------------------------------
const mk = (capabilityLevel, demandImportance, extra = {}) => ({
  qualityId: 'maxStrength', magnitude: 0.1, demandImportance, capabilityLevel,
  confidence: 'moderate', trainability: 0.65, injuryRisk: 1,
  rationale: 'r', ...extra,
});

const close = explainFocus(mk(0.85, 0.9), { sportLabel: 'Rugby' }); // gap 0.05 <= 0.08
assert(/close/.test(close.meaning), 'T9 gap <= 0.08 meaning includes "close"');

const trainable = explainFocus(mk(0.7, 0.9), { sportLabel: 'Rugby' }); // gap 0.2, in (0.08, 0.25]
assert(/trainable/.test(trainable.meaning), 'T10 gap in (0.08, 0.25] meaning includes "trainable"');

const biggest = explainFocus(mk(0.5, 0.9), { sportLabel: 'Rugby' }); // gap 0.4 > 0.25
assert(/biggest lever/.test(biggest.meaning), 'T11 gap > 0.25 meaning includes "biggest lever"');

// ---- trainability register ------------------------------------------------
const fast = explainFocus(mk(0.5, 0.9, { trainability: 0.85 }), { sportLabel: 'Rugby' });
assert(/fast/.test(fast.meaning), 'T12 trainability >= 0.8 meaning includes "fast"');

const slow = explainFocus(mk(0.5, 0.9, { trainability: 0.4 }), { sportLabel: 'Rugby' });
assert(/consisten/.test(slow.meaning), 'T13 trainability <= 0.5 meaning includes "consisten(cy/t)"');

// ---- met demand -> maintain framing ----------------------------------------
const met = explainFocus(mk(0.9, 0.8), { sportLabel: 'Rugby' }); // capabilityLevel >= demandImportance
assert(/strong where it counts|keep it topped up/i.test(met.headline) && !/opportunity/i.test(met.headline),
  'T14 met demand headline is a "maintain" framing, not an "opportunity" one');

// ---- unknown qualityId falls back gracefully -------------------------------
let threw = false;
let unknownOut;
try {
  unknownOut = explainFocus(mk(0.5, 0.9, { qualityId: 'someWeirdQuality' }), { sportLabel: 'Rugby' });
} catch {
  threw = true;
}
assert(!threw, 'T15 unknown qualityId does not throw');
assert(unknownOut && /someWeirdQuality/i.test(unknownOut.headline), 'T16 unknown qualityId falls back to the id as label');

console.log('atlas-language tests done');
