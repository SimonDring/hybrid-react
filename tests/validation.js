// tests/validation.js — pure input-validation rulebook.
import { num, oneOf, text, validateProfile, validateDailyMetric, validateSessionLog, validateInjury } from '../src/lib/validation/validate.js';
import { LIMITS, ENUMS, TEXT_MAX } from '../src/lib/validation/rules.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ---- generic helpers -----------------------------------------------------
const h1 = num('', LIMITS.age, 'Age');
assert(h1.ok === true && h1.value === null, 'H1 empty number → null, no error');
assert(num(30, LIMITS.age, 'Age').ok === true, 'H2 in-range number passes');
assert(num(999, LIMITS.age, 'Age').ok === false, 'H3 out-of-range number rejected');
assert(num(12.5, LIMITS.age, 'Age').ok === false, 'H4 non-integer rejected when int required');
assert(oneOf('strength', ENUMS.strength_style, 'Style').ok === true, 'H5 known enum passes');
assert(oneOf('ADMIN', ENUMS.strength_style, 'Style').ok === false, 'H6 unknown enum rejected');
assert(text('  hi  ', TEXT_MAX.name) === 'hi', 'H7 text trimmed');
assert(text('x'.repeat(5000), TEXT_MAX.notes).length === TEXT_MAX.notes, 'H8 text capped to max');

// ---- validateProfile -----------------------------------------------------
const okProfile = validateProfile({ age: 34, bodyweight_kg: 78, strength_style: 'strength' });
assert(okProfile.ok === true, 'P1 valid profile passes');

const badAge = validateProfile({ age: 999 });
assert(badAge.ok === false && badAge.errors.age, 'P2 out-of-range age rejected with message');

const passthrough = validateProfile({ lift_log: { squat: { e1rm: 150 } }, load_overrides: { 3: 'plan' }, focus: ['gym'], strength_style: null });
assert(passthrough.ok === true && passthrough.value.lift_log.squat.e1rm === 150 && passthrough.value.load_overrides[3] === 'plan' && passthrough.value.focus[0] === 'gym', 'P3 unrecognised keys pass through untouched');

const longName = validateProfile({ name: 'n'.repeat(200) });
assert(longName.value.name.length === TEXT_MAX.name && longName.ok === true, 'P4 name trimmed/capped, not an error');

const badLift = validateProfile({ lifts: { squat: 9999, bench: 100, deadlift: 180 } });
assert(badLift.ok === false && badLift.errors['lifts.squat'] && badLift.value.lifts.bench === 100 && badLift.value.lifts.deadlift === 180, 'P5 absurd lift rejected, valid ones kept');

const junkAvatar = validateProfile({ avatar: { url: 'http://evil.example/x.js', color: 'red' } });
assert(junkAvatar.value.avatar.url === null && junkAvatar.value.avatar.color === 'red', 'P6 untrusted avatar URL dropped');

const dataAvatar = validateProfile({ avatar: { url: 'data:image/jpeg;base64,abc' } });
assert(dataAvatar.value.avatar.url === 'data:image/jpeg;base64,abc', 'P7 data-image avatar URL kept');

// ---- daily metric / session log / injury ---------------------------------
assert(validateDailyMetric({ resting_hr: 52, energy: 4 }).ok === true, 'D1 valid daily metric passes');
assert(validateDailyMetric({ energy: 50 }).ok === false, 'D2 out-of-range rating rejected');
assert(validateDailyMetric({ resting_hr: -10 }).ok === false, 'D3 negative HR rejected');

assert(validateSessionLog({ quality: 4, energy: 3, recovery: 5, notes: 'good' }).ok === true, 'S1 valid session log passes');
assert(validateSessionLog({ quality: 999 }).ok === false, 'S2 rating overflow rejected');
assert(validateSessionLog({ notes: 'x'.repeat(9000) }).value.notes.length === TEXT_MAX.notes, 'S3 session notes capped');

assert(validateInjury({ severity: 3, status: 'active', title: 'Tweaked knee' }).ok === true, 'I1 valid injury passes');
assert(validateInjury({ severity: 12 }).ok === false, 'I2 severity overflow rejected');
assert(validateInjury({ status: 'EXPLODED' }).ok === false, 'I3 unknown status rejected');
assert(validateInjury({ title: 't'.repeat(500) }).value.title.length === TEXT_MAX.title, 'I4 injury title capped');
