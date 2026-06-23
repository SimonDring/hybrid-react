// tests/session-titles.js
// Session titles must be SIMPLE and reflect what the session actually trains:
// Upper / Lower / Push / Pull / Full body / Core — no jargon, no per-muscle suffix.
import { focusLabel } from '@performance-os/engine/lib/plan/allocator.js';

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

console.log('session-titles tests done');
