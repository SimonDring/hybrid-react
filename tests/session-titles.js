// tests/session-titles.js
// F3: session titles must reflect contents. A mixed lower+upper session is
// "Full body"; a specific "X focus" only when one region clearly dominates, and
// the focus muscle always belongs to the labelled region.
import { focusLabel } from '../src/lib/plan/allocator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Squat + bench style distribution (meaningful lower AND upper) → Full body.
assert(focusLabel({ quads: 6, glutes: 3, chest: 6, triceps: 3, shoulders: 3 }) === 'Full body',
  'T1 mixed lower+upper session → Full body (was mislabelled "Upper · push")');

// Clearly lower-dominant → Lower body, focus muscle from the lower region.
assert(focusLabel({ quads: 10, glutes: 5, calves: 3, chest: 1 }) === 'Lower body · quads focus',
  'T2 dominant lower → "Lower body · quads focus"');

// Clearly push-dominant → Upper · push, focus muscle from the push region.
assert(focusLabel({ chest: 10, triceps: 5, shoulders: 4, quads: 1 }) === 'Upper · push · chest focus',
  'T3 dominant push → "Upper · push · chest focus"');

// Clearly pull-dominant → Upper · pull.
assert(focusLabel({ back: 10, biceps: 5, quads: 1 }) === 'Upper · pull · back focus',
  'T4 dominant pull → "Upper · pull · back focus"');

// No region clearly leads → Full body (never a misleading single-region label).
assert(focusLabel({ quads: 4, chest: 4, back: 4 }) === 'Full body',
  'T5 three balanced regions → Full body');

// Empty / zero volume → Full body fallback.
assert(focusLabel({}) === 'Full body', 'T6 empty volume → Full body');

console.log('session-titles tests done');
