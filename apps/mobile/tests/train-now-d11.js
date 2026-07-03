// tests/train-now-d11.js — WP-04: Train Now runs on the same brain as the plan.
//
// generateTrainNow was a separate allocateGym call site whose ctx omitted the D11
// fields (sport/power/priorityQualities/season/skbIds), so a run/cycle athlete's
// on-demand session was selected by the legacy muscle-deficit fill (chest flyes for
// a distance runner) while their weekly plan was diagnosis-driven — an incoherence
// users can feel. The ctx now carries the same fields gymCtx supplies to the reflow.
//
// Guards here:
//   1. run athlete → Train Now selections are D11-consistent (no off-target
//      chest/arm isolation; durability compounds present) and marked by the gate.
//   2. build athlete → adding the fields is a byte-level no-op (empty diagnosis,
//      style !== 'sport', sport null — the gate cannot fire).

process.env.TZ = 'Europe/London';

// Fixed clock (Train Now reads "today" for the missed-volume window).
const RealDate = Date;
const NOW = new RealDate('2026-07-06T10:00:00').getTime(); // a Monday
globalThis.Date = class extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(NOW); }
  static now() { return NOW; }
};

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
const Plan = await import('../src/lib/PlanService.js');

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const BASE = {
  plan_start_date: '2026-07-06', plan_weeks: 8,
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80, onboarded: true
};

// ── 1. Run athlete: on-demand session comes from the D11 brain ──────────────
Database.services.updateProfile({
  ...BASE,
  goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational'
});

const runNow = Plan.generateTrainNow({ minutes: 45 });
const runNames = (runNow.session.items || []).map((it) => (it.name || '').toLowerCase());

assert(runNames.length >= 1, `run Train Now session is non-empty (${runNames.length} items)`);
assert(!runNames.some((n) => /chest fly|pec deck|biceps curl|spider curl|triceps|lateral raise/.test(n)),
  `run Train Now excludes chest/arm isolation (got: ${runNames.join(', ')})`);
assert(runNames.some((n) => /nordic|romanian|rdl|hamstring|glute|calf|squat|deadlift|lunge|step.?up/.test(n)),
  'run Train Now includes durability / lower-body strength work');

// Determinism (fixed clock + same profile ⇒ same session).
const runAgain = Plan.generateTrainNow({ minutes: 45 });
assert(JSON.stringify(runAgain.session.items) === JSON.stringify(runNow.session.items),
  'run Train Now is deterministic');

// ── 2. Build athlete: the added ctx fields are a no-op ──────────────────────
// The D11 gate is style==='sport' && priorityQualities.length>0 && sport ∈ {run,cycle};
// a build profile fails all three (sport null, empty diagnosis), so its Train Now
// output must be unchanged by this wiring. Proven at the allocator level: the exact
// legacy ctx (without the D11 fields) and the new ctx produce identical sessions.
const { allocateGym } = await import('@performance-os/engine/lib/plan/allocator.js');
const { weeklyMuscleTargets } = await import('@performance-os/engine/lib/strength/targets.js');
const { resolveProgram } = await import('@performance-os/engine/lib/strength/program.js');
const { resolveLifts } = await import('@performance-os/engine/lib/liftProgression.js');

const buildProfile = { ...BASE, goal_type: 'build', strength_style: 'bodybuilding' };
const program = resolveProgram(buildProfile);
const targets = weeklyMuscleTargets({ style: program.style, intent: 'base', level: 'intermediate', weekInPhase: 1, phaseWeeks: 1 });
const legacyCtx = {
  style: program.style, intent: 'base', deload: false, weekNum: 1, level: 'intermediate',
  sex: 'male', lifts: resolveLifts(buildProfile), access: FULL, bodyweight: 80,
  exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map()
};
const newCtx = { ...legacyCtx, sport: null, power: !!program.power, priorityQualities: [], season: program.season, skbIds: new Set() };
const slots = [{ minutes: 45, equip: FULL }];

const legacySession = allocateGym({ targets, slots, ctx: legacyCtx });
const newSession = allocateGym({ targets, slots, ctx: newCtx });
assert(JSON.stringify(legacySession) === JSON.stringify(newSession),
  'build: adding the D11 ctx fields is byte-identical at the allocator');

// And end-to-end: a build athlete's Train Now is sane (isolation allowed for bodybuilding).
Database.services.updateProfile(buildProfile);
const buildNow = Plan.generateTrainNow({ minutes: 45 });
assert((buildNow.session.items || []).length >= 1, 'build Train Now session is non-empty');
