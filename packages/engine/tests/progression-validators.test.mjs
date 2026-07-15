// progression-validators.test.mjs — Phase 3 M2 T1: the Wave-B NET (report-only).
//
// True-positive proof by SEEDED DEFECT (13-VALIDATION-STRATEGY §8.2): a validator
// with a low false-positive rate is worthless if it also misses real violations. So
// for each of the two report-only validators this suite hand-builds a plan that
// violates EXACTLY its rule and asserts it FIRES — at the right tier, with a reason —
// AND hand-builds a clean plan that asserts it does NOT fire (the false-positive
// guard). This is the discrimination proof: the net catches the defect and stays quiet
// when there is none.
//
// Report-only discipline (the report → flag → gate ladder is M4): the findings speak
// `severity`, never a trim/veto verdict, and `validatePlanProgression` never mutates
// the plan. Engine-owned: imports ONLY ../src/... — never apps/mobile.
import {
  validatePlanProgression,
  progressionSanityValidator,
  doseCoherenceValidator
} from '../src/lib/validation/progression.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── plan fixture builders (minimal engine plan shape) ────────────────────────
const item = (num, name, sets, weight, extra = {}) =>
  ({ num, group: num[0], exId: name.toLowerCase().replace(/\s+/g, '_'), name, sets, weight, ...extra });
const session = (quality, items, title = 'Day · Lift') =>
  ({ title, _objective: { quality, purpose: `Develop ${quality}` }, items });
const week = (num, sessions, flags = {}) =>
  ({ num, deload: false, taper: false, ...flags, sessions });
const phase = (title, weeks) => ({ title, weeks });
const plan = (phases) => ({ phases });

// A block of `n` working weeks whose primary lift is dosed identically every week.
const flatBlock = (title, n, quality = 'maxStrength', sets = '3 × 5', weight = '100 kg') =>
  phase(title, Array.from({ length: n }, (_, i) =>
    week(i + 1, [session(quality, [item('A1', 'Back squat', sets, weight)])])));

// The same block, but the primary lift's load creeps each week (progresses).
const progressingBlock = (title, n, quality = 'maxStrength') =>
  phase(title, Array.from({ length: n }, (_, i) =>
    week(i + 1, [session(quality, [item('A1', 'Back squat', '3 × 5', `${100 + i * 2.5} kg`)])])));

// ── 1 · progression-sanity: FLAT block fires ─────────────────────────────────
{
  const flat = plan([flatBlock('Base', 6)]);
  const report = validatePlanProgression(flat);
  const fired = report.findings.filter((f) => f.validator === 'progression.sanity' && /flat block/.test(f.reason));
  assert(fired.length === 1, 'progression-sanity FIRES on a flat 6-week block (a progressing athlete must overload — SR-01)');
  assert(fired[0] && fired[0].tier === 5, 'the flat-block finding is tier 5 (OBJECTIVE FIDELITY)');
  assert(fired[0] && /Back squat/.test(fired[0].reason), 'the flat-block reason names the stuck lift');
  assert(fired[0] && fired[0].severity === 'warn', 'the flat-block finding carries a severity (report-only vocabulary)');
  // report entry shape: {validator, severity, reason, tier}
  assert(['validator', 'severity', 'reason', 'tier'].every((k) => k in fired[0]), 'the report entry has {validator, severity, reason, tier}');
  assert(!('verdict' in fired[0]), 'the finding carries NO trim/veto verdict (report-only — cannot gate; the ladder is M4)');
}

// ── 2 · progression-sanity: PROGRESSING block does NOT fire (FP guard) ────────
{
  const good = plan([progressingBlock('Base', 6)]);
  const report = validatePlanProgression(good);
  const fired = report.findings.filter((f) => f.validator === 'progression.sanity' && /flat block/.test(f.reason));
  assert(fired.length === 0, 'progression-sanity is QUIET on a block whose primary lift creeps week-over-week (false-positive guard)');
}

// ── 3 · progression-sanity: unexplained dose regression fires ────────────────
{
  const regress = plan([phase('Base', [
    week(1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '100 kg')])]),
    week(2, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '95 kg')])]),
    week(3, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '95 kg')])])
  ])]);
  const fired = progressionSanityValidator.runPlan(regress).filter((f) => /unexplained regression/.test(f.reason));
  assert(fired.length === 1, 'progression-sanity FIRES on a within-block load regression (100→95 kg, no deload, no added reps)');
  assert(fired[0] && fired[0].tier === 5, 'the regression finding is tier 5');
}

// ── 4 · progression-sanity: deload cadence outside recoverability bounds ──────
{
  // 9 consecutive working weeks, no deload → beyond 2× the governed cadence (8).
  const tooLong = plan([phase('Endless', Array.from({ length: 9 }, (_, i) =>
    week(i + 1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', `${100 + i * 2.5} kg`)])])))]);
  const fired = progressionSanityValidator.runPlan(tooLong).filter((f) => /deload cadence/.test(f.reason));
  assert(fired.length === 1, 'progression-sanity FIRES when a working stretch runs past the governed deload cadence (9 weeks, bound 8)');
  assert(fired[0] && fired[0].tier === 3, 'the deload-cadence finding is tier 3 (RECOVERABILITY)');

  // A block that deloads on cadence → quiet.
  const cadenced = plan([phase('Block', [
    week(1, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '100 kg')])]),
    week(2, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '102.5 kg')])]),
    week(3, [session('maxStrength', [item('A1', 'Back squat', '3 × 5', '105 kg')])]),
    week(4, [session('maxStrength', [item('A1', 'Back squat', '2 × 5', '80 kg')])], { deload: true })
  ])]);
  const cad = progressionSanityValidator.runPlan(cadenced).filter((f) => /deload cadence/.test(f.reason));
  assert(cad.length === 0, 'progression-sanity is QUIET when deloads arrive within the governed cadence (false-positive guard)');
}

// ── 5 · dose-coherence: quality/scheme MISMATCH fires ("3×12 for everyone") ───
{
  // A maxStrength objective whose PRIMARY lift is dosed 3×12 — a hypertrophy scheme on a
  // heavy strength lift (the named SR-14 counter-case).
  const mismatch = plan([phase('Base', [
    week(1, [session('maxStrength', [item('A1', 'Back squat', '3 × 12', '60 kg')])])
  ])]);
  const fired = doseCoherenceValidator.run(mismatch.phases[0].weeks[0]);
  assert(fired.length === 1, 'dose-coherence FIRES on a maxStrength primary dosed 3×12 (the "3×12 for everyone" antipattern — SR-14)');
  const via = validatePlanProgression(mismatch).findings.filter((f) => f.validator === 'progression.dose-coherence');
  assert(via.length === 1 && via[0].tier === 5, 'the dose-coherence finding surfaces in the plan report at tier 5 (OBJECTIVE FIDELITY)');
  assert(via[0] && via[0].severity === 'warn' && !('verdict' in via[0]), 'the dose-coherence finding is report-only (severity, no verdict)');
  assert(via[0] && /Back squat/.test(via[0].reason) && /12/.test(via[0].reason), 'the dose-coherence reason names the lift and the offending rep count');
}

// ── 6 · dose-coherence: COHERENT scheme does NOT fire (FP guard) ─────────────
{
  // maxStrength primary at 3×5 — coherent; and an accessory legitimately at higher reps
  // in the SAME session must NOT trip the primary-scoped check.
  const coherent = plan([phase('Base', [
    week(1, [session('maxStrength', [
      item('A1', 'Back squat', '3 × 5', '120 kg'),
      item('B1', 'Leg curl', '3 × 15', '30 kg')   // accessory: high-rep, out of scope by design
    ])])
  ])]);
  const fired = doseCoherenceValidator.run(coherent.phases[0].weeks[0]);
  assert(fired.length === 0, 'dose-coherence is QUIET when the maxStrength primary is low-rep, even with a high-rep accessory present (false-positive guard)');

  // A hypertrophy objective dosed low-rep (the WP-49 discipline↔objective decoupling)
  // must NOT fire — dose-coherence only flags the "3×12 on a strength lift" direction.
  const hyLowRep = plan([phase('Base', [
    week(1, [session('hypertrophy', [item('A1', 'Back squat', '4 × 4', '110 kg')])])
  ])]);
  assert(doseCoherenceValidator.run(hyLowRep.phases[0].weeks[0]).length === 0,
    'dose-coherence tolerates a build discipline dosing a hypertrophy-objective day low-rep (does not mischaracterise the engine design)');
}

// ── 7 · the report is advisory only (never mutates, never a verdict) ─────────
{
  const p = plan([flatBlock('Base', 6)]);
  const before = JSON.stringify(p);
  const report = validatePlanProgression(p);
  assert(JSON.stringify(p) === before, 'validatePlanProgression does not mutate the plan (pure, report-only)');
  assert(report.reportOnly === true, 'the report is flagged reportOnly: true');
  assert(report.findings.every((f) => f.severity && !('verdict' in f)), 'no finding carries a trim/veto verdict (cannot gate a plan)');
}

if (!failures) console.log('\nprogression-validators: all assertions passed.');
