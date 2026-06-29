// tests/sport-onboarding-model.js — onboarding → profile mapping for the new
// compete/season + recreational/goal model, plus build_base migration.
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', ...o });
let fails = 0;
const eq = (got, want, msg) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${JSON.stringify(got)} want ${JSON.stringify(want)})`)); if (!ok) fails++; };

// compete + in-season → engine key 'in', no goal
let p = answersToProfile(A({ sportIntent: 'compete', sportSeason: 'in_season' }));
eq(p.sport_intent, 'compete', 'compete intent preserved');
eq(p.sport_season, 'in', 'in_season → engine key in');
eq(p.sport_goal, null, 'compete has no sport_goal');

// compete + off-season → 'off'
p = answersToProfile(A({ sportIntent: 'compete', sportSeason: 'off_season' }));
eq(p.sport_season, 'off', 'off_season → engine key off');

// recreational + goal → goal set, season null
p = answersToProfile(A({ sportIntent: 'recreational', sportGoal: 'get_stronger' }));
eq(p.sport_intent, 'recreational', 'recreational intent');
eq(p.sport_season, null, 'recreational leaves sport_season null');
eq(p.sport_goal, 'get_stronger', 'recreational goal preserved');

// MIGRATION: legacy build_base intent → recreational + build_base goal
p = answersToProfile(A({ sportIntent: 'build_base' }));
eq(p.sport_intent, 'recreational', 'legacy build_base → recreational');
eq(p.sport_goal, 'build_base', 'legacy build_base → build_base goal');

// recreational with no goal → defaults build_base
p = answersToProfile(A({ sportIntent: 'recreational' }));
eq(p.sport_goal, 'build_base', 'recreational default goal = build_base');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
