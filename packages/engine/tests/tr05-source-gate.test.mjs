// tr05-source-gate.test.mjs — Phase 3 M5-L1 regression guard for TR-05 (audit 06):
// "a schema-default / unlearned prior must NEVER arm the D7 deload steer."
//
// THE DEFECT this pins closed: createAthleteModel (athlete/schema.js) seeds
// learnedPriors.recoveryRate {value:1, source:'population'} on EVERY real onboarded user.
// PlanGenerator armed the D7 deload/block steer on `recoveryRate.value != null` WITHOUT
// checking source, so every real user got a D7-STEERED (non-population) plan off a
// population default with ZERO learning — the exact TR-05 root defect the learning seam
// exists to prevent. It hid because the golden archetypes carry no athlete_model at all.
//
// THE RULE (now structural): only a GENUINELY-LEARNED prior (source==='learned', the value
// learning/promoteFromOutcomes stamps on promotion) arms the steer. A population/staged
// default resolves to null → population deload rhythm → BYTE-IDENTICAL to the no-model plan.
//
// Imports ONLY from @performance-os/engine (no app boot). Fixed dates.
import { generatePlan, promoteFromOutcomes } from '@performance-os/engine';
import { createAthleteModel } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
// A diagnosis-bearing sport profile (rugby) — the shape whose D7 steer arming is at stake.
const base = {
  goal_type: 'sport', sport: 'rugby', sport_intent: 'compete', sport_season: 'off_season',
  experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 90,
  access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] },
  sport_days: ['wed', 'sat'], plan_start_date: '2026-07-13', lifts: {},
};

// The population reference: NO athlete_model at all → steer OFF → population deload rhythm.
const population = JSON.stringify(generatePlan({ ...base }));

// ── (1) A SCHEMA-DEFAULT model does NOT arm — byte-identical to the population plan ──
// The exact object every real user carries out of createAthleteModel (source:'population').
const schemaDefault = createAthleteModel({ meta: { onboardedAt: null } });
assert(schemaDefault.learnedPriors.recoveryRate.source === 'population',
  '(setup) createAthleteModel seeds a source:population recoveryRate (the real-user default)');
const withDefault = JSON.stringify(generatePlan({ ...base, athlete_model: schemaDefault }));
assert(withDefault === population,
  '(1) a schema-DEFAULT (source:population) prior does NOT arm D7 — plan is BYTE-IDENTICAL to population');

// A hand-built population/low prior (the shape pre-fix armed on) is also inert.
const popPrior = { learnedPriors: { recoveryRate: { value: 1.2, source: 'population', confidence: 'low' } } };
assert(JSON.stringify(generatePlan({ ...base, athlete_model: popPrior })) === population,
  '(1b) even a NON-neutral value stays inert while source≠learned (source gates, not the value)');

// A STAGED prior (what promoteFromOutcomes emits pre-promotion) also does NOT arm.
const staged = promoteFromOutcomes(
  [{ period_end: '2026-02-01', observed: { recoveryRate: 1.2 }, confidence: 0.7 },
   { period_end: '2026-03-01', observed: { recoveryRate: 1.2 }, confidence: 0.7 }], 1);
assert(!staged.learnedPriors.recoveryRate, '(setup) 2-block history stays staged (no learned prior emitted)');
assert(JSON.stringify(generatePlan({ ...base, athlete_model: { learnedPriors: staged.learnedPriors, stagedPriors: staged.staged } })) === population,
  '(1c) a STAGED prior does not arm — the steer never reads the staged field');

// ── (2) A GENUINELY-LEARNED prior DOES arm — the plan differs (the gate has teeth) ──
const learned = { learnedPriors: { recoveryRate: { value: 1.2, source: 'learned', confidence: 'moderate' } } };
const withLearned = JSON.stringify(generatePlan({ ...base, athlete_model: learned }));
assert(withLearned !== population, '(2) a source:LEARNED prior ARMS the D7 steer — plan differs from population');

// End-to-end: a promoted prior from promoteFromOutcomes arms it too (same value path).
const promoted = promoteFromOutcomes(
  [{ period_end: '2026-02-01', observed: { recoveryRate: 1.2 }, confidence: 0.7 },
   { period_end: '2026-03-01', observed: { recoveryRate: 1.2 }, confidence: 0.7 },
   { period_end: '2026-04-01', observed: { recoveryRate: 1.2 }, confidence: 0.7 }], 1);
assert(promoted.learnedPriors.recoveryRate && promoted.learnedPriors.recoveryRate.source === 'learned',
  '(setup) 3 predictive blocks promote to a source:learned prior');
assert(JSON.stringify(generatePlan({ ...base, athlete_model: { learnedPriors: promoted.learnedPriors } })) !== population,
  '(2b) the PROMOTED prior arms the steer end-to-end (learning → plan)');

console.log('tr05-source-gate: done');
