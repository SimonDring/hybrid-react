# Athlete & Performance Model Foundation — Implementation Plan (Sprint 3, Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure, versioned Athlete Model + a derived Performance Model (capability-per-physical-quality with confidence) in `packages/engine`, feed it from onboarding, persist it, and prove today's plans are unchanged — without rewriting any programme-generation logic.

**Architecture:** Two new pure domains in `packages/engine/src/lib` (`athlete/`, `performance/`) plus knowledge data in `packages/engine/src/data` and two adapters in `packages/engine/src/lib/adapters`. An app-side `AthleteModelService` builds/persists/loads the model via the existing SyncService path (stored as a versioned `users.profile.athlete_model` sub-object). The live plan generator keeps consuming today's profile; an adapter maps the model back to engine input and a golden-master test proves the round-trip yields byte-identical plans.

**Tech Stack:** Plain ES modules (JS, `"type":"module"`), no test framework — tests are node scripts under `apps/mobile/tests/*.js` with a local `assert(cond,msg)` helper, run via `node apps/mobile/tests/<file>.js`. Engine imported via the workspace package name `@performance-os/engine/lib/*` and `/data/*` (symlinked to `packages/engine`, so edits are picked up live).

## Global Constraints

- **Purity / determinism:** every function in `athlete/` and `performance/` and the adapters is PURE. NEVER call `Date.now()`, `new Date()` (argless), or `Math.random()` inside them. Any "now" is passed in as an `asOf` ISO-date string (`'YYYY-MM-DD'`). Same inputs → same outputs.
- **Test harness:** node scripts in `apps/mobile/tests/`. Copy this exact assert helper into every new test file:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
  Run a test with `node apps/mobile/tests/<file>.js` from the repo root. A test file "fails" if it prints any `FAIL:` line (process exit code 1).
- **Engine import paths (verbatim):** `@performance-os/engine/lib/PlanGenerator.js`, `@performance-os/engine/lib/athlete/...`, `@performance-os/engine/lib/performance/...`, `@performance-os/engine/lib/adapters/...`, `@performance-os/engine/data/...`.
- **Confidence everywhere:** every capability the Performance Model emits MUST carry `source` (`'measured'|'inferred'`) and `confidence` (`'low'|'moderate'|'high'`).
- **Privacy (Constitution Article 11):** NEVER copy raw vitals (HRV, sleep, resting HR) into the Athlete Model. It may reference injuries/vitals, never duplicate raw sensitive values.
- **Do NOT edit the frozen docs:** the Constitution, EDS, Decision Ontology, Knowledge Architecture, TAS (`docs/foundation/*`, `docs/engine/00-*`, `docs/architecture/TAS.md`). Only the *running* docs (HANDOFF.md, CLAUDE.md) and new non-frozen docs may change.
- **All app data writes go through SyncService** (via `AthleteModelService`), never directly to `Database.js` from a screen.
- **`npm run dev` must still boot** at the end of every task that touches `apps/mobile`.
- **Schema constant:** the Athlete Model `schemaVersion` is the integer `1` for this sprint. Import it from `athlete/schema.js` as `ATHLETE_SCHEMA_VERSION`; never hard-code the literal elsewhere.
- **Engine read-set (the only fields the adapter must reproduce for identical plans):** `goal_type, sport, run_discipline, sport_intent, sport_season, sport_goal, event_date, sport_days, strength_style, experience.gym, availability.days, availability.days_per_week, access, bodyweight_kg, sex, lifts, plan_start_date`. `generatePlan` ignores everything else (`lifts_source`, `markers`, `goals`, cleared endurance fields), so those need not round-trip.

---

## File Structure

**Create (engine — pure domain + knowledge):**
- `packages/engine/src/data/trainingAgeBands.js` — training-age bands + legacy-level mapping.
- `packages/engine/src/data/qualities.js` — physical-quality registry (seed).
- `packages/engine/src/data/adaptations.js` — adaptation registry (seed).
- `packages/engine/src/data/capabilityPriors.js` — population capability priors per quality per band.
- `packages/engine/src/lib/athlete/schema.js` — model shape, defaults, `ATHLETE_SCHEMA_VERSION`.
- `packages/engine/src/lib/athlete/fieldRegistry.js` — per-field justification manifest + `listStoredFieldPaths`.
- `packages/engine/src/lib/athlete/validation.js` — `validateAthleteModel`.
- `packages/engine/src/lib/athlete/buildAthleteModel.js` — pure builder from inputs.
- `packages/engine/src/lib/athlete/index.js` — public exports.
- `packages/engine/src/lib/performance/estimation.js` — per-quality capability estimation.
- `packages/engine/src/lib/performance/derivePerformanceModel.js` — full performance model.
- `packages/engine/src/lib/performance/index.js` — public exports.
- `packages/engine/src/lib/adapters/athleteModelToEngineInput.js` — model → engine profile.
- `packages/engine/src/lib/adapters/profileToAthleteModel.js` — legacy profile → model.
- `packages/engine/src/lib/adapters/goalMapping.js` — shared OUTCOME↔LEGACY goal map.

**Create (app — service + persistence):**
- `apps/mobile/src/lib/AthleteModelService.js` — build/persist/load/upgrade.

**Modify (app):**
- `apps/mobile/src/lib/onboardingModel.js` — add `answersToAthleteModelInputs(a)` (pure).
- `apps/mobile/src/screens/Onboarding.jsx` — dual-write (also build+persist the model).

**Create (tests — `apps/mobile/tests/`):**
- `athlete-training-age.js`, `athlete-qualities.js`, `athlete-priors.js`, `athlete-schema.js`,
  `athlete-field-registry.js`, `athlete-validation.js`, `athlete-build.js`,
  `athlete-estimation.js`, `performance-model.js`, `adapter-to-engine.js`,
  `adapter-from-profile.js`, `athlete-adapter-golden-master.js`,
  `answers-to-athlete-model.js`, `athlete-model-service.js`.

**Create (docs + migration audit trail):**
- `docs/architecture/ATHLETE-MODEL.md` — Part 9 technical doc (NOT frozen).
- `supabase/migrations/20260701_athlete_model.sql` — documented no-op (audit trail for the `profile.athlete_model` shape).

**Modify (running docs):**
- `HANDOFF.md`, `CLAUDE.md` — pointer updates only.

---

## Task 1: Training-age bands (knowledge)

**Files:**
- Create: `packages/engine/src/data/trainingAgeBands.js`
- Test: `apps/mobile/tests/athlete-training-age.js`

**Interfaces:**
- Produces: `TRAINING_AGE_BANDS` (array), `bandForYears(years:number|null) → bandId|null`, `legacyLevelForBand(bandId) → 'beginner'|'intermediate'|'advanced'`, `bandForLegacyLevel(level) → bandId`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-training-age.js
import { TRAINING_AGE_BANDS, bandForYears, legacyLevelForBand, bandForLegacyLevel }
  from '@performance-os/engine/data/trainingAgeBands.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(TRAINING_AGE_BANDS.length === 4, 'T1 four bands defined');
assert(bandForYears(0.5) === 'novice', 'T2 0.5y → novice');
assert(bandForYears(2) === 'intermediate', 'T3 2y → intermediate');
assert(bandForYears(4) === 'advanced', 'T4 4y → advanced');
assert(bandForYears(8) === 'highlyAdvanced', 'T5 8y → highlyAdvanced');
assert(bandForYears(null) === null, 'T6 unknown years → null (no assumption)');
assert(legacyLevelForBand('novice') === 'beginner', 'T7 novice → beginner');
assert(legacyLevelForBand('highlyAdvanced') === 'advanced', 'T8 highlyAdvanced → advanced');
assert(bandForLegacyLevel('beginner') === 'novice', 'T9 beginner → novice (bijection base)');
assert(bandForLegacyLevel('intermediate') === 'intermediate', 'T10 intermediate → intermediate');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-training-age.js`
Expected: FAIL — cannot resolve module `trainingAgeBands.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/trainingAgeBands.js
// Measurable training-age bands. Replaces vague "beginner/intermediate" labels with
// year-derived bands, while keeping a mapping back to the legacy engine level so the
// live plan generator (which still reads experience.gym) is unaffected.
export const TRAINING_AGE_BANDS = [
  { id: 'novice',         maxYears: 1,        legacyLevel: 'beginner' },
  { id: 'intermediate',   maxYears: 3,        legacyLevel: 'intermediate' },
  { id: 'advanced',       maxYears: 5,        legacyLevel: 'advanced' },
  { id: 'highlyAdvanced', maxYears: Infinity, legacyLevel: 'advanced' },
];

export function bandForYears(years) {
  if (years == null || Number.isNaN(Number(years))) return null;
  const y = Number(years);
  for (const b of TRAINING_AGE_BANDS) if (y < b.maxYears) return b.id;
  return 'highlyAdvanced';
}

export function legacyLevelForBand(bandId) {
  const b = TRAINING_AGE_BANDS.find((x) => x.id === bandId);
  return b ? b.legacyLevel : 'intermediate';
}

// Legacy label → band. 'returning' has no clean year band; it maps to novice's band for
// prior lookups (the self-rated label itself is preserved separately for the engine).
export function bandForLegacyLevel(level) {
  switch (level) {
    case 'beginner': return 'novice';
    case 'returning': return 'novice';
    case 'advanced': return 'advanced';
    case 'intermediate':
    default: return 'intermediate';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-training-age.js`
Expected: all `PASS:` lines, no `FAIL:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/trainingAgeBands.js apps/mobile/tests/athlete-training-age.js
git commit -m "feat(engine): training-age bands + legacy-level mapping"
```

---

## Task 2: Quality & adaptation registries (knowledge)

**Files:**
- Create: `packages/engine/src/data/qualities.js`, `packages/engine/src/data/adaptations.js`
- Test: `apps/mobile/tests/athlete-qualities.js`

**Interfaces:**
- Produces: `QUALITIES` (array of quality objects), `qualityIds()` → string[], `getQuality(id)`; `ADAPTATIONS` (array), `adaptationIds()` → string[].
- Quality object: `{ id, family, adaptations:[adaptationId], assessment, fatigueCost:{neural,metabolic,mechanical}, recoveryTimeH, prerequisites:[qualityId], evidence }`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-qualities.js
import { QUALITIES, qualityIds, getQuality } from '@performance-os/engine/data/qualities.js';
import { ADAPTATIONS, adaptationIds } from '@performance-os/engine/data/adaptations.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ids = qualityIds();
assert(ids.includes('maxStrength') && ids.includes('reactiveStrength') && ids.includes('aerobicCapacity'),
  'T1 core qualities present');
assert(QUALITIES.length >= 10, 'T2 at least 10 seed qualities');

const adaptSet = new Set(adaptationIds());
for (const q of QUALITIES) {
  assert(q.id && q.family && Array.isArray(q.adaptations) && q.assessment,
    `T3 ${q.id} has required fields`);
  assert(q.fatigueCost && q.recoveryTimeH != null,
    `T4 ${q.id} has fatigue cost + recovery time`);
  for (const a of q.adaptations)
    assert(adaptSet.has(a), `T5 ${q.id} adaptation "${a}" exists in ADAPTATIONS`);
  for (const p of q.prerequisites)
    assert(ids.includes(p), `T6 ${q.id} prerequisite "${p}" is a valid quality`);
}
assert(getQuality('maxStrength').prerequisites.length === 0, 'T7 maxStrength has no prereqs');
assert(getQuality('reactiveStrength').prerequisites.includes('maxStrength'),
  'T8 reactive strength requires a max-strength base');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-qualities.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/adaptations.js
// Seed adaptation registry. Each adaptation is a physiological change that develops one or
// more qualities. Dose-response coefficients are representative seed values to be validated.
export const ADAPTATIONS = [
  { id: 'motor_unit_recruitment', change: 'more/earlier high-threshold MU recruitment', develops: ['maxStrength', 'explosiveStrength'] },
  { id: 'myofibrillar_hypertrophy', change: 'contractile protein accretion', develops: ['maxStrength', 'hypertrophy'] },
  { id: 'sarcoplasmic_hypertrophy', change: 'non-contractile volume growth', develops: ['hypertrophy'] },
  { id: 'rate_coding', change: 'higher motor-unit firing frequency', develops: ['explosiveStrength'] },
  { id: 'tendon_stiffness', change: 'increased series-elastic stiffness', develops: ['reactiveStrength'] },
  { id: 'ssc_efficiency', change: 'stretch-shortening-cycle efficiency', develops: ['reactiveStrength'] },
  { id: 'capillary_density', change: 'increased capillarisation', develops: ['strengthEndurance', 'aerobicCapacity'] },
  { id: 'fiber_type_shift', change: 'IIx→IIa shift', develops: ['strengthEndurance'] },
  { id: 'mitochondrial_density', change: 'more mitochondria', develops: ['aerobicCapacity'] },
  { id: 'stroke_volume', change: 'cardiac stroke-volume increase', develops: ['aerobicCapacity'] },
  { id: 'glycolytic_enzymes', change: 'glycolytic enzyme upregulation', develops: ['anaerobicCapacity'] },
  { id: 'buffering_capacity', change: 'improved H+ buffering', develops: ['anaerobicCapacity'] },
  { id: 'sarcomerogenesis', change: 'added in-series sarcomeres (length)', develops: ['mobility'] },
  { id: 'tissue_tolerance', change: 'end-range tissue tolerance', develops: ['mobility', 'robustness'] },
  { id: 'proprioception', change: 'improved joint position sense', develops: ['stability'] },
  { id: 'co_contraction', change: 'agonist/antagonist co-contraction control', develops: ['stability'] },
  { id: 'tendon_remodelling', change: 'collagen remodelling / tendon capacity', develops: ['robustness'] },
  { id: 'bone_density', change: 'bone mineral density', develops: ['robustness'] },
];
export const adaptationIds = () => ADAPTATIONS.map((a) => a.id);
```

```js
// packages/engine/src/data/qualities.js
// Seed physical-quality registry — the organising primitive of training content (EDS §31).
// Representative, evidence-tagged; NOT exhaustive. fatigueCost values are 'low'|'moderate'|'high'.
export const QUALITIES = [
  { id: 'maxStrength', family: 'strength', adaptations: ['motor_unit_recruitment', 'myofibrillar_hypertrophy'],
    assessment: '1rm', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed' },
  { id: 'hypertrophy', family: 'structural', adaptations: ['myofibrillar_hypertrophy', 'sarcoplasmic_hypertrophy'],
    assessment: 'girth_or_bodyweight', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'high' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed' },
  { id: 'explosiveStrength', family: 'power', adaptations: ['rate_coding', 'motor_unit_recruitment'],
    assessment: 'jump_or_imtp_rfd', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: ['maxStrength'], evidence: 'seed' },
  { id: 'reactiveStrength', family: 'power', adaptations: ['tendon_stiffness', 'ssc_efficiency'],
    assessment: 'rsi_drop_jump', fatigueCost: { neural: 'high', metabolic: 'low', mechanical: 'high' },
    recoveryTimeH: 72, prerequisites: ['maxStrength'], evidence: 'seed' },
  { id: 'strengthEndurance', family: 'endurance', adaptations: ['capillary_density', 'fiber_type_shift'],
    assessment: 'amrap', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'moderate' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed' },
  { id: 'aerobicCapacity', family: 'aerobic', adaptations: ['mitochondrial_density', 'stroke_volume', 'capillary_density'],
    assessment: 'vo2max_or_pace', fatigueCost: { neural: 'low', metabolic: 'high', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed' },
  { id: 'anaerobicCapacity', family: 'anaerobic', adaptations: ['glycolytic_enzymes', 'buffering_capacity'],
    assessment: 'repeat_sprint', fatigueCost: { neural: 'moderate', metabolic: 'high', mechanical: 'moderate' },
    recoveryTimeH: 48, prerequisites: [], evidence: 'seed' },
  { id: 'mobility', family: 'tissue', adaptations: ['sarcomerogenesis', 'tissue_tolerance'],
    assessment: 'rom_screen', fatigueCost: { neural: 'low', metabolic: 'low', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed' },
  { id: 'stability', family: 'control', adaptations: ['proprioception', 'co_contraction'],
    assessment: 'single_leg_balance', fatigueCost: { neural: 'moderate', metabolic: 'low', mechanical: 'low' },
    recoveryTimeH: 24, prerequisites: [], evidence: 'seed' },
  { id: 'robustness', family: 'durability', adaptations: ['tendon_remodelling', 'tissue_tolerance', 'bone_density'],
    assessment: 'load_tolerance', fatigueCost: { neural: 'low', metabolic: 'moderate', mechanical: 'high' },
    recoveryTimeH: 72, prerequisites: [], evidence: 'seed' },
];
export const qualityIds = () => QUALITIES.map((q) => q.id);
export const getQuality = (id) => QUALITIES.find((q) => q.id === id) || null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-qualities.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/qualities.js packages/engine/src/data/adaptations.js apps/mobile/tests/athlete-qualities.js
git commit -m "feat(engine): seed quality + adaptation registries"
```

---

## Task 3: Capability priors (knowledge)

**Files:**
- Create: `packages/engine/src/data/capabilityPriors.js`
- Test: `apps/mobile/tests/athlete-priors.js`

**Interfaces:**
- Consumes: `qualityIds` from `data/qualities.js`, `TRAINING_AGE_BANDS` from `data/trainingAgeBands.js`.
- Produces: `CAPABILITY_PRIORS` (`{ [qualityId]: { [bandId]: level } }`), `priorLevel(qualityId, bandId) → number` (0..1; defaults to 0.35 for unknown band).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-priors.js
import { CAPABILITY_PRIORS, priorLevel } from '@performance-os/engine/data/capabilityPriors.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';
import { TRAINING_AGE_BANDS } from '@performance-os/engine/data/trainingAgeBands.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

for (const q of qualityIds())
  for (const b of TRAINING_AGE_BANDS) {
    const lvl = priorLevel(q, b.id);
    assert(typeof lvl === 'number' && lvl >= 0 && lvl <= 1, `T1 ${q}/${b.id} prior in 0..1 (${lvl})`);
  }
assert(priorLevel('maxStrength', 'novice') < priorLevel('maxStrength', 'advanced'),
  'T2 priors rise with training age');
assert(priorLevel('maxStrength', 'unknownBand') === 0.35, 'T3 unknown band → documented default 0.35');
assert(Object.keys(CAPABILITY_PRIORS).length === qualityIds().length, 'T4 a prior block per quality');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-priors.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/data/capabilityPriors.js
// Population capability priors (0..1) per quality per training-age band. These are the
// documented ASSUMPTION used when a quality is unmeasured (low confidence by construction).
// Seed values — rise monotonically with training age; refine with real data later.
import { qualityIds } from './qualities.js';

const BAND_BASE = { novice: 0.25, intermediate: 0.50, advanced: 0.72, highlyAdvanced: 0.88 };

export const CAPABILITY_PRIORS = Object.fromEntries(
  qualityIds().map((q) => [q, { ...BAND_BASE }])
);

export function priorLevel(qualityId, bandId) {
  const block = CAPABILITY_PRIORS[qualityId];
  if (!block || block[bandId] == null) return 0.35;
  return block[bandId];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-priors.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/capabilityPriors.js apps/mobile/tests/athlete-priors.js
git commit -m "feat(engine): population capability priors per quality per band"
```

---

## Task 4: Athlete Model schema + defaults

**Files:**
- Create: `packages/engine/src/lib/athlete/schema.js`
- Test: `apps/mobile/tests/athlete-schema.js`

**Interfaces:**
- Produces: `ATHLETE_SCHEMA_VERSION = 1`; `createAthleteModel(overrides = {}) → AthleteModel` — deep-default shape with every section present (`identity, goals, sportingContext, trainingHistory, constraints, lifestyle, assessments, performanceMetrics, learnedPriors, meta`). `overrides` shallow-merges per top-level section.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-schema.js
import { createAthleteModel, ATHLETE_SCHEMA_VERSION } from '@performance-os/engine/lib/athlete/schema.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const m = createAthleteModel();
assert(m.schemaVersion === ATHLETE_SCHEMA_VERSION && m.schemaVersion === 1, 'T1 schemaVersion = 1');
for (const sec of ['identity', 'goals', 'sportingContext', 'trainingHistory', 'constraints',
                   'lifestyle', 'assessments', 'performanceMetrics', 'learnedPriors', 'meta'])
  assert(sec in m, `T2 section present: ${sec}`);
assert(Array.isArray(m.goals) && Array.isArray(m.assessments) && Array.isArray(m.performanceMetrics),
  'T3 list sections default to arrays');
assert(m.identity.age === null && m.identity.biologicalSex === null, 'T4 identity defaults null');
assert(m.trainingHistory.selfRatedLevel === null && m.trainingHistory.resistanceTrainingYears === null,
  'T5 training history defaults null');

const o = createAthleteModel({ identity: { age: 30, biologicalSex: 'female' } });
assert(o.identity.age === 30 && o.identity.biologicalSex === 'female', 'T6 override applied');
assert(o.identity.heightCm === null, 'T7 override merges, keeps other identity defaults');
assert(o.constraints.equipment.length === 0, 'T8 constraints default present after override');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-schema.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/athlete/schema.js
// The Athlete Model — durable, portable representation of WHO the athlete is (Ontology §8,
// EDS §29). Source of truth every future decision reads. Pure factory; no clocks.
export const ATHLETE_SCHEMA_VERSION = 1;

const defaults = () => ({
  schemaVersion: ATHLETE_SCHEMA_VERSION,
  athleteId: null,
  updatedAt: null, // stamped by the persistence layer, not the pure builder

  identity: { age: null, biologicalSex: null, heightCm: null, bodyMassKg: null },

  // Outcome-based, multiple, prioritised. Replaces single "training style".
  goals: [], // { id, outcome, priority, sportRef, targetMetric, deadline }

  sportingContext: {
    primarySport: null, secondarySports: [], position: null, competitiveLevel: null,
    seasonPhase: null, competitionCalendar: [], weeklySportSchedule: [],
    competitionFrequency: null, trainingFrequency: null,
  },

  trainingHistory: {
    resistanceTrainingYears: null, sportYears: null,
    selfRatedLevel: null, // 'beginner'|'returning'|'intermediate'|'advanced' — preserves legacy input
    olympicLiftingExperience: null, barbellExperience: null, plyometricExperience: null,
    vbtExperience: null, coachingHistory: null,
    movementCompetency: { squat: null, hinge: null, press: null, pull: null, olympic: null, plyo: null },
  },

  constraints: {
    equipment: [], availableDays: [], daysPerWeek: null, sessionDurationMin: null,
    injuryHistory: [], currentPain: [], medicalRestrictions: [], mobilityLimitations: [],
    travel: null, shiftWork: null, rehabStatus: null, other: [],
  },

  lifestyle: { sleepQuality: null, stress: null, occupation: null, recoveryOpportunities: null },

  assessments: [],        // { id, type, value, unit, source, confidence, measuredAt }
  performanceMetrics: [], // { id, metric, value, unit, source, confidence, measuredAt }

  learnedPriors: {
    recoveryRate: { value: 1, source: 'population', confidence: 'low' },
    volumeTolerance: { value: 1, source: 'population', confidence: 'low' },
  },

  meta: { onboardedAt: null, source: null, planStartDate: null, enginePassthrough: {} },
});

export function createAthleteModel(overrides = {}) {
  const base = defaults();
  const out = { ...base };
  for (const key of Object.keys(overrides)) {
    const cur = base[key];
    const ov = overrides[key];
    if (cur && !Array.isArray(cur) && typeof cur === 'object' &&
        ov && !Array.isArray(ov) && typeof ov === 'object') {
      out[key] = { ...cur, ...ov };
    } else {
      out[key] = ov;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-schema.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/athlete/schema.js apps/mobile/tests/athlete-schema.js
git commit -m "feat(engine): athlete model schema + defaults (v1)"
```

---

## Task 5: Field registry (every field justified)

**Files:**
- Create: `packages/engine/src/lib/athlete/fieldRegistry.js`
- Test: `apps/mobile/tests/athlete-field-registry.js`

**Interfaces:**
- Consumes: `createAthleteModel` from `athlete/schema.js`.
- Produces: `FIELD_REGISTRY` (`{ [dottedPath]: { why, decisions:[string], mandatory:boolean, confidenceIfMissing, assumptionIfMissing } }`); `listStoredFieldPaths(model) → string[]` (dotted leaf/section paths, one per persisted field group); `registryGaps(model) → string[]` (paths present in the model but missing from the registry).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-field-registry.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { FIELD_REGISTRY, listStoredFieldPaths, registryGaps }
  from '@performance-os/engine/lib/athlete/fieldRegistry.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const model = createAthleteModel();
const gaps = registryGaps(model);
assert(gaps.length === 0, `T1 every stored field is justified (gaps: ${JSON.stringify(gaps)})`);

for (const [path, entry] of Object.entries(FIELD_REGISTRY)) {
  assert(typeof entry.why === 'string' && entry.why.length > 0, `T2 ${path} has a why`);
  assert(Array.isArray(entry.decisions) && entry.decisions.length > 0, `T3 ${path} maps to ≥1 decision`);
  assert(typeof entry.mandatory === 'boolean', `T4 ${path} declares mandatory`);
}
assert(listStoredFieldPaths(model).includes('identity.age'), 'T5 paths include identity.age');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-field-registry.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/athlete/fieldRegistry.js
// The justification manifest: NO stored field may exist without a documented reason and the
// decision(s) it serves (guiding principle, made mechanical). Decisions reference the
// Migration Blueprint D1–D16 catalogue (current or documented-future).
//
// listStoredFieldPaths walks the model to a fixed depth and returns one path per persisted
// "group". Registry keys must exactly cover those paths (registryGaps === []).

const REGISTERED_SECTIONS = {
  // identity (leaf-level)
  'identity.age': { why: 'Age modulates recovery capacity and trainability.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population median for band' },
  'identity.biologicalSex': { why: 'Sex normalises strength standards and rep/volume defaults.', decisions: ['D1', 'D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'unspecified → neutral defaults' },
  'identity.heightCm': { why: 'Anthropometry contextualises lift standards and ROM.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'omit from normalisation' },
  'identity.bodyMassKg': { why: 'Bodyweight normalises strength (BW multiples) and loads bodyweight work.', decisions: ['D1', 'D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population median for band' },
  // goals
  'goals': { why: 'Outcome goals (prioritised) drive diagnosis and prioritisation.', decisions: ['D4', 'D5', 'D7'], mandatory: true, confidenceIfMissing: 'low', assumptionIfMissing: 'general_fitness' },
  // sporting context
  'sportingContext.primarySport': { why: 'Sport sets the demand profile that qualities are compared against.', decisions: ['D2', 'D4'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'no sport → general demand' },
  'sportingContext.secondarySports': { why: 'Secondary sports add demand + scheduling load.', decisions: ['D2', 'D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'sportingContext.position': { why: 'Position refines the demand profile within a sport.', decisions: ['D2'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'generic position' },
  'sportingContext.competitiveLevel': { why: 'Level scales expected capability and training tolerance.', decisions: ['D5', 'D7'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'recreational' },
  'sportingContext.seasonPhase': { why: 'Season phase sets the periodisation intent + volume scalar.', decisions: ['D7'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'derive from event date/off-season' },
  'sportingContext.competitionCalendar': { why: 'Dated events drive tapers and block boundaries.', decisions: ['D7', 'D15'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'no fixed events' },
  'sportingContext.weeklySportSchedule': { why: 'Sport sessions are fixed constraints gym work routes around.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'no fixed sport days' },
  'sportingContext.competitionFrequency': { why: 'Competition density affects in-season maintenance.', decisions: ['D7'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'sportingContext.trainingFrequency': { why: 'Sport training frequency bounds total weekly load.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: '0' },
  // training history
  'trainingHistory.resistanceTrainingYears': { why: 'Measurable training age sets capability priors + progression rate.', decisions: ['D1', 'D7', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'derive from self-rated level' },
  'trainingHistory.sportYears': { why: 'Years in sport inform skill/robustness base.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'unknown' },
  'trainingHistory.selfRatedLevel': { why: 'Coarse competency the athlete self-reports; drives legacy engine level + exercise gating.', decisions: ['D9', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'intermediate' },
  'trainingHistory.olympicLiftingExperience': { why: 'Gates Olympic-lift selection.', decisions: ['D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.barbellExperience': { why: 'Gates heavy barbell selection + loading.', decisions: ['D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.plyometricExperience': { why: 'Gates plyometric selection (landing competency).', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.vbtExperience': { why: 'Reserved: enables velocity-based dosing later.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.coachingHistory': { why: 'Optional context on prior coaching.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.movementCompetency': { why: 'Per-pattern competency gates exercise complexity (the L4 gate).', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from training age' },
  // constraints
  'constraints.equipment': { why: 'Available equipment gates every exercise choice.', decisions: ['D11'], mandatory: true, confidenceIfMissing: 'high', assumptionIfMissing: 'bodyweight only' },
  'constraints.availableDays': { why: 'Preferred training days for scheduling.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine suggests days' },
  'constraints.daysPerWeek': { why: 'Sessions/week sets frequency + per-session volume budget.', decisions: ['D8', 'D9'], mandatory: true, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine suggests frequency' },
  'constraints.sessionDurationMin': { why: 'Time per session bounds session size.', decisions: ['D9'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine sizes by volume ÷ days' },
  'constraints.injuryHistory': { why: 'Historical injuries drive prevention emphasis.', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.currentPain': { why: 'Active pain contraindicates patterns.', decisions: ['D10', 'D15'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.medicalRestrictions': { why: 'Medical limits hard-exclude work.', decisions: ['D10'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.mobilityLimitations': { why: 'Mobility limits gate ROM-demanding lifts.', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'constraints.travel': { why: 'Travel reduces equipment access + recovery.', decisions: ['D11', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'false' },
  'constraints.shiftWork': { why: 'Shift work degrades recovery.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'false' },
  'constraints.rehabStatus': { why: 'Rehab stage shapes return-to-performance dosing.', decisions: ['D10', 'D12'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.other': { why: 'Extension point for future constraint kinds.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  // lifestyle
  'lifestyle.sleepQuality': { why: 'Sleep is a primary recovery driver.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'average' },
  'lifestyle.stress': { why: 'Life stress reduces recovery capacity.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'average' },
  'lifestyle.occupation': { why: 'Occupational load adds to total load.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'sedentary' },
  'lifestyle.recoveryOpportunities': { why: 'Available recovery windows scale weekly volume.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'moderate' },
  // assessments + metrics + priors
  'assessments': { why: 'Structured, source-tagged results sharpen capability estimates.', decisions: ['D1', 'D4'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from priors' },
  'performanceMetrics': { why: 'Objective metrics (1RMs, times, jumps) are the measured inputs to capability.', decisions: ['D1', 'D4', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from priors' },
  'learnedPriors': { why: 'Learning seam — population defaults now, athlete-specific later.', decisions: ['D12', 'D16'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population default' },
};

export const FIELD_REGISTRY = REGISTERED_SECTIONS;

// System keys that are structural, not athlete data — excluded from justification.
const SYSTEM_KEYS = new Set(['schemaVersion', 'athleteId', 'updatedAt', 'meta']);

export function listStoredFieldPaths(model) {
  const out = [];
  for (const [section, val] of Object.entries(model)) {
    if (SYSTEM_KEYS.has(section)) continue;
    if (val && !Array.isArray(val) && typeof val === 'object') {
      // registered at leaf level if any leaf is registered, else at section level
      const leaves = Object.keys(val).map((k) => `${section}.${k}`);
      const anyLeafRegistered = leaves.some((p) => p in FIELD_REGISTRY);
      if (anyLeafRegistered) out.push(...leaves);
      else out.push(section);
    } else {
      out.push(section); // arrays + scalars registered at section level
    }
  }
  return out;
}

export function registryGaps(model) {
  return listStoredFieldPaths(model).filter((p) => !(p in FIELD_REGISTRY));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-field-registry.js`
Expected: all `PASS:` (T1 gaps === 0 is the key gate).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/athlete/fieldRegistry.js apps/mobile/tests/athlete-field-registry.js
git commit -m "feat(engine): athlete-model field registry + completeness gate"
```

---

## Task 6: Validation

**Files:**
- Create: `packages/engine/src/lib/athlete/validation.js`
- Test: `apps/mobile/tests/athlete-validation.js`

**Interfaces:**
- Consumes: `createAthleteModel` from `athlete/schema.js`.
- Produces: `validateAthleteModel(model) → { ok:boolean, value:AthleteModel, errors:{[path]:msg} }`. Normalises: clamps `identity.age` to 5..100, `bodyMassKg` to 20..300; rejects unknown `biologicalSex`; coerces `goals[].priority` to a positive integer. NEVER throws; missing data is valid (returns ok with defaults preserved).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-validation.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { validateAthleteModel } from '@performance-os/engine/lib/athlete/validation.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const empty = validateAthleteModel(createAthleteModel());
assert(empty.ok, 'T1 empty/default model is valid (missing data tolerated)');

const good = validateAthleteModel(createAthleteModel({ identity: { age: 30, biologicalSex: 'male', bodyMassKg: 80 } }));
assert(good.ok && good.value.identity.age === 30, 'T2 valid identity passes');

const badSex = validateAthleteModel(createAthleteModel({ identity: { biologicalSex: 'yes' } }));
assert(!badSex.ok && badSex.errors['identity.biologicalSex'], 'T3 unknown sex rejected');

const clamped = validateAthleteModel(createAthleteModel({ identity: { age: 200, bodyMassKg: 5 } }));
assert(clamped.value.identity.age === 100 && clamped.value.identity.bodyMassKg === 20,
  'T4 out-of-range identity clamped to bounds');

const g = validateAthleteModel(createAthleteModel({ goals: [{ id: 'x', outcome: 'get_stronger', priority: 2.7 }] }));
assert(g.value.goals[0].priority === 3, 'T5 goal priority coerced to positive integer');

let threw = false;
try { validateAthleteModel(null); } catch { threw = true; }
assert(!threw, 'T6 never throws, even on null input');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-validation.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/athlete/validation.js
// Runtime validation + normalisation. Degrades gracefully: missing data is valid; bad values
// are clamped or flagged. Never throws (Constitution Article 5 — never refuse to model).
import { createAthleteModel } from './schema.js';

const SEXES = new Set(['male', 'female', 'other']);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function validateAthleteModel(model) {
  const errors = {};
  const src = (model && typeof model === 'object') ? model : {};
  const value = createAthleteModel(src);

  // identity
  const id = value.identity;
  if (id.age != null) {
    if (typeof id.age !== 'number' || Number.isNaN(id.age)) { errors['identity.age'] = 'age must be a number'; id.age = null; }
    else id.age = clamp(id.age, 5, 100);
  }
  if (id.bodyMassKg != null) {
    if (typeof id.bodyMassKg !== 'number' || Number.isNaN(id.bodyMassKg)) { errors['identity.bodyMassKg'] = 'bodyMassKg must be a number'; id.bodyMassKg = null; }
    else id.bodyMassKg = clamp(id.bodyMassKg, 20, 300);
  }
  if (id.biologicalSex != null && !SEXES.has(id.biologicalSex)) {
    errors['identity.biologicalSex'] = `unknown sex "${id.biologicalSex}"`;
  }

  // goals
  value.goals = (Array.isArray(value.goals) ? value.goals : []).map((g) => ({
    ...g,
    priority: g && g.priority != null ? Math.max(1, Math.round(Number(g.priority) || 1)) : 1,
  }));

  return { ok: Object.keys(errors).length === 0, value, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-validation.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/athlete/validation.js apps/mobile/tests/athlete-validation.js
git commit -m "feat(engine): athlete model validation + normalisation"
```

---

## Task 7: Pure builder + public index

**Files:**
- Create: `packages/engine/src/lib/athlete/buildAthleteModel.js`, `packages/engine/src/lib/athlete/index.js`
- Test: `apps/mobile/tests/athlete-build.js`

**Interfaces:**
- Consumes: `createAthleteModel`, `validateAthleteModel`.
- Produces: `buildAthleteModel(inputs, asOf) → AthleteModel` — deep-merges partial `inputs` onto defaults, runs validation, stamps `meta.onboardedAt = inputs.meta?.onboardedAt ?? asOf` (asOf injected; no clock). Returns the validated `value`. `athlete/index.js` re-exports `createAthleteModel, ATHLETE_SCHEMA_VERSION, validateAthleteModel, buildAthleteModel, FIELD_REGISTRY, listStoredFieldPaths, registryGaps`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-build.js
import { buildAthleteModel } from '@performance-os/engine/lib/athlete/buildAthleteModel.js';
import * as A from '@performance-os/engine/lib/athlete/index.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ASOF = '2026-07-01';
const m1 = buildAthleteModel({ identity: { age: 25 }, goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] }, ASOF);
assert(m1.identity.age === 25 && m1.goals[0].outcome === 'build_muscle', 'T1 builds from partial inputs');
assert(m1.constraints.equipment.length === 0, 'T2 unspecified sections keep defaults');
assert(m1.meta.onboardedAt === ASOF, 'T3 onboardedAt stamped from injected asOf');

const m2 = buildAthleteModel({ identity: { age: 25 }, goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }] }, ASOF);
assert(JSON.stringify(m1) === JSON.stringify(m2), 'T4 deterministic (same inputs + asOf → identical)');

assert(typeof A.buildAthleteModel === 'function' && typeof A.validateAthleteModel === 'function'
  && A.ATHLETE_SCHEMA_VERSION === 1, 'T5 index re-exports public API');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-build.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/athlete/buildAthleteModel.js
// Pure builder: partial inputs → validated Athlete Model. asOf is an injected 'YYYY-MM-DD'
// string used for any timestamp — the function never reads a clock (determinism).
import { createAthleteModel } from './schema.js';
import { validateAthleteModel } from './validation.js';

export function buildAthleteModel(inputs = {}, asOf) {
  const model = createAthleteModel(inputs);
  model.meta = { ...model.meta, onboardedAt: (inputs.meta && inputs.meta.onboardedAt) || asOf || null,
                 source: (inputs.meta && inputs.meta.source) || 'onboarding' };
  return validateAthleteModel(model).value;
}
```

```js
// packages/engine/src/lib/athlete/index.js
export { createAthleteModel, ATHLETE_SCHEMA_VERSION } from './schema.js';
export { validateAthleteModel } from './validation.js';
export { buildAthleteModel } from './buildAthleteModel.js';
export { FIELD_REGISTRY, listStoredFieldPaths, registryGaps } from './fieldRegistry.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-build.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/athlete/buildAthleteModel.js packages/engine/src/lib/athlete/index.js apps/mobile/tests/athlete-build.js
git commit -m "feat(engine): pure athlete-model builder + public index"
```

---

## Task 8: Capability estimation (measured vs inferred + confidence)

**Files:**
- Create: `packages/engine/src/lib/performance/estimation.js`
- Test: `apps/mobile/tests/athlete-estimation.js`

**Interfaces:**
- Consumes: `getQuality, qualityIds` (`data/qualities.js`), `priorLevel` (`data/capabilityPriors.js`), `bandForYears, bandForLegacyLevel` (`data/trainingAgeBands.js`).
- Produces: `estimateCapability(qualityId, model, asOf) → { qualityId, level, source:'measured'|'inferred', confidence, evidence, updatedAt }`. `maxStrength` is `measured` when a `1rm_*` performance metric exists; otherwise every quality is `inferred` from the training-age band prior. NEVER throws. `level` always in 0..1, `confidence` always set.
- Helper: `bandForModel(model) → bandId` — prefers `resistanceTrainingYears`, falls back to `selfRatedLevel`, else `'intermediate'`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-estimation.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { estimateCapability, bandForModel } from '@performance-os/engine/lib/performance/estimation.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

// Inferred path — no measurements.
const bare = createAthleteModel({ trainingHistory: { resistanceTrainingYears: 0.5 } });
const inf = estimateCapability('maxStrength', bare, ASOF);
assert(inf.source === 'inferred' && inf.confidence === 'low', 'T1 no data → inferred, low confidence');
assert(inf.level >= 0 && inf.level <= 1, 'T2 inferred level in 0..1');

// Measured path — recent squat 1RM.
const measured = createAthleteModel({
  identity: { biologicalSex: 'male', bodyMassKg: 80 },
  performanceMetrics: [{ id: 'm', metric: '1rm_squat', value: 160, unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: '2026-06-20' }],
});
const meas = estimateCapability('maxStrength', measured, ASOF);
assert(meas.source === 'measured', 'T3 recent 1RM → measured');
assert(meas.confidence === 'high' || meas.confidence === 'moderate', 'T4 measured → ≥ moderate confidence');
assert(meas.level > inf.level, 'T5 a strong measured lift outranks a novice prior');

// Band resolution.
assert(bandForModel(createAthleteModel({ trainingHistory: { resistanceTrainingYears: 4 } })) === 'advanced', 'T6 years → band');
assert(bandForModel(createAthleteModel({ trainingHistory: { selfRatedLevel: 'beginner' } })) === 'novice', 'T7 self-rated → band');
assert(bandForModel(createAthleteModel()) === 'intermediate', 'T8 unknown → intermediate default');

// Never throws + always confident.
for (const q of ['hypertrophy', 'reactiveStrength', 'aerobicCapacity', 'mobility', 'robustness']) {
  const c = estimateCapability(q, createAthleteModel(), ASOF);
  assert(c.confidence && c.level != null, `T9 ${q} always yields level + confidence`);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-estimation.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/performance/estimation.js
// Per-quality capability estimation: measured (from metrics/assessments) → higher confidence,
// else inferred from training-age priors → low confidence. The D1 "assess" seed (in engine).
// Seed normalisation coefficients — representative, to be validated.
import { getQuality } from '../../data/qualities.js';
import { priorLevel } from '../../data/capabilityPriors.js';
import { bandForYears, bandForLegacyLevel } from '../../data/trainingAgeBands.js';

const STRONG_BW_MULTIPLE = { male: 2.0, female: 1.5, other: 1.8 }; // squat 1RM/BW mapping to level 1.0

export function bandForModel(model) {
  const th = model.trainingHistory || {};
  const byYears = bandForYears(th.resistanceTrainingYears);
  if (byYears) return byYears;
  if (th.selfRatedLevel) return bandForLegacyLevel(th.selfRatedLevel);
  return 'intermediate';
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso + 'T00:00:00'), b = new Date(bIso + 'T00:00:00');
  return Math.abs((b - a) / 86400000);
}

function measuredMaxStrength(model, asOf) {
  const metrics = (model.performanceMetrics || []).filter((m) => /^1rm_/.test(m.metric || '') && m.value > 0);
  if (!metrics.length) return null;
  const squat = metrics.find((m) => m.metric === '1rm_squat') || metrics[0];
  const bw = model.identity.bodyMassKg || 80;
  const sex = model.identity.biologicalSex || 'other';
  const mult = STRONG_BW_MULTIPLE[sex] || STRONG_BW_MULTIPLE.other;
  const level = Math.min(1, Math.max(0, (squat.value / bw) / mult));
  let confidence = 'moderate';
  if (squat.measuredAt) confidence = daysBetween(squat.measuredAt, asOf) <= 30 ? 'high' : (daysBetween(squat.measuredAt, asOf) <= 180 ? 'moderate' : 'low');
  return { level, confidence, evidence: `measured ${squat.metric} ${squat.value}${squat.unit || ''}` };
}

export function estimateCapability(qualityId, model, asOf) {
  const q = getQuality(qualityId);
  const band = bandForModel(model);
  const inferred = {
    qualityId, level: priorLevel(qualityId, band), source: 'inferred',
    confidence: 'low', evidence: `training-age band prior (${band})`, updatedAt: asOf || null,
  };
  if (!q) return inferred;

  if (qualityId === 'maxStrength') {
    const m = measuredMaxStrength(model, asOf);
    if (m) return { qualityId, level: m.level, source: 'measured', confidence: m.confidence, evidence: m.evidence, updatedAt: asOf || null };
  }
  return inferred;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-estimation.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/performance/estimation.js apps/mobile/tests/athlete-estimation.js
git commit -m "feat(engine): capability estimation (measured vs inferred + confidence)"
```

---

## Task 9: Derive Performance Model + public index

**Files:**
- Create: `packages/engine/src/lib/performance/derivePerformanceModel.js`, `packages/engine/src/lib/performance/index.js`
- Test: `apps/mobile/tests/performance-model.js`

**Interfaces:**
- Consumes: `qualityIds` (`data/qualities.js`), `estimateCapability` (`performance/estimation.js`).
- Produces: `derivePerformanceModel(model, asOf) → { athleteId, derivedAt:asOf, capabilities:[...], demandProfile:null, limitingFactors:[], priorityAdaptations:[] }`. One capability per seed quality. Pure/deterministic. `performance/index.js` re-exports `estimateCapability, bandForModel, derivePerformanceModel`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/performance-model.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/derivePerformanceModel.js';
import { qualityIds } from '@performance-os/engine/data/qualities.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

const model = createAthleteModel({ athleteId: 'u1', trainingHistory: { resistanceTrainingYears: 2 } });
const pm = derivePerformanceModel(model, ASOF);
assert(pm.athleteId === 'u1' && pm.derivedAt === ASOF, 'T1 carries id + derivedAt(asOf)');
assert(pm.capabilities.length === qualityIds().length, 'T2 one capability per seed quality');
for (const c of pm.capabilities)
  assert(c.source && c.confidence && c.level != null, `T3 ${c.qualityId} has source+confidence+level`);
assert(Array.isArray(pm.limitingFactors) && pm.limitingFactors.length === 0, 'T4 limiting factors scaffolded empty');
assert(pm.demandProfile === null, 'T5 demand profile scaffolded (not computed this sprint)');

const pm2 = derivePerformanceModel(model, ASOF);
assert(JSON.stringify(pm) === JSON.stringify(pm2), 'T6 deterministic given asOf');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/performance-model.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/performance/derivePerformanceModel.js
// The Performance Model: capability-per-physical-quality with confidence, derived from the
// Athlete Model + knowledge. Independent of programme generation. Diagnosis fields
// (demandProfile/limitingFactors/priorityAdaptations) are scaffolded here, computed later.
import { qualityIds } from '../../data/qualities.js';
import { estimateCapability } from './estimation.js';

export function derivePerformanceModel(model, asOf) {
  const capabilities = qualityIds().map((q) => estimateCapability(q, model, asOf));
  return {
    athleteId: model.athleteId || null,
    derivedAt: asOf || null,
    capabilities,
    demandProfile: null,
    limitingFactors: [],
    priorityAdaptations: [],
  };
}
```

```js
// packages/engine/src/lib/performance/index.js
export { estimateCapability, bandForModel } from './estimation.js';
export { derivePerformanceModel } from './derivePerformanceModel.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/performance-model.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/performance/derivePerformanceModel.js packages/engine/src/lib/performance/index.js apps/mobile/tests/performance-model.js
git commit -m "feat(engine): derive performance model (capability vector)"
```

---

## Task 10: Adapter — Athlete Model → engine input

**Files:**
- Create: `packages/engine/src/lib/adapters/goalMapping.js`, `packages/engine/src/lib/adapters/athleteModelToEngineInput.js`
- Test: `apps/mobile/tests/adapter-to-engine.js`

**Interfaces:**
- Produces (`goalMapping.js`): `OUTCOME_TO_LEGACY` (`{ [outcome]: { goal_type, strength_style } }`), `legacyToOutcome(goal_type, strength_style, sport) → outcome`.
- Produces (`athleteModelToEngineInput.js`): `athleteModelToEngineInput(model) → engineProfile` — reproduces the engine read-set (Global Constraints): `goal_type, strength_style, sport, sport_intent, sport_goal, event_date, sport_season, run_discipline, sport_days, experience:{gym}, lifts, availability:{days,days_per_week,allocation}, access, bodyweight_kg, sex, age, plan_start_date, focus:['gym'], primary:'gym'`. Sport values `sport/season/event/sport_days` come from first-class `sportingContext` fields; `sport_intent/sport_goal/run_discipline` and scheduling passthroughs (`plan_weeks`) come from `meta.enginePassthrough`. Primary goal = `goals` sorted by ascending `priority`, first entry. (`name` is display metadata, not a coaching input — the model does not carry it.)

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/adapter-to-engine.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';
import { legacyToOutcome } from '@performance-os/engine/lib/adapters/goalMapping.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Build goal.
const build = createAthleteModel({
  identity: { age: 28, biologicalSex: 'male', bodyMassKg: 82 },
  goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }],
  trainingHistory: { selfRatedLevel: 'intermediate' },
  constraints: { equipment: ['barbell', 'dumbbell'], daysPerWeek: 4, availableDays: ['mon', 'wed', 'fri', 'sat'] },
  performanceMetrics: [{ id: 'l', metric: '1rm_squat', value: 140, unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: null }],
  meta: { planStartDate: '2026-07-06' },
});
const eb = athleteModelToEngineInput(build);
assert(eb.goal_type === 'build' && eb.strength_style === 'bodybuilding', 'T1 build_muscle → build/bodybuilding');
assert(eb.experience.gym === 'intermediate', 'T2 self-rated level → experience.gym');
assert(eb.access.includes('barbell') && eb.availability.days_per_week === 4, 'T3 equipment + availability mapped');
assert(eb.lifts.squat === 140, 'T4 1rm metric → lifts.squat');
assert(eb.bodyweight_kg === 82 && eb.sex === 'male', 'T5 biometrics mapped');
assert(eb.plan_start_date === '2026-07-06', 'T6 plan_start_date from meta');
assert(eb.focus[0] === 'gym' && eb.primary === 'gym', 'T7 always a gym plan');

// Sport goal — sport-shape specifics travel on meta.enginePassthrough + weeklySportSchedule.
const sport = createAthleteModel({
  goals: [{ id: 'g', outcome: 'improve_sport_performance', priority: 1, sportRef: 'run' }],
  sportingContext: {
    primarySport: 'run', seasonPhase: 'in',
    competitionCalendar: [{ label: 'race', date: '2026-09-01' }],
    weeklySportSchedule: [{ day: 'tue', type: 'sport' }, { day: 'thu', type: 'sport' }],
  },
  meta: { enginePassthrough: { run_discipline: 'long', sport_intent: 'compete' } },
});
const es = athleteModelToEngineInput(sport);
assert(es.goal_type === 'sport' && es.sport === 'run', 'T8 sport goal → goal_type sport');
assert(es.run_discipline === 'long' && es.sport_intent === 'compete', 'T9 discipline + intent from passthrough');
assert(es.event_date === '2026-09-01' && es.sport_days.length === 2, 'T10 event date + sport days mapped');
assert(legacyToOutcome('build', 'strength') === 'get_stronger', 'T11 legacy→outcome inverse');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/adapter-to-engine.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/adapters/goalMapping.js
// Bijective-enough mapping between outcome goals (the model) and the legacy goal_type/
// strength_style pair (what the live engine reads). Sport outcomes carry a sportRef.
export const OUTCOME_TO_LEGACY = {
  get_stronger:  { goal_type: 'build', strength_style: 'strength' },
  build_muscle:  { goal_type: 'build', strength_style: 'bodybuilding' },
  general_fitness: { goal_type: 'build', strength_style: 'functional' },
  general_health:  { goal_type: 'build', strength_style: 'functional' },
  improve_sport_performance: { goal_type: 'sport', strength_style: 'strength' },
  improve_sprint_speed: { goal_type: 'sport', strength_style: 'strength' },
  increase_vertical_jump: { goal_type: 'sport', strength_style: 'strength' },
  improve_endurance: { goal_type: 'sport', strength_style: 'strength' },
};

export function legacyToOutcome(goalType, strengthStyle, sport) {
  if (goalType === 'sport') return 'improve_sport_performance';
  if (strengthStyle === 'bodybuilding') return 'build_muscle';
  if (strengthStyle === 'functional') return 'general_fitness';
  return 'get_stronger';
}
```

```js
// packages/engine/src/lib/adapters/athleteModelToEngineInput.js
// Maps the Athlete Model back to exactly the profile fields generatePlan reads (the engine
// read-set). Proven byte-identical to the legacy path by the adapter golden-master test.
// This adapter is NOT in the live path this sprint — it exists to prove the model can drive
// the engine.
import { OUTCOME_TO_LEGACY } from './goalMapping.js';

const LEVELS = new Set(['beginner', 'returning', 'intermediate', 'advanced']);

export function athleteModelToEngineInput(model) {
  const goals = [...(model.goals || [])].sort((a, b) => (a.priority || 1) - (b.priority || 1));
  const primary = goals[0] || { outcome: 'get_stronger' };
  const legacy = OUTCOME_TO_LEGACY[primary.outcome] || OUTCOME_TO_LEGACY.get_stronger;
  const isSport = legacy.goal_type === 'sport';

  const sc = model.sportingContext || {};
  const th = model.trainingHistory || {};
  const cn = model.constraints || {};
  const id = model.identity || {};
  const pass = (model.meta && model.meta.enginePassthrough) || {};

  const gym = LEVELS.has(th.selfRatedLevel) ? th.selfRatedLevel : 'intermediate';

  // 1RM metrics → lifts
  const metric = (name) => {
    const m = (model.performanceMetrics || []).find((x) => x.metric === name && x.value > 0);
    return m ? m.value : null;
  };
  const lifts = {
    squat: metric('1rm_squat'), bench: metric('1rm_bench'),
    deadlift: metric('1rm_deadlift'), ohp: metric('1rm_ohp'), pull: metric('1rm_pull'),
  };
  const anyLift = Object.values(lifts).some((v) => v != null);

  const event = (sc.competitionCalendar && sc.competitionCalendar[0]) ? sc.competitionCalendar[0].date : null;
  const sportDays = (sc.weeklySportSchedule || []).map((s) => s.day);
  // pure scheduling passthroughs (e.g. plan_weeks); sport-shape passthroughs are read explicitly below
  const passExtras = { ...pass };
  delete passExtras.sport_intent; delete passExtras.sport_goal; delete passExtras.run_discipline;

  return {
    age: id.age ?? null,
    sex: id.biologicalSex ?? null,
    bodyweight_kg: id.bodyMassKg ?? null,

    goal_type: legacy.goal_type,
    strength_style: legacy.strength_style,
    focus: ['gym'], primary: 'gym',

    sport: isSport ? (sc.primarySport || primary.sportRef || null) : null,
    sport_intent: isSport ? (pass.sport_intent || 'recreational') : null,
    sport_goal: isSport ? (pass.sport_goal || null) : null,
    sport_season: isSport ? (sc.seasonPhase || null) : null,
    run_discipline: isSport && (sc.primarySport === 'run') ? (pass.run_discipline || null) : null,
    event_date: isSport ? event : null,
    sport_days: isSport ? sportDays : null,

    experience: { gym },
    lifts: anyLift ? lifts : null,

    availability: { days_per_week: cn.daysPerWeek ?? null, days: cn.availableDays || [],
                    allocation: { gym: cn.daysPerWeek ?? null } },
    access: cn.equipment || [],

    plan_start_date: (model.meta && model.meta.planStartDate) || null,
    ...passExtras,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/adapter-to-engine.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/adapters/goalMapping.js packages/engine/src/lib/adapters/athleteModelToEngineInput.js apps/mobile/tests/adapter-to-engine.js
git commit -m "feat(engine): adapter athlete-model → engine input"
```

---

## Task 11: Adapter — legacy profile → Athlete Model

**Files:**
- Create: `packages/engine/src/lib/adapters/profileToAthleteModel.js`
- Test: `apps/mobile/tests/adapter-from-profile.js`

**Interfaces:**
- Consumes: `buildAthleteModel` (`athlete/buildAthleteModel.js`), `legacyToOutcome` (`adapters/goalMapping.js`).
- Produces: `profileToAthleteModel(profile, asOf) → AthleteModel`. Maps engine read-set fields into first-class model sections (`sport`→`sportingContext.primarySport`, `sport_season`→`seasonPhase`, `event_date`→`competitionCalendar`, `sport_days`→`weeklySportSchedule`) and stashes the legacy-shape sport values the engine still reads (`sport_intent, sport_goal, run_discipline`) plus scheduling passthroughs (`plan_weeks`) in `meta.enginePassthrough`; `plan_start_date` → `meta.planStartDate`. Lifts → `performanceMetrics` as `1rm_*`.

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/adapter-from-profile.js
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

const profile = {
  name: 'Sam', age: 30, sex: 'female', bodyweight_kg: 65,
  goal_type: 'build', strength_style: 'strength',
  experience: { gym: 'advanced' },
  lifts: { squat: 100, bench: 60, deadlift: 120, ohp: 40, pull: 50 },
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
  access: ['barbell', 'dumbbell'],
  plan_start_date: '2026-07-06', plan_weeks: 8,
};
const m = profileToAthleteModel(profile, ASOF);
assert(m.identity.age === 30 && m.identity.biologicalSex === 'female', 'T1 identity mapped');
assert(m.goals[0].outcome === 'get_stronger' && m.goals[0].priority === 1, 'T2 legacy goal → outcome');
assert(m.trainingHistory.selfRatedLevel === 'advanced', 'T3 experience → self-rated level (lossless)');
assert(m.constraints.equipment.includes('barbell') && m.constraints.daysPerWeek === 3, 'T4 constraints mapped');
const squat = m.performanceMetrics.find((x) => x.metric === '1rm_squat');
assert(squat && squat.value === 100, 'T5 lifts → 1rm metrics');
assert(m.meta.planStartDate === '2026-07-06' && m.meta.enginePassthrough.plan_weeks === 8,
  'T6 scheduling passthroughs stashed in meta');

const sportP = {
  goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'compete',
  sport_season: 'in', event_date: '2026-09-01', sport_days: ['tue', 'thu'],
  experience: { gym: 'intermediate' }, availability: { days_per_week: 3, days: [] }, access: ['full_gym'],
};
const sm = profileToAthleteModel(sportP, ASOF);
assert(sm.goals[0].outcome === 'improve_sport_performance' && sm.sportingContext.primarySport === 'run', 'T7 sport mapped');
assert(sm.meta.enginePassthrough.run_discipline === 'long' && sm.sportingContext.weeklySportSchedule.length === 2,
  'T8 sport specifics carried (passthrough + weekly schedule)');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/adapter-from-profile.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// packages/engine/src/lib/adapters/profileToAthleteModel.js
// Builds an Athlete Model from an existing legacy users.profile (for existing users, and as
// the source side of the round-trip golden master). Preserves everything the engine reads.
import { buildAthleteModel } from '../athlete/buildAthleteModel.js';
import { legacyToOutcome } from './goalMapping.js';

export function profileToAthleteModel(profile = {}, asOf) {
  const p = profile || {};
  const outcome = legacyToOutcome(p.goal_type, p.strength_style, p.sport);

  const performanceMetrics = [];
  const L = p.lifts || {};
  for (const [k, metric] of [['squat', '1rm_squat'], ['bench', '1rm_bench'], ['deadlift', '1rm_deadlift'],
                             ['ohp', '1rm_ohp'], ['pull', '1rm_pull']]) {
    if (L[k] != null) performanceMetrics.push({ id: metric, metric, value: L[k], unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: null });
  }

  const sportDays = Array.isArray(p.sport_days) ? p.sport_days : [];
  const weeklySportSchedule = sportDays.map((day) => ({ day, type: 'sport' }));

  // Sport-shape values the live engine reads but that Plan 1 does not yet model first-class
  // (Plan 2 promotes them to outcome goals / competitive level) travel as an explicit bridge.
  const enginePassthrough = {};
  if (p.plan_weeks != null) enginePassthrough.plan_weeks = p.plan_weeks;
  if (p.sport_intent != null) enginePassthrough.sport_intent = p.sport_intent;
  if (p.sport_goal != null) enginePassthrough.sport_goal = p.sport_goal;
  if (p.run_discipline != null) enginePassthrough.run_discipline = p.run_discipline;

  const inputs = {
    identity: { age: p.age ?? null, biologicalSex: p.sex ?? null, bodyMassKg: p.bodyweight_kg ?? null, heightCm: p.height_cm ?? null },
    goals: [{ id: 'primary', outcome, priority: 1, sportRef: p.sport || null }],
    sportingContext: {
      primarySport: p.sport || null,
      seasonPhase: p.sport_season || null,
      competitionCalendar: p.event_date ? [{ label: 'event', date: p.event_date }] : [],
      weeklySportSchedule,
    },
    trainingHistory: { selfRatedLevel: (p.experience && p.experience.gym) || null },
    constraints: {
      equipment: p.access || [],
      availableDays: (p.availability && p.availability.days) || [],
      daysPerWeek: (p.availability && p.availability.days_per_week) ?? null,
    },
    performanceMetrics,
    meta: { source: 'migration', planStartDate: p.plan_start_date || null, enginePassthrough },
  };
  return buildAthleteModel(inputs, asOf);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/adapter-from-profile.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/adapters/profileToAthleteModel.js apps/mobile/tests/adapter-from-profile.js
git commit -m "feat(engine): adapter legacy profile → athlete model"
```

---

## Task 12: Adapter golden master — plans are unchanged

**Files:**
- Create: `apps/mobile/tests/athlete-adapter-golden-master.js`

**Interfaces:**
- Consumes: `generatePlan` (`@performance-os/engine/lib/PlanGenerator.js`), `answersToProfile, BLANK_ANSWERS` (`../src/lib/onboardingModel.js`), `profileToAthleteModel`, `athleteModelToEngineInput`.
- Proves: `generatePlan(athleteModelToEngineInput(profileToAthleteModel(p, asOf)))` deep-equals `generatePlan(p)` for every archetype. If it differs, the adapters are lossy for the engine read-set — fix them until identical (this is the "existing functionality operational" gate).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-adapter-golden-master.js
// Round-trip equivalence: the Athlete Model must be able to drive the engine to the SAME plan
// the legacy profile produces. Deterministic — profiles anchor plan_start_date to today and
// generatePlan output contains no absolute dates.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ASOF = '2026-07-01';
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Archetype matrix — decision-bearing branches (Sprint 3 spec Part 7 scenarios).
const ARCHETYPES = {
  build_strength_int: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate',
    daysPerWeek: 4, equipment: FULL, lifts: { squat: 140, bench: 100, deadlift: 180, ohp: 60, pull: 12 }, sex: 'male', bodyweight_kg: 82 }),
  build_bb_adv: A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5, equipment: FULL }),
  build_functional_beg: A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, equipment: ['dumbbell', 'bodyweight'] }),
  build_min_avail: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'returning', daysPerWeek: 2, equipment: ['bodyweight'] }),
  build_female: A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, equipment: FULL, sex: 'female', bodyweight_kg: 62 }),
  run_sprint_compete: A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL, sportDays: ['tue', 'thu'] }),
  run_long_event: A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL }),
  cycle_rec: A({ goalType: 'sport', sport: 'cycle', sportIntent: 'recreational', sportGoal: 'get_stronger', experienceLevel: 'advanced', daysPerWeek: 3, equipment: FULL }),
  swim_rec: A({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational', sportGoal: 'build_base', experienceLevel: 'intermediate', daysPerWeek: 4, equipment: FULL }),
  no_lifts: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, equipment: FULL }),
};

for (const [name, ans] of Object.entries(ARCHETYPES)) {
  const profile = answersToProfile(ans);
  const roundTrip = athleteModelToEngineInput(profileToAthleteModel(profile, ASOF));
  const a = JSON.stringify(generatePlan(profile));
  const b = JSON.stringify(generatePlan(roundTrip));
  assert(a === b, `GM ${name}: model-driven plan identical to legacy plan`);
}
```

- [ ] **Step 2: Run test to verify it fails (or reveals adapter gaps)**

Run: `node apps/mobile/tests/athlete-adapter-golden-master.js`
Expected: initially some `FAIL:` lines where the round-trip drops an engine field.

- [ ] **Step 3: Fix the adapters until identical**

Diagnose each failing archetype by comparing the two profiles:
```bash
node -e "import('./apps/mobile/src/lib/onboardingModel.js').then(async (O)=>{ const {profileToAthleteModel}=await import('./packages/engine/src/lib/adapters/profileToAthleteModel.js'); const {athleteModelToEngineInput}=await import('./packages/engine/src/lib/adapters/athleteModelToEngineInput.js'); const p=O.answersToProfile({...O.BLANK_ANSWERS, goalType:'sport', sport:'run', runDiscipline:'sprint', sportIntent:'compete', sportSeason:'off_season', daysPerWeek:3, equipment:['barbell']}); const rt=athleteModelToEngineInput(profileToAthleteModel(p,'2026-07-01')); const keys=['goal_type','strength_style','sport','sport_intent','sport_goal','sport_season','run_discipline','event_date','sport_days','experience','lifts','availability','access','bodyweight_kg','sex','plan_start_date']; for(const k of keys) console.log(k, JSON.stringify(p[k]), '||', JSON.stringify(rt[k])); });"
```
For each mismatched key in the engine read-set, adjust `profileToAthleteModel`/`athleteModelToEngineInput` (Tasks 10–11) so the value round-trips. Common fixes: carry `sport_intent`/`sport_goal`/`sport_season` on `sportingContext`; ensure `availability.days` order preserved; ensure `access` array copied verbatim. Re-run until all `PASS:`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-adapter-golden-master.js`
Expected: all `PASS:` (every archetype identical).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/tests/athlete-adapter-golden-master.js packages/engine/src/lib/adapters/
git commit -m "test(engine): adapter golden master — model-driven plans identical to legacy"
```

---

## Task 13: `answersToAthleteModelInputs` (onboarding → model, pure)

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js` (add one exported function; do NOT change existing exports' behaviour)
- Test: `apps/mobile/tests/answers-to-athlete-model.js`

**Interfaces:**
- Consumes: existing `answersToProfilePatch` (reuse it to derive the legacy-equivalent fields), `profileToAthleteModel` (`@performance-os/engine/lib/adapters/profileToAthleteModel.js`).
- Produces: `answersToAthleteModelInputs(a, asOf) → AthleteModel`. Implemented by routing today's answers through `answersToProfilePatch` then `profileToAthleteModel` (so onboarding maps into the model with zero divergence from the legacy fields), then enriching with any richer answer fields present (none yet in Plan 1 — Plan 2 adds them).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/answers-to-athlete-model.js
import { answersToAthleteModelInputs, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

const m = answersToAthleteModelInputs(A({
  name: 'Jo', age: 27, sex: 'male', bodyweight_kg: 80,
  goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate',
  daysPerWeek: 4, equipment: ['barbell', 'dumbbell'],
}), ASOF);

assert(m.schemaVersion === 1, 'T1 produces a v1 athlete model');
assert(m.identity.age === 27 && m.identity.biologicalSex === 'male', 'T2 identity from answers');
assert(m.goals[0].outcome === 'build_muscle', 'T3 build/bodybuilding → build_muscle outcome');
assert(m.constraints.equipment.includes('barbell') && m.constraints.daysPerWeek === 4, 'T4 constraints from answers');
assert(m.trainingHistory.selfRatedLevel === 'intermediate', 'T5 experience → self-rated level');
assert(m.meta.source === 'onboarding' || m.meta.source === 'migration', 'T6 meta.source set');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/answers-to-athlete-model.js`
Expected: FAIL — `answersToAthleteModelInputs` is not exported.

- [ ] **Step 3: Add the function to `onboardingModel.js`**

Add these two lines to the imports at the top of `apps/mobile/src/lib/onboardingModel.js` (after the existing engine imports on lines 1–2):
```js
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
```
Append this exported function at the end of the file (after `answersToProfile`):
```js
// Onboarding answers → Athlete Model. Routes through the SAME legacy profile mapping so the
// model never diverges from the fields the live engine reads, then (Plan 2) enriches with the
// richer question set. asOf keeps it deterministic/testable.
export function answersToAthleteModelInputs(a, asOf) {
  const profile = answersToProfilePatch(a);
  const model = profileToAthleteModel(profile, asOf);
  model.meta = { ...model.meta, source: 'onboarding' };
  return model;
}
```

- [ ] **Step 4: Run test to verify it passes (and legacy behaviour is unchanged)**

Run: `node apps/mobile/tests/answers-to-athlete-model.js`
Expected: all `PASS:`.

Run the existing engine golden master to confirm no behavioural drift:
Run: `node apps/mobile/tests/golden-master.js`
Expected: `PASS` / no snapshot diff (we only ADDED an export; `answersToProfilePatch` is untouched).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/answers-to-athlete-model.js
git commit -m "feat(app): answersToAthleteModelInputs — onboarding maps into the athlete model"
```

---

## Task 14: `AthleteModelService` (build / persist / load / upgrade)

**Files:**
- Create: `apps/mobile/src/lib/AthleteModelService.js`
- Test: `apps/mobile/tests/athlete-model-service.js`

**Interfaces:**
- Consumes: `SyncService.updateProfile` (write), `Database.services.getProfile` (read), `derivePerformanceModel`, `answersToAthleteModelInputs`, `localISODate` (for the persistence-layer `asOf`/`updatedAt` — the SERVICE may read the clock; the pure engine may not), `ATHLETE_SCHEMA_VERSION`.
- Produces:
  - `buildAndSaveFromAnswers(answers) → Promise<AthleteModel>` — builds via `answersToAthleteModelInputs(answers, localISODate())`, stamps `athleteId`+`updatedAt`, persists to `users.profile.athlete_model` via `Sync.updateProfile({ athlete_model })`.
  - `getAthleteModel() → AthleteModel | null` — reads `profile.athlete_model`, runs `upgradeAthleteModel`, or lazily derives from the legacy profile via `profileToAthleteModel` if absent.
  - `getPerformanceModel() → PerformanceModel | null` — `derivePerformanceModel(getAthleteModel(), localISODate())`.
  - `upgradeAthleteModel(stored) → AthleteModel` — version upgrader; unknown/older versions are re-validated through `createAthleteModel` (fields default safely).

- [ ] **Step 1: Write the failing test**

```js
// apps/mobile/tests/athlete-model-service.js
// localStorage shim must exist BEFORE Database.js boots (it writes on import).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; },
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Storage = await import('../src/lib/Storage.js');
const Database = (await import('../src/lib/Database.js')).default;
const { BLANK_ANSWERS } = await import('../src/lib/onboardingModel.js');
const Svc = await import('../src/lib/AthleteModelService.js');

Storage.setNamespace('athleteTest');
// Seed a user row so getProfile()/updateProfile() have a current user (offline path).
Database.services.upsertCurrentUser
  ? Database.services.upsertCurrentUser({ id: 'athleteTest' })
  : null;

const answers = { ...BLANK_ANSWERS, name: 'Jo', age: 30, sex: 'male', bodyweight_kg: 80,
  goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate',
  daysPerWeek: 4, equipment: ['barbell', 'dumbbell'] };

const saved = await Svc.buildAndSaveFromAnswers(answers);
assert(saved.schemaVersion === 1 && saved.goals[0].outcome === 'get_stronger', 'T1 build + save returns model');

const loaded = Svc.getAthleteModel();
assert(loaded && loaded.identity.age === 30, 'T2 persisted model reloads from profile.athlete_model');

const pm = Svc.getPerformanceModel();
assert(pm && pm.capabilities.length > 0 && pm.capabilities.every((c) => c.confidence), 'T3 performance model derives with confidence');

// Upgrade path: an older/unknown-version blob still yields a valid current model.
const upgraded = Svc.upgradeAthleteModel({ schemaVersion: 0, identity: { age: 41 } });
assert(upgraded.schemaVersion === 1 && upgraded.identity.age === 41, 'T4 upgrade normalises old blob to v1');

// Lazy derive: with no athlete_model but a legacy profile, getAthleteModel derives one.
Storage.setNamespace('legacyOnly');
Database.services.updateProfile({ goal_type: 'build', strength_style: 'bodybuilding', experience: { gym: 'advanced' }, access: ['full_gym'], availability: { days_per_week: 5, days: [] } });
const derived = Svc.getAthleteModel();
assert(derived && derived.goals[0].outcome === 'build_muscle', 'T5 lazily derives model from legacy profile');
```

Note: if `Database.services.upsertCurrentUser` does not exist, replace the seed line with the project's actual "ensure current user" call — check `apps/mobile/src/lib/Database.js` for the method that creates/returns the current user (e.g. `Database.services.updateProfile({})` auto-creates it). The test's intent is: a current user exists in the `athleteTest` namespace before saving.

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/mobile/tests/athlete-model-service.js`
Expected: FAIL — `AthleteModelService.js` not found.

- [ ] **Step 3: Write minimal implementation**

```js
// apps/mobile/src/lib/AthleteModelService.js
// App-side stable interface to the Athlete Model. Builds from onboarding, persists a versioned
// model at users.profile.athlete_model via SyncService (offline-first), loads + upgrades it, and
// derives the Performance Model. Screens/consumers use THIS — never raw onboarding answers.
import * as Sync from './SyncService.js';
import Database from './Database.js';
import { localISODate, answersToAthleteModelInputs } from './onboardingModel.js';
import { createAthleteModel, ATHLETE_SCHEMA_VERSION } from '@performance-os/engine/lib/athlete/index.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { derivePerformanceModel } from '@performance-os/engine/lib/performance/index.js';

export async function buildAndSaveFromAnswers(answers) {
  const asOf = localISODate();
  const model = answersToAthleteModelInputs(answers, asOf);
  const profile = Database.services.getProfile() || {};
  model.athleteId = (profile && profile.id) || null; // may be null offline/anon; fine
  model.updatedAt = new Date().toISOString();
  await Sync.updateProfile({ athlete_model: model });
  return model;
}

export function upgradeAthleteModel(stored) {
  if (!stored || typeof stored !== 'object') return null;
  if (stored.schemaVersion === ATHLETE_SCHEMA_VERSION) return createAthleteModel(stored);
  // Older/unknown version → re-hydrate through the current defaults (missing fields default,
  // extra fields dropped). Extend with explicit per-version migrations as the schema evolves.
  const up = createAthleteModel(stored);
  up.schemaVersion = ATHLETE_SCHEMA_VERSION;
  return up;
}

export function getAthleteModel() {
  const profile = Database.services.getProfile() || {};
  if (profile.athlete_model) return upgradeAthleteModel(profile.athlete_model);
  // No stored model yet (existing user): lazily derive from the legacy profile.
  if (profile && Object.keys(profile).length) return profileToAthleteModel(profile, localISODate());
  return null;
}

export function getPerformanceModel() {
  const model = getAthleteModel();
  return model ? derivePerformanceModel(model, localISODate()) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/mobile/tests/athlete-model-service.js`
Expected: all `PASS:`. If T1/T2 fail because no current user exists, adjust the seed line per the Step-1 note (use the real "ensure current user" call from `Database.js`).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/AthleteModelService.js apps/mobile/tests/athlete-model-service.js
git commit -m "feat(app): AthleteModelService — build/persist/load/upgrade + performance model"
```

---

## Task 15: Dual-write from onboarding (live wiring)

**Files:**
- Modify: `apps/mobile/src/screens/Onboarding.jsx`

**Interfaces:**
- Consumes: `AthleteModelService.buildAndSaveFromAnswers`.
- Behaviour: on onboarding submit, AFTER the existing `updateProfile(answersToProfilePatch(a))` call, also call `AthleteModelService.buildAndSaveFromAnswers(a)`. The legacy profile write is unchanged (live engine untouched); the athlete model is persisted alongside.

- [ ] **Step 1: Read the current submit handler**

Run: `grep -n "answersToProfilePatch\|updateProfile\|answersToInjuries\|async function\|onComplete\|handleFinish\|submit" apps/mobile/src/screens/Onboarding.jsx`
Identify the submit handler that calls `updateProfile(answersToProfilePatch(a))`.

- [ ] **Step 2: Add the dual-write import**

At the top of `apps/mobile/src/screens/Onboarding.jsx`, add:
```js
import * as AthleteModelService from '../lib/AthleteModelService.js';
```

- [ ] **Step 3: Add the dual-write call**

Immediately AFTER the existing profile write in the submit handler (the line that calls `updateProfile(answersToProfilePatch(a))` or the store action wrapping it), add:
```js
    // Sprint 3: also build + persist the Athlete Model (parallel to the legacy profile).
    // Non-blocking: never let model persistence break onboarding completion.
    try { await AthleteModelService.buildAndSaveFromAnswers(a); }
    catch (e) { console.error('athlete model save failed (non-fatal):', e); }
```
Match the existing handler's `await`/`.then` style — if the handler is not async and uses `.then`, use `.catch` instead:
```js
    AthleteModelService.buildAndSaveFromAnswers(a).catch((e) => console.error('athlete model save failed (non-fatal):', e));
```

- [ ] **Step 4: Verify the app boots and onboarding still completes**

Start the dev server via the preview tool (`preview_start`), then:
- `preview_console_logs` (level: error) — expect no new errors on load.
- Complete an onboarding run in the preview (or reload an onboarded user); confirm no crash.
- Confirm the model persisted: `preview_eval` with
  ```js
  (() => { const raw = Object.keys(localStorage).find(k => k.startsWith('htp_users_v4')); const users = JSON.parse(localStorage.getItem(raw) || '{}'); const u = Object.values(users)[0] || {}; return u.profile && u.profile.athlete_model ? u.profile.athlete_model.schemaVersion : 'no athlete_model'; })()
  ```
  Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/Onboarding.jsx
git commit -m "feat(app): dual-write athlete model on onboarding submit"
```

---

## Task 16: Documentation + migration audit trail

**Files:**
- Create: `docs/architecture/ATHLETE-MODEL.md`, `supabase/migrations/20260701_athlete_model.sql`
- Modify: `HANDOFF.md`, `CLAUDE.md` (pointer lines only)

**Interfaces:** none (docs).

- [ ] **Step 1: Write the technical doc**

Create `docs/architecture/ATHLETE-MODEL.md` with these sections (fill each from the code as built — no placeholders):
1. **Overview & non-goals** — what the model is; Sprint 3 boundary (no programme rewrite).
2. **Athlete Model schema** — the full v1 shape from `athlete/schema.js`, each section documented.
3. **Assessment & performance-metric schema** — the `assessments[]` / `performanceMetrics[]` shapes + `source`/`confidence` semantics.
4. **Performance Model** — capability-per-quality, measured vs inferred, the seed quality/adaptation/priors registries.
5. **Validation rules** — from `validation.js` (bounds, enums, coercions).
6. **Assumption rules** — the field-registry `assumptionIfMissing` per field; population priors as the documented default.
7. **Field registry & the justification gate** — how `registryGaps` enforces "no field without a why".
8. **Data flow** — onboarding → `answersToAthleteModelInputs` → `AthleteModelService` (persist `users.profile.athlete_model`) → `derivePerformanceModel`; adapters for existing users + the golden-master round-trip.
9. **API interfaces** — the engine exports (`athlete/index.js`, `performance/index.js`, `adapters/*`) and `AthleteModelService`.
10. **Migration notes** — versioning (`ATHLETE_SCHEMA_VERSION`), `upgradeAthleteModel`, lazy derivation for existing users, dual-write.
11. **Current→future input mapping** — the full table (spec §2.5 expanded).
12. **Known limitations** — seed coefficients unvalidated; engine consumes the primary goal only; model non-queryable across athletes (future table); wizard question-set revision is Plan 2.

- [ ] **Step 2: Write the migration audit trail (documented no-op)**

Create `supabase/migrations/20260701_athlete_model.sql`:
```sql
-- Sprint 3 — Athlete Model persistence.
-- No DDL required: the athlete model is stored as a versioned sub-object at
--   public.users.profile -> 'athlete_model'
-- which is an existing JSONB column already protected by the "own profile" RLS policy
-- (auth.uid() = id). This file documents the shape + version for auditability.
--
-- profile.athlete_model = {
--   schemaVersion: 1, athleteId, updatedAt,
--   identity, goals[], sportingContext, trainingHistory, constraints,
--   lifestyle, assessments[], performanceMetrics[], learnedPriors, meta
-- }
-- Raw vitals (HRV/sleep/RHR) are NOT stored here — they remain in public.daily_metrics
-- (owner-only), preserving the Constitution Article 11 privacy boundary.
--
-- A normalized public.athlete_profiles table is deferred to the Team package (cross-athlete
-- queries). Until then, no schema change is needed.
select 1;
```

- [ ] **Step 3: Update the running docs**

In `HANDOFF.md`, update the current-status/sprint-pointer section to note: Sprint 3 Plan 1 (Athlete & Performance Model foundation) landed — pure model in `packages/engine`, `AthleteModelService`, dual-write, adapter golden master green; next up Plan 2 (revised onboarding question set). In `CLAUDE.md`, add a one-line pointer under the engine section:
```
The Athlete Model (packages/engine/src/lib/athlete + performance, adapters) is the athlete
representation every future decision reads; app-side AthleteModelService persists it at
users.profile.athlete_model. Design: docs/superpowers/specs/2026-07-01-athlete-model-design.md;
tech doc: docs/architecture/ATHLETE-MODEL.md.
```

- [ ] **Step 4: Verify no frozen docs changed**

Run: `git status --porcelain docs/foundation docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md docs/architecture/TAS.md`
Expected: NO output (none of the frozen docs are modified).

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/ATHLETE-MODEL.md supabase/migrations/20260701_athlete_model.sql HANDOFF.md CLAUDE.md
git commit -m "docs(sprint3): athlete model technical doc + migration audit trail + pointers"
```

---

## Final verification (run all new tests + the existing safety net)

- [ ] Run every new test and the existing golden master; expect zero `FAIL:` and no snapshot diff:

```bash
for t in athlete-training-age athlete-qualities athlete-priors athlete-schema \
         athlete-field-registry athlete-validation athlete-build athlete-estimation \
         performance-model adapter-to-engine adapter-from-profile athlete-adapter-golden-master \
         answers-to-athlete-model athlete-model-service golden-master; do
  echo "== $t =="; node apps/mobile/tests/$t.js || echo "  ^ FAILED";
done
```

- [ ] `npm run dev` boots without errors (preview_start + preview_console_logs level:error).

---

## Self-review (completed during planning)

- **Spec coverage:** Part 1 review → §2 findings + Task 16 doc; Part 2 Athlete Model → Tasks 4–7; Part 3 Performance Model → Tasks 2,3,8,9; Part 4 validation/registry → Tasks 5,6; Part 5 persistence → Task 14 + Task 16 migration; Part 6 decision interface → Tasks 7,9,14 (engine indexes + service); Part 7 testing → every task + Task 12 scenario matrix; Part 8 migration/adapters → Tasks 10–12,14–15; Part 9 docs → Task 16. **Revised onboarding question wording (spec §9) is intentionally Plan 2** (noted in Task 16 limitations).
- **Type consistency:** `ATHLETE_SCHEMA_VERSION` imported everywhere (never literal); capability object `{qualityId,level,source,confidence,evidence,updatedAt}` consistent Tasks 8/9; adapter reproduces the documented engine read-set consistently Tasks 10–12; `answersToAthleteModelInputs(a, asOf)` signature consistent Tasks 13/14.
- **Placeholder scan:** no TBD/TODO; every code + test step shows complete content; Task 16 doc lists exact sections to fill from the built code.

---

## Plan 2 (sequenced follow-up, scoped — write after Plan 1 lands)

**Revised onboarding question set (spec §9).** Extend `BLANK_ANSWERS` + the wizard with: outcome-based multi-goal + priority (replacing the single style step), measurable training-age years, explicit session duration, light movement-competency self-assessment, free-form primary/secondary sport + level/position; retire `notes`/`markers`. Extend `answersToAthleteModelInputs` to consume the new fields and `answersToProfilePatch` to derive the legacy pair from outcome goals — guarded by the existing `golden-master.js` staying byte-identical for old-field inputs, plus a new test proving new-field inputs map to the same legacy profile. Reuses existing wizard components (no visual redesign).
