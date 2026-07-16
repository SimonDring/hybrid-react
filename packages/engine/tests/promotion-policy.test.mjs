// promotion-policy.test.mjs — Phase 3 M5-L1 acceptance: the D16 staged→learned
// promotion policy (promoteFromOutcomes). The engine that LEARNS an athlete.
// Spec: docs/superpowers/specs/2026-07-16-m5-d16-learning-loop-design.md;
// ruled policy: docs/design/m5-learning/PROMOTION-POLICY.md (🔒 7).
//
// Proves the RULED gates, all pure + additive-first:
//   (a) <3 blocks              → STAGED, no learned prior (Gate A unmet; steer OFF)
//   (b) 3 predictive blocks    → PROMOTED, learned ≤15% off population, D7 steer ARMS
//   (c) 3 blocks, last miss     → NOT promoted (Gate B unmet)
//   (d) learned then mispredicts → DEMOTED fast (back to population; steer OFF)
//   (e) learned then abstains    → HELD learned (an abstain never demotes)
//   (f) empty history            → population plan, BYTE-IDENTICAL (additive-first)
//
// Imports ONLY from @performance-os/engine (no app boot). Fixed dates.
import { promoteFromOutcomes, generatePlan, blockDeloadSteers } from '@performance-os/engine';
import { recoverabilityBand } from '@performance-os/engine/data/blockPriors.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const POP = 1.0;
// The D7 steer's arming expression, reproduced VERBATIM from PlanGenerator.js:213 — the
// single source of truth for "is a learned recoveryRate prior in force?" (TR-05).
const armValue = (learnedPriors) =>
  (learnedPriors && learnedPriors.recoveryRate && learnedPriors.recoveryRate.value) ?? null;

// A block-outcome row carrying the recovery signal the substrate's outcome_signals supplies.
const block = (end, recoveryRate, confidence = 0.7) =>
  ({ period_end: end, observed: { recoveryRate }, confidence });

// A "recovers faster" athlete: observed recovery signal steady at 1.15 (>1 population mean).
const FAST3 = [block('2026-02-01', 1.15), block('2026-03-01', 1.15), block('2026-04-01', 1.15)];

// ── (a) <3 blocks → STAGED, no learned prior, steer OFF ──────────────────────
{
  const r = promoteFromOutcomes(FAST3.slice(0, 2), POP);
  assert(r.provenance.tier === 'staged', `(a) 2 blocks → tier 'staged' (got '${r.provenance.tier}')`);
  assert(r.provenance.gateA === false, '(a) Gate A unmet with only 2 blocks');
  assert(armValue(r.learnedPriors) === null, '(a) NO learned recoveryRate — the D7 steer resolves to null');
  assert(!!r.staged.recoveryRate, '(a) the estimate lives in the distinct staged field (steers nothing)');
  assert(blockDeloadSteers({ sport: 'run', priorityQualities: [{ qualityId: 'maxStrength' }], recoveryRate: armValue(r.learnedPriors) }) === false,
    '(a) blockDeloadSteers is OFF for the un-promoted athlete');
}

// ── (b) 3 predictive blocks + confidence → PROMOTED, ≤15%, steer ARMS ─────────
let promoted;
{
  const r = promoteFromOutcomes(FAST3, POP);
  promoted = r;
  assert(r.provenance.tier === 'learned', `(b) 3 predictive blocks → tier 'learned' (got '${r.provenance.tier}')`);
  assert(r.provenance.gateA && r.provenance.gateB, '(b) BOTH gates passed (evidence + falsifiability)');
  const v = armValue(r.learnedPriors);
  assert(v != null && r.learnedPriors.recoveryRate.source === 'learned', `(b) a LEARNED recoveryRate is written (value ${v})`);
  assert(Math.abs(v - POP) <= 0.15 * POP + 1e-9, `(b) shrinkage holds — learned ${v} deviates ≤15% from population ${POP}`);
  assert(!r.staged.recoveryRate, '(b) staged is empty once learned (structurally distinct; only one is populated)');
  assert(recoverabilityBand(v) === 'high', `(b) 1.15 lands the 'high' recoverability band (faster recovery)`);
  assert(blockDeloadSteers({ sport: 'run', priorityQualities: [{ qualityId: 'maxStrength' }], recoveryRate: v }) === true,
    '(b) blockDeloadSteers now ARMS for the promoted athlete');
}

// ── (c) 3 blocks but the LAST mispredicts → NOT promoted (Gate B unmet) ───────
{
  const hist = [block('2026-02-01', 1.15), block('2026-03-01', 1.15), block('2026-04-01', 0.80)]; // last collapses
  const r = promoteFromOutcomes(hist, POP);
  assert(r.provenance.tier === 'staged', `(c) last-block misprediction → NOT promoted (tier '${r.provenance.tier}')`);
  assert(r.provenance.gateA === true && r.provenance.gateB === false, '(c) Gate A met but Gate B (falsifiability) FAILS on the mispredicting block');
  assert(armValue(r.learnedPriors) === null, '(c) no learned prior — the steer stays OFF');
}

// ── (d) a promoted prior that then mispredicts → DEMOTED fast ─────────────────
{
  const hist = [...FAST3, block('2026-05-01', 0.80)]; // block 4: a clear misprediction
  const r = promoteFromOutcomes(hist, POP, { current: promoted });
  assert(r.provenance.tier === 'staged', `(d) learned + misprediction → DEMOTED to 'staged' (got '${r.provenance.tier}')`);
  assert(r.provenance.demotedFrom === 'learned', '(d) provenance records the demotion from learned');
  assert(armValue(r.learnedPriors) === null, '(d) the learned prior is withdrawn — steer reverts to population (OFF)');
}

// ── (e) a promoted prior that then ABSTAINS → HELD (an abstain never demotes) ──
{
  const hist = [...FAST3, { period_end: '2026-05-01', observed: { recoveryRate: null }, confidence: 0 }]; // block 4: no signal
  const r = promoteFromOutcomes(hist, POP, { current: promoted });
  assert(r.provenance.tier === 'learned', `(e) learned + abstain → HELD learned (got '${r.provenance.tier}')`);
  assert(r.provenance.held === 'abstain', '(e) provenance records the abstain-hold (no demotion)');
  assert(armValue(r.learnedPriors) != null, '(e) the learned prior stays armed through an untestable block');
}

// ── (f) empty history → population plan, BYTE-IDENTICAL (additive-first, the law) ──
{
  const r = promoteFromOutcomes([], POP);
  assert(r.provenance.tier === 'population', `(f) empty history → tier 'population' (got '${r.provenance.tier}')`);
  assert(armValue(r.learnedPriors) === null && !r.staged.recoveryRate, '(f) no learned AND no staged prior — nothing to steer');

  // A diagnosed sport profile: no learned prior vs an empty-history learned prior → identical.
  const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
  const sport = {
    goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete',
    event_date: '2026-08-30', experience_level: 'intermediate', experience: { gym: 'intermediate' },
    sex: 'male', bodyweight_kg: 75, access: FULL,
    availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {},
  };
  const bare = JSON.stringify(generatePlan({ ...sport }));
  const withEmpty = JSON.stringify(generatePlan({ ...sport, athlete_model: { learnedPriors: r.learnedPriors } }));
  assert(withEmpty === bare, '(f) attaching the empty-history learnedPriors yields a BYTE-IDENTICAL plan');

  // TEETH — the PROMOTED prior (b) DOES move that same plan (the identity check is non-vacuous).
  const withLearned = JSON.stringify(generatePlan({ ...sport, athlete_model: { learnedPriors: promoted.learnedPriors } }));
  assert(withLearned !== bare, '(f/teeth) attaching a PROMOTED learnedPriors DOES change the plan — the D7 steer arms');
}

// ── PURITY — same inputs, same output; the function never touches a plan/dose ──
{
  const a = JSON.stringify(promoteFromOutcomes(FAST3, POP));
  const b = JSON.stringify(promoteFromOutcomes(FAST3, POP));
  assert(a === b, 'purity: identical history → identical result (no clock/randomness)');
  const r = promoteFromOutcomes(FAST3, POP);
  assert(!('plan' in r) && !('session' in r) && !('dose' in r), 'purity: the result carries priors ONLY — no plan/session/dose');
  assert(typeof r.provenance.engineVersion === 'string' && typeof r.provenance.methodVersion === 'string',
    'provenance: stamped with engine + method versions (EDS §25)');
}

console.log('promotion-policy: done');
