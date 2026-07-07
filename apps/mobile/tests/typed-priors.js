// tests/typed-priors.js — WP-37: the learned-priors READ-PATH is formal.
// Acceptance (audit): overriding a prior in a test CHANGES the decision;
// live output (population defaults, no learned priors) is UNCHANGED — proven
// byte-identical here and by the untouched golden master in the suite.

import assert from 'node:assert';
import { generatePlan, derivePerformanceModel, resolveProgram } from '@performance-os/engine';
import { capabilityPrior, dosePrior } from '@performance-os/engine/lib/priors.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// ── the typed interface carries provenance ────────────────────────────────────
const popCap = capabilityPrior('maxStrength', 'intermediate');
ok(popCap.value === 0.5 && popCap.source === 'population' && popCap.confidence === 'low',
  'capability prior defaults to the population value with declared provenance');
const popDose = dosePrior('volumeTolerance');
ok(popDose.value === 1 && popDose.source === 'population', 'dose prior defaults to a neutral 1');
ok(dosePrior('someUnknownPrior').value === 1, 'unknown prior names read as neutral (forward-safe)');

// ── D1: a learned capability prior changes the estimate + declares itself ────
const model = {
  sportingContext: { primarySport: 'running_middle' },
  trainingHistory: { selfRatedLevel: 'intermediate' },
  learnedPriors: { capability: { maxStrength: { value: 0.9, source: 'd16-test', confidence: 'moderate' } } },
};
const pm = derivePerformanceModel(model, '2026-07-05');
const ms = pm.capabilities.find((c) => c.qualityId === 'maxStrength');
ok(ms.level === 0.9, 'D1: the learned prior CHANGES the capability estimate (0.5 → 0.9)');
ok(/learned prior \(d16-test/.test(ms.evidence), 'D1: the evidence declares the learned source');
ok(ms.confidence === 'moderate', "D1: the prior's own confidence carries through");
const other = pm.capabilities.find((c) => c.qualityId === 'aerobicCapacity');
ok(other.level === 0.5 && /training-age band prior/.test(other.evidence),
  'D1: unoverridden qualities keep the population default AND the original evidence string');

// ── D12: a volume-tolerance prior changes the dose ───────────────────────────
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const answers = { ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL };
const profile = answersToProfile(answers);
const totalSets = (plan) => plan.phases.flatMap((p) => p.weeks.flatMap((w) => w.sessions))
  .flatMap((s) => s.items).reduce((a, it) => a + (parseInt(it.sets, 10) || 0), 0);

const base = generatePlan(profile);
const lowTol = generatePlan({ ...profile, athlete_model: { learnedPriors: { volumeTolerance: { value: 0.7, source: 'd16-test', confidence: 'moderate' } } } });
ok(resolveProgram(profile).volumeScalar === 1, 'D12: no learned prior → the volume scalar is the population default');
ok(resolveProgram({ ...profile, athlete_model: { learnedPriors: { volumeTolerance: { value: 0.7 } } } }).volumeScalar === 0.7,
  'D12: the prior scales the volume scalar at the ONE seam plan + reflow share');
// WP-49 flip (build→discipline): the read-path seam is proven above — the learned prior DOES change
// the decision input (volumeScalar 1 → 0.7). This profile is now a build DISCIPLINE (powerlifting),
// and the diagnosis-first disciplines drive their set count from priorityLifts × the discipline's
// fixed set scheme, so a scaled MEV→MAV target no longer removes delivered sets (volume is a
// downstream ledger, not the driver). We therefore assert the seam scales the decision input, not
// that raw delivered sets shrink. NOTE: the delivered-set effect of volumeTolerance is now dormant
// for disciplines — see the FLAGGED section of the WP-49 test-flip report.
ok(resolveProgram({ ...profile, athlete_model: { learnedPriors: { volumeTolerance: { value: 0.4 } } } }).volumeScalar === 0.4,
  `D12: a lower volume tolerance further scales the dose seam (0.4), the input every downstream dose reads`);
// (totalSets kept referenced so the helper stays live for future volume-first coverage.)
void totalSets(lowTol); void totalSets(base);

// ── the acceptance's other half: defaults are byte-identical ─────────────────
const withEmptyPriors = generatePlan({ ...profile, athlete_model: { learnedPriors: {} } });
ok(JSON.stringify(base) === JSON.stringify(withEmptyPriors),
  'no learned priors → byte-identical output (live behaviour unchanged)');
const withSchemaDefaults = generatePlan({ ...profile, athlete_model: { learnedPriors: {
  recoveryRate: { value: 1, source: 'population', confidence: 'low' },
  volumeTolerance: { value: 1, source: 'population', confidence: 'low' },
} } });
ok(JSON.stringify(base) === JSON.stringify(withSchemaDefaults),
  "the schema's default priors (value 1) are also byte-identical — the seam is dormant until D16 writes");

console.log(`\n${pass} typed-priors checks passed.`);
