// tests/plan-memo-signature.js — P0-7 (engine-audit TR-06): the plan-memo signature
// in PlanService must change whenever a plan-driving profile field changes, or the
// memoised plan goes stale — an edit to the season window (first/last game date), a
// GAA code fix (sport_code), or an athlete-model sync would keep serving the OLD plan
// until some unrelated field happened to change.
//
// The signature must also NOT thrash: athlete_model.updatedAt is stamped with
// new Date().toISOString() on every persist (AthleteModelService), so the signature
// covers the model's stable plan-driving subset, never the volatile timestamp.

// localStorage shim must exist BEFORE Database.js boots (PlanService imports it).
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

const { profileSignature } = await import('../src/lib/PlanService.js');
assert(typeof profileSignature === 'function', 'T0 profileSignature is exported for this test');

// A GAA footballer with a season window and a dual-written athlete model — every
// field group the engine reads (season window via seasonWindow.js, sport_code via
// skbSportIdOf, athlete_model via profileToAthleteModel + the D7/D12 prior reads).
const baseModel = {
  schemaVersion: 1,
  updatedAt: '2026-07-01T00:00:00.000Z', // volatile — stamped on every persist
  sportingContext: { primarySport: 'gaa_football', position: null },
  trainingHistory: { resistanceTrainingYears: 3, sportYears: 10 },
  constraints: { injuryHistory: [] },
  performanceMetrics: [],
  learnedPriors: {
    recoveryRate: { value: 1, source: 'population', confidence: 'low' },
    volumeTolerance: { value: 1, source: 'population', confidence: 'low' },
  },
};
const base = {
  focus: ['gym'], goal_type: 'sport', sport: 'gaa', sport_code: 'gaa_football',
  experience: { gym: 'intermediate' }, access: ['barbell', 'dumbbell', 'bodyweight'],
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
  plan_start_date: '2026-07-13',
  first_game_date: '2026-08-01', last_game_date: '2026-11-15',
  athlete_model: baseModel,
};

const sig = (over = {}) => profileSignature({ ...base, ...over });
const withModel = (patch) => ({ athlete_model: { ...structuredClone(baseModel), ...patch } });

// ── determinism: same profile, same signature ────────────────────────────────
assert(sig() === sig(), 'T1 identical profiles produce identical signatures');

// ── the four TR-06 omissions each invalidate the memo ────────────────────────
assert(sig({ sport_code: 'gaa_hurling' }) !== sig(),
  'T2 sport_code change invalidates (GAA code fix regenerates the plan)');
assert(sig({ first_game_date: '2026-09-01' }) !== sig(),
  'T3 first_game_date change invalidates (season window start)');
assert(sig({ last_game_date: '2026-10-15' }) !== sig(),
  'T4 last_game_date change invalidates (season window end)');
assert(sig(withModel({})) === sig(),
  'T5 an athlete_model clone with identical content leaves the signature unchanged');
assert(sig({ athlete_model: null }) !== sig(),
  'T6 removing the athlete_model entirely invalidates');

// ── the model's PLAN-DRIVING fields each invalidate ──────────────────────────
const lpModel = structuredClone(baseModel);
lpModel.learnedPriors.recoveryRate.value = 1.2;
assert(sig({ athlete_model: lpModel }) !== sig(),
  'T7 learnedPriors.recoveryRate change invalidates (D7 block steer)');

const vtModel = structuredClone(baseModel);
vtModel.learnedPriors.volumeTolerance.value = 0.8;
assert(sig({ athlete_model: vtModel }) !== sig(),
  'T8 learnedPriors.volumeTolerance change invalidates (D12 dose scalar)');

const ihModel = structuredClone(baseModel);
ihModel.constraints.injuryHistory = [{ body_part: 'hamstring', resolvedAt: '2026-05-01' }];
assert(sig({ athlete_model: ihModel }) !== sig(),
  'T9 constraints.injuryHistory change invalidates (D4 injuryRisk — model syncs regenerate)');

const posModel = structuredClone(baseModel);
posModel.sportingContext.position = 'midfield';
assert(sig({ athlete_model: posModel }) !== sig(),
  'T10 sportingContext.position change invalidates (adapter reads it)');

const psModel = structuredClone(baseModel);
psModel.sportingContext.primarySport = 'gaa_hurling';
assert(sig({ athlete_model: psModel }) !== sig(),
  'T11 sportingContext.primarySport change invalidates (skbSportIdOf fallback)');

const pmModel = structuredClone(baseModel);
pmModel.performanceMetrics = [{ id: '1rm_squat', metric: '1rm_squat', value: 140, unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: '2026-06-01' }];
assert(sig({ athlete_model: pmModel }) !== sig(),
  'T12 performanceMetrics change invalidates (measuredAt trust in the adapter)');

const thModel = structuredClone(baseModel);
thModel.trainingHistory.resistanceTrainingYears = 8;
assert(sig({ athlete_model: thModel }) !== sig(),
  'T13 trainingHistory.resistanceTrainingYears change invalidates');

// ── volatility guard: the memo must NOT thrash on persistence timestamps ─────
const tsModel = structuredClone(baseModel);
tsModel.updatedAt = '2026-07-13T09:00:00.000Z';
assert(sig({ athlete_model: tsModel }) === sig(),
  'T14 updatedAt ALONE does not invalidate (stamped on every persist — would thrash)');

// ── a pre-existing field still invalidates (no regression) ───────────────────
assert(sig({ sport_season: 'in' }) !== sig(), 'T15 sport_season still invalidates (regression guard)');

// ── plan_start_date anchors every date in the plan (PlanGenerator reads it) ──
assert(sig({ plan_start_date: '2026-07-20' }) !== sig(),
  'T16 plan_start_date change invalidates (all plan dates anchor to it)');

// ── Phase 1 PR B: team fixtures drive MD-relative placement (generatePlan now always
// runs with fixtureMicrocycle:true) — a fixture change must regenerate or a coach's
// updated schedule keeps serving the old, un-reshaped plan ────────────────────────
assert(sig({ team_fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }] }) !== sig(),
  'T17 team_fixtures change invalidates (drives fixture-aware MD placement)');
assert(sig({ team_match_weekday: 5 }) !== sig(),
  'T18 team_match_weekday change invalidates (recurring MD fallback anchor)');

console.log('\nplan-memo-signature: done.');
