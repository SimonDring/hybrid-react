// prop-additive-identity.test.mjs — Phase 3 M0 T3 property: ADDITIVE-MEASUREMENT
// BYTE-IDENTITY (13-VALIDATION-STRATEGY §5.2 "Additive-measurement byte-identity";
// commitment C8's additive-first guarantee; Wave C / M3's explicit entry gate).
//
// THE INVARIANT: for any profile, adding ZERO new measurements produces a
// byte-identical plan — only a newly-MEASURED cohort may differ. This is the entry
// gate for every M3 estimator landing: a new estimator must not perturb an athlete
// who supplied no new measurement.
//
// ── PRE-M3 STATUS (stated plainly, spec §5.2 + Task 3 instruction) ──
// Today the measured estimator seam is barely armed (~1/10 qualities measured at the
// pin), so this property is NEAR-TRIVIAL now: the engine has no distinct "no new
// measurement" code path to break yet. It is asserted ANYWAY, permanently, so that
// when M3 wires measurement into diagnosis it CANNOT silently break additive-first —
// the day a no-op measurement starts moving a plan, this test goes red.
//
// Non-vacuity is built in as a permanent positive control ("teeth"): the SAME profile
// with a REAL added measurement (a tracked lift) MUST differ. If it didn't, the
// identity assertion would be comparing measurement to a no-op that has no effect
// anywhere, and the guarantee would be meaningless. So the test proves BOTH:
//   (a) adding an empty measurement set → byte-identical  (the guarantee), and
//   (b) adding a real measurement → different              (the guarantee has teeth).
//
// Imports ONLY from @performance-os/engine (no app boot — spec §2.1). Fixed dates.
import { generatePlan } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Base profiles WITHOUT measurement evidence (empty lifts, no test results).
const BASES = {
  'build-strength-3d': { goal_type: 'build', strength_style: 'strength', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 82, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'build-bodybuilding-4d': { goal_type: 'build', strength_style: 'bodybuilding', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'female', bodyweight_kg: 65, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'sport-run-sprint-4d': { goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 75, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
};

// The "zero new measurements" mutations — each is a NO-OP measurement: an empty
// measurement container, added to the profile without any actual value. Adding any of
// these must not move the plan by a single byte.
const ZERO_MEASUREMENT_MUTATIONS = [
  (p) => ({ ...p }),                                   // literally unchanged
  (p) => ({ ...p, lifts: { ...(p.lifts || {}) } }),    // same (empty) lift map, fresh object
  (p) => ({ ...p, test_results: [] }),                 // an empty Test Results set
  (p) => ({ ...p, tracked_lifts: [] }),                // an empty tracked-lift log
];

for (const [name, base] of Object.entries(BASES)) {
  const baseline = JSON.stringify(generatePlan({ ...base }));

  // (a) THE GUARANTEE — every zero-measurement mutation is byte-identical.
  ZERO_MEASUREMENT_MUTATIONS.forEach((mutate, i) => {
    const got = JSON.stringify(generatePlan(mutate({ ...base })));
    assert(got === baseline, `additive-identity: ${name} — zero-measurement mutation #${i} yields a byte-identical plan`);
  });

  // (b) TEETH — a REAL added measurement (tracked lifts) must move a strength build's
  //     plan. Sport plans may legitimately not shift on lifts, so only assert the
  //     positive control where a measurement demonstrably steers the plan today.
  if (name === 'build-strength-3d') {
    const measured = JSON.stringify(generatePlan({ ...base, lifts: { squat: 150, bench: 105, deadlift: 200 } }));
    assert(measured !== baseline, `teeth: ${name} — adding a REAL measurement (tracked lifts) DOES change the plan (identity check is non-vacuous)`);
  }
}

console.log('NOTE: pre-M3 this property is near-trivial (no distinct no-op-measurement code path exists yet); it is pinned now so M3 estimator work cannot silently break additive-first.');
