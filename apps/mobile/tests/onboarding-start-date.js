// tests/onboarding-start-date.js
// "When do you want to start?" — resolveStartDate mapping + answersToProfilePatch wiring.
process.env.TZ = 'Europe/London';

import { resolveStartDate, answersToProfilePatch, localISODate, BLANK_ANSWERS }
  from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Reference days (verified: 2026-06-24 is a Wednesday, 2026-06-29 a Monday).
const wed = new Date(2026, 5, 24);
const mon = new Date(2026, 5, 29);
const sun = new Date(2026, 5, 28);
assert(wed.getDay() === 3 && mon.getDay() === 1 && sun.getDay() === 0, 'S0 reference weekdays are right');

assert(resolveStartDate('today', '', wed) === '2026-06-24', 'S1 today → that local day');
assert(resolveStartDate('tomorrow', '', wed) === '2026-06-25', 'S2 tomorrow → +1 day');
assert(resolveStartDate('monday', '', wed) === '2026-06-29', 'S3 next Monday from Wed → following Mon');
assert(resolveStartDate('monday', '', mon) === '2026-06-29', 'S4 Monday when today IS Monday → today');
assert(resolveStartDate('monday', '', sun) === '2026-06-29', 'S5 Monday from Sun → next day');
assert(resolveStartDate('date', '2026-07-10', wed) === '2026-07-10', 'S6 date → the chosen date');
assert(resolveStartDate('date', '2026-06-01', wed) === '2026-06-24', 'S7 past date clamps to today');
assert(resolveStartDate('date', '', wed) === '2026-06-24', 'S8 empty custom date → today');
assert(resolveStartDate('', '', wed) === '2026-06-24', 'S9 blank option → today');
assert(resolveStartDate(undefined, undefined, wed) === '2026-06-24', 'S10 undefined option → today');

// answersToProfilePatch wires it in, and stays backward-compatible. (Real callers
// always seed from BLANK_ANSWERS; a legacy answers object simply lacks startWhen.)
const noField = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', daysPerWeek: 3, startWhen: undefined });
assert(noField.plan_start_date === localISODate(new Date()), 'S11 no startWhen → today (back-compat)');

const tomorrow = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', daysPerWeek: 3, startWhen: 'tomorrow' });
const t = new Date(); t.setDate(t.getDate() + 1);
assert(tomorrow.plan_start_date === localISODate(t), 'S12 startWhen=tomorrow flows into plan_start_date');

assert(BLANK_ANSWERS.startWhen === 'today' && BLANK_ANSWERS.startDate === '', 'S13 BLANK_ANSWERS defaults');
