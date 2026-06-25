// tests/sport-constraints.js — sport-day scheduling constraints (pure engine logic).
import { weekdayIndex, deriveConstraints } from '@performance-os/engine/lib/plan/constraints.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

assert(weekdayIndex('mon') === 0 && weekdayIndex('sun') === 6, 'C1 weekdayIndex maps mon→0, sun→6');
assert(weekdayIndex('xxx') === undefined, 'C2 unknown weekday → undefined');

const swim = deriveConstraints({ sport: 'swim', sport_days: ['tue', 'thu'] });
assert(eq(swim.busyDays, [1, 3]), 'C3 sport_days → sorted weekday indices');
assert(eq(swim.sportMuscles, ['back', 'shoulders', 'core']), 'C4 sportMuscles from the swim module keyMuscles');

const dupes = deriveConstraints({ sport: 'swim', sport_days: ['thu', 'tue', 'thu', 'bogus'] });
assert(eq(dupes.busyDays, [1, 3]), 'C5 de-duped, sorted, junk dropped');

const none = deriveConstraints({ sport: 'swim' });
assert(eq(none.busyDays, []) && eq(none.sportMuscles, ['back', 'shoulders', 'core']), 'C6 no sport_days → empty busyDays');

const build = deriveConstraints({ goal_type: 'build' });
assert(eq(build.busyDays, []) && eq(build.sportMuscles, []), 'C7 non-sport goal → empty constraints');

const unknownSport = deriveConstraints({ sport: 'curling', sport_days: ['mon'] });
assert(eq(unknownSport.busyDays, [0]) && eq(unknownSport.sportMuscles, []), 'C8 unknown sport → busyDays kept, no muscles');

// ---- suggestGymDays ----
import { suggestGymDays } from '@performance-os/engine/lib/plan/constraints.js';
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Simon: swim Tue/Thu, wants 4 gym days → all 4 avoid Tue/Thu, spread out.
const s = suggestGymDays({ sportDays: ['tue', 'thu'], gymDays: 4 });
assert(s.length === 4, 'C9 suggests exactly gymDays days');
assert(!s.includes('tue') && !s.includes('thu'), 'C10 avoids sport days when there is room');
assert(eq(s, [...s].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b))), 'C11 returned in week order');

// Packed week: 6 gym days + swim Tue/Thu (only 5 free) → must reuse 1 sport day.
const packed = suggestGymDays({ sportDays: ['tue', 'thu'], gymDays: 6 });
assert(packed.length === 6, 'C12 packed week still returns gymDays days');
const overlap = packed.filter(d => d === 'tue' || d === 'thu');
assert(overlap.length === 1, 'C13 packed week reuses the minimum number of sport days');

// No sport days → just a spread of gymDays.
const noSport = suggestGymDays({ sportDays: [], gymDays: 3 });
assert(noSport.length === 3, 'C14 no sport days → spread of gymDays');
