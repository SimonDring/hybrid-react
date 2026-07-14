// prop-contracts.test.mjs — Phase 3 M0 T3 property: CONTRACT PROPERTIES at stage
// boundaries (13-VALIDATION-STRATEGY §5.2 "Contract properties"; §1's cross-cutting
// contract-enforcement machinery; TAS §5.7; 02 §2.2, §2.5, §2.16).
//
// Four sub-invariants, fuzzed across generated valid inputs, each asserted against the
// boundary in the CURRENT post-Wave-A engine that actually carries it:
//
//   (a) {value, confidence, rationale} present + typed. Tested at the D4 diagnosis
//       boundary (limitingFactors — magnitude/confidence/rationale) and the runtime
//       signal boundary (deriveReadiness — value/confidence). See the SCOPE NOTE.
//   (b) confidence ≤ weakest input (TAS §5.7). Tested at D4: a limiting factor's
//       confidence stays the WEAK LINK — the capability estimate — never rising above
//       it however strong the (SKB-backed) demand is (diagnose.js: "confidence stays
//       the weakest input"). Fuzzed with a seeded LCG so any failure is reproducible.
//   (c) droppedDemands / parked always present, even when empty (02 §2.2, §2.5;
//       SR-05). Tested on the Performance Model: droppedDemands is ALWAYS an array —
//       [] for a goal athlete, populated for a sport athlete — an authored demand is
//       homed or declared, never silently dropped.
//   (d) a D16-style output naming a plan/session/dose is a contract violation
//       (02 §2.16; Art 18 — priors are the ONLY write channel toward the core). Tested
//       on the learning seam (blockOutcome): its real output is priors-only, and a
//       hand-built D16 output that names a plan/session/dose is caught by the invariant.
//
// ── SCOPE NOTE (honest boundaries, spec §5.2 + Task 3) ──
// V2's universal contract — {value, confidence, rationale} enforced at EVERY stage
// boundary, failing fast in dev/CI — is M4 machinery (M-VAL). It is NOT yet wired at
// every boundary in the current engine. This test asserts the contract where it
// EXISTS today (D4 diagnosis, derived runtime signals, the learning seam) so those
// boundaries can't regress, and NAMES the not-yet-universal parts rather than pretending
// coverage. Likewise `parked` (D5 non-selection reasons) is not yet an emitted field —
// a V2 M-DIAG target; `droppedDemands` (which IS emitted) is pinned now.
//
// Imports the barrel + one deep ./lib path (diagnose) — allowed for engine-owned tests
// (run-engine.mjs convention). No app boot (spec §2.1). Deterministic (seeded fuzz).
import { performanceModelForProfile, deriveReadiness, blockOutcome } from '@performance-os/engine';
import { diagnoseLimitingFactors } from '@performance-os/engine/lib/performance/diagnose.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Seeded LCG — reproducible fuzz (the report can cite SEED for any failure).
const SEED = 0x1234abcd;
let _s = SEED >>> 0;
const rnd = () => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 0x100000000);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const CONF_TIERS = ['low', 'medium', 'high'];
const CONF_ORD = { low: 0, medium: 1, high: 2 };

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// ───────────────────────────────────────────────────────────────────────────────
// (b) + (a·D4): confidence ≤ weakest input, and {value, confidence, rationale} typed.
// Fuzz 200 diagnosis inputs: random qualities, random capability confidence tiers,
// random demand importances. For every emitted factor: its confidence never exceeds
// the matching capability's confidence (the weak link), and it carries a numeric
// magnitude + string confidence + string rationale.
// ───────────────────────────────────────────────────────────────────────────────
let dIters = 0, weakestViol = 0, shapeViol = 0;
for (let it = 0; it < 200; it++) {
  const nQ = 1 + Math.floor(rnd() * 6);
  const caps = [], dem = [];
  const capConfById = new Map();
  for (let q = 0; q < nQ; q++) {
    const id = `q${q}`;
    const conf = pick(CONF_TIERS);
    capConfById.set(id, conf);
    caps.push({ qualityId: id, level: Math.floor(rnd() * 6), confidence: conf, source: pick(['inferred', 'measured']) });
    dem.push({ qualityId: id, importance: Math.floor(rnd() * 10) });
  }
  const factors = diagnoseLimitingFactors(caps, dem);
  for (const f of factors) {
    dIters++;
    // (a) contract shape present + typed.
    if (!(typeof f.magnitude === 'number' && typeof f.confidence === 'string' && typeof f.rationale === 'string' && f.rationale.length > 0)) shapeViol++;
    // (b) confidence ≤ weakest input (the capability estimate).
    const capConf = capConfById.get(f.qualityId);
    if (CONF_ORD[f.confidence] > CONF_ORD[capConf]) weakestViol++;
  }
}
assert(dIters > 0, `contract(a/b): fuzz produced ${dIters} diagnosis factors to check (SEED=${SEED.toString(16)})`);
assert(shapeViol === 0, `contract(a): every D4 factor carries typed {magnitude, confidence, rationale} (${shapeViol} violations)`);
assert(weakestViol === 0, `contract(b): every D4 factor's confidence ≤ its weakest input (capability) confidence (${weakestViol} violations)`);

// (a) runtime signal boundary — deriveReadiness always returns typed {value, confidence}.
for (let it = 0; it < 20; it++) {
  const r = deriveReadiness({});
  const ok = r && (r.value === null || typeof r.value === 'number') && typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1;
  if (!ok) { assert(false, `contract(a): deriveReadiness returns typed {value, confidence in [0,1]} (iter ${it})`); break; }
  if (it === 19) assert(true, 'contract(a): deriveReadiness returns typed {value, confidence in [0,1]} across repeats');
}

// ───────────────────────────────────────────────────────────────────────────────
// (c) droppedDemands always present (array), even when empty. Fuzz goal + sport
// profiles; assert the ledger is ALWAYS an array on the Performance Model.
// ───────────────────────────────────────────────────────────────────────────────
const PROFILE_FUZZ = [
  { goal_type: 'build', strength_style: 'strength', experience_level: 'beginner', access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13' },
  { goal_type: 'build', strength_style: 'bodybuilding', experience_level: 'advanced', access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13' },
  { goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30', experience_level: 'intermediate', access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13' },
  { goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational', experience_level: 'intermediate', access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13' },
];
let ddViol = 0, sawEmpty = false, sawPopulated = false;
for (const p of PROFILE_FUZZ) {
  const pm = performanceModelForProfile(p, p.plan_start_date);
  if (!Array.isArray(pm.droppedDemands)) ddViol++;
  else if (pm.droppedDemands.length === 0) sawEmpty = true;
  else sawPopulated = true;
}
assert(ddViol === 0, `contract(c): droppedDemands is ALWAYS an array on the Performance Model (${ddViol} violations)`);
assert(sawEmpty && sawPopulated, 'contract(c): the ledger is present both when EMPTY (goal athlete) and POPULATED (sport athlete) — non-vacuous');
console.log('NOTE: `parked` (D5 non-selection reasons) is not yet an emitted engine field — a V2 M-DIAG target; `droppedDemands` (emitted today) is pinned here so it cannot silently disappear.');

// ───────────────────────────────────────────────────────────────────────────────
// (d) D16 output NAMES ONLY PRIORS — never a plan / session / dose (02 §2.16; Art 18).
// The invariant, encoded as a predicate: a learning output is a contract violation if
// any of its records carries a plan/session/dose-naming key. Assert the REAL blockOutcome
// output satisfies it, AND that a hand-built plan-naming output is caught (teeth).
// ───────────────────────────────────────────────────────────────────────────────
const FORBIDDEN_D16_KEYS = ['plan', 'phases', 'weeks', 'sessions', 'session', 'items', 'exercises', 'title', 'sets', 'reps', 'weight', 'load', 'dose', 'prescription'];
// A record "names a plan/session/dose" if it carries any forbidden key (deep).
function namesPlanSessionOrDose(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_D16_KEYS.includes(k)) return true;
    if (namesPlanSessionOrDose(obj[k])) return true;
  }
  return false;
}
// A D16 output is valid iff NO emitted record (verdict / candidate prior) names one.
function d16IsPriorsOnly(out) {
  const records = [...(out.verdicts || []), ...(out.candidatePriors || [])];
  return records.every((r) => !namesPlanSessionOrDose(r));
}

// Real output — a struggling block that emits a candidate prior.
const realD16 = blockOutcome({
  priorityQualities: [{ qualityId: 'maxStrength' }, { qualityId: 'workCapacity' }],
  liftLog: [{ date: '2026-06-01', e1rm: 150 }, { date: '2026-06-14', e1rm: 149 }, { date: '2026-06-28', e1rm: 148 }],
  sessionRecoveries: [{ date: '2026-06-01', recovery: 3 }, { date: '2026-06-14', recovery: 2 }, { date: '2026-06-28', recovery: 2 }],
  startISO: '2026-06-01', endISO: '2026-06-28',
});
assert(realD16.candidatePriors.length > 0, 'contract(d): the fixture drives blockOutcome to emit a candidate prior (non-vacuous)');
assert(realD16.candidatePriors.every((p) => 'type' in p && 'value' in p && 'confidence' in p),
  'contract(d): every emitted candidate is a PRIOR shape {type, value, confidence}');
assert(d16IsPriorsOnly(realD16), 'contract(d): the real D16 (learning) output names ONLY priors — no plan/session/dose');

// Teeth — a hand-built D16 output that names a plan/session/dose MUST be rejected.
const illegalD16 = { verdicts: [], candidatePriors: [{ type: 'volumeTolerance', value: 0.9, confidence: 'low', sessions: [{ title: 'Monday', items: [{ name: 'Back Squat', sets: 5 }] }] }] };
assert(!d16IsPriorsOnly(illegalD16), 'teeth: a D16 output that names a plan/session/dose is caught as a contract violation');
console.log('NOTE: no standalone engine validator REJECTS a plan-naming D16 output yet (D16 lands at M5); this property encodes and pins the §2.16 priors-only invariant so the learning seam cannot drift into naming plans.');
