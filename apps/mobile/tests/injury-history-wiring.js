// tests/injury-history-wiring.js — the WP-36 follow-up: real injuries reach the
// diagnosis. A RESOLVED injury row (status 'recovered', body_part_key from the
// taxonomy) is mirrored into the persisted athlete model's constraints.injuryHistory
// (AthleteModelService.syncInjuryHistory), rides users.profile.athlete_model, and the
// adapter maps it back — so EVERY read path (Atlas's performanceModelForProfile, the
// PlanService diagnosis, generatePlan's meta) sees the injuryRisk boost the engine
// computes. Active injuries stay OUT (they're runtime constraint state, not history).

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
const { performanceModelForProfile } = await import('@performance-os/engine');

Storage.setNamespace('injuryWiringTest');
Database.services.reloadFromStorage();

// A middle-distance runner with a RESOLVED hamstring strain and an ACTIVE knee niggle.
Database.services.updateProfile({
  goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_code: 'running_middle',
  experience: { gym: 'intermediate' }, access: ['barbell', 'dumbbell', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
});
Database.services.addInjury({ body_part: 'Right hamstring', title: 'Hamstring strain', status: 'recovered', body_part_key: 'hamstring', body_region: 'lower_limb', date_recovered: '2026-05-01' });
Database.services.addInjury({ body_part: 'Left knee', title: 'Knee niggle', status: 'active', body_part_key: 'knee', body_region: 'lower_limb' });

// ── the sync mirrors ONLY the resolved row ───────────────────────────────────
const model = await Svc.syncInjuryHistory();
assert(model && Array.isArray(model.constraints.injuryHistory), 'T1 syncInjuryHistory returns the model');
assert(model.constraints.injuryHistory.length === 1
  && model.constraints.injuryHistory[0].body_part === 'hamstring'
  && model.constraints.injuryHistory[0].resolvedAt === '2026-05-01',
  'T2 only the RESOLVED injury is mirrored (active knee stays out)');

const persisted = Database.services.getProfile().athlete_model;
assert(persisted && persisted.constraints.injuryHistory.length === 1,
  'T3 the history is PERSISTED at users.profile.athlete_model');

// ── the acceptance: the boost flows through the app read path ────────────────
const profile = Database.services.getProfile();
const pm = performanceModelForProfile(profile, '2026-07-05');
const rob = pm.limitingFactors.find((f) => f.qualityId === 'robustness');
assert(rob && rob.injuryRisk === 1.25,
  `T4 the runner's robustness limiter carries the hamstring-history boost (×${rob && rob.injuryRisk})`);
assert(/injury history raises the stakes/.test(rob.rationale),
  'T5 the emitted rationale explains the boost (Atlas/session whys show it)');

// ── idempotent + change-driven writes ────────────────────────────────────────
const before = Database.services.getProfile().athlete_model.updatedAt;
await Svc.syncInjuryHistory();
assert(Database.services.getProfile().athlete_model.updatedAt === before,
  'T6 unchanged history → NO write (idempotent)');

// resolving the knee later updates the history
const rows = Database.services.listInjuries();
const knee = rows.find((r) => r.body_part_key === 'knee');
Database.services.updateInjury(knee.id, { status: 'recovered', date_recovered: '2026-07-01' });
const m2 = await Svc.syncInjuryHistory();
assert(m2.constraints.injuryHistory.length === 2
  && m2.constraints.injuryHistory.some((h) => h.body_part === 'knee'),
  'T7 a later resolution joins the history');

// duplicate resolutions of the same part keep the NEWEST date, never stack
Database.services.addInjury({ body_part: 'Right hamstring', title: 'Recurrence', status: 'recovered', body_part_key: 'hamstring', body_region: 'lower_limb', date_recovered: '2026-06-20' });
const m3 = await Svc.syncInjuryHistory();
const ham = m3.constraints.injuryHistory.filter((h) => h.body_part === 'hamstring');
assert(ham.length === 1 && ham[0].resolvedAt === '2026-06-20',
  'T8 same-part recurrences dedupe to the newest resolution');

console.log('injury-history-wiring tests done');
