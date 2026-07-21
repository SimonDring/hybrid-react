// tests/store-aerobic-trimp-basis.js — Phase 2 flip (2026-07-21): trainingStore's
// LIVE load path (buildView → loadView/acwr, and the deload decision that reads it)
// now scores workouts via the governed Banister-TRIMP aerobic load (aerobicLoad /
// aerobicDailyLoads), not the old duration×3 proxy (trainingLoad.dailyLoads /
// workoutLoad). Those engine functions themselves are UNCHANGED — the flip is
// entirely in WHICH one buildView calls (see tests/training-load.js, unaffected,
// and tests/form-view.js, which pins the parallel formView readout). This test
// proves buildView's numeric output actually moved onto the new basis for an
// HR-bearing workout, i.e. the flip is real, not just wired-but-inert.
//
// generatePlan/PlanGenerator never reads this — the pure baseline stays
// byte-identical (golden-master.js). This is a RUNTIME-layer proof only.

// localStorage shim must exist BEFORE Database.js boots (it writes on import).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Database = (await import('../src/lib/Database.js')).default;
const { aerobicLoad } = await import('@performance-os/engine');

const todayISO = new Date().toISOString().split('T')[0];

Database.services.updateProfile({ age: 30, sex: 'male' });
Database.services.upsertDailyMetric({ date: todayISO, resting_hr: 60, source: 'manual' });

// One unlinked, HR-bearing workout TODAY: 60 min @ avg 150 bpm — usable for TRIMP
// (restHr 60, Tanaka maxHr 208 − 0.7·30 = 187, so avgHr sits inside the HRr range).
Database.tables.workouts.create({
  provider: 'test', type: 'run', session_id: null,
  start_time: `${todayISO}T08:00:00.000Z`, end_time: `${todayISO}T09:00:00.000Z`,
  duration_sec: 3600, avg_hr: 150
});

const { useTrainingStore } = await import('../src/stores/trainingStore.js');
const view = useTrainingStore.getState();

// Expected TRIMP load for this workout, from the SAME governed formula buildView
// now feeds (restHr 60, sex male, age 30).
const expectedTrimp = aerobicLoad(
  { duration_sec: 3600, avg_hr: 150 },
  { restHr: 60, maxHr: null, sex: 'male', age: 30 }
);
assert(expectedTrimp.method === 'trimp',
  `sanity: the seeded workout is HR-usable (TRIMP method, not the duration fallback) — got ${expectedTrimp.method}`);

const durationProxyLoad = Math.round((3600 / 60) * 3); // the OLD trainingLoad.workoutLoad basis
assert(expectedTrimp.load !== durationProxyLoad,
  `sanity: TRIMP load (${expectedTrimp.load}) differs from the old duration×3 proxy (${durationProxyLoad}) — a real discriminator`);

// buildView's `dl` is a single-day series (only today is loaded), so acute (7-day
// EWMA ending today) = load × 2/(7+1) — mirrors trainingLoad.acuteChronic exactly.
const lambda7 = 2 / (7 + 1);
const expectedAcuteTrimp = Math.round(expectedTrimp.load * lambda7);
const expectedAcuteDurationProxy = Math.round(durationProxyLoad * lambda7);
assert(expectedAcuteTrimp !== expectedAcuteDurationProxy,
  'sanity: the two bases produce different acute values for this workout (not a coincidental tie)');

assert(view.load.acute === expectedAcuteTrimp,
  `THE FLIP: buildView's live acute load reflects the TRIMP basis (got ${view.load.acute}, expected ${expectedAcuteTrimp})`);
assert(view.load.acute !== expectedAcuteDurationProxy,
  `THE FLIP: buildView's live acute load is NOT the old duration×3 basis (got ${view.load.acute}, old proxy would have been ${expectedAcuteDurationProxy})`);

console.log(process.exitCode ? 'store-aerobic-trimp-basis FAILURES' : 'PASS: store-aerobic-trimp-basis');
