// bench.mjs — Phase 3 M0 T4: perf BASELINES for the engine
// (13-VALIDATION-STRATEGY.md §6 "Performance benchmarks").
//
// Runs a small, FIXED reference-profile matrix through the engine operations
// §6's budget table names that are reachable engine-only — full planning pass
// (generatePlan), runtime projection (reflow), and validate(week) — and prints
// p50/p95 per operation, stamped with the engine + knowledge-set version that
// produced them (so a later phase can compare like-for-like across versions).
//
// BASELINES ONLY (plan Task 4 / spec §2 item 6 / §6's own wording: "land at M0
// as measured baselines, become budgets once two phases of data exist"). This
// script makes NO pass/fail assertion and NEVER exits non-zero on slowness.
// It is deliberately named `bench.mjs`, not `*.test.mjs`, so run-engine.mjs's
// `*.test.mjs` discovery (packages/engine/tests/run-engine.mjs) never picks it
// up — it does not gate `test:engine`, `npm test`, or CI. Run it by hand:
//
//   node tests/bench.mjs                        from packages/engine/
//   npm run bench -w @performance-os/engine      from the repo root
//
// Determinism (Global Constraint 4 / Art 18): every reference profile carries
// a FIXED plan_start_date — no profile field ever reads the clock. The one
// clock read in this file (process.hrtime.bigint(), inside timeIt()) measures
// wall-clock DURATION only; it never seeds a profile and nothing here asserts
// on a wall-clock threshold. This file lives beside the engine-owned suite,
// not inside a decision pass, and imports only the published
// `@performance-os/engine` barrel (the Task 1 convention: no app import).
import {
  generatePlan, reflowPhases, validateWeek, resolveProgram, resolveLifts,
  performanceModelForProfile, profileToAthleteModel, sportKnowledge as SKB,
  localISO, SESSION_CEILING_MIN,
} from '@performance-os/engine';

// ── fixed reference profiles ─────────────────────────────────────────────────
// A small, deliberately diverse set (build/sport, level, frequency, equipment) —
// NOT the full 28+-archetype golden matrix (that lives in apps/mobile/tests and
// is app-adapter-shaped via answersToProfile). These are engine-shaped profiles
// directly, matching the fields PlanGenerator reads (see smoke.test.mjs).
const START = '2026-07-14';   // fixed — never Date.now()
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const BW = ['bodyweight'];

const REFERENCE_PROFILES = {
  'build·beginner·3d·full': {
    goal_type: 'build', strength_style: 'strength', experience: { gym: 'beginner' },
    sex: 'male', access: FULL,
    availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
    plan_start_date: START,
  },
  'build·advanced·6d·full': {
    goal_type: 'build', strength_style: 'bodybuilding', experience: { gym: 'advanced' },
    sex: 'female', access: FULL, lifts: { squat: 100, bench: 60, deadlift: 120 },
    availability: { days_per_week: 6, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    plan_start_date: START,
  },
  'build·bodyweight·beginner·3d(edge)': {
    goal_type: 'build', strength_style: 'functional', experience: { gym: 'beginner' },
    sex: 'male', access: BW,
    availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
    plan_start_date: START,
  },
  'sport·run-middle·offseason·4d': {
    goal_type: 'sport', sport: 'run', sport_code: 'running_middle', run_discipline: 'middle',
    sport_intent: 'recreational', sport_season: 'off', experience: { gym: 'intermediate' },
    sex: 'male', access: FULL,
    availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
    plan_start_date: START,
  },
  'sport·rugby·inseason·4d': {
    goal_type: 'sport', sport: 'rugby', sport_code: 'rugby',
    sport_intent: 'compete', sport_season: 'in', event_date: '2026-08-15',
    experience: { gym: 'advanced' }, sex: 'male', access: FULL,
    availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
    plan_start_date: START,
  },
};

const ITERATIONS = 25;   // per operation per profile — enough to read a stable p50/p95 locally

// ── timing kit ────────────────────────────────────────────────────────────────
function nowMs() { return Number(process.hrtime.bigint()) / 1e6; }
function timeIt(fn, iterations) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = nowMs();
    fn();
    samples.push(nowMs() - t0);
  }
  return samples;
}
function percentile(samples, p) {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}
const fmt = (ms) => ms.toFixed(2).padStart(8);

// ── gymCtx replication (engine-only) ─────────────────────────────────────────
// reflowPhases needs the same derived "gym programming context" the app's
// PlanService.gymCtx() builds for the runtime orchestrator (WP-24b). That
// function itself is app-side glue, but every value it derives comes from
// engine-exported calls (resolveProgram, resolveLifts, performanceModelForProfile,
// profileToAthleteModel, sportKnowledge) — so it's reproduced here verbatim,
// engine-only, rather than importing apps/mobile (Task 1's "no app import" rule).
function gymCtx(profile) {
  const program = resolveProgram(profile);
  const e = profile.experience || {};
  const level = e.gym || e.strength_functional || e.strength_physique || 'beginner';
  const asOf = profile.plan_start_date || null;
  const perf = performanceModelForProfile(profile, asOf);
  const skbSportId = profile.sport
    ? (profileToAthleteModel(profile, asOf)?.sportingContext?.primarySport || null)
    : null;
  const skbIds = skbSportId
    ? new Map((SKB.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((x) => [x.id, x.transferToSportRating]))
    : new Map();
  return {
    style: program.style, level, minutes: SESSION_CEILING_MIN,
    access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile),
    bodyweight: profile.bodyweight_kg,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map(),
    sport: profile.sport || null, power: !!program.power,
    priorityQualities: (perf && perf.priorityAdaptations) || [], season: program.season, skbIds,
    skbSportId, discipline: program.discipline || null,
    competedLift: profile.olympic_lift || 'both',
  };
}

// ── dateFor replication (plain date math — mirrors PlanService.dateForSession) ─
const DAY_IDX = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
function weekdayOfTitle(title) {
  const t = (title || '').toLowerCase();
  for (const k in DAY_IDX) if (t.includes(k)) return DAY_IDX[k];
  return null;
}
function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function makeDateFor(startDate) {
  return (weekNum, title) => {
    const wi = weekdayOfTitle(title);
    if (!startDate || wi == null) return null;
    const d = mondayOf(startDate);
    d.setDate(d.getDate() + (weekNum - 1) * 7 + wi);
    return d;
  };
}

// ── run the matrix ────────────────────────────────────────────────────────────
const rows = [];   // { op, archetype, n, p50, p95 }
let stampedProvenance = null;

for (const [archetype, profile] of Object.entries(REFERENCE_PROFILES)) {
  // full planning pass
  let plan;
  const planSamples = timeIt(() => { plan = generatePlan(profile); }, ITERATIONS);
  rows.push({ op: 'full planning pass', archetype, n: ITERATIONS, p50: percentile(planSamples, 50), p95: percentile(planSamples, 95) });
  if (!stampedProvenance) stampedProvenance = plan.meta && plan.meta.provenance;

  // validate(week) — a representative week (phase 1, week 1)
  const week = plan.phases[0].weeks[0];
  const validateSamples = timeIt(() => { validateWeek(week); }, ITERATIONS);
  rows.push({ op: 'validate(week)', archetype, n: ITERATIONS, p50: percentile(validateSamples, 50), p95: percentile(validateSamples, 95) });

  // runtime projection (reflow) — current week 1, a clean liveState (no
  // completions/readiness/injuries/freezes — the same "nothing changed" state
  // the reflow≡baseline property (T3) exercises), so this measures the
  // cheapest real reflow pass reachable without additional app-side state.
  const startDate = new Date(`${profile.plan_start_date}T00:00:00`);
  const dateFor = makeDateFor(startDate);
  const reflowInputs = {
    phases: plan.phases, currentWeek: 1, today: startDate, gctx: gymCtx(profile), profile,
    sessions: {}, recovery: null, load: null, reverted: false, overrides: {}, activeInjuries: [],
    dateFor, totalWeeks: plan.totalWeeks, startDate, startISO: localISO(startDate),
  };
  const reflowSamples = timeIt(() => { reflowPhases(reflowInputs); }, ITERATIONS);
  rows.push({ op: 'reflow (D15)', archetype, n: ITERATIONS, p50: percentile(reflowSamples, 50), p95: percentile(reflowSamples, 95) });
}

// ── print the table ───────────────────────────────────────────────────────────
console.log(`engine ${stampedProvenance?.engineVersion || '?'} · knowledge ${stampedProvenance?.knowledgeSetVersion || '?'} · n=${ITERATIONS}/cell\n`);
const opWidth = Math.max(...rows.map((r) => r.op.length), 'operation'.length);
const archWidth = Math.max(...rows.map((r) => r.archetype.length), 'archetype'.length);
console.log(`${'operation'.padEnd(opWidth)}  ${'archetype'.padEnd(archWidth)}  ${'p50 (ms)'.padStart(8)}  ${'p95 (ms)'.padStart(8)}`);
console.log('-'.repeat(opWidth + archWidth + 24));
for (const r of rows) {
  console.log(`${r.op.padEnd(opWidth)}  ${r.archetype.padEnd(archWidth)}  ${fmt(r.p50)}  ${fmt(r.p95)}`);
}

console.log('\nBaselines only — no budget enforced this phase (13-VALIDATION-STRATEGY.md §6).');
