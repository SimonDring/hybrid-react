// localStorage shim must exist BEFORE Database.js boots (it writes on import).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; },
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Storage = await import('../src/lib/Storage.js');
const Database = (await import('../src/lib/Database.js')).default;
const { BLANK_ANSWERS } = await import('../src/lib/onboardingModel.js');
const Svc = await import('../src/lib/AthleteModelService.js');

// Seed a current user in a fresh namespace. Database.js auto-creates a default
// user row (ensureDefaultUserAndPlan) whenever a namespace has none yet;
// reloadFromStorage() re-runs that check against the NEW namespace (see
// tests/database-reload.js for the same pattern), so this gives getProfile()/
// updateProfile() a real current-user row to operate on in the offline path.
Storage.setNamespace('athleteTest');
Database.services.reloadFromStorage();

const answers = { ...BLANK_ANSWERS, name: 'Jo', age: 30, sex: 'male', bodyweight_kg: 80,
  goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate',
  daysPerWeek: 4, equipment: ['barbell', 'dumbbell'] };

const saved = await Svc.buildAndSaveFromAnswers(answers);
assert(saved.schemaVersion === 1 && saved.goals[0].outcome === 'get_stronger', 'T1 build + save returns model');

const loaded = Svc.getAthleteModel();
assert(loaded && loaded.identity.age === 30, 'T2 persisted model reloads from profile.athlete_model');

const pm = Svc.getPerformanceModel();
assert(pm && pm.capabilities.length > 0 && pm.capabilities.every((c) => c.confidence), 'T3 performance model derives with confidence');

// Upgrade path: an older/unknown-version blob still yields a valid current model.
const upgraded = Svc.upgradeAthleteModel({ schemaVersion: 0, identity: { age: 41 } });
assert(upgraded.schemaVersion === 1 && upgraded.identity.age === 41, 'T4 upgrade normalises old blob to v1');

// Lazy derive: with no athlete_model but a legacy profile, getAthleteModel derives one.
Storage.setNamespace('legacyOnly');
Database.services.reloadFromStorage();
Database.services.updateProfile({ goal_type: 'build', strength_style: 'bodybuilding', experience: { gym: 'advanced' }, access: ['full_gym'], availability: { days_per_week: 5, days: [] } });
const derived = Svc.getAthleteModel();
assert(derived && derived.goals[0].outcome === 'build_muscle', 'T5 lazily derives model from legacy profile');
