import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { validateAthleteModel } from '@performance-os/engine/lib/athlete/validation.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const empty = validateAthleteModel(createAthleteModel());
assert(empty.ok, 'T1 empty/default model is valid (missing data tolerated)');

const good = validateAthleteModel(createAthleteModel({ identity: { age: 30, biologicalSex: 'male', bodyMassKg: 80 } }));
assert(good.ok && good.value.identity.age === 30, 'T2 valid identity passes');

const badSex = validateAthleteModel(createAthleteModel({ identity: { biologicalSex: 'yes' } }));
assert(!badSex.ok && badSex.errors['identity.biologicalSex'], 'T3 unknown sex rejected');

const clamped = validateAthleteModel(createAthleteModel({ identity: { age: 200, bodyMassKg: 5 } }));
assert(clamped.value.identity.age === 100 && clamped.value.identity.bodyMassKg === 20,
  'T4 out-of-range identity clamped to bounds');

const g = validateAthleteModel(createAthleteModel({ goals: [{ id: 'x', outcome: 'get_stronger', priority: 2.7 }] }));
assert(g.value.goals[0].priority === 3, 'T5 goal priority coerced to positive integer');

let threw = false;
try { validateAthleteModel(null); } catch { threw = true; }
assert(!threw, 'T6 never throws, even on null input');

// never-throw must hold for nested-null / malformed nested fields, not just top-level null.
let threw2 = false;
try { const r = validateAthleteModel(createAthleteModel({ identity: null })); assert(r.value.identity && typeof r.value.identity === 'object', 'T7 null identity coerced to a valid object'); }
catch { threw2 = true; }
assert(!threw2, 'T7b never throws on { identity: null }');

let threw3 = false;
try { const r = validateAthleteModel({ identity: 'bad', goals: 'not-an-array' }); assert(Array.isArray(r.value.goals), 'T8 non-array goals coerced to array'); assert(typeof r.value.identity === 'object', 'T8b non-object identity coerced'); }
catch { threw3 = true; }
assert(!threw3, 'T8c never throws on malformed nested fields');
