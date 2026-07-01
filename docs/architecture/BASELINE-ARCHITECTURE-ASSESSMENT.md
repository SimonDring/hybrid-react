# Baseline Architecture Assessment (Sprint 1)

> **A complete, factual baseline of the platform as it exists today, measured against the frozen governing set (Constitution · EDS · Decision Ontology · Knowledge Architecture · TAS).**
> This document is **observational**: it describes what exists, how it works, why, and how it maps to the target architecture. It proposes no implementations and changes no code. It is the reference baseline every future sprint is planned against.

| | |
|---|---|
| **Status** | v1.0 — baseline, observational (Sprint 1) |
| **Date** | 2026-07-01 |
| **Method** | Read-only inspection of the actual source (engine, app, backend, web, tests, docs) + the five frozen governing documents. No code modified. |
| **Authority** | Subordinate to the governing set. Where this document and a governing document differ on *what should be*, the governing document is the target; this document only records *what is*. |
| **Scope** | The whole repository: `packages/engine`, `apps/mobile`, `apps/web`, `supabase`, tests, tooling, docs. |

---

## 1. Executive Summary

**What this is.** *Performance OS* (repo `hybrid-react`) is a personalised, evidence-based **gym-plan generator** shipping today as a React + Vite PWA (`apps/mobile`) backed by Supabase, with an extracted pure decision engine (`packages/engine`, `@performance-os/engine`) and a reserved Next.js coach/marketing site (`apps/web`). It takes a short onboarding questionnaire and produces a multi-week, periodised strength programme tuned to the athlete's own goal (get stronger / build muscle / functional / strength-support for an endurance sport), tracks sessions and recovery, ingests wearable data (Google Health + Strava), and adapts the current week to reality.

**The engine is genuinely sophisticated and, in software terms, well-built.** The pure `generatePlan(profile)` pipeline is deterministic, golden-master-protected, exhaustively unit-tested (84 test files), evidence-annotated (RP/Israetel, Schoenfeld, Issurin, Bosquet, Mujika, StrengthLevel), and already implements several hard things well: a weekly MRV ceiling, real event tapers, adaptive fatigue-driven deloads, ACWR that is *explicitly demoted* per its own contested evidence, freeze-on-commit, sport-around-gym scheduling, honest durations, and a data-driven injury subsystem. The offline-first sync layer is solid and the security posture (RLS, secrets) is strong for a solo build.

**But the platform's own governing set — authored to v1.0 the same day as this baseline — was written as the deliberate *correction* of this engine's central shape.** The Constitution's Articles 4, 5, and 6 use the current engine as their literal "Violated" examples. The engine's atomic unit is *"allocate N sets to muscle M"* (a procedural volume fill), not an inspectable coaching *decision*; it organises around **muscles**, not **qualities/adaptations**; and it is **volume-first** (compute a per-muscle target, then fill it) rather than **adaptation-first** (choose the adaptation, derive the dose, validate the volume as a ceiling). It cannot say *why* in the way Article 14 requires, has no separable validator suite (Article 19), no limiting-factor diagnosis (Article 5), and no learning loop beyond lift autoregulation (Articles 12/16).

**The gap is therefore not quality — it is orientation.** The current system is an excellent *volume-driven bodybuilding-science planner with sport bias*; the target is a *decision-graph coaching engine that reasons in qualities, diagnoses limiters, chooses adaptations, and validates dose*. Much of what exists is directly reusable material for that target (the exercise catalogue, the injury subsystem, the pure-engine boundary, the evidence KB, the reflow/freeze machinery, the golden-master harness); the reasoning *spine* is what changes.

**Headline findings:**
- **Architecture direction is already correct in two respects the TAS prizes:** the engine is a pure, deterministic, extracted library (Article 18 / TAS L1), and plans are derived-from-profile projections, not stored truth. These are real assets to preserve.
- **Coaching decisions leak out of the engine** into the app: readiness/load/deload and the reflow are computed in `apps/mobile` (the view store + `PlanService`), not the pure library (TAS T18/T7).
- **Knowledge partly leaks into code:** the injury subsystem and the evidence KB are exemplary (data + provenance), but sport emphasis lives as code vectors that *duplicate* a richly-authored but **~95%-dormant** Sport Knowledge Base (SKB), and many coaching numbers are code literals (TAS T15/T16).
- **The Sport Knowledge Base is the largest latent asset and the largest inconsistency:** ~8,800 lines of authored sport JSON (running profiles alone ~7,000), of which the engine consumes essentially one section (`decisionRules`, for reflow) — and two of ten sports are empty stubs.
- **The Team package does not exist below the type layer:** no `teams`/`team_members` tables, no coach RLS, no derived-signal roll-up; the coach dashboard is a high-fidelity mock that *re-derives* engine logic in TypeScript (TAS T8/T19/T20). The privacy split (Article 11) is designed in the web app's types but not enforced anywhere in the backend.
- **Testing protects the engine's decisions well but nothing else:** `npm test` is broken (points at a deleted file), **no CI runs any tests**, and there are zero UI/sync/RLS tests.
- **Documentation drift** exists (a referenced `exerciseDemos.js` that does not exist; a stale README calling the engine an empty placeholder; SCHEMA.md describing an invite allowlist that was removed and "5 phases" the engine never produces).

Sprint 2 can treat the TAS's own migration sequence (§17) as the spine: **make the engine boundary real (pull derived signals in), unify the reflow, extract knowledge as a versioned package, then enforce contracts** — the four steps that ship value before the diagnosis-first reasoning rebuild.

---

## 2. Current System Overview

**Product.** A dynamic gym-plan generator for a busy person who wants to trust they are training optimally for their own goal and available time. Two intended packages: **Individual** (built — one person onboards and gets a tailored plan) and **Team** (near-term priority, *not built* — coach web dashboard + player mobile, coach schedule as constraints, privacy-preserving team loading view).

**Scope today (important).** The engine is **GYM-ONLY**. Selecting a sport *biases the gym programme* (per-muscle emphasis, priority lifts, periodisation season, systemic pullback); it does **not** generate run/cycle/swim sessions — the athlete does their own sport training, which wearables track. Real endurance programming is a deferred future stage.

**Runtime shape.**
- **`packages/engine` (`@performance-os/engine`)** — the pure, deterministic decision engine: `generatePlan(profile)` + the recommendation/knowledge modules. No I/O.
- **`apps/mobile`** — React 18 + Vite PWA (React Router 6, Zustand), the Individual + player surface. Wraps the engine via `PlanService` and runs the adaptive runtime reflow; offline-first sync to Supabase.
- **`apps/web`** — Next.js 14; a live config-driven marketing site + a mock coach dashboard (Team package, not wired to real data).
- **`supabase/`** — Postgres + Auth (12 base tables + migrations), RLS, and edge functions for Strava/Google-Health OAuth + sync.
- **`packages/shared`** — reserved, empty.
- **`docs/`** — the frozen governing set + running docs (CLAUDE.md, HANDOFF.md) + strategy/product/security.

**Deployment.** GitHub Pages via GitHub Actions on push to `main` (base path `/hybrid-react/`); the deploy job builds only — **no tests run in CI**.

**Data flow in one line.** Screens → `trainingStore` (Zustand, `buildView`) → `SyncService` → Supabase (primary) ↘ `Database.js`/localStorage (offline-first cache). Plan *content* comes from `PlanService` (engine + reflow); the store holds session *state*.

---

## 3. Repository Structure

Tracked files by area: `apps/` 307 · `packages/` 84 · `docs/` 71 · `supabase/` 24.

```
hybrid-react/
├── packages/
│   ├── engine/                      # @performance-os/engine — the PURE decision engine
│   │   ├── index.js                 # public barrel (generatePlan + recommendation fns)
│   │   ├── src/lib/
│   │   │   ├── PlanGenerator.js      # generatePlan(profile) orchestrator
│   │   │   ├── strength/             # program, targets, stimulus, exerciseLoad, priorityIntents, sportLoad
│   │   │   ├── plan/                 # allocator(860), scheduler, split, periodization, volume, axial, despine,
│   │   │   │                         #   constraints, contributions, rollingVolume, substitutions, primers, frequency, trainingLoad
│   │   │   ├── indices/              # 11 physiological index calculators (readiness integrator + sub-indices)
│   │   │   ├── injury/               # index, injuryFilter, injuryRules, profiles(14 regions), symptomAssessment, _schema
│   │   │   ├── sports/               # 6 LIVE sport modules (run/cycle/swim/rugby/soccer/gaa) + registry + _schema
│   │   │   ├── sportKnowledge/       # SKB accessor + schema + decision-rule interpreter (reflowAdjust, rules)
│   │   │   ├── knowledge/            # evidence KB (kb, entries, schema)
│   │   │   ├── recovery/ load/       # RecoveryOutput / LoadOutput contracts
│   │   │   ├── Readiness.js Utils.js baseline.js liftProgression.js
│   │   └── src/data/                 # strengthExercises(~118), muscleVolume, exerciseSimilarity, primers,
│   │       └── sport-knowledge/      #   injuryTaxonomy, rehabExercises + 10 SKB JSON profiles (~8,800 lines)
│   └── shared/                       # RESERVED, empty (.gitkeep dirs)
├── apps/
│   ├── mobile/                       # the app today (PWA)
│   │   ├── src/screens/ (~26)        # Home, Plan, PhaseDetail, WeekDetail, SessionDetail, SessionRunner,
│   │   │                             #   TrainNow, Onboarding, BlockCheckin, Injuries, Coach(placeholder),
│   │   │                             #   Health, Trends, TrainingLoad, Wearables, Integrations, Atlas,
│   │   │                             #   Profile, Settings, DevPlayground, auth/*
│   │   ├── src/components/           # shell (TopBar/TabBar/ScreenContainer) + OnboardingWizard, RestTimer,
│   │   │                             #   SubstituteSheet, ExerciseInfo, DailyCheckin, WeekSchedule + ui/*
│   │   ├── src/lib/                  # Database(813), SyncService(798), PlanService(806, the reflow),
│   │   │                             #   Storage, supabaseClient, sessionOverrides, onboardingModel,
│   │   │                             #   validation/*, verdicts, coachNote, fitnessAge, atlas/*
│   │   ├── src/stores/               # trainingStore(543), authStore(277)
│   │   ├── src/data/                 # exerciseLibrary(form guide), strengthStandards, activityTypes, athletePillars, sports, providers
│   │   ├── tests/ (84 files)         # plain-node assert scripts + golden-master snapshot
│   │   ├── scripts/                  # engine-quality tooling (random-sessions, review-samples, rate-batch)
│   │   └── vite.config.js index.html # base /hybrid-react/, VitePWA, build-only CSP
│   └── web/                          # RESERVED Next.js — marketing (live) + coach dashboard (mock)
├── supabase/                         # schema.sql, migrations/ (001–013 + 2), functions/ (strava/fitbit/enrich), config
└── docs/
    ├── foundation/                   # FROZEN: CONSTITUTION, DECISION-ONTOLOGY, KNOWLEDGE-ARCHITECTURE, PANEL-REVIEW
    ├── architecture/                 # FROZEN: TAS.md  +  (this) BASELINE-ARCHITECTURE-ASSESSMENT.md
    ├── engine/                       # FROZEN: 00-EDS + 01-05 (panel, roadmap, SKB, physiology, index specs)
    ├── product/ strategy/ setup/     # TEAM-ARCHITECTURE, VISION, sign-in-with-apple
    ├── superpowers/                  # per-feature plans + design specs (history of how it was built)
    └── SCHEMA.md SECURITY-AUDIT.md decision-engine-evaluation.md
```

**Purpose of each top-level area:** `packages/engine` = the reasoning core (pure); `apps/mobile` = the athlete surface + runtime/persistence; `apps/web` = the future coach/marketing surface; `supabase` = shared backend; `docs` = governance (frozen) + running status + history.

---

## 4. Module Catalogue

Fuller per-module inventories live in the Sprint-1 working notes (`scratchpad/baseline/01–10`). Summary by layer, with **status** and **confidence**.

### 4.1 Pure engine — plan generation (`packages/engine/src/lib/plan/`, `strength/`)
| Module | LoC | Purpose | Status | Conf. |
|---|---:|---|---|---|
| `PlanGenerator.js` | 199 | `generatePlan(profile)` orchestrator: periodization → per-week build → schedule → despine | live, core | H |
| `strength/program.js` | 70 | goal → style, emphasis vector, volume scalar, exercise-priority | live, core | H |
| `strength/targets.js` | 109 | MEV→MAV weekly per-muscle set target + ramp (the volume brain) | live, core | H |
| `plan/allocator.js` | 860 | greedy target→ledger→fill: selection scoring, MRV ceiling, supersets, rep/RPE scheme, titles, durations | live, **the heart** | H |
| `plan/periodization.js` | 182 | BUILD periodization profiles + `deriveSeason` + `continueBlock` | live, core | H |
| `plan/split.js` | 159 | training split templates (1–7 days) + emphasis-weighted sport splits | live, core | H |
| `plan/scheduler.js` | 195 | weekday placement via permutation search minimising interference | live (carries inert endurance branch) | H |
| `plan/volume.js` | 113 | measuring stick: count + grade weekly volume vs landmarks (read-only) | live, validation-ish | H |
| `plan/{contributions,stimulus,axial,constraints,frequency}` | ~200 | muscle-contribution, stimulus credit, spinal-load budget, sport-day constraints, frequency default | live | H |
| `plan/{despine,rollingVolume,substitutions,primers}` | ~390 | refinement passes + reflow helpers + session-only swaps + activation primer | live | H |
| `liftProgression.js` `strength/exerciseLoad.js` | 287 | e1RM autoregulation + accessory→anchor coefficient weights | live | H |

### 4.2 Pure engine — reactive / recommendation
| Module | Purpose | Status | Conf. |
|---|---|---|---|
| `Readiness.js` | daily readiness from wearable/manual; estimate path when no vendor score | live | H |
| `recovery/recovery.js` | RecoveryOutput (objective+subjective blend or v2 index value) | live | H |
| `load/load.js` + `plan/trainingLoad.js` | ACWR (Edwards TRIMP → EWMA → ratio), **explicitly demoted**; deload recommendation | live | H |
| `indices/*` (11) | uniform `{value,confidence,band,contributors,missingInputs}`; `readinessIndex` integrates 7 sub-indices | live (v2 default) | H |
| `knowledge/*` (kb, entries) | evidence KB with provenance/confidence; consumed by trainingLoad + indices + landmarks | live | H |

### 4.3 Pure engine — knowledge subsystems
| Module | Purpose | Status | Conf. |
|---|---|---|---|
| `injury/*` + `data/{injuryTaxonomy,rehabExercises}` | 14 body regions, phase-staged contraindications (RegExp), red-flag triage, rehab/prevention | **live, exemplary** | H |
| `sports/*` (6 modules) | emphasis vectors + priority lists + season blocks that actually bias the plan | live | H |
| `sportKnowledge/*` + `data/sport-knowledge/*.json` (10) | richly-authored SKB; only `decisionRules` consumed (reflow) | **~95% dormant** | H |
| `data/strengthExercises.js` (~118) | the single programming exercise catalogue | live, strong asset | H |
| `data/muscleVolume.js` | 10 muscle groups, pattern-contrib, landmarks (from kb) | live | H |
| `data/exerciseSimilarity.js` | a SECOND muscle model, for substitutions only | live (duplication) | H |

### 4.4 App runtime (`apps/mobile/src/lib`, `stores`)
| Module | LoC | Purpose | Status | Conf. |
|---|---:|---|---|---|
| `PlanService.js` | 806 | the runtime **reflow** wrapper + calendar + Train-Now (the L3 orchestrator today) | live | H |
| `trainingStore.js` | 543 | Zustand store; `buildView()` computes load/readiness/index and calls `setRuntime` | live | H |
| `SyncService.js` | 798 | online-first write path to Supabase; offline fallback; wearable OAuth/sync | live | H |
| `Database.js` | 813 | synchronous localStorage tables + services ("do not rewrite") | live | M (not fully read) |
| `onboardingModel.js` | 202 | answers → engine profile transform | live | H |
| `Storage`, `supabaseClient`, `sessionOverrides`, `validation/*`, `verdicts`, `coachNote`, `fitnessAge`, `atlas/*`, `authStore` | — | cache namespacing, client, freeze snapshots, write-gating validation, plain-language derivations, auth | live | M–H |

### 4.5 Surfaces
- **`apps/mobile/src/screens` (~26)** — mostly REAL features (Home, Plan/Phase/Week/Session detail, SessionRunner, TrainNow, Injuries+triage, Health cluster, Trends, TrainingLoad, Wearables, Atlas, Profile, Settings, Integrations, Onboarding, BlockCheckin, full auth). **Placeholders:** `Coach` (pure "coming soon", orphaned route), the ExerciseInfo form-video slot, the Garmin integration card. **Dev:** `DevPlayground` (`/dev`) + `?preview=1` seeding. `TrainingCalendar.jsx` appears unused.
- **`apps/web`** — marketing REAL (config-driven); coach dashboard = high-fidelity **mock** (`data/mock*`, pinned clock); leads/analytics/auth are stubs; **no Supabase, no engine import**; readiness/ACWR/verdict logic **hand-ported to TypeScript** (`lib/derive.ts`, `statusLogic.ts`).

### 4.6 Backend (`supabase/`)
- 12 base tables + migrations (wearable_connections, workouts, set_logs, avatars); uniform RLS `auth.uid() = user_id`; soft-delete; `security definer` RPCs (`delete_user`, `set_device_primary`); DB CHECK constraints (010). Edge functions: Strava/Google-Health OAuth + sync + enrich (secrets server-side).

### 4.7 Modules whose purpose is unclear / to verify
- `Database.js` internals (reclaim/id logic) — not fully read.
- `TrainingCalendar.jsx` — likely dead (superseded by `WeekSchedule`).
- Migrations 005/006/008/011/013 — inferred from names + usage, not individually read.

---

## 5. Decision Catalogue

The engine makes many coaching decisions; **all are procedural computations, none is an inspectable "decision object" with rationale + confidence** (the Article 4 gap). Each is listed with its inputs, logic (with real numbers), and character.

| # | Decision | Inputs | Logic (key numbers) | Basis | Explainability |
|---|---|---|---|---|---|
| D-a | **Goal → style** | goal_type, sport, strength_style, focus | one enum: `strength\|bodybuilding\|functional\|sport` (fallbacks) drives everything downstream | heuristic map | implicit |
| D-b | **Per-muscle emphasis** | style / sport | bodybuilding: delts/arms ×1.1; functional: core ×1.2; sport: module vector (e.g. run calves ×1.30) | coaching prior / sport module | implicit |
| D-c | **Volume scalar** | sport, season, days, goal | `sportLoadScalar` = season×goal×dayFactor×systemic, clamped [0.5,1.0]; build = 1.0 | cited design spec | good (documented) |
| D-d | **Weekly per-muscle set target (MEV→MAV ramp)** | style, level, deload, emphasis, scalar, blockFrac | `STYLE_TOP` strength .6/functional 1.0/bodybuilding 1.4/sport .6; `LEVEL_START` 0–.6; deload→MEV×scalar; ×emphasis×scalar | **RP/Israetel (cited)** | ledger only |
| D-e | **Periodization block/phase/deload** | goal, style, sport, season, event | hypertrophy 6wk / strength 12wk / functional 8wk; sport blocks per season; deload weeks fixed | cited literature | good |
| D-f | **Split selection** | days, style, emphasis | 1→full … 4→U/L/U/L … 6→PPL×2; sport = emphasis-weighted region days | standard coaching | transparent |
| D-g | **Frequency default** | profile | `round(repr weekly sets / 32)`, clamp [2,7] | calibrated heuristic (magic 32) | none |
| D-h | **Exercise selection & ordering** | slot, targets, deficit, equipment, level | greedy score = Σ min(effVol,room)×(0.6+0.9·urgency) × multipliers (priority ×1.35, on-quality ×1.15/off ×0.7, stretch ×1.12, variety, focus) − 0.1·waste | mixed evidence + tuned multipliers | **internal only** |
| D-i | **Set counts** | role, scheme | power 4×4; primary=scheme.main; core 3; iso=style | scheme tables | visible |
| D-j | **Rep/RPE scheme** | style×intent, deload/taper, sex, equipment | big table (e.g. strength base 4×5@7 → peak 4×3@8–9); **taper cuts volume, keeps RPE** (cited); no-barbell strength → 4×8; female +2 acc reps | periodised + cited taper | visible / rationale not |
| D-k | **Rest** | role, CNS tier | 180/120 primary; 60 iso/core; 150/90 CNS accessory; superset-B 20s | CNS heuristic | drives UI timer |
| D-l | **Supersets / structure** | picks | straight-set anchors+primaries+high-CNS; pair low-CNS antagonists; sequence power→primary→acc→core→health | training convention | structural |
| D-m | **Session title** | realised volume | region label read from delivered volume + Explosive/Power tag (sport/functional) | honest derivation | good |
| D-n | **Session duration** | realised work | `~round(timeUsed/5)×5` from sets×per-set-min (supersets compressed) | honest estimate | good |
| D-o | **Weekly MRV ceiling** | delivered volume | reject a pick if any muscle (incl. synergist × stimulus factor) > MRV; per-slot cap ~half | MRV science | backstop |
| D-p | **Stimulus credit** | loadClass × level | loaded 1.0; bodyweightStrength 1.0→0.2; isoCore 0.5→0.15; health 0 | coaching model | coherent |
| D-q | **Suggested weights** | 5 tracked e1RMs | weight = anchorE1RM × coefficient(StrengthLevel) × %1RM(reps,RIR); RPE autoregulates e1RM ~2%/RPE | strongly cited | good |
| D-r | **Axial management** | axial budgets | session cap 4; high-day ≥3 spaced apart; despine adjacent heavy days | spinal heuristic | structural |
| D-s | **Scheduling / interference** | sessions, sport days | permutation search minimising muscle-overlap + sport-proximity + axial penalties | Hickson interference | structural |
| **Reactive (runtime, in `apps/mobile`)** |
| D-t | **Readiness** | wearable/subjective | estimate = mean(sleep/480, HRV vs baseline, RHR vs baseline); bands ≥70/≥50 | reasonable heuristic | banner copy |
| D-u | **ACWR / load** | session TRIMP | EWMA 7/28; ratio; **demoted** (floor 0.85; never solo-forces deload) | cited (Impellizzeri/Lolli) | verdict |
| D-v | **Adaptive deload** | load, readiness, recovery, illness | force if illness OR (readiness<50 & recovery≤2) OR (loadDeload & corroborated); defer if fresh (≥70, recovery≥4) | evidence-weighted | banner + reason |
| D-w | **Current-week reflow** | actuals, readiness, load | rolling 10-day window: spread missed volume across pending slots (capped, MRV-rate ceiling, forgive overflow); scale minutes by combined multiplier | ledger model | forgiven surfaced |
| D-x | **Freeze-on-commit** | start action | pin the adapted session as a local override so Start never changes it | Article 10 aligned | — |
| D-y | **Injury filtering** | active/history injuries | block contraindicated (RegExp on name); severity≥4 & >70% blocked → full rehab session; else substitute + rehab + banner; prevention for recovered | data-driven, cited | banner |
| D-z | **SKB decision rules** | sport, season, ACWR, readiness, competition | fire `decisionRules` → volume multiplier / force-deload (many effects reserved no-ops) | authored rules | rule ids surfaced |

**Character of the decision layer.** Selection, dose, scheme, and scheduling are **procedural** — rich internal signals (deficits, urgency, scores, grades, forgiven volume) are computed but almost none is surfaced as user-facing rationale, and none is a replaceable "decision" with a contract. Volume **drives** planning; `volume.js` only **validates** after the fact (never as a gate). Diagnosis of limiting factors and explicit adaptation targets **do not exist**.

---

## 6. Knowledge Catalogue

Where coaching knowledge lives, and in what form.

| Knowledge | Form | Location | Consumers | Status |
|---|---|---|---|---|
| Exercise catalogue (~118) | JS objects (code) | `engine/data/strengthExercises.js` | allocator, volume, substitutions, loads | **live, single source, strong** |
| Muscle-volume landmarks (MEV/MAV/MRV) | **data via kb** | `engine/data/muscleVolume.js` ← `kb.value('volume.landmarks')` | targets, allocator ceiling, volume | live, provenance-backed |
| Pattern → muscle contribution (fractional sets) | code table | `engine/data/muscleVolume.js` (`PATTERN_CONTRIB`) | contributions, volume | live |
| Second muscle model (primary/secondary) | code table | `engine/data/exerciseSimilarity.js` | substitutions only | live — **duplicate** of the above |
| Evidence KB (thresholds, source reliability, landmarks) | data + provenance | `engine/lib/knowledge/entries.js` | trainingLoad (ACWR), indices, landmarks | **live, exemplary** |
| Injury profiles (14 regions, contraindications, prevention) | data (RegExp + dosing + evidenceId) | `engine/lib/injury/profiles.js` + `data/{injuryTaxonomy,rehabExercises}` | injuryFilter/Rules | **live, exemplary** (Constitution's cited model) |
| Sport bias (emphasis, priority, season blocks, systemic) | **code** modules | `engine/lib/sports/*` (6) | resolveProgram/Periodization | live — **duplicates the SKB** |
| Sport Knowledge Base (24 sections × 10 sports) | JSON | `engine/data/sport-knowledge/*.json` (~8,800 lines) | only `decisionRules` (reflow) | **~95% dormant**; rugby/soccer are stubs |
| Rep/RPE schemes, STYLE_TOP, level ramps, CNS/axial tiers, scoring multipliers, `SWEET_SPOT_SETS=32`, rest values | **code literals** | allocator, targets, scheme, axial | engine | live — **knowledge-in-code (T16)** |
| Strength standards (1RM/BW) | two code tables | `engine/liftProgression.js` (estimate) + `apps/mobile/data/strengthStandards.js` (display bands) | weights / progress scale | live — **duplicated science** |
| Exercise form guidance (~40) | code + regex aliases | `apps/mobile/data/exerciseLibrary.js` | ExerciseInfo (ⓘ) | live — **coverage gap** vs 118; name-coupled |
| Activity-column registry (strength/swim/run/cycle) | code | `apps/mobile/data/activityTypes.js` | session table | live (swim/run/cycle reserved) |
| Athlete pillars / fitness age / goals | code helpers | `apps/mobile/{data/athletePillars,lib/{fitnessAge,goals,atlas/*}}` | Atlas/Health | live, display |

**Duplication / leakage map (for Sprint 2):** (1) sport emphasis in `lib/sports/*` **vs** the SKB JSON — two representations of the same sports that do not even share IDs (`gaa` vs `gaelic_football`+`hurling`; `triathlon` in SKB but no module); (2) two muscle models in the engine; (3) two strength-standard tables; (4) coaching numbers as code literals throughout the allocator/scheme/targets; (5) the coach web app re-implements readiness/ACWR/verdicts in TS (cross-surface duplication). **Missing knowledge:** a quality/adaptation taxonomy, a limiting-factor/diagnosis model, movement→quality mappings, and the exercise-level tags the SKB `decisionRules` need (soreness region, high-speed) — hence their reserved no-ops.

---

## 7. Data Flow

```
ONBOARDING
  OnboardingWizard → onboardingModel.answersToProfilePatch   [T1: answers → engine profile;
                     (goal fork; 5 lifts barbell-gated; equipment; plan_weeks via resolvePeriodization)]
        → store.updateProfile → validateProfile (gate) → SyncService.updateProfile
        → Supabase users.profile (JSONB) + Database (localStorage)

PLAN (read)
  Screen → PlanService.getPhases()
        → generated(): generatePlan(profile)      [pure, memoised on profileSignature]  ← TRANSFORM 2
        → adaptedPhases(): reflow current week (rolling 10-day window, pending only)     ← TRANSFORM 3
        → injuryFilteredPhases(): applyInjuryRules + applyPrevention                     ← TRANSFORM 4
        → decoratePhases(): buildPrimer per gym session                                  ← TRANSFORM 5

LIVE STATE → ADAPTATION
  trainingStore.buildView() reads Database →
        dailyLoads → ACWR → assessLoad (loadOut);
        computeReadiness + readinessIndex(...) → recoveryOut (v2 default drives the plan);
        setRuntime({sessions, recovery, load})  → PlanService reflow reads it

WRITE (offline-first)
  Screen → store.completeSession(ref,payload) → validateSessionLog (gate)
        → Sync.completeSession: Database write (SYNCHRONOUS, instant) THEN Supabase upsert
        → set(buildView())  (instant re-render; cloud runs in background; errors logged not surfaced)

WEARABLES
  Google Health / Strava OAuth (edge fns) → daily_metrics / workouts → autoLink + enrich → load/readiness
```

**Transformations & duplications highlighted:**
- **T1 (answers→profile)** re-derives season/discipline/level mappings that `resolveProgram`/`deriveSeason` also compute; `resolvePeriodization` is invoked **twice** (onboarding stores `plan_weeks`; `generatePlan` re-derives length).
- **`gymCtx` in PlanService** re-assembles the program context rather than reusing `generatePlan`'s — the generator/reflow duplicated-logic risk (TAS T10) made concrete.
- **Validation bounds** exist in `validation/rules.js` **and** DB CHECK constraints (010) — deliberate defence-in-depth, but two copies.
- **Hidden assumption:** session state is **position-keyed** (`p{phase}_wk{week}_s{idx}`); structural plan changes rely entirely on the **epoch guard** (`withinEpoch`) to avoid mis-mapping — mid-plan structural change isn't truly supported (`clearPlan` resets).
- **Reads bypass Sync by design** (`buildView` reads Database directly for instant render); **no write bypasses SyncService** (verified). Settings reads `Database.tables.*` directly for counts/export (read-only, not a rule violation).
- **Derived coaching signals are computed in the app** (`buildView`), not the engine — the central TAS T18 leak.

---

## 8. Current Architecture Diagrams

**As-built layering (contrast with the TAS six-layer target):**
```
  ┌ SURFACES ───────────────────────────────────────────────────────────────┐
  │ apps/mobile screens (React) ....................... apps/web (mock coach) │
  │   consume plan via PlanService; store via Zustand    re-derives in TS ←T8 │
  └───────────────┬──────────────────────────────────────────────────────────┘
                  │
  ┌ RUNTIME / ORCHESTRATION + DECISION LEAKAGE (apps/mobile/src/lib, stores) ─┐
  │ trainingStore.buildView()  → computes readiness/load/index  ←T18 leak      │
  │ PlanService.js  → reflow + freeze + calendar + TrainNow (mutable _runtime) │
  │ SyncService.js  → online-first writes     Database.js → localStorage cache │
  └───────────────┬──────────────────────────────────────────────────────────┘
                  │ imports @performance-os/engine/*
  ┌ PURE ENGINE (packages/engine) ────────────────────────────────────────────┐
  │ generatePlan: program → periodization → targets → allocator → scheduler    │
  │              → despine    (+ recovery/load/indices/injury/sport/knowledge)  │
  │ PURE + DETERMINISTIC + golden-master-protected  ✅ (Article 18 aligned)     │
  │ BUT knowledge partly in code (sports/*, scheme tables, multipliers) ←T15/16 │
  └───────────────┬──────────────────────────────────────────────────────────┘
                  │
  ┌ BACKEND (supabase) ───────────────────────────────────────────────────────┐
  │ Postgres 12 tables (plans/phases/weeks VESTIGIAL) · RLS auth.uid()=user_id  │
  │ edge functions (OAuth + sync) · NO teams/coach model (Team package absent)  │
  └────────────────────────────────────────────────────────────────────────────┘
```

**generatePlan pipeline:**
```
profile
 └─ resolveProgram ──▶ {style, emphasis, volumeScalar, exercisePriority, priorityByIntent}
 └─ deriveConstraints ─▶ {busyDays, sportMuscles}
 └─ resolvePeriodization ▶ {totalWeeks, split[], deloads[]}   (+ event-taper detection)
 └─ for each week:
      weeklyMuscleTargets ─▶ per-muscle set target (MEV→MAV ramp)
        └─ resolveSplit ─▶ per-day focus+anchors+weights
             └─ allocateGym ─▶ greedy fill (score, MRV ceiling, supersets, scheme, titles, durations)
      chooseDays ─▶ weekdays (around sport days)
      scheduleWeek ─▶ interference-minimising placement
      despineWeek ─▶ spine-recovery swaps
 └─ {phases:[{weeks:[{sessions}]}], totalWeeks}
```

**Runtime reflow (PlanService):** baseline plan (immutable) + `_runtime{sessions,recovery,load}` → recompute pending gym slots in a 10-day window → injury filter → primer decoration. Freeze-on-start pins the shown session.

---

## 9. Alignment Against the Constitution

Rated: **Aligned · Partial · Conflict · Missing**, with the governing Article.

| Article | Verdict | Evidence |
|---|---|---|
| **A1** performance is the objective; bank don't pad | **Partial** | banks time + honest durations (holds); but volume-target fill + finisher lean toward "fill" (the exact failure A1 warns of) |
| **A2** gym serves the sport (demand before construction) | **Partial→Conflict** | sport bias is *proactive* (sportLoadScalar + emphasis + around-sport scheduling) — better than a cosmetic post-multiplier, but still an **emphasis multiplier applied to a muscle-volume plan**, not a structured demand model consumed before construction |
| **A3** goal belongs to the athlete; sport-agnostic core | **Partial** | goals/sports are registry-resolved (good), no goal hard-coded in the pipeline; **but** the volume model is an RP-hypertrophy chassis (`STYLE_TOP` caps), i.e. hypertrophy science generalised to all goals |
| **A4** the atomic unit is the coaching DECISION | **Conflict** (central) | the engine represents "allocate N sets to muscle M" procedurally; no decision objects, no per-decision rationale/confidence, nothing inspectable to override at a boundary — A4's literal "Violated" example |
| **A5** diagnosis before prescription; qualities not muscles | **Conflict** | no limiting-factor diagnosis; organised around `MUSCLE_GROUPS`; "priority" is a hard-coded emphasis multiplier — A5's literal "Violated" example |
| **A6** adaptation before dose; volume is a guardrail | **Conflict** | pipeline is volume-first (`weeklyMuscleTargets` then `allocateGym` fills) — A6's literal "Violated" example; volume validated only as a passive read |
| **A7** minimum-effective, sufficient, progressed, never padded | **Partial** | MRV ceiling + honest stop (holds); progression via e1RM autoreg (holds); the supportive finisher rounds short sessions (mild tension, though factor-0/non-fatiguing) |
| **A8** safety/availability override optimisation | **Aligned** | injury contraindications shape sessions; competency gating (`minLevelForPrimary`, level gates); constraints-before-content for sport days |
| **A9** recoverability ceiling; no fatigue without reason | **Partial** | real MRV ceiling + ACWR + sport pullback; but not a single gym+sport+life recoverable budget; volume-to-hit-a-target sits in tension with "no fatigue without an adaptation reason" |
| **A10** human is final authority; freeze-on-commit | **Aligned** | overrides + freeze-on-start; reflow touches only pending work |
| **A11** raw-vitals privacy inviolable | **Partial** | individual RLS is owner-only (holds); the cross-person derived-only rule is **designed in apps/web types but unenforced** (no teams, no privacy validator) |
| **A12** science informs; response validates (hypotheses) | **Partial** | plans regenerate from state (holds); but the "did it work?" validation loop is essentially absent (only lift autoreg) |
| **A13** confidence governs authority (3 tiers) | **Partial** | the ACWR demotion is implemented in code (the exemplar), kb carries confidence, indices compose confidence; **but** the plan pipeline decisions don't compute/compose confidence |
| **A14** every recommendation explainable | **Conflict** | rich internals, little surfaced rationale; no decision-trace explanation (blocked by A4) |
| **A15** no silent truncation/debt | **Aligned-ish** | `forgiven` volume surfaced, honest durations, deload reasons, injury banners, coverage-honest scope note; a real implemented value |
| **A16** become personal; learn don't assume | **Partial** | 3-tier priors partially (lift estimate→entered→logged; e1RM autoreg); no learned recovery/response |
| **A17** knowledge separate from reasoning | **Partial→Conflict** | injury + evidence KB are exemplary; **but** sport emphasis in code duplicating the SKB (A17's literal "Violated" example), and coaching numbers as code literals |
| **A18** pure deterministic core; priors + bounded substitution | **Aligned** | `generatePlan` pure + deterministic + golden-master; plans derived not stored; PlanService is the runtime boundary (learning-via-priors & AI seam not built) |
| **A19** validation is a separable safety layer | **Conflict** | no validator suite; the MRV "ceiling" lives **inside** the allocator's selection loop; injury filtering is post-hoc strip-and-patch (the anti-pattern A19 warns of) |
| **A20** simplicity earns its place | **Partial** | much pragmatic value shipped; but the SKB is built far ahead of use (~95% dormant) and the allocator carries many tuned magic numbers |

**Conflict order:** honoured pragmatically (safety/injury gate; sport-around-gym scheduling; MRV over target; freeze-on-commit) but not as an explicit compiled decision procedure.

---

## 10. Alignment Against the EDS

The EDS (engine spec) defines the D1–D16 decision graph the engine *should* run. Mapping current code to the target decisions:

| Target decision | Present today? | Where / gap |
|---|---|---|
| D1 Assess (athlete model) | **Partial** | scattered: `onboardingModel`, `resolveLifts`, `computeReadiness` — no unified assessment |
| D2 Demand (sport demand model) | **Partial** | `sports/*` emphasis + SKB (dormant); not a consumed demand model |
| D3 Position | **Missing** | no team/position modelling |
| **D4 Diagnose (limiting factors)** | **Missing** | the biggest EDS gap; "priority" replaces diagnosis |
| D5 Prioritise (qualities) | **Missing** | no quality taxonomy; priority = emphasis multiplier |
| D6 Strategy | **Partial** | `resolveProgram` style choice |
| D7 Block | **Aligned** | `resolvePeriodization` |
| D8 Week | **Aligned** | `weeklyMuscleTargets` + `resolveSplit` |
| D9 Session | **Aligned-ish** | split day + slot |
| D10 Movement-reqs | **Missing** | selection skips a movement-requirement step (goes straight to volume fill) |
| D11 Select (value-ordered + stopping) | **Partial** | `allocator.bestExercise` is value-ordered w/ a stop, but muscle-deficit-driven, not adaptation-value-driven |
| D12 Dose | **Aligned-ish** | scheme + set counts + weights |
| D13 Schedule | **Aligned** | `scheduler` |
| **D14 Validate (separable suite)** | **Missing** | no validator suite; checks embedded in construction |
| D15 Reflow (pure, pending only) | **Partial** | exists but lives in `apps/mobile` (`PlanService`) and duplicates generator math (EDS W2/T10), not a pure engine fn |
| D16 Learn (async priors) | **Missing** | only lift autoreg; no priors channel |

The EDS's named weaknesses are directly observable: **W1** engine coupled to storage/UI (reached via `PlanService` after a sync DB read), **W2** duplicated planning logic (generator vs reflow), **W3** device-local state (freezes/overrides in localStorage only), **W4** mutable module-level runtime (`_runtime` in `PlanService`), **A5** readiness/load computed in the view store, **A8** sport emphasis duplicates the SKB.

---

## 11. Alignment Against the Decision Ontology

The Ontology defines the canonical vocabulary/entities (Organisation ⊃ Team ⊃ Athlete/Coach; Decision; Override; Quality/Adaptation; Limiting Factor; Performance Outcome; Prior).

- **Present as data:** Athlete (profile), Session, Injury, Exercise, Sport, Week/Phase (as generated structures). Override exists as a runtime concept (`sessionOverrides`) but not as a first-class recorded/learned entity.
- **Missing entities:** Decision (the atomic unit), Quality/Adaptation, Limiting Factor, Performance Outcome, Prior, Organisation/Team/Coach. The engine's vocabulary is **muscles + volume + exercises**, not the Ontology's **qualities + adaptations + limiting factors + decisions**.
- **Naming drift:** app/engine use `run/cycle/swim/gaa`; the SKB uses `running/cycling/swimming/gaelic_football/hurling`; onboarding has its own sport list — three vocabularies for the same concept (the Ontology mandates one canonical vocabulary).

**Verdict: Partial.** The concrete, athlete-owned entities exist; the *reasoning-spine* entities (the ones that make it a coaching engine rather than a planner) are absent.

---

## 12. Alignment Against the Knowledge Architecture

The KA mandates the 8-kind taxonomy (Knowledge / Decision Logic / Inference / Calculation / Optimisation / Validation / Learning / Derived Data) and 12 knowledge domains, each as versioned data with schema + registry + validate-on-load + provenance.

| KA requirement | Verdict | Evidence |
|---|---|---|
| Knowledge is data, not code | **Partial** | injury + evidence KB + landmarks are data with provenance (exemplary); sport emphasis + scheme tables + scoring multipliers are code |
| One canonical home per fact | **Conflict** | sports/* vs SKB; two muscle models; two strength-standard tables |
| Registries the core consults by id | **Aligned (where used)** | injury registry, sport registry, kb, SKB accessor |
| Provenance (confidence/evidenceLevel/source/lastReviewed) | **Partial** | kb entries + injury `evidenceId` carry it; most engine numbers don't |
| Validate-on-load | **Aligned (where used)** | `_schema` validators for sports, injury, SKB, kb |
| 12 domains present | **Partial** | Sport, Exercise, Injury, Evidence, Recovery/Load, Programming, Constraint present in some form; **Quality&Adaptation, Movement, Validation, Learning, Athlete(rich) largely absent** |
| Knowledge separate from the engine package | **Not yet** | knowledge lives inside `packages/engine/src/data` + `lib/*`, not an independent `packages/knowledge` |

**Verdict: the KA is honoured best in the injury/evidence subsystems (which the Constitution itself cites as the model) and least in the plan pipeline.**

---

## 13. Alignment Against the TAS

The TAS is the technical blueprint. Its own risk register (T1–T23) names current-code gaps; its Appendix A maps target layers to today's modules.

| TAS layer / element | Today | Alignment |
|---|---|---|
| **L1 pure engine** | `packages/engine` (pure, deterministic, golden-master) | **Strong** on purity/determinism; **missing** the 6-call public API, the derived-signal fns (readiness/load), and a pure `reflow` |
| **L1 public API** (`plan/reflow/deriveReadiness/deriveLoad/validate/explain/rollUp`) | only `generatePlan` + scattered fns | **Missing** (T21) |
| **L2 knowledge** (versioned package) | `engine/src/data` + `lib/{knowledge,sports,sportKnowledge}` | **Partial**; not extracted/versioned; emphasis duplicates SKB (T15); numbers as literals (T16) |
| **L3 orchestration** (thin, no coaching logic, no mutable state) | `PlanService.js` with mutable `_runtime` + coaching logic (reflow math) | **Conflict** (T7/T23); computes coaching |
| Derived signals computed in engine | computed in `buildView` (view store) | **Conflict** (T18) |
| One reflow (pure D15) | reflow in app, duplicates generator | **Conflict** (T10) |
| **L4 Identity/Persistence/Wearable** | Supabase Auth, SyncService/Database, edge functions | **Aligned** as-is (wearable to be formalised as an ACL) |
| **L4 Membership & Access (teams)** | none | **Missing** (Team package unbuilt) |
| **L5 learning** | none (population defaults implicit) | **Missing** (seam reserved) |
| **L6 surfaces render only** | mobile computes coaching in `buildView`; web re-derives in TS | **Conflict** (T8/T14/T20) |
| Server roll-up across privacy boundary | client-side (would be) | **Missing/Conflict** (T19) |
| Provenance stamp (engineVersion × knowledgeSetVersion) | memoise-by-signature only | **Partial** (T3) |
| Contracts enforced at boundaries | none | **Missing** (T6) |

**Verdict:** the current stack **is** the TAS's Appendix-A starting point, and the TAS migration sequence (§17: engine boundary → one reflow → knowledge package → contracts) is directly actionable against it. The two biggest structural conflicts are **decision leakage into the app** (T7/T18) and **knowledge duplication/leakage** (T15/T16).

---

## 14. Scientific Strengths

- **Volume periodisation is real and cited:** MEV→MAV ramp with deload-to-MEV, a hard weekly **MRV ceiling** counting synergist + stimulus-weighted volume (RP/Israetel, Schoenfeld).
- **Periodisation models are literature-anchored per goal** (Israetel hypertrophy, Issurin strength blocks, Kraemer/Ratamess functional, Bompa/Haff/Rønnestad/Bosquet/Mujika for sport seasons).
- **Real event taper** that cuts volume while keeping intensity (Bosquet 2007; Travis & Mujika 2020) — distinct from a deload.
- **Evidence-aware reactive layer:** ACWR is *explicitly demoted* to a low-confidence corroborating signal with citations (Impellizzeri 2019/2020, Lolli) — a textbook application of "confidence governs authority"; subjective > objective recovery weighting (Saw 2016); personal-baseline normalisation instead of population absolutes.
- **Stimulus-weighted volume** (a bird-dog ≈ 0 for an advanced athlete; health work never counts) — a nuanced, coherent accounting model.
- **Sport-support detail** where authored: running sub-disciplines (sprint = Olympic lifts/plyos; long = tendon loading, no plyos) with citations (Blagrove, Berryman); systemic-fatigue pullback for high-impact sports.
- **Data-driven injury management:** phase-staged contraindications, red-flag triage that defers to professionals, cited prevention protocols — the Constitution's own exemplar of knowledge-as-data.
- **Strength standards / weight suggestions** grounded in StrengthLevel population ratios + Epley e1RM with RPE autoregulation.

---

## 15. Scientific Weaknesses

- **Volume-first, not adaptation-first** (Article 6 conflict): the primary planning currency is *sets per muscle per week*; the engine answers "how much of each muscle" before "what adaptation, and why."
- **Muscle-organised, not quality-organised** (Article 5): no maximal-strength / RFD / reactive-strength / aerobic-capacity taxonomy; two athletes needing categorically different training get the same session with different set counts.
- **No limiting-factor diagnosis:** "priority" is a hard-coded emphasis multiplier, not a diagnosed limiter with rationale.
- **Bodybuilding-science chassis generalised to all goals:** the RP hypertrophy ramp is the spine; strength/sport just cap the ramp lower — sport-transfer reasoning rides on top of a hypertrophy model rather than replacing it.
- **Sport as a multiplier, not a demand model:** emphasis vectors + a volume scalar, applied to a muscle-volume plan, rather than a structured demand profile consumed before construction.
- **Many tuned magic numbers without cited sources:** selection multipliers (×1.35, ×1.15, ×0.7, 0.6+0.9·urgency, overshoot 0.1), `SWEET_SPOT_SETS = 32`, rest tiers, STYLE_TOP values.
- **The athlete-response validation loop is essentially absent:** the platform does not check whether developing a priority actually moved performance (Article 12) beyond lift e1RM.
- **The richest authored sport science (the SKB) is unused** — the deepest coaching knowledge in the repo barely touches programming.

---

## 16. Software Strengths

- **A pure, deterministic, extracted engine** (`@performance-os/engine`) — the crown-jewel property the TAS prizes (Article 18), already achieved and golden-master-protected (19-archetype byte-identical snapshot).
- **Plans are derived-from-profile projections**, memoised on a profile signature — not stored truth (aligns with the "plan is a hypothesis regenerated from state" model).
- **Freeze-on-commit** and a clean immutable-baseline / runtime-projection split (Article 10).
- **Offline-first sync** done carefully: synchronous local write then background cloud upsert; UI can never be blocked by the network; soft-delete throughout; a one-time pre-auth migration.
- **Strong security core** (audit 71/100): uniform `auth.uid()=user_id` RLS, anon-key-only browser, service-role/OAuth secrets server-side, clean git history, DB CHECK constraints (post-audit), account deletion + data export.
- **Clean module boundaries within the engine** (registries for sports/injury/kb; no circular imports; shared axial/constraint helpers hoisted to prevent divergence).
- **Exhaustive engine unit tests** (84 files) + reproducible engine-quality tooling (`review-samples`, `rate-batch`) — decision coverage is genuinely strong.
- **A design-system discipline that holds** (real theme variables; the known-bad `--card-bg/--border/--accent-bg` appear nowhere).
- **Thorough, honest internal documentation** (module headers cite evidence + design specs; the security audit and decision-engine evaluation are candid).

---

## 17. Software Weaknesses

- **Coaching decisions leak into the app:** readiness/load/index/deload computed in `trainingStore.buildView`; the reflow (real coaching math) lives in `PlanService` with **mutable module-level state** (`_runtime`) — the exact TAS T7/T18/T23 anti-patterns.
- **Duplicated planning logic:** the generator and the reflow re-derive the same math with no parity test (T10); `gymCtx` reimplements program context.
- **Knowledge duplication:** sports/* vs SKB (divergent IDs), two muscle models, two strength-standard tables, coaching numbers as code literals.
- **No enforced decision contracts / no validator suite:** the graph is an implicit procedural pipeline; the MRV ceiling is inside the selection loop; injury handling is post-hoc strip-and-patch.
- **The 860-line allocator** concentrates most of the engine's complexity and most of its magic numbers in one module.
- **Testing gaps:** `npm test` is **broken** (points at a deleted `tests/data-layer.js`); **no CI runs tests**; zero UI/screen tests; SyncService/Supabase-sync and RLS untested — precisely the "silent failure" areas CLAUDE.md flags.
- **Cross-surface drift guaranteed:** the coach web app hand-ports readiness/ACWR/verdict logic to TypeScript.
- **`Database.js` is a large, synchronous, do-not-rewrite dependency** the whole app leans on.

---

## 18. Technical Debt

Rated by severity (🔴 high / 🟠 medium / 🟡 low) and migration complexity (S/M/L).

| Item | Type | Sev | Complexity | Notes |
|---|---|---|---|---|
| Derived signals + reflow computed in the app, mutable `_runtime` | decision leakage | 🔴 | L | TAS step 1–2; move into the engine as pure fns |
| Generator/reflow duplicated math, no parity test | duplicated logic | 🔴 | M | TAS step 2 (one reflow) |
| Sport emphasis (code) duplicates the SKB (JSON), divergent IDs | knowledge duplication | 🔴 | M | TAS step 3; derive emphasis from SKB |
| Coaching numbers as code literals (allocator/scheme/targets) | knowledge-in-code | 🟠 | M | TAS step 3 (T16) |
| No validator suite / contracts; MRV inside selection; injury strip-and-patch | architectural shortcut | 🔴 | L | Articles 19/4; TAS step 4 |
| `npm test` broken + no CI test gate | tooling | 🔴 | S | fix script + add CI job (high value, low risk) |
| Two muscle models (contributions vs exerciseSimilarity) | duplication | 🟠 | S | reconcile to one source |
| Two strength-standard tables (engine vs app) | duplication | 🟡 | S | single source |
| Form-guide (~40) coverage gap vs 118 exercises + name-coupling | coupling/coverage | 🟠 | M | key by id, not regex on name |
| `exerciseDemos.js` referenced but absent (CLAUDE.md/memory) | doc drift | 🟡 | S | correct docs (no demos exist) |
| README stale (engine "empty placeholder"); SCHEMA.md stale (allowlist, "5 phases") | doc drift | 🟡 | S | reconcile |
| Vestigial DB tables (plans/phases/weeks, wearable_readings, ai_recommendations) | dead schema | 🟠 | M | decide derived-plan vs stored-plan |
| `TrainingCalendar.jsx` likely unused | dead code | 🟡 | S | confirm + remove |
| Scheduler endurance branch (supSpecs/doubles/longRun) inert | legacy | 🟡 | S | remove or keep for Stage 7 |
| SKB rugby/soccer stubs; reserved no-op decision-rule effects | incompleteness | 🟠 | M | needs exercise-level tagging |
| OAuth `state`=user_id (no nonce/PKCE); `users.profile` open JSONB; no CSP header/privacy policy | security (audit) | 🟠 | M | per SECURITY-AUDIT P1/P2/P3 |

---

## 19. Legacy Components

- **DB plan hierarchy (`training_plans → phases → weeks`)** — designed for a *stored* plan; the engine rebuild made the plan an ephemeral projection, leaving `phases`/`weeks` **never synced/used** and `training_plans` a near-stub.
- **`wearable_readings`** — legacy per-workout table, explicitly not pulled (superseded by `daily_metrics` + `workouts`).
- **`ai_recommendations`** — Stage-8 placeholder table, never written.
- **Scheduler endurance machinery** — run/swim disciplines, supplemental sessions, doubles, long-run day — inert in the gym-only engine.
- **`allowed_emails`** — added (002) then dropped (012); SCHEMA.md still narrates it.
- **Legacy profile fields** — `run_goal`, `swim_goal`, `pool_length_m`, `long_run_day`, ranked `goals[]`, `height_cm` — nulled/ignored but tolerated on old rows.
- **`TrainingCalendar.jsx`** — superseded by `WeekSchedule` (likely dead).
- **Legacy access tiers** (`full_gym`/`home_weights`/`none`) — still mapped for old seeds alongside the granular `equipment[]`.

---

## 20. Candidate Components to Preserve

(These are assets for the target architecture — reuse, do not discard.)

- **The pure, deterministic engine boundary + golden-master harness** — the foundation the whole TAS is built to protect. Preserve the purity discipline and the 19-archetype snapshot.
- **The exercise catalogue** (`strengthExercises.js`, ~118, richly tagged) — a strong, single-source data asset; the natural seed of the L2 Exercise domain.
- **The injury subsystem** (profiles + taxonomy + rehab + triage) — the Constitution's own exemplar of knowledge-as-data; keep as-is and generalise the pattern.
- **The evidence KB** (`knowledge/kb` + entries) — provenance-tagged science already consumed by the reactive layer; the seed of the Evidence & Confidence domain.
- **The MRV ceiling, stimulus-credit model, and volume accounting** — sound as a *validation guardrail* (their intended role under Article 6).
- **The reflow + freeze-on-commit + rolling-window ledger** — the coaching value is real; preserve the behaviour while relocating it into the pure engine (D15).
- **ACWR-demotion + subjective-priority recovery + personal-baseline** — model applications of Article 13; keep.
- **Offline-first sync + RLS posture + soft-delete** — the L4 persistence pattern; extend, don't rebuild.
- **The privacy split designed in `apps/web` types** (`PlayerPrivateSource` vs `CoachVisibleStatus`, `lib/derive.ts`) — the right shape for Article 11; move the roll-up server-side into the engine.
- **The SKB *content*** — a large latent knowledge asset; preserve and wire in (do not delete because it is dormant).
- **Engine-quality tooling** (`review-samples`, `rate-batch`, golden-master) — keep as the regression + evaluation substrate.

---

## 21. Candidate Components to Replace *(migration opportunities only — not designs)*

- **The volume-first target→fill core** → an adaptation-first decision graph (diagnose → prioritise quality → derive movement/dose → select → validate). The allocator becomes a *selection* decision under a validator, not the whole engine.
- **Coaching computation in `buildView`/`PlanService`** → the engine's `deriveReadiness/deriveLoad/reflow` behind the 6-call public API; `PlanService` shrinks to a thin orchestrator (fetch/invoke/cache/persist) with no mutable state.
- **Sport emphasis code vectors** → derived from the (single, reconciled) SKB demand model.
- **Coaching numbers as code literals** → versioned L2 knowledge entries.
- **`apps/web`'s hand-ported readiness/ACWR/verdicts** → the engine's `rollUp()` (render, don't re-derive).
- **Two muscle models / two strength-standard tables** → one canonical source each.
- **Injury post-hoc strip-and-patch** → constraints-before-content + a separable contraindication validator.

---

## 22. Candidate Components to Remove

- **Vestigial DB tables** `phases`, `weeks` (unused), and a decision on `training_plans` (stub) — after choosing derived-plan vs stored-plan.
- **`wearable_readings`** and **`ai_recommendations`** if the derived/AI models supersede them.
- **The scheduler's inert endurance branch** (unless retained deliberately for Stage 7).
- **`TrainingCalendar.jsx`** if confirmed unused.
- **Stale doc references**: `exerciseDemos.js` (does not exist), README "empty placeholder" text, SCHEMA.md allowlist + "5 phases".
- **`allowed_emails`** residue in SCHEMA.md (table already dropped).

> Nothing here is a rewrite mandate — each is a "confirm-then-retire" candidate for Sprint 2 scoping.

---

## 23. Unknowns

- **`Database.js` internals** (findOrCreate/reclaim/id generation) — not fully read (M confidence on session-identity edge cases).
- **Edge-function source** (token refresh, HR-zone computation) — characterised from the client + audit, not read line-by-line.
- **Migrations 005/006/008/011/013** — inferred from names/usage; not individually read (e.g. whether 011 closed the avatar MIME/size-limit finding).
- **EDS / Decision Ontology / Knowledge Architecture** — read at the requirement level (via the Constitution's EDS-mapping appendix + the TAS's citations), not cover-to-cover; D-numbering and domain lists are taken from the TAS.
- **Whether any SKB richness surfaces anywhere** (coach/athlete dashboard sections) — no non-test consumer found; assumed latent.
- **`readiness_v2` rollout state in production** (default on in code; actual per-user distribution unknown).
- **Actual applied-migration state of the live Supabase project** (the audit flags schema-vs-migration drift depends on which ran).

---

## 24. Risks

| Risk | Likelihood | Impact | Note |
|---|---|---|---|
| **No CI test gate + broken `npm test`** lets an engine regression ship silently | High | High | golden-master only protects if someone remembers to run it |
| **Reflow/generator drift** (duplicated math, no parity test) produces baseline≠adapted inconsistencies | Med | Med | TAS T10 |
| **Knowledge duplication drift** (sports/* vs SKB; two muscle models; two standards) | Med | Med | silent divergence of the same fact |
| **Privacy invariant unenforced** — the Team package could ship coach-visible raw vitals without a structural guard | Med (when Team built) | **Critical** | Article 11; no privacy validator exists |
| **Migrating the volume-first core** is a deep, cross-cutting change to the most complex module (allocator) under golden-master | High | High | sequence per TAS §17; keep the harness green |
| **Doc drift misleads contributors** (exerciseDemos, README, SCHEMA) | High | Low | quick fixes |
| **Security items** (OAuth state, open profile JSONB, no CSP/privacy policy) before a real multi-user/health launch | Med | Med–High | per SECURITY-AUDIT P1–P3 |
| **`Database.js` fragility** — large synchronous do-not-rewrite dependency in the write path | Low | Med | wrap, don't disturb |

---

## 25. Open Questions

1. **Derived-plan vs stored-plan.** The engine treats the plan as an ephemeral projection; the DB models a stored hierarchy. Which is canonical going forward (this decides the fate of `training_plans/phases/weeks` and whether an AI-edited plan is persisted)?
2. **How far to relocate coaching into the engine in one step** (readiness/load/reflow) vs incrementally — and how to keep the golden-master green across the move.
3. **Reconciling the three sport vocabularies** (`run/cycle/swim/gaa` vs SKB `running/cycling/swimming/gaelic_football/hurling` vs onboarding) into the Ontology's one canonical vocabulary.
4. **The SKB's role:** wire the authored richness into a real demand/decision model (and add the exercise-level tags its `decisionRules` need), or trim it to what the engine can consume?
5. **Where the quality/adaptation taxonomy and limiting-factor diagnosis live** as the new organising primitive (the D4/D5 gap), and how muscle-volume becomes a downstream ledger under it.
6. **Confidence composition** across plan-pipeline decisions (today only the index/reactive layer composes confidence) — the TAS records this as a standing tension.
7. **Team package sequencing:** build the privacy-preserving `rollUp()` + teams RLS spine (with tests) before or alongside the engine-boundary work?
8. **Testing strategy:** minimum viable CI (golden-master + engine suite) now, and how to reach UI/sync/RLS coverage the current suite lacks.

---

### Provenance

Compiled Sprint 1 by first-hand read of the source (engine pipeline, reactive layer, injury/sport knowledge, data tables, app runtime + data flow, backend schema/RLS/migrations/audit, and the Constitution + TAS in full), with focused sub-agent inventories for the frontend, the reserved web app, and tests/infra. Detailed per-subsystem working notes: `scratchpad/baseline/01–10`. No application code or governing document was modified.
