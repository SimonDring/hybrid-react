// tests/staged-priors-wiring.js — WP-59: the app-side half of the first learning loop.
// AthleteModelService.syncStagedPriors gathers the athlete's OWN already-logged data
// (session recovery ratings + logged-set e1RMs) over the just-finished block, runs the
// pure blockOutcome() verdict, and PERSISTS the candidate at users.profile.athlete_model
// .stagedPriors — which NOTHING in the engine reads. Promotion (staged → learnedPriors,
// which the engine DOES read) is a separate, reviewed step. This proves: gathering,
// persistence, change-driven writes, and — critically — that staging does NOT touch the
// live prior the engine consumes.

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
const Svc = await import('../src/lib/AthleteModelService.js');

Storage.setNamespace('stagedPriorsTest');
Database.services.reloadFromStorage();

const BLOCK = { startISO: '2026-04-01', endISO: '2026-06-01' };
const PRIORITY = [{ qualityId: 'maxStrength' }];

Database.services.updateProfile({
  goal_type: 'strength', strength_style: 'strength',
  experience: { gym: 'intermediate' }, access: ['barbell', 'dumbbell', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
  plan_start_date: BLOCK.startISO,
});

// A STRUGGLING block: declining top-set weight (falling e1RM) + declining, low recovery.
for (let w = 0; w < 5; w++) {
  const date = new Date(Date.UTC(2026, 3, 1 + w * 7)).toISOString(); // Apr 1 + w weeks
  Database.tables.setLogs.create({
    session_id: `s${w}`, exercise_key: 'squat', exercise_name: 'Back squat',
    actual_weight: 120 - w * 2, actual_reps: 5, actual_rpe: 8, completed_at: date,
  });
  Database.tables.sessionLogs.create({
    session_id: `s${w}`, recovery: 3.4 - w * 0.15, quality: 3, completed_at: date,
  });
}

// ── T1 gathering + verdict: a struggling block stages ONE downward candidate ──
const m1 = await Svc.syncStagedPriors({ ...BLOCK, priorityQualities: PRIORITY });
assert(m1 && m1.stagedPriors, 'T1 syncStagedPriors returns the model with a stagedPriors block');
assert(m1.stagedPriors.verdicts[0].qualityId === 'maxStrength' && m1.stagedPriors.verdicts[0].verdict === 'declined',
  `T2 the maxStrength priority reads as declined (${m1.stagedPriors.verdicts[0].verdict})`);
assert(m1.stagedPriors.candidatePriors.length === 1
  && m1.stagedPriors.candidatePriors[0].type === 'volumeTolerance'
  && m1.stagedPriors.candidatePriors[0].value === 0.9,
  'T3 corroborated struggle → ONE downward volumeTolerance 0.9 candidate');
assert(/e1RM|recovery/.test(m1.stagedPriors.candidatePriors[0].evidence || ''),
  'T4 the candidate carries cited evidence (explainability)');
assert(m1.stagedPriors.block.startISO === BLOCK.startISO && m1.stagedPriors.block.endISO === BLOCK.endISO,
  'T5 the staged record pins the block window');

// ── T6 persistence: it rides users.profile.athlete_model ──
const persisted = Database.services.getProfile().athlete_model;
assert(persisted && persisted.stagedPriors && persisted.stagedPriors.candidatePriors.length === 1,
  'T6 stagedPriors is PERSISTED at users.profile.athlete_model');

// ── T7 the engine's LIVE prior is untouched — staging never promotes itself ──
assert(persisted.learnedPriors.volumeTolerance.value === 1
  && persisted.learnedPriors.volumeTolerance.source === 'population',
  'T7 learnedPriors.volumeTolerance stays population/1 — the engine still reads the un-learned prior');

// ── T8 change-driven: same data → NO write ──
const before = Database.services.getProfile().athlete_model.updatedAt;
await Svc.syncStagedPriors({ ...BLOCK, priorityQualities: PRIORITY });
assert(Database.services.getProfile().athlete_model.updatedAt === before,
  'T8 unchanged block outcome → no write (idempotent)');

// ── T9 a responding block stages NO candidate (never auto-escalates) ──
Storage.setNamespace('stagedPriorsTest2');
Database.services.reloadFromStorage();
Database.services.updateProfile({ goal_type: 'strength', plan_start_date: BLOCK.startISO, access: ['barbell'] });
for (let w = 0; w < 5; w++) {
  const date = new Date(Date.UTC(2026, 3, 1 + w * 7)).toISOString();
  Database.tables.setLogs.create({ session_id: `r${w}`, exercise_key: 'squat', actual_weight: 100 + w * 3, actual_reps: 5, completed_at: date });
  Database.tables.sessionLogs.create({ session_id: `r${w}`, recovery: 4, completed_at: date });
}
const m2 = await Svc.syncStagedPriors({ ...BLOCK, priorityQualities: PRIORITY });
assert(m2.stagedPriors.verdicts[0].verdict === 'responded' && m2.stagedPriors.candidatePriors.length === 0,
  'T9 a responding block → responded verdict, NO candidate prior');

// ── T10 guardrail: missing window/priorities → early return, no recompute ──
const before10 = Database.services.getProfile().athlete_model.updatedAt;
const m3 = await Svc.syncStagedPriors({});
assert(m3 && m3.stagedPriors && m3.stagedPriors.verdicts[0].verdict === 'responded',
  'T10a missing args → returns the existing model untouched (still the responded block)');
assert(Database.services.getProfile().athlete_model.updatedAt === before10,
  'T10b missing args writes nothing');

console.log('staged-priors-wiring tests done');
