// tests/wp47-block-steer.js — WP-47 (D7 steer, gated): the block plan drives the deload rhythm.
//
// v0 was advisory. This is the first place D7 actually STEERS the plan — the concrete A9 step:
// a diagnosed SPORT cohort that carries a recoverability prior gets its deload cadence from the
// diagnosis (recoverability), not the style template. Deliberately narrow + reversible: it fires
// ONLY when sport + a diagnosis + a recoverability prior are all present, so no-prior profiles
// (every golden archetype) keep the template deloads and don't move.

import { generatePlan, deloadsFromRecoverability } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const withPrior = (p, rate) => ({ ...p, athlete_model: { learnedPriors: { recoveryRate: { value: rate, source: 'learned', confidence: 'low' } } } });
const deloadWeeksOf = (plan) => {
  const out = [];
  for (const ph of plan.phases || []) for (const w of ph.weeks || []) if (w.deload) out.push(w.num);
  return out.sort((a, b) => a - b);
};

const sportAnswers = A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', experienceLevel: 'advanced', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: { squat: 170, deadlift: 210 } });
const sportBase = answersToProfile(sportAnswers);

// Sanity: this cohort actually has a diagnosis (the gate needs priorityQualities).
const diagCheck = generatePlan(sportBase);
assert(diagCheck.meta.diagnosis && diagCheck.meta.diagnosis.priorityQualities.length > 0, 'the sport cohort has a diagnosis (gate precondition)');
const total = diagCheck.totalWeeks;

// (1) sport + LOW recoverability prior → deloads follow the recoverability cadence (tighter).
const low = generatePlan(withPrior(sportBase, 0.8));
const expectedLow = deloadsFromRecoverability(total, 0.8);
assert(JSON.stringify(deloadWeeksOf(low)) === JSON.stringify(expectedLow),
  `low-recoverability sport deloads follow the diagnosis cadence ${JSON.stringify(expectedLow)} (got ${JSON.stringify(deloadWeeksOf(low))})`);

// (2) same sport, NO prior → template deloads (untouched) — and they differ from the steered set.
const noPrior = generatePlan(sportBase);
assert(JSON.stringify(deloadWeeksOf(noPrior)) !== JSON.stringify(expectedLow) || expectedLow.length === 0,
  'without a recoverability prior the sport plan keeps the template deloads (not the steered cadence)');

// (3) low recoverability MOVED the deloads vs no-prior — proving the steer actually fires.
assert(JSON.stringify(deloadWeeksOf(low)) !== JSON.stringify(deloadWeeksOf(noPrior)),
  `the steer changes the deload rhythm (low ${JSON.stringify(deloadWeeksOf(low))} vs template ${JSON.stringify(deloadWeeksOf(noPrior))})`);

// (4) BUILD cohort is NOT gated — a recoverability prior does not steer its deloads.
const buildBase = answersToProfile(A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} }));
const buildLow = generatePlan(withPrior(buildBase, 0.8));
const buildNoPrior = generatePlan(buildBase);
assert(JSON.stringify(deloadWeeksOf(buildLow)) === JSON.stringify(deloadWeeksOf(buildNoPrior)),
  'a build plan is unchanged by a recoverability prior (not gated — stays on the template until WP-49)');

console.log(process.exitCode ? 'wp47-block-steer FAILURES' : `PASS: wp47-block-steer — ${pass} assertions (total weeks ${total})`);
