# Sprint 3 — Athlete Assessment & Performance Model — Design Spec

- **Status:** Approved design (2026-07-01). Ready for implementation planning.
- **Sprint goal:** Establish a complete digital representation of an athlete that future
  coaching decisions reason over. **No programme-generation logic is rewritten in this sprint.**
- **Author role:** Principal Software Engineer, platform rebuild.
- **Governs against (frozen, do NOT edit):** Constitution, EDS, Decision Ontology,
  Knowledge Architecture, TAS, Baseline Architecture Assessment, Migration Blueprint.

---

## 0. One-paragraph summary

Today the app stores a flat bag of onboarding answers in `users.profile` and the engine
reasons in **muscles and volume**. The frozen docs require the engine to eventually reason
in **physical qualities** (max strength, explosive strength, aerobic capacity, mobility, …),
and to do that it must first build a proper **model of the athlete** — the same way a coach
diagnoses an athlete before writing a programme. This sprint introduces two new **pure**
domains in `packages/engine` — an **Athlete Model** (who the athlete is) and a **Performance
Model** (what drives their performance, as capability-per-quality with confidence) — plus a
thin app-side service and a pair of tested adapters. The live plan generator is left
**untouched**; the adapter that maps the new model back into today's engine input is proven,
by a golden-master test, to produce identical plans. Onboarding's *question set* is revised so
every input earns its place (outcome-based goals, measurable training age, session duration),
but the UI is not redesigned.

---

## 1. Decisions locked with the user

| # | Decision | Choice |
|---|---|---|
| A | New data-collection UI this sprint? | **No new UI.** Revise the *question set* (what onboarding asks); reuse existing wizard components. |
| B | Where the pure domain lives | **`packages/engine`** (app-side adapter + persistence in `apps/mobile`). |
| C | How it connects to today's live plan | **Parallel, proven by tests.** Live engine keeps consuming today's profile; adapter tested to yield identical plans. |
| D | Performance-model depth | **Structure + representative seed** (≈10 core qualities + population priors), extensible. |
| E | Persistence location | **Versioned `users.profile.athlete_model` sub-object** (no new table, no migration). Dedicated table = future work. |
| F | Goal capture | **Outcome-based, multiple, prioritised**, mapped back to legacy `goal_type`/`strength_style` via the adapter. |

---

## 2. Part 1 — Review of the existing implementation (findings)

### 2.1 Current onboarding flow
- 12-step wizard: `apps/mobile/src/components/OnboardingWizard.jsx`, wrapped by
  `apps/mobile/src/screens/Onboarding.jsx`.
- Answers → profile transform: `apps/mobile/src/lib/onboardingModel.js`
  (`BLANK_ANSWERS`, `answersToProfilePatch`).
- Result written to `users.profile` (JSONB) via `trainingStore.updateProfile` →
  `SyncService.updateProfile` → Supabase + localStorage (`htp_users_v4_{ns}`).

### 2.2 What is collected today
Identity (name, age, sex, bodyweight); goal_type (`build`|`sport`); strength **style**
(`strength`|`bodybuilding`|`functional`); sport (`run`|`cycle`|`swim` only); run discipline;
sport intent/season/goal/event date; sport days; **experience label**
(`beginner`|`returning`|`intermediate`|`advanced`); days/week; equipment; preferred days;
start timing; 5 barbell lifts (squat/bench/deadlift/ohp/pull).

### 2.3 Problems to fix
- **Bodybuilding-centric:** goal is a *training style*, not an outcome; single goal only.
- **Vague experience labels** instead of measurable training age.
- **Sport list hard-limited** to run/cycle/swim; no position/level; no secondary sport.
- **Missing inputs:** session duration (engine uses a default), movement competency,
  any assessment or performance metric beyond 5 lifts, mobility, lifestyle.
- **Dead inputs:** `notes`→`markers`, `pool_length_m`, `lifts_source` (display only) —
  never read by any decision.
- **No confidence anywhere:** every value is treated as equally certain.

### 2.4 What the engine actually reads (the contract we must preserve)
`goal_type, sport, run_discipline, sport_intent, sport_season, sport_goal, event_date,
sport_days, strength_style, experience, availability{days,days_per_week}, access,
bodyweight_kg, sex, lifts, lift_log, plan_start_date`
(entry: `packages/engine/src/lib/PlanGenerator.js`; resolvers under `strength/`, `plan/`).
The adapter (§8) must reproduce exactly these fields.

### 2.5 Current→future input mapping (summary; full table in the Part 9 doc)
| Today | Future Athlete Model | Notes |
|---|---|---|
| `goal_type` + `strength_style` | `goals[]` (outcome, priority) | adapter reconstructs legacy pair |
| `experience` label | `trainingHistory.resistanceTrainingYears` (+ competency) | adapter derives legacy band |
| *(none)* | `constraints.sessionDurationMin` | new; improves plans today |
| `sport`, `run_discipline`, season, event | `sportingContext.*` | preserved 1:1 |
| `lifts`, `lift_log` | `performanceMetrics[]` | typed, source+confidence tagged |
| injuries (separate table) | referenced by `constraints.injuryHistory` | remains in `injuries` table |
| daily vitals (`daily_metrics`) | *referenced, not copied* | privacy boundary preserved |
| `markers`, `pool_length_m`, `lifts_source` | dropped | no decision uses them |

---

## 3. Architecture

Two new pure domains + knowledge data in `packages/engine`, an app-side service, and adapters.

```
Onboarding answers (revised question set)
        │  (apps/mobile: onboardingModel → answersToAthleteModelInputs)
        ▼
┌───────────────────────────┐     AthleteModelService.js (apps/mobile/src/lib)
│  Athlete Model            │  ── build · validate · persist (versioned) · load ·
│  packages/engine/lib/     │     expose stable read interface (wraps pure engine fns)
│  athlete/                 │
└─────────────┬─────────────┘
              │ derivePerformanceModel(model, knowledge, asOf)  — PURE, deterministic
              ▼
┌───────────────────────────┐     knowledge: packages/engine/src/data/
│  Performance Model        │       qualities.js · adaptations.js ·
│  capability-per-quality   │       capabilityPriors.js · trainingAgeBands.js
│  with confidence          │
└─────────────┬─────────────┘
              │ athleteModelToEngineInput(model)  — adapter, TESTED (golden master)
              ▼
      Engine input  →  generatePlan(...)  (UNCHANGED, live path unchanged)
```

**Purity discipline (matches the engine):** all builders/derivers are pure and take an
injected `asOf` timestamp — never call `Date.now()`/`Math.random()`. Same inputs → same
outputs. Testable with `node tests/*.js`.

### 3.1 Module / file map
```
packages/engine/src/
  lib/athlete/
    schema.js              # AthleteModel shape + createAthleteModel(defaults)
    fieldRegistry.js       # per-field manifest (why · decisions · mandatory · confidenceIfMissing · assumption)
    validation.js          # validateAthleteModel(model) → {ok, value, errors}; normalisation
    buildAthleteModel.js   # pure: normalized inputs → AthleteModel (asOf injected)
    index.js               # public exports
  lib/performance/
    estimation.js          # per-quality capability-estimation rules (pure)
    derivePerformanceModel.js  # pure: AthleteModel + knowledge → PerformanceModel
    index.js
  lib/adapters/
    profileToAthleteModel.js       # legacy users.profile → AthleteModel (existing users)
    athleteModelToEngineInput.js   # AthleteModel → engine profile input (live-equivalent)
  data/
    qualities.js           # quality registry (knowledge)
    adaptations.js         # adaptation registry (knowledge)
    capabilityPriors.js    # population capability priors per quality per training-age band
    trainingAgeBands.js    # training-age band definitions + legacy-label mapping
  tests/
    athleteModel.test.js         # build + validation + determinism + missing-data
    performanceModel.test.js     # capability estimation + confidence + determinism
    adapterGoldenMaster.test.js  # model→engine input yields identical plan across scenarios
    fieldRegistry.test.js        # every stored field has a justification entry

apps/mobile/src/lib/
  AthleteModelService.js   # build from answers · persist (versioned) · load · upgrade
  onboardingModel.js       # + answersToAthleteModelInputs(a) (keeps answersToProfilePatch)

docs/architecture/
  ATHLETE-MODEL.md         # Part 9 technical doc (NOT frozen)
```

---

## 4. The Athlete Model (schema v1)

Durable, portable source of truth. Aligns with Decision Ontology "Athlete State" (§8) and
EDS §29. Shapes shown as annotated JS object literals (the codebase is plain JS + JSDoc).

```js
AthleteModel = {
  schemaVersion: 1,
  athleteId: string,            // = auth user id
  updatedAt: ISOString,         // set by the persistence layer, not the pure builder

  identity: {
    age: number|null,
    biologicalSex: 'male'|'female'|'other'|null,  // physiology normalisation only
    heightCm: number|null,
    bodyMassKg: number|null,
  },

  // Outcome-based, MULTIPLE, prioritised. Replaces single "training style".
  goals: [
    {
      id: string,
      outcome: string,          // e.g. 'build_muscle' | 'get_stronger' | 'improve_sprint_speed'
                                //      | 'increase_vertical_jump' | 'improve_endurance'
                                //      | 'return_from_injury' | 'general_health'
                                //      | 'improve_sport_performance'
      priority: number,         // 1 = highest
      sportRef: string|null,    // links a goal to a sport/discipline when relevant
      targetMetric: { metric: string, value: number, unit: string }|null,
      deadline: ISODate|null,
    }
  ],

  sportingContext: {
    primarySport: string|null,          // free-form id; NOT limited to run/cycle/swim
    secondarySports: string[],
    position: string|null,
    competitiveLevel: 'recreational'|'club'|'regional'|'national'|'elite'|null,
    seasonPhase: 'off'|'pre'|'in'|'transition'|null,
    competitionCalendar: [ { label: string, date: ISODate } ],
    weeklySportSchedule: [ { day: 'mon'|…|'sun', type: string } ],
    competitionFrequency: string|null,  // e.g. 'weekly' | 'monthly' | 'none'
    trainingFrequency: number|null,     // sport sessions / week
  },

  // Measurable training age — replaces vague labels.
  trainingHistory: {
    resistanceTrainingYears: number|null,
    sportYears: number|null,
    olympicLiftingExperience: 'none'|'some'|'proficient'|null,
    barbellExperience: 'none'|'some'|'proficient'|null,
    plyometricExperience: 'none'|'some'|'proficient'|null,
    vbtExperience: 'none'|'some'|'proficient'|null,   // future
    coachingHistory: string|null,                     // optional
    movementCompetency: {                             // the L4 gate; self- or coach-assessed
      // each key: 'novice'|'intermediate'|'advanced'|null
      squat: null, hinge: null, press: null, pull: null, olympic: null, plyo: null,
    },
  },

  // Extensible: typed lists so new constraint kinds don't break the schema.
  constraints: {
    equipment: string[],                 // barbell|dumbbell|machine|cable|band|kettlebell|bodyweight
    availableDays: ('mon'|…|'sun')[],
    daysPerWeek: number|null,
    sessionDurationMin: number|null,     // NEW
    injuryHistory: [ { ref: string, region: string, status: string } ],  // pointers to injuries table
    currentPain: [ { region: string, severity: 'low'|'moderate'|'high' } ],
    medicalRestrictions: string[],
    mobilityLimitations: string[],
    travel: boolean|null,
    shiftWork: boolean|null,
    rehabStatus: 'none'|'acute'|'rehab'|'return_to_perform'|null,
    other: [ { kind: string, value: any } ],   // extension point
  },

  lifestyle: {                            // only factors that change coaching
    sleepQuality: 'poor'|'fair'|'good'|null,
    stress: 'low'|'moderate'|'high'|null,
    occupation: 'sedentary'|'active'|'physical'|null,
    recoveryOpportunities: 'low'|'moderate'|'high'|null,
  },

  // Missing-tolerant, source-tagged. Supports coach-entered + self-assess + not-yet-done.
  assessments: [
    {
      id: string,
      type: string,                       // e.g. 'overhead_mobility' | 'single_leg_stability'
                                          //      | 'hinge_competency' | 'landing_mechanics'
      value: any,                         // scale/result; shape depends on type
      unit: string|null,
      source: 'coach'|'self'|'derived',
      confidence: 'low'|'moderate'|'high',
      measuredAt: ISODate|null,
    }
  ],

  // Flexible, sport-agnostic. No hard-coded sports.
  performanceMetrics: [
    {
      id: string,
      metric: string,                     // '1rm_squat' | 'sprint_40m' | 'cmj_height' | 'vo2max' | …
      value: number,
      unit: string,
      source: 'coach'|'self'|'derived'|'wearable',
      confidence: 'low'|'moderate'|'high',
      measuredAt: ISODate|null,
    }
  ],

  // Learning seam — alive from day one (Constitution Article 16).
  // Holds population defaults now; learning writes athlete-specific priors later.
  // extensible; each prior is a typed { value, source: 'population'|'learned', confidence }
  learnedPriors: {
    recoveryRate:    { value: number, source: 'population'|'learned', confidence: 'low'|'moderate'|'high' },
    volumeTolerance: { value: number, source: 'population'|'learned', confidence: 'low'|'moderate'|'high' },
  },

  meta: { onboardedAt: ISODate|null, source: 'onboarding'|'migration'|'coach' },
}
```

**Privacy (Constitution Article 11):** raw vitals (HRV, sleep, resting HR) are **not** copied
into the model — they remain owner-only in `daily_metrics`. The model references injuries and
vitals; it never duplicates raw sensitive values. The model as a whole is owner-only under the
existing `users` RLS (`auth.uid() = id`).

---

## 5. The Performance Model + knowledge seed

**Separate**, derived (spec Part 3). It reasons over the Athlete Model + knowledge to produce
capability-per-quality with confidence.

```js
PerformanceModel = {
  athleteId: string,
  derivedAt: ISOString,          // = asOf (injected)
  capabilities: [
    {
      qualityId: string,          // 'maxStrength' | 'hypertrophy' | 'explosiveStrength' | …
      level: number,              // 0..1 normalised
      source: 'measured'|'inferred',
      confidence: 'low'|'moderate'|'high',
      evidence: string,           // e.g. 'squat 1RM within 30d' | 'training-age band prior'
      updatedAt: ISODate|null,
    }
  ],
  // Scaffolding — DEFINED, not computed this sprint (diagnosis is a future sprint):
  demandProfile: null,            // (sport → quality importances) — structure only
  limitingFactors: [],            // computed later
  priorityAdaptations: [],        // computed later
}
```

### 5.1 Seed quality registry (`data/qualities.js`) — ≈10 core qualities
Representative, evidence-based, confidence-tagged. Each entry:
`{ id, family, adaptations[], doseResponse{model, confidence}, fatigueCost{neural,metabolic,mechanical},
recoveryTimeH, prerequisites[], assessmentMethod, trainabilityNotes, evidence }`

Seed set: `maxStrength`, `hypertrophy`, `explosiveStrength` (RFD), `reactiveStrength` (SSC),
`strengthEndurance`, `aerobicCapacity`, `anaerobicCapacity`, `mobility`, `stability`,
`robustness`. (Dose-response numbers are seed values tagged with confidence and marked for
future validation — this sprint proves the *structure*, not final coefficients.)

### 5.2 Adaptation registry (`data/adaptations.js`)
`{ id, change, developsQualities[], doseResponse, recoveryCharacter, evidence }`
(e.g. `tendon_stiffness`, `motor_unit_recruitment`, `mitochondrial_density`, `ssc_efficiency`).

### 5.3 Training-age bands + population priors
- `trainingAgeBands.js`: `novice (<1y) · intermediate (1–3y) · advanced (3–5y) ·
  highlyAdvanced (5y+)`, each mapped to the legacy label the engine expects.
- `capabilityPriors.js`: population `level` (0..1) per quality per band — the documented
  assumption used when a quality is unmeasured. Low confidence by construction.

### 5.4 Capability estimation (`performance/estimation.js`, pure)
Per quality: **if** a recent relevant `performanceMetric`/`assessment` exists → `source:
'measured'`, higher confidence, level normalised (e.g. 1RM vs bodyweight/sex via existing
strength standards). **Else** → `source: 'inferred'` from training-age band prior +
identity, `confidence: 'low'`. **Never throws on missing data** — always falls back to a
population prior with low confidence (Constitution Article 5 low-confidence hypothesis;
Article 13 widen margins). This is the D1 "Assess" seed the frozen lifecycle places in the
engine.

---

## 6. Part 4 — Validation, field registry, decision interface

### 6.1 Field registry (`athlete/fieldRegistry.js`)
A data manifest: for **every** stored field, an entry declaring
`{ why, decisions: string[], mandatory: boolean, confidenceIfMissing, assumptionIfMissing }`.
`decisions` reference the Migration Blueprint D1–D16 catalogue (current or documented-future).
**Enforcement:** `fieldRegistry.test.js` asserts every field key present in a built model has
a registry entry — so no field can exist without a documented justification (your guiding
principle, made mechanical).

### 6.2 Validation (`athlete/validation.js`)
`validateAthleteModel(model) → {ok, value, errors}`: type/enum checks, sane bounds
(e.g. lifts within StrengthLevel plausibility), normalisation. Invalid inputs are rejected or
coerced; the model **degrades gracefully** on missing data and never refuses to build.

### 6.3 Decision interface (Part 6)
Downstream code **never reads raw onboarding again**. It consumes:
- App side: `AthleteModelService.getAthleteModel()` / `getPerformanceModel()`.
- Engine side (pure): `buildAthleteModel(inputs, asOf)`, `derivePerformanceModel(model, knowledge, asOf)`.
This isolates all consumers from future onboarding changes (spec Part 6, TAS §5.3 contracts).

---

## 7. Part 5 — Persistence & versioning

- **Location:** `users.profile.athlete_model` — a versioned sub-object. Reuses the proven
  `SyncService.updateProfile` path, existing RLS (`auth.uid() = id`), offline-first sync.
  **No Supabase schema migration, no new table.** (A normalized `athlete_profiles` table is
  noted as future work for Team-package cross-athlete queries.)
- **Versioning:** `schemaVersion` on the object + an `upgradeAthleteModel(stored)` function in
  `AthleteModelService`. Unknown/extra fields are preserved; missing fields default safely
  (mirrors the existing `readiness_v2 !== false` graceful-degradation pattern).
- **Backward compatibility:** existing users without an `athlete_model` get one derived on
  load (see §8) and persisted; old cached profiles keep working unchanged.
- **Documentation:** a Supabase migration file is added purely as a **documented no-op/comment**
  recording the `profile.athlete_model` shape and version (audit trail), even though no `ALTER`
  is required.

---

## 8. Part 8 — Adapters & migration (the safety mechanism)

- `profileToAthleteModel(legacyProfile) → AthleteModel` — builds a model for **existing users**
  from their current profile. Called lazily on load by `AthleteModelService`, then persisted.
- `athleteModelToEngineInput(model) → engineProfile` — maps the model back to exactly the
  fields §2.4 lists. **Proven** by `adapterGoldenMaster.test.js`: for a battery of
  representative athletes, `generatePlan(athleteModelToEngineInput(profileToAthleteModel(p)))`
  equals `generatePlan(p)`. This is how "existing functionality remains operational" is
  *demonstrated*, not asserted.
- **Onboarding (dual-write):** the revised onboarding writes the legacy `users.profile` exactly
  as today **and** builds + persists the athlete model. The live engine path is unchanged.

---

## 9. Part 6 (content) — Revised onboarding question set

Reuse existing wizard components; change *what* is asked. Every change is justified by a
decision it serves (full wording lands in the Part 9 doc + the implementation plan).

| Change | From → To | Serves |
|---|---|---|
| **Goals** | single training style → **outcome goals, multi-select + prioritise** | D4/D5 diagnose & prioritise; spec Part 2 |
| **Training age** | beginner/intermediate labels → **years RT + years sport** | D7/D9/D11/D12; removes vague labels |
| **Session duration** | *(not asked)* → **minutes/session** | D9 session design; improves plans **today** |
| **Movement competency** | *(not asked)* → **light self-assess squat/hinge/press/pull** (confidence-tagged) | D10/D11 exercise gating (future) |
| **Sport** | fixed run/cycle/swim → **free-form primary + optional secondary + level/position** | D2 demand profile (future); no hard-coded sports |
| **Retire** | `notes`/`markers`, `pool_length_m` | no decision consumes them |

Rule: no question is added unless it maps to a decision (current, or documented-future in the
D1–D16 catalogue). Legacy engine fields are always reconstructed by the adapter, so the live
plan keeps working regardless of question-set changes.

---

## 10. Part 7 — Testing

Plain `node tests/*.js` (matches the engine's existing style), deterministic:
- **Determinism** — same model → same performance model (fixed `asOf`).
- **Adapter golden master** — identical plans across spec-Part-7 scenarios: different sports,
  different experience levels, missing data, conflicting/multiple goals, injury scenarios,
  limited equipment, minimal availability, season transitions.
- **Missing-data** — model + performance model build with population priors + low confidence,
  never throw.
- **Field-registry completeness** — every stored field has a justification entry.
- **Validation** — invalid inputs rejected/normalised; bounds enforced.
- **Confidence** — measured inputs yield higher confidence than inferred; confidence is present
  on every capability.

---

## 11. Part 9 — Documentation deliverable

New **non-frozen** doc `docs/architecture/ATHLETE-MODEL.md` (architecture/ already holds living
docs) covering: Athlete Model schema, assessment schema, validation rules, assumption rules,
data flow, API interfaces, migration notes, known limitations, and the full current→future
input mapping. Plus pointer updates to the **running** docs only (HANDOFF.md, CLAUDE.md) —
never the frozen governing set.

---

## 12. Scope boundaries (non-goals this sprint)

- **No** programme-generation logic rewritten; live plan path unchanged.
- **No** live routing of plans through the new model (adapter is tested, not in the hot path).
- **No** diagnosis: limiting-factor / demand-profile / priority-adaptation computation is
  scaffolding only.
- **No** new onboarding UI framework or visual redesign (question content only).
- **No** real learning: `learnedPriors` holds population defaults; the learning loop is later.
- **No** new Supabase table; persistence reuses `users.profile`.

---

## 13. Success-criteria mapping

| Spec success criterion | Satisfied by |
|---|---|
| Comprehensive Athlete Profile model exists | §4 |
| Separate Performance Model exists | §5 |
| Onboarding maps cleanly into the model | §8 (adapter + dual-write), §9 |
| Every assessment input has a documented purpose | §6.1 field registry + test |
| Downstream modules consume via a stable interface | §6.3 |
| Existing functionality remains operational | §8 golden master |
| New functionality covered by automated tests | §10 |
| Platform reasons about athletes, not raw answers | §3 flow + §6.3 |

---

## 14. Known limitations / risks

- Seed dose-response coefficients are representative, not validated — tagged low/medium
  confidence, flagged for future evidence work.
- Capability estimation from sparse inputs is coarse (low confidence by design) until real
  assessments/logs accumulate.
- Storing the model inside `users.profile` keeps it non-queryable across athletes; acceptable
  for the Individual package, revisited when Team needs cross-athlete reads.
- Revising onboarding questions touches a live surface; mitigated by dual-write + the adapter
  golden master (legacy fields always reconstructed).
