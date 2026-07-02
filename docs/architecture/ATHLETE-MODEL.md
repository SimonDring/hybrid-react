# Athlete Model — Technical Documentation (Sprint 3, Plan 1)

- **Status:** Living / non-frozen. Implementation reference for the Athlete Assessment &
  Performance Model layer landed in Sprint 3 Plan 1.
- **Design spec:** [`docs/superpowers/specs/2026-07-01-athlete-model-design.md`](../superpowers/specs/2026-07-01-athlete-model-design.md).
- **Implementation plan:** [`docs/superpowers/plans/2026-07-01-athlete-model-foundation.md`](../superpowers/plans/2026-07-01-athlete-model-foundation.md).
- **Validated against (frozen, not modified):** Constitution, EDS, Decision Ontology,
  Knowledge Architecture, TAS.

---

## 1. Overview & non-goals

A coach diagnoses the athlete before writing a programme; the software must do the same. This
layer is the platform's structured, durable **representation of the athlete** — the single source
of truth every future coaching decision reasons over. It replaces "reason directly over the raw
onboarding answers" with "reason over a typed Athlete Model + a derived Performance Model."

Two pure domains live in `packages/engine`:
- **Athlete Model** — *who the athlete is* (identity, goals, sporting context, training history,
  constraints, lifestyle, assessments, performance metrics, learned priors).
- **Performance Model** — *what drives performance*: capability per **physical quality** with a
  confidence and a source (measured vs inferred), derived from the Athlete Model + knowledge.

An app-side `AthleteModelService` builds, persists (versioned), loads, and upgrades the model.

**Non-goals this sprint (deliberately out of scope):**
- No programme-generation logic was rewritten. The live plan generator still consumes today's
  legacy `users.profile`; an adapter maps the model back to that profile and a **golden-master
  test proves the plans are byte-identical**.
- No diagnosis: the Performance Model's `demandProfile` / `limitingFactors` / `priorityAdaptations`
  are **scaffolded** (present in the shape, not computed) — diagnosis is a later sprint.
- No real learning: `learnedPriors` hold population defaults; the learning loop is later.
- No new onboarding UI. The revised onboarding *question wording* (outcome-based multi-goal,
  measurable training age, session duration, movement competency) is **Plan 2** — see §12.
- No new Supabase table; persistence reuses the existing `users.profile` JSONB.

---

## 2. Where the code lives

```
packages/engine/src/
  lib/athlete/
    schema.js              # AthleteModel shape + createAthleteModel() + ATHLETE_SCHEMA_VERSION
    fieldRegistry.js       # FIELD_REGISTRY manifest + listStoredFieldPaths + registryGaps
    validation.js          # validateAthleteModel()
    buildAthleteModel.js   # pure builder (asOf injected)
    index.js               # public exports
  lib/performance/
    estimation.js          # estimateCapability() + bandForModel()
    derivePerformanceModel.js
    index.js
  lib/adapters/
    goalMapping.js               # OUTCOME_TO_LEGACY + legacyToOutcome
    athleteModelToEngineInput.js # AthleteModel → engine profile (round-trip inverse)
    profileToAthleteModel.js     # legacy profile → AthleteModel
  data/
    trainingAgeBands.js    # bands + legacy-level mapping
    qualities.js           # seed physical-quality registry
    adaptations.js         # seed adaptation registry
    capabilityPriors.js    # population priors per quality per band

apps/mobile/src/lib/
  AthleteModelService.js   # build / persist (users.profile.athlete_model) / load / upgrade
  onboardingModel.js       # + answersToAthleteModelInputs(a, asOf)
apps/mobile/src/screens/
  Onboarding.jsx           # dual-write: legacy profile + athlete model
```

**Purity discipline:** every function in `athlete/`, `performance/`, and `adapters/` is pure and
takes an injected `asOf` ISO-date string — no `Date.now()`, no argless `new Date()`, no
`Math.random()`. Only the app-side `AthleteModelService` reads the clock (for `asOf` /
`updatedAt`). Same inputs → same outputs; the engine tests assert this determinism.

---

## 3. Athlete Model schema (v1)

`schemaVersion` is the integer `1` (exported as `ATHLETE_SCHEMA_VERSION`). `createAthleteModel(overrides)`
returns a deep-default model and shallow-merges each top-level section from `overrides`.

```js
AthleteModel = {
  schemaVersion: 1,
  athleteId: string|null,
  updatedAt: ISOString|null,   // stamped by the persistence layer, not the pure builder

  identity: { age, biologicalSex, heightCm, bodyMassKg },  // biologicalSex: 'male'|'female'|'other'|null
                                                           // demographics are for physiology normalisation only

  // Outcome-based, MULTIPLE, prioritised (replaces a single "training style").
  goals: [ { id, outcome, priority, sportRef, targetMetric, deadline } ],
  //   outcome e.g. 'get_stronger' | 'build_muscle' | 'general_fitness' | 'improve_sport_performance'
  //   priority: 1 = highest

  sportingContext: {
    primarySport,           // free-form id — NOT limited to run/cycle/swim
    secondarySports: [],
    position, competitiveLevel,           // competitiveLevel: recreational|club|regional|national|elite
    seasonPhase,                          // 'off'|'pre'|'in'|'transition'
    competitionCalendar: [ { label, date } ],
    weeklySportSchedule: [ { day, type } ],
    competitionFrequency, trainingFrequency,
  },

  // Measurable training age (replaces vague beginner/intermediate labels).
  trainingHistory: {
    resistanceTrainingYears, sportYears,
    selfRatedLevel,          // 'beginner'|'returning'|'intermediate'|'advanced' — preserves the legacy input
    olympicLiftingExperience, barbellExperience, plyometricExperience, vbtExperience,  // none|some|proficient
    coachingHistory,
    movementCompetency: { squat, hinge, press, pull, olympic, plyo },  // each: novice|intermediate|advanced|null
  },

  constraints: {              // extensible — typed lists, so new constraint kinds don't break the schema
    equipment: [], availableDays: [], daysPerWeek, sessionDurationMin,
    injuryHistory: [], currentPain: [], medicalRestrictions: [], mobilityLimitations: [],
    travel, shiftWork, rehabStatus, other: [],
  },

  lifestyle: { sleepQuality, stress, occupation, recoveryOpportunities },  // only factors that change coaching

  assessments: [],            // see §4
  performanceMetrics: [],     // see §4

  learnedPriors: {            // learning seam — population defaults now (Constitution Article 16)
    recoveryRate:    { value, source, confidence },   // source: 'population'|'learned'
    volumeTolerance: { value, source, confidence },
  },

  meta: { onboardedAt, source, planStartDate, enginePassthrough },  // see §8 for enginePassthrough
}
```

**Privacy (Constitution Article 11).** Raw vitals (HRV, sleep, resting HR) are **never copied
into the model** — they remain owner-only in `daily_metrics`. The model may reference injuries and
vitals; it never duplicates raw sensitive values. The whole model is owner-only under the existing
`users` RLS (`auth.uid() = id`).

**`name` is not stored.** A display name earns no coaching decision, so per the guiding principle
it is not an Athlete Model field (it stays on `users.profile` for display).

---

## 4. Assessment & performance-metric schema

Both are **missing-tolerant, source-tagged lists** so absent data is a first-class state.

```js
assessments: [ { id, type, value, unit, source, confidence, measuredAt } ]
//   type e.g. 'overhead_mobility' | 'single_leg_stability' | 'hinge_competency' | 'landing_mechanics'
performanceMetrics: [ { id, metric, value, unit, source, confidence, measuredAt } ]
//   metric e.g. '1rm_squat' | 'sprint_40m' | 'cmj_height' | 'vo2max'
```

- `source`: `'coach' | 'self' | 'derived' | 'wearable'` — supports coach-entered assessments,
  athlete self-assessment, and engine-derived values.
- `confidence`: `'low' | 'moderate' | 'high'`.
- No hard-coded sports: `metric`/`type` are free-form strings, so any sport's tests fit.

Today, onboarding lifts are mapped in as `performanceMetrics` (`1rm_squat`, `1rm_bench`,
`1rm_deadlift`, `1rm_ohp`, `1rm_pull`), which is what the capability estimator reads.

---

## 5. Performance Model

`derivePerformanceModel(model, asOf)` is pure and null-safe. It produces one capability per seed
quality:

```js
PerformanceModel = {
  athleteId, derivedAt,        // derivedAt = asOf
  capabilities: [ { qualityId, level, source, confidence, evidence, updatedAt } ],
  demandProfile: null,         // scaffolding — computed in a later sprint
  limitingFactors: [],         // scaffolding
  priorityAdaptations: [],     // scaffolding
}
```

- `level` is a 0..1 normalised estimate. `source` is `'measured' | 'inferred'`. `confidence` is
  always present.
- **Measured vs inferred** (`estimateCapability`): `maxStrength` is `measured` when a recent
  `1rm_*` performance metric exists (level = `(squat1RM / bodyMass) / STRONG_BW_MULTIPLE[sex]`,
  clamped 0..1; confidence by recency — ≤30 days → high, ≤180 → moderate, else low). Otherwise every
  quality is `inferred` from the training-age band prior with `confidence: 'low'`. The estimator
  **never throws** and always returns a level + confidence (Constitution Article 5 — an early
  diagnosis is an explicit low-confidence hypothesis; Article 13 — widen margins under low
  confidence).

### 5.1 Seed knowledge (representative, not exhaustive)

- **Quality registry** (`data/qualities.js`, 10 seed qualities): `maxStrength`, `hypertrophy`,
  `explosiveStrength`, `reactiveStrength`, `strengthEndurance`, `aerobicCapacity`,
  `anaerobicCapacity`, `mobility`, `stability`, `robustness`. Each entry:
  `{ id, family, adaptations[], assessment, fatigueCost{neural,metabolic,mechanical}, recoveryTimeH,
  prerequisites[], evidence }`. Referential integrity is enforced by test (every referenced
  adaptation exists; every prerequisite is a valid quality — e.g. `reactiveStrength` requires
  `maxStrength`).
- **Adaptation registry** (`data/adaptations.js`): `{ id, change, develops[] }`.
- **Training-age bands** (`data/trainingAgeBands.js`): `novice (<1y)`, `intermediate (1–3y)`,
  `advanced (3–5y)`, `highlyAdvanced (5y+)`, each mapped to the legacy engine level.
- **Capability priors** (`data/capabilityPriors.js`): population `level` (0..1) per quality per
  band, rising monotonically with training age — the documented assumption used when a quality is
  unmeasured.

Dose-response/fatigue values are **seed** (tagged `evidence: 'seed'`) — the sprint proves the
*structure*, not final coefficients.

---

## 6. Validation rules

`validateAthleteModel(model) → { ok, value, errors }` (pure, never throws — including on `null` or a
malformed nested field such as `{ identity: null }`, which is coerced back to defaults):
- `identity.age` clamped to `5..100`; `identity.bodyMassKg` clamped to `20..300` (clamping is a
  normalisation, not an error — `ok` stays true).
- `identity.biologicalSex` must be `male|female|other`; an unknown value sets
  `errors['identity.biologicalSex']` and `ok:false`.
- `goals[].priority` coerced to a positive integer.
- Missing data is valid — the model degrades gracefully rather than refusing to build.

---

## 7. Field registry & the justification gate (the guiding principle, made mechanical)

`fieldRegistry.js` holds `FIELD_REGISTRY` — a manifest with one entry **per stored field**:

```
{ why, decisions: [D1..D16], mandatory, confidenceIfMissing, assumptionIfMissing }
```

- `why` — a specific coaching reason (not filler).
- `decisions` — the Migration-Blueprint D1–D16 decisions the field influences (current or
  documented-future).
- `mandatory` — whether a plan can be built without it (only `goals`, `constraints.equipment`,
  `constraints.daysPerWeek` are mandatory).
- `assumptionIfMissing` — what is assumed when the field is absent (population priors for
  capabilities).

`registryGaps(createAthleteModel())` **must be empty** — a test fails if any stored field lacks a
registry entry. This is how "every assessment input has a documented purpose" is enforced
automatically. (`meta` / `schemaVersion` / `athleteId` / `updatedAt` are system keys, excluded from
justification.)

---

## 8. Data flow

```
Onboarding answers
  │  answersToAthleteModelInputs(a, asOf)   [apps/mobile/src/lib/onboardingModel.js]
  │    = profileToAthleteModel(answersToProfilePatch(a), asOf), meta.source='onboarding'
  ▼
AthleteModelService.buildAndSaveFromAnswers(answers)   [apps/mobile]
  │    persists model at users.profile.athlete_model (versioned) via SyncService (offline-first)
  ▼
users.profile.athlete_model   (owner-only, RLS auth.uid() = id)
  │
  ├─ getAthleteModel()  → stored+upgraded model, else lazily derived from the legacy profile
  └─ getPerformanceModel() → derivePerformanceModel(getAthleteModel(), localISODate())

Adapters (round-trip, TESTED, NOT in the live plan path this sprint):
  legacy profile ──profileToAthleteModel──▶ AthleteModel ──athleteModelToEngineInput──▶ engine profile
  golden master: generatePlan(engine profile) === generatePlan(legacy profile)   (byte-identical)
```

**enginePassthrough.** The engine reads a fixed set of legacy-shape sport fields
(`sport_intent`, `sport_goal`, `run_discipline`) and pure scheduling values (`plan_weeks`) that
Plan 1 does not yet model first-class. `profileToAthleteModel` stashes these in
`meta.enginePassthrough`, and `athleteModelToEngineInput` reads them back, so the round-trip is
lossless without polluting the first-class schema (which would duplicate `competitiveLevel` etc.).
Plan 2 promotes them to first-class fields. First-class sport fields DO round-trip directly:
`sport ↔ sportingContext.primarySport`, `sport_season ↔ seasonPhase`,
`event_date ↔ competitionCalendar[0].date`, `sport_days ↔ weeklySportSchedule[].day`.

---

## 9. API interfaces

**Engine (pure):**
- `@performance-os/engine/lib/athlete/index.js` — `createAthleteModel`, `ATHLETE_SCHEMA_VERSION`,
  `validateAthleteModel`, `buildAthleteModel`, `FIELD_REGISTRY`, `listStoredFieldPaths`,
  `registryGaps`.
- `@performance-os/engine/lib/performance/index.js` — `estimateCapability`, `bandForModel`,
  `derivePerformanceModel`.
- `@performance-os/engine/lib/adapters/...` — `athleteModelToEngineInput`, `profileToAthleteModel`,
  `OUTCOME_TO_LEGACY`, `legacyToOutcome`.

**App service (`apps/mobile/src/lib/AthleteModelService.js`):**
- `buildAndSaveFromAnswers(answers) → Promise<AthleteModel>` — build from onboarding + persist.
- `getAthleteModel() → AthleteModel | null` — stored+upgraded, else lazily derived from the legacy
  profile.
- `getPerformanceModel() → PerformanceModel | null`.
- `upgradeAthleteModel(stored) → AthleteModel` — version upgrader.

Downstream consumers use these — never raw onboarding answers — so future onboarding changes are
isolated from decision code.

---

## 10. Migration notes

- **Persistence:** the model is a versioned sub-object at `users.profile.athlete_model`. No Supabase
  DDL — the JSONB column and its `own profile` RLS already exist. `supabase/migrations/20260701_athlete_model.sql`
  is a documented no-op recording the shape for auditability.
- **Versioning / backward compatibility:** `upgradeAthleteModel` returns a current-version blob
  re-validated through `createAthleteModel`; an older/unknown version is re-hydrated and stamped the
  current `ATHLETE_SCHEMA_VERSION` (the stamp is load-bearing — the merge treats `schemaVersion` as a
  primitive override). Missing fields default safely; extra fields are dropped.
- **Existing users:** have no `athlete_model` yet; `getAthleteModel()` lazily derives one from their
  legacy `users.profile` (`profileToAthleteModel`) on first read.
- **New users:** the revised onboarding writes the legacy profile exactly as today **and**
  dual-writes the athlete model. The live engine path is unchanged.

---

## 11. Current → future input mapping

| Today (`users.profile` / onboarding) | Athlete Model | Notes |
|---|---|---|
| `goal_type` + `strength_style` | `goals[]` (outcome + priority) | adapter reconstructs the legacy pair via `OUTCOME_TO_LEGACY` |
| `experience.gym` label | `trainingHistory.selfRatedLevel` (+ future `resistanceTrainingYears`) | lossless round-trip; Plan 2 adds measurable years |
| *(not asked today)* | `constraints.sessionDurationMin` | new; Plan 2 collects it |
| `sport` | `sportingContext.primarySport` | free-form; no longer limited to run/cycle/swim |
| `sport_season` | `sportingContext.seasonPhase` | 1:1 |
| `event_date` | `sportingContext.competitionCalendar[0].date` | 1:1 |
| `sport_days` | `sportingContext.weeklySportSchedule[].day` | 1:1 (type `'sport'`) |
| `sport_intent` / `sport_goal` / `run_discipline` | `meta.enginePassthrough.*` | legacy-shape bridge; Plan 2 promotes to first-class |
| `lifts` / `lift_log` | `performanceMetrics[]` (`1rm_*`) | typed, source + confidence tagged |
| `bodyweight_kg`, `sex`, `age`, `height_cm` | `identity.*` | physiology normalisation |
| injuries (`injuries` table) | referenced by `constraints.injuryHistory` | stays in the `injuries` table |
| daily vitals (`daily_metrics`) | *referenced, not copied* | Article 11 privacy boundary preserved |
| `markers`/`notes`, `pool_length_m`, `lifts_source` | dropped | no decision consumes them |

---

## 12. Known limitations

- **Seed coefficients** (quality dose-response, fatigue, the strength normalisation multiples) are
  representative, not validated — flagged `evidence: 'seed'` for future evidence work.
- **Coarse capability** from sparse inputs — low confidence by design until real assessments/logs
  accumulate; only `maxStrength` has a measured path today.
- **Engine consumes the primary goal only** — `athleteModelToEngineInput` reads the highest-priority
  goal; multi-goal is stored but not yet consumed (matches today's engine).
- **Non-queryable across athletes** — the model lives inside `users.profile`; a normalized
  `athlete_profiles` table is deferred to the Team package (cross-athlete reads).
- **Revised onboarding question wording is Plan 2** — this sprint keeps the existing wizard; it maps
  today's answers into the model. Plan 2 adds outcome-based multi-goal, measurable training age,
  session duration, and movement-competency questions.
- **Pre-existing engine golden-master drift (unrelated to this sprint).** `apps/mobile/tests/golden-master.js`
  reports a 19-archetype `restSec` drift that predates Sprint 3 (the snapshot was last regenerated at
  `49f9263`; allocator rest logic changed afterward; the broken `npm test` never ran it). It is
  tracked separately (the blueprint's "Sprint 0 — safety net & CI gate") and was **not** touched
  here; the athlete-model adapter golden master (`athlete-adapter-golden-master.js`) is independent
  and passes.
