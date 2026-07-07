// WP-49 (Plan 2 T1): a profile carrying `discipline` feeds that discipline's demand vector into
// the athlete model's diagnosis path. The plan-level assertion (build plan → meta.diagnosis)
// belongs in Task 3, which opens the D11 style==='sport' gate — a build plan has no meta.diagnosis
// until then. So this test asserts at the MODEL level: profileToAthleteModel carries
// profile.discipline → model.disciplineId, and disciplineDemandFor(model) reads the discipline's
// demand vector (maxStrength 1.0 for powerlifting, definitional).
import { profileToAthleteModel } from '@performance-os/engine';
import { disciplineDemandFor, disciplineIdFor } from '@performance-os/engine/lib/performance/disciplineDemand.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; }

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

const profile = {
  ...answersToProfile(A({ goalType: 'build', experienceLevel: 'advanced', daysPerWeek: 4,
                           days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male',
                           lifts: { squat: 140, bench: 100, deadlift: 180 } })),
  discipline: 'powerlifting',
};

const model = profileToAthleteModel(profile, '2026-07-07');
assert(model.disciplineId === 'powerlifting', 'adapter copies profile.discipline -> model.disciplineId');
assert(disciplineIdFor(model) === 'powerlifting', 'disciplineIdFor resolves the model disciplineId');

const demand = disciplineDemandFor(model);
assert(!!demand, 'disciplineDemandFor returns a non-null demand vector for a discipline-carrying model');
assert(demand && demand.maxStrength === 1.0, 'powerlifting demand has maxStrength 1.0 (definitional lead quality)');

// disciplineIdFor only resolves an EXPLICIT, known model.disciplineId — no legacy-outcome
// inference — so every existing profile (none of which set `discipline`) is unaffected. This is
// what keeps the golden-master byte-identical: a model with no disciplineId falls back to null.
const bareModel = { disciplineId: null, goals: [{ id: 'primary', outcome: 'get_stronger', priority: 1 }] };
assert(disciplineDemandFor(bareModel) === null, 'no explicit discipline -> null demand, even for a get_stronger goal (no behaviour change)');

console.log(process.exitCode ? 'wp49-discipline-diagnosis FAILURES' : `PASS: wp49-discipline-diagnosis — ${pass} assertions`);
