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
- Diagnosis is computed but does **not steer the plan**. `demandProfile` (from the SKB),
  `limitingFactors`, and `priorityAdaptations` are now populated (see §5.2/§5.4) — but the diagnosis
  is model output only; it does not yet change plan generation (that re-seating is a later sprint).
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
  demandProfile: [ { qualityId, importance, source, evidence } ] | null,   // see §5.2 — live (Plan 2)
  limitingFactors: [ { qualityId, magnitude, demandImportance, capabilityLevel, confidence, trainability, injuryRisk, rationale } ],  // see §5.4 — COMPUTED (D4)
  priorityAdaptations: [ { qualityId, order, magnitude, confidence, adaptations, tracesToLimiter, rationale } ],  // see §5.4 — COMPUTED (D5)
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

### 5.2 `demandProfile` — populated from the SKB (Plan 2)

`demandProfile` is no longer scaffolding: `derivePerformanceModel` (`packages/engine/src/lib/performance/derivePerformanceModel.js`)
calls `buildDemandProfile(sportId, positionId)` (`packages/engine/src/lib/performance/demandProfile.js`)
whenever `model.sportingContext.primarySport` is set, using `model.sportingContext.position` (or
`null`). It stays `null` when there's no primary sport, or when the sport has no SKB physical
profile, or when nothing maps (never throws).

`buildDemandProfile(sportId, positionId)`:
1. Reads the SKB sport's `physicalProfile.qualities` (`packages/engine/src/lib/sportKnowledge`) and
   maps each SKB quality name through `mapSkbQuality` (`packages/engine/src/data/sportQualityMap.js`,
   the `SKB_TO_PM_QUALITY` table) to a Performance-Model quality id. The base `importance` per PM
   quality is the SKB's `importance` (0–10) normalised to 0..1, taking the max across every SKB
   quality that maps to the same PM quality.
2. **Position boost:** for the chosen position's `primaryQualities` (`SKB.section(sportId,
   'positions')`), any mapped PM quality is raised to at least `PRIMARY_FLOOR` (0.9) — a position's
   primary qualities are always treated as highly demanding, even if the sport-level base importance
   was lower.
3. Returns `[ { qualityId, importance, source: 'skb', evidence } ]` — `evidence` is a traceable
   string (`skb:<sportId>:<skbQualityName>` or `skb:<sportId>:pos:<positionId>`).

`SKB_TO_PM_QUALITY` (`sportQualityMap.js`) maps: `maxStrength`, `relativeStrength` → `maxStrength`;
`explosivePower` → `explosiveStrength`; `reactiveStrength` → `reactiveStrength`; `aerobicEndurance` →
`aerobicCapacity`; `anaerobicEndurance`, `repeatSprintAbility` → `anaerobicCapacity`; `mobility` →
`mobility`; `stability`, `balance` → `stability`; `durability` → `robustness`. **Unmapped and
dropped** (no Performance-Model home yet — a future sport-skill/speed quality layer, not this
sprint): `sprintSpeed`, `acceleration`, `deceleration`, `changeOfDirection`, `coordination`,
`rotationalPower`, `gripStrength`, `neckStrength`.

### 5.3 SKB-driven sport selection (Plan 2)

The onboarding sport list is **derived from the SKB**, not hand-maintained:

- `selectableSports()` (`packages/engine/src/lib/sportKnowledge/selectable.js`) returns every SKB
  sport id that is both **completeness-gated** (`SKB.completeness(id).complete` — sufficiently
  authored) **and** has an engine binding (`bindingFor(id)` is non-null). `positionsFor(skbId)`
  reads the sport's `positions` section for the onboarding position picker. Authoring a new
  flagship SKB profile and adding one binding entry is enough to make a sport selectable — no
  wizard change needed.
- `bindingFor(skbId)` (`packages/engine/src/data/sportEngineBinding.js`, table `SKB_ENGINE_BINDING`)
  maps an SKB sport id to the **legacy engine sport module + discipline** that actually plans it
  today (e.g. `running_sprint → { engineSport: 'run', discipline: 'sprint' }`,
  `gaelic_football`/`hurling → { engineSport: 'gaa', discipline: null }`), so onboarding can reason
  in SKB ids while the live gym engine keeps biasing correctly on its existing sport vocabulary.
- The adapter preserves the exact legacy round-trip: `athleteModelToEngineInput` prefers the exact
  legacy `sport`/`run_discipline` stashed in `meta.enginePassthrough` when present (byte-identical
  golden master for existing users), and only falls back to `bindingFor(sportingContext.primarySport)`
  for the new SKB-driven onboarding path. **Net effect: plans are unchanged** — SKB-driven sport
  selection changes what onboarding asks and what feeds `demandProfile`, not what the live plan
  generator produces.

### 5.4 `limitingFactors` / `priorityAdaptations` — the diagnosis (D4/D5, COMPUTED)

`limitingFactors` and `priorityAdaptations` are no longer scaffolding — `derivePerformanceModel`
(`packages/engine/src/lib/performance/derivePerformanceModel.js`) now calls
`diagnoseLimitingFactors(capabilities, demandProfile)` (D4,
`packages/engine/src/lib/performance/diagnose.js`) and feeds its output into
`prioritiseQualities(limitingFactors)` (D5, `packages/engine/src/lib/performance/prioritise.js`).
Both are pure and null-safe.

**D4 — `diagnoseLimitingFactors`.** For every quality in the `demandProfile`, ranks the gap between
what the sport/position *demands* and what the athlete can currently *do*:

- `magnitude = max(0, demandImportance − capabilityLevel) × demandImportance × trainability × injuryRisk`
  — the gap, weighted by how important the quality is to the sport (a large gap on a low-importance
  quality matters less than a smaller gap on a high-importance one). `trainability` and `injuryRisk`
  are **neutral seams** (`= 1.0` today — typed and wired so a later sprint can enrich them from the
  quality registry / injury system without changing the shape).
- `confidence` is the **weakest input** — the capability estimate's confidence (the demand side is
  SKB-evidence-backed, so the capability estimate is the weak link).
- `rationale` is a plain-English sentence naming the demand, the athlete's current level, and the
  gap (or "you meet the demand; maintain it" when there is no gap).
- Factors are sorted by `magnitude` descending (ties broken alphabetically by `qualityId`).
- **A sport athlete always has a diagnosis** — every demanded quality is ranked, including
  zero-magnitude ones (met demands). When there is no `demandProfile` (no primary sport, or the
  sport has no SKB physical profile), `diagnoseLimitingFactors` returns `[]` — there is nothing to
  diagnose against.

**D5 — `prioritiseQualities`.** From the ranked limiting factors, selects a **confidence-scaled**
set of priority qualities to develop:

- Only positive-magnitude factors are candidates (a met demand is never a priority).
- `k` (how many priorities to select) scales with the top factor's confidence: `low → 1`,
  `moderate → 2`, `high → 3` — lower confidence means a narrower, more conservative diagnosis.
- Each selected quality is mapped through the quality registry (`data/qualities.js`) to the
  `adaptations[]` that develop it, and carries `tracesToLimiter` (which limiting factor it
  addresses) plus a `rationale` naming the magnitude and the adaptations to develop it via.
- **Compatibility guard** (`data/qualityCompatibility.js`, `areIncompatible`): a candidate is
  deferred (skipped, not selected) if it conflicts with an already-selected higher-priority quality.
  Seeded with the classic concurrent-training interference pair (`maxStrength` ×
  `aerobicCapacity`) — priorities are never a mix of max-strength and max-endurance work at once.
- When `limitingFactors` is empty (no demand, or every demand is already met), `priorityAdaptations`
  is `[]`.

**Field naming note:** despite the historical name, `priorityAdaptations` holds **priority-QUALITY**
entries — each one *carries* the `adaptations[]` that develop that quality, rather than being a flat
list of adaptations itself.

**This diagnosis is model output only.** Nothing in the live plan generator reads
`limitingFactors`/`priorityAdaptations` yet — see §12.

### 5.5 Exercise-quality knowledge layer (Sprint 5, PARALLEL)

`packages/engine/src/data/exerciseQualities.js` tags every one of the 118 exercises with the physical
**qualities** it develops (primary/secondary, from the fixed 10), the **adaptations** it drives
(derived through the quality registry), its **force-velocity** profile (a controlled vocabulary,
`FORCE_VELOCITY`), and a per-exercise **fatigue cost** (`{neural, metabolic, mechanical}`). Tags
resolve via CLASS rules (reading the flags an exercise already carries) → PATTERN defaults →
per-exercise OVERRIDES, mirroring `exerciseSimilarity.js`. Every tag carries honest seed evidence
(`{ level:'seed', confidence, source, needsReview:true }`).

Each of the 10 qualities also now carries a `doseResponse` (`{ intensity, reps, rir, restType }`), so
the blueprint's rule holds — no quality label without both a dose and an assessment.

**This is PARALLEL knowledge — nothing in `generatePlan` reads it.** It is the bridge the diagnosis
needs before it can steer exercise selection (the allocator picks by muscle; the diagnosis speaks in
qualities). Both golden masters stay byte-identical. Accessor: `exerciseQualities(id)` (also on the
engine barrel). Consumers arrive next: **D10** (movement/quality requirements) and **D11** (intervention
selection) in Sprints 7–8. Design + plan: `docs/superpowers/{specs,plans}/2026-07-02-exercise-quality-tagging-*`.

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
- **The diagnosis (`limitingFactors` / `priorityAdaptations`) is model output only — it does not
  yet steer plan generation.** D4/D5 (§5.4) now compute the demand × capability diagnosis, but
  nothing downstream reads it: the live plan generator still runs entirely off the legacy profile
  via `athleteModelToEngineInput`, unchanged. Coupling the diagnosis into what the plan actually
  builds (the diagnosis→plan re-seating) is the **next sprint**.
- **`trainability` and `injuryRisk` are neutral seams** (`= 1.0` on every limiting factor) — typed
  and wired into the `magnitude` formula so a later sprint can enrich them (from the quality
  registry's `fatigueCost`/prerequisites and the injury system) without changing the shape or
  breaking consumers.
- **Build-goal diagnosis is empty.** `diagnoseLimitingFactors` only ever produces factors when a
  `demandProfile` exists, and `demandProfile` is only built from a primary **sport** (§5.2). Athletes
  whose goal is a build-goal (get stronger, build muscle, general fitness) with no sporting context
  get `limitingFactors: []` and `priorityAdaptations: []` — not because the diagnosis is broken, but
  because no goal-as-sport demand profile exists yet to diagnose against.
- **SKB qualities without a Performance-Model home are unmapped, not lost.** `sportQualityMap.js`
  documents the drop list (`sprintSpeed`, `acceleration`, `deceleration`, `changeOfDirection`,
  `coordination`, `rotationalPower`, `gripStrength`, `neckStrength`) — a future sport-skill/speed
  quality layer, not this sprint. They are absent from `demandProfile` rather than approximated.
- **Revised onboarding question wording landed in Plan 2** — SKB-driven sport + position selection,
  session-duration, training-age, and movement-competency steps are now in `OnboardingWizard.jsx`;
  see §5.2/§5.3 for the mechanism. Live plans are unchanged (golden master green).
- **Pre-existing engine golden-master drift (unrelated to this sprint).** `apps/mobile/tests/golden-master.js`
  reports a 19-archetype `restSec` drift that predates Sprint 3 (the snapshot was last regenerated at
  `49f9263`; allocator rest logic changed afterward; the broken `npm test` never ran it). It is
  tracked separately (the blueprint's "Sprint 0 — safety net & CI gate") and was **not** touched
  here; the athlete-model adapter golden master (`athlete-adapter-golden-master.js`) is independent
  and passes.
