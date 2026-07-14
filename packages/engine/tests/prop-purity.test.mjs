// prop-purity.test.mjs — Phase 3 M0 T3 property: PURITY (13-VALIDATION-STRATEGY §5.2
// "Purity triple-enforcement, continued"; Constitution Art 18).
//
// THE INVARIANT: the same profile through the same engine + knowledge versions is
// the same plan, forever — no clock, no randomness, no I/O inside the pure core.
// This is the pin's crown jewel (audit 10 §2), extended into the engine-owned suite:
// generatePlan(profile) is a pure function, so two calls with the same profile MUST
// serialise byte-identically, across a spread of profiles (build styles, disciplines,
// sport cohorts). It also asserts the provenance stamp (engine + knowledge version) is
// present and stable — a plan stamped KSV n is reproducible from science n (KA §5).
//
// Imports ONLY from @performance-os/engine (no app boot — spec §2.1). Deterministic:
// every profile carries a fixed plan_start_date (never the clock).
//
// NON-VACUITY / falsifiability is built in as a permanent positive control (the
// "teeth" block below): two DIFFERENT profiles must NOT serialise identically, so a
// green identity result is meaningful and not a comparison of two identical blobs.
// Falsifiability evidence for the report (RED→GREEN) is recorded separately by
// temporarily injecting nondeterminism (Math.random) into src/version.js provenance().
import { generatePlan, ENGINE_VERSION, KNOWLEDGE_SET_VERSION } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// A spread of engine-shaped profiles (snake_case fields the engine reads directly).
// One per decision-bearing family: build styles × discipline × sport cohorts.
const PROFILES = {
  'build-strength-3d': { goal_type: 'build', strength_style: 'strength', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 82, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 140, bench: 100, deadlift: 180 } },
  'build-bodybuilding-4d': { goal_type: 'build', strength_style: 'bodybuilding', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'female', bodyweight_kg: 65, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'build-functional-bw-3d': { goal_type: 'build', strength_style: 'functional', experience_level: 'beginner', experience: { gym: 'beginner' }, sex: 'male', bodyweight_kg: 78, access: ['bodyweight'], availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'build-olympic-4d': { goal_type: 'build', discipline: 'olympic', experience_level: 'advanced', experience: { gym: 'advanced' }, sex: 'male', bodyweight_kg: 90, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: { squat: 150 }, olympic_lift: 'both' },
  'sport-run-sprint-4d': { goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete', event_date: '2026-08-30', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 75, access: FULL, availability: { days_per_week: 4, days: ['mon', 'tue', 'thu', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
  'sport-cycle-3d': { goal_type: 'sport', sport: 'cycle', sport_intent: 'recreational', experience_level: 'intermediate', experience: { gym: 'intermediate' }, sex: 'male', bodyweight_kg: 72, access: FULL, availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] }, plan_start_date: '2026-07-13', lifts: {} },
};

// ── provenance stamp present + stable (KA §5 — the plan is reproducible from it) ──
assert(typeof ENGINE_VERSION === 'string' && ENGINE_VERSION.length > 0, 'ENGINE_VERSION is a non-empty string');
assert(typeof KNOWLEDGE_SET_VERSION === 'string' && KNOWLEDGE_SET_VERSION.length > 0, 'KNOWLEDGE_SET_VERSION is a non-empty string');

// ── the property: same profile → byte-identical plan, twice, for every profile ──
const serialised = {};
for (const [name, profile] of Object.entries(PROFILES)) {
  const a = generatePlan({ ...profile });
  const b = generatePlan({ ...profile });
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  serialised[name] = sa;
  assert(sa === sb, `purity: ${name} — two generatePlan calls are byte-identical`);
  // provenance is stamped on the plan and carries the two versions the identity depends on.
  assert(a.meta && a.meta.provenance && a.meta.provenance.engineVersion === ENGINE_VERSION,
    `purity: ${name} — plan stamps the current engineVersion`);
  assert(a.meta.provenance.knowledgeSetVersion === KNOWLEDGE_SET_VERSION,
    `purity: ${name} — plan stamps the current knowledgeSetVersion`);
}

// A third call, interleaved AFTER other profiles ran, still matches the first — proving
// no hidden mutable module state leaks between generations (Set/Map iteration, caches).
for (const [name, profile] of Object.entries(PROFILES)) {
  const again = JSON.stringify(generatePlan({ ...profile }));
  assert(again === serialised[name], `purity: ${name} — stable across interleaved generations (no shared mutable state)`);
}

// ── teeth (permanent non-vacuity control): distinct profiles must NOT be identical ──
// If this ever passed, the identity assertions above would be vacuous.
const keys = Object.keys(serialised);
let distinctPairs = 0;
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    if (serialised[keys[i]] !== serialised[keys[j]]) distinctPairs++;
  }
}
const totalPairs = (keys.length * (keys.length - 1)) / 2;
assert(distinctPairs === totalPairs, `teeth: all ${totalPairs} distinct-profile pairs serialise differently (identity checks are non-vacuous)`);
