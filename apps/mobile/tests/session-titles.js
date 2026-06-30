// tests/session-titles.js
// Session titles must be SIMPLE and reflect what the session actually trains:
// Upper / Lower / Push / Pull / Full body / Core — no jargon, no per-muscle suffix.
// Sport + functional plans may append a QUALITY tag (Power / Explosive) — see below.
import { focusLabel, qualityTag } from '@performance-os/engine/lib/plan/allocator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Meaningful work in BOTH halves of the body → Full body.
assert(focusLabel({ quads: 6, glutes: 3, chest: 6, triceps: 3, shoulders: 3 }) === 'Full body',
  'T1 mixed lower+upper session → Full body');

// Clearly lower-dominant → Lower.
assert(focusLabel({ quads: 10, glutes: 5, calves: 3, chest: 1 }) === 'Lower',
  'T2 dominant lower → "Lower"');

// Press-dominant upper → Push.
assert(focusLabel({ chest: 10, triceps: 5, shoulders: 4, quads: 1 }) === 'Push',
  'T3 dominant press → "Push"');

// Pull-dominant upper → Pull.
assert(focusLabel({ back: 10, biceps: 5, quads: 1 }) === 'Pull',
  'T4 dominant pull → "Pull"');

// Upper day doing BOTH press and pull → Upper.
assert(focusLabel({ chest: 6, shoulders: 3, back: 6, biceps: 3 }) === 'Upper',
  'T5 balanced press + pull (no legs) → "Upper"');

// Meaningful lower AND upper, balanced → Full body.
assert(focusLabel({ quads: 4, chest: 4, back: 4 }) === 'Full body',
  'T6 lower + upper present → Full body');

// Core-dominant → Core.
assert(focusLabel({ core: 8, quads: 1 }) === 'Core', 'T7 dominant core → "Core"');

// Empty / zero volume → Full body fallback.
assert(focusLabel({}) === 'Full body', 'T8 empty volume → Full body');

// ── Quality tag (appended to the region label for sport + functional plans) ──
const W = (quality) => ({ ex: { quality }, item: { volumeFactor: 1 } });

// Build/strength plans never get a quality tag, even with power work present.
assert(qualityTag([W('power'), W('general')], 'strength') === '', 'Q1 strength → no tag');
assert(qualityTag([W('power'), W('general')], 'bodybuilding') === '', 'Q2 bodybuilding → no tag');

// Sport/functional with no power work → no tag.
assert(qualityTag([W('general'), W('general')], 'sport') === '', 'Q3 sport, no power → no tag');

// Sport with SOME power work but not power-led → "Power".
assert(qualityTag([W('general'), W('general'), W('power')], 'sport') === 'Power',
  'Q4 sport, minority power → "Power"');

// Sport that OPENS on power and is mostly power → "Explosive".
assert(qualityTag([W('power'), W('power'), W('general')], 'sport') === 'Explosive',
  'Q5 sport, power-led → "Explosive"');

// Functional carries power too.
assert(qualityTag([W('general'), W('power')], 'functional') === 'Power', 'Q6 functional power → "Power"');

// Finisher/mobility power (volumeFactor 0) does not count as working power.
assert(qualityTag([{ ex: { quality: 'power' }, item: { volumeFactor: 0 } }], 'sport') === '',
  'Q7 factor-0 power (finisher) → no tag');

console.log('session-titles tests done');
