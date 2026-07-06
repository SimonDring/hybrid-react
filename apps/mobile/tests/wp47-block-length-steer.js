// tests/wp47-block-length-steer.js — WP-47 (completion): the block plan steers block STRUCTURE.
//
// WP-47 #151 steered only the deload rhythm. This completes D7 steering: for a diagnosed SPORT
// cohort that carries a recoverability prior, the periodisation PHASE SPLIT (block structure)
// comes from the diagnosis — blockPlanToSplit maps the block plan's blocks to base|build|peak
// segments, fit to totalWeeks — not the style template. Same gate as the deload steer, so every
// golden archetype (no prior) is byte-identical; this test drives it with an injected prior.

import { generatePlan, blockPlanToSplit } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── blockPlanToSplit: always fits totalWeeks exactly, every segment ≥ 1 ──────
const blocks = [
  { trajectory: 'accumulation', lengthWeeks: 4, isTaper: false },
  { trajectory: 'transmutation', lengthWeeks: 3, isTaper: false },
  { trajectory: 'realisation', lengthWeeks: 2, isTaper: true },
];
for (const tw of [6, 8, 9, 12, 3]) {
  const sp = blockPlanToSplit(blocks, tw);
  const sum = sp.reduce((a, s) => a + s.weeks, 0);
  assert(sum === tw && sp.every((s) => s.weeks >= 1), `blockPlanToSplit fits ${tw} weeks exactly (${JSON.stringify(sp.map((s) => s.weeks))})`);
  assert(sp[0].intent === 'base' && sp[sp.length - 1].intent === 'peak', `trajectory→intent maps (accumulation→base, taper→peak) for tw=${tw}`);
}
assert(blockPlanToSplit([], 8) === null && blockPlanToSplit(blocks, 0) === null, 'null when it cannot build a split (no blocks / no weeks)');

// ── integration: a diagnosed sport cohort WITH a prior gets a diagnosis-driven split ──
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const withPrior = (p, rate) => ({ ...p, athlete_model: { learnedPriors: { recoveryRate: { value: rate, source: 'learned', confidence: 'low' } } } });
const phaseShape = (plan) => (plan.phases || []).map((ph) => ({ intent: ph.intent || (ph.title || '').toLowerCase(), weeks: (ph.weeks || []).length }));

// An off-season endurance athlete: a 12-week plan (template base/build split) with a diagnosis,
// so the diagnosis-driven structure visibly differs from the style template.
const sportBase = answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }));

const noPrior = generatePlan(sportBase);
assert(noPrior.meta.diagnosis && noPrior.meta.diagnosis.blockPlan.steered === false, 'no prior → blockPlan advisory (steered:false)');
const withP = generatePlan(withPrior(sportBase, 0.8));
assert(withP.meta.diagnosis.blockPlan.steered === true, 'with a recoverability prior → blockPlan STEERS (steered:true)');

// the steered plan's phase week-shape matches blockPlanToSplit of its own block plan.
const expectedSplit = blockPlanToSplit(withP.meta.diagnosis.blockPlan.blocks, withP.totalWeeks);
const steeredWeeks = phaseShape(withP).map((p) => p.weeks);
assert(JSON.stringify(steeredWeeks) === JSON.stringify(expectedSplit.map((s) => s.weeks)),
  `steered phase lengths follow the block plan ${JSON.stringify(expectedSplit.map((s) => s.weeks))} (got ${JSON.stringify(steeredWeeks)})`);
// and it actually DIFFERS from the template structure (proves the steer fires).
assert(JSON.stringify(phaseShape(noPrior)) !== JSON.stringify(phaseShape(withP)),
  `the steer changes the block structure (template ${JSON.stringify(phaseShape(noPrior).map((p) => p.weeks))} vs steered ${JSON.stringify(steeredWeeks)})`);
// the steered plan is still valid (totals + validation).
assert(steeredWeeks.reduce((a, b) => a + b, 0) === withP.totalWeeks, 'steered phases sum to totalWeeks');
assert(withP.meta.validation && withP.meta.validation.pass !== false, 'the steered plan passes validation');

// ── build cohort is NOT gated (a prior does not steer it) ────────────────────
const buildBase = answersToProfile(A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }));
assert(JSON.stringify(phaseShape(generatePlan(withPrior(buildBase, 0.8)))) === JSON.stringify(phaseShape(generatePlan(buildBase))),
  'a build plan is unchanged by a recoverability prior (not gated)');

console.log(process.exitCode ? 'wp47-block-length-steer FAILURES' : `PASS: wp47-block-length-steer — ${pass} assertions`);
