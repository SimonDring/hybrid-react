// tests/sport-onboarding-validation.js — every SELECTABLE sport must survive the real onboarding
// save path: answers → answersToProfilePatch() → validateProfile(). Regression guard for the
// "Sport is not a recognised value" bug (2026-07-09), where the app's ENUMS.sport had drifted
// from the engine's sport binding and rejected triathlon + the 5 team/field sports on save.
import { selectableSports } from '@performance-os/engine';
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { validateProfile } from '../src/lib/validation/validate.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A realistic recreational-sport answer set; only `skbSport` varies. Every other validated field
// is a known-good value, so the ONLY thing that can trip validation is the sport enum.
const answersFor = (skbSport) => ({
  ...BLANK_ANSWERS,
  goalType: 'sport',
  skbSport,
  sportIntent: 'recreational',
  sportGoal: 'build_base',
  experienceLevel: 'intermediate',
  daysPerWeek: 3,
  days: ['mon', 'wed', 'fri'],
});

const sports = selectableSports();
assert(sports.length >= 11, `V0 onboarding offers the full sport list (${sports.length} selectable)`);

// V1 — the reported case, called out explicitly.
const tri = validateProfile(answersToProfilePatch(answersFor('triathlon')));
assert(tri.ok === true && !tri.errors.sport,
  `V1 triathlon onboarding passes validation${tri.errors.sport ? ' — got: ' + tri.errors.sport : ''}`);

// V2 — EVERY selectable sport must pass (triathlon, the team/field sports, and the endurance ones).
const rejected = [];
for (const s of sports) {
  const patch = answersToProfilePatch(answersFor(s.id));
  const res = validateProfile(patch);
  if (!res.ok && res.errors.sport) rejected.push(`${s.id} (sport="${patch.sport}")`);
}
assert(rejected.length === 0,
  `V2 all ${sports.length} selectable sports survive onboarding validation` +
  (rejected.length ? ` — REJECTED: ${rejected.join(', ')}` : ''));
