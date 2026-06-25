// tests/onboarding-no-minutes.js — onboarding no longer captures session length.
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(!('sessionMinutes' in BLANK_ANSWERS), 'BLANK_ANSWERS has no sessionMinutes');

const patch = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', daysPerWeek: 4 });
assert(!('session_minutes' in patch.availability), 'profile.availability has no session_minutes');
assert(patch.availability.days_per_week === 4, 'days_per_week still captured (got ' + patch.availability.days_per_week + ')');

console.log('onboarding-no-minutes done');
