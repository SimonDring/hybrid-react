// tests/validation.js — pure input-validation rulebook.
import { num, oneOf, text } from '../src/lib/validation/validate.js';
import { LIMITS, ENUMS, TEXT_MAX } from '../src/lib/validation/rules.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ---- generic helpers -----------------------------------------------------
assert(num('', LIMITS.age, 'Age').value === null, 'H1 empty number → null, no error');
assert(num(30, LIMITS.age, 'Age').ok === true, 'H2 in-range number passes');
assert(num(999, LIMITS.age, 'Age').ok === false, 'H3 out-of-range number rejected');
assert(num(12.5, LIMITS.age, 'Age').ok === false, 'H4 non-integer rejected when int required');
assert(oneOf('strength', ENUMS.strength_style, 'Style').ok === true, 'H5 known enum passes');
assert(oneOf('ADMIN', ENUMS.strength_style, 'Style').ok === false, 'H6 unknown enum rejected');
assert(text('  hi  ', TEXT_MAX.name) === 'hi', 'H7 text trimmed');
assert(text('x'.repeat(5000), TEXT_MAX.notes).length === TEXT_MAX.notes, 'H8 text capped to max');
