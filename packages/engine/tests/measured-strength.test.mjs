// measured-strength.test.mjs — Phase 3 M3 T1 acceptance: the MEASURED strength estimator.
// (spec docs/superpowers/specs/2026-07-15-phase3-m3-measured-diagnosis-design.md §2/§3;
// 03-PERFORMANCE-MODEL §5.2 estimator classes + C8 measured-displaces-inferred.)
//
// Proves the three acceptance gates, all behind D1's single estimation interface:
//   (a) ADDITIVE-FIRST — a profile with NO logged lifts is estimated by the prior path
//       (source 'inferred') and its plan is byte-identical to that prior-path baseline;
//       measurement adds nothing to an athlete who supplied nothing.
//   (b) MEASURED DISPLACES INFERRED, LABELLED — a strong-squat/weak-press logged athlete
//       gets a maxStrength capability that DIFFERS from the prior, stamped source 'measured'
//       at a HIGHER confidence tier, with the displaced prior NAMED (C8; Art 14/16).
//   (c) k>1 PRIORITIES — measurement's higher confidence lets D5 name more than one
//       priority for that athlete (G1/G3), where the flat-prior athlete collapses to k=1.
//
// Imports ONLY from @performance-os/engine (no app boot — spec §2.1). Fixed dates.
import { estimateCapability } from '@performance-os/engine/lib/performance/estimation.js';
import { profileToAthleteModel, performanceModelForProfile, generatePlan } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const AS_OF = '2026-07-13';
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const base = {
  goal_type: 'build', strength_style: 'strength', experience_level: 'intermediate',
  experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 82, access: FULL,
  availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: AS_OF,
};
// Strong squat/deadlift, comparatively weaker press — real capability, real spread.
const NO_LIFT = { ...base, lifts: {} };
const MEASURED = { ...base, lifts: { squat: 150, bench: 105, deadlift: 190, ohp: 75, pull: 10 } };

const modelNo = profileToAthleteModel(NO_LIFT, AS_OF);
const modelMe = profileToAthleteModel(MEASURED, AS_OF);
const capNo = estimateCapability('maxStrength', modelNo, AS_OF, null);
const capMe = estimateCapability('maxStrength', modelMe, AS_OF, null);

// ── (a) additive-first: no logged lifts → the prior path, byte-identical plan ──
assert(capNo.source === 'inferred', `(a) no-lift maxStrength is prior-inferred (source=${capNo.source})`);
assert(capNo.confidence === 'low', '(a) no-lift maxStrength carries the low prior confidence');
assert(!('displaces' in capNo), '(a) no-lift estimate carries no displacement (nothing was measured)');
// The plan for a no-lift athlete equals the plan built from the same profile with an explicit
// empty lift map + empty tracked-lift log — adding zero measurements moves nothing.
const planNoA = JSON.stringify(generatePlan({ ...NO_LIFT }));
const planNoB = JSON.stringify(generatePlan({ ...NO_LIFT, lifts: {}, tracked_lifts: [], test_results: [] }));
assert(planNoA === planNoB, '(a) adding zero measurements to a no-lift profile yields a byte-identical plan');

// ── (b) measured displaces inferred, labelled, prior named ──
assert(capMe.source === 'measured', `(b) logged-lift maxStrength is measured (source=${capMe.source})`);
assert(capMe.level !== capNo.level, `(b) measured level (${capMe.level.toFixed(3)}) differs from the prior (${capNo.level})`);
const TIER = { low: 0, moderate: 1, high: 2 };
assert(TIER[capMe.confidence] > TIER[capNo.confidence], `(b) measured confidence (${capMe.confidence}) is a HIGHER tier than the prior (${capNo.confidence})`);
assert(capMe.displaces && capMe.displaces.level === capNo.level, '(b) the displaced prior is recorded, and its level matches the prior estimate');
assert(/displaces/.test(capMe.evidence) && capMe.evidence.includes(capNo.evidence), '(b) the displaced prior is NAMED in the measured evidence');
// The displacement is SURFACED in the diagnosis rationale the athlete can read (Art 14).
const pmMe = performanceModelForProfile(MEASURED, AS_OF);
const msFactor = pmMe.limitingFactors.find((f) => f.qualityId === 'maxStrength');
assert(msFactor && /Measured — displaces/.test(msFactor.rationale), '(b) the limiting-factor rationale names the displaced prior');

// ── (c) k>1 priorities for the measured athlete; k=1 for the flat-prior athlete ──
const pmNo = performanceModelForProfile(NO_LIFT, AS_OF);
assert(pmNo.priorityAdaptations.length === 1, `(c) the flat-prior athlete collapses to k=1 (got ${pmNo.priorityAdaptations.length})`);
assert(pmMe.priorityAdaptations.length > 1, `(c) the measured athlete surfaces k>1 priorities (got ${pmMe.priorityAdaptations.length}: ${pmMe.priorityAdaptations.map((p) => p.qualityId).join(', ')})`);

console.log('measured-strength: done');
