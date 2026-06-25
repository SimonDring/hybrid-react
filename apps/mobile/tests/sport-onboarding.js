// tests/sport-onboarding.js — sport_days captured from onboarding answers.
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

assert(eq(BLANK_ANSWERS.sportDays, []), 'O1 BLANK_ANSWERS.sportDays defaults to []');

const sport = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', sportDays: ['tue', 'thu'], daysPerWeek: 4 });
assert(eq(sport.sport_days, ['tue', 'thu']), 'O2 sport goal carries sport_days');

const build = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', sportDays: ['tue'], daysPerWeek: 3 });
assert(build.sport_days === null, 'O3 build goal clears sport_days');
