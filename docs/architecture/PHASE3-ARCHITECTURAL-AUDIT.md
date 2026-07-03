# Phase 3 — Complete Architectural Audit & Rebuild Plan

**Version:** 1.0 · **Date:** 2026-07-03 · **Status:** LIVING planning document (NOT frozen)

**Authority:** This audit is validated against, and subordinate to, the frozen governing set
(v1.0, 2026-07-01): the **Constitution**, **Decision Ontology**, **Knowledge Architecture**
(`docs/foundation/`), the **EDS** (`docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`), and the
**TAS** (`docs/architecture/TAS.md`). Where the code conflicts with those documents, the
documents are correct; this audit exists to enumerate those conflicts and plan their removal.

**Relationship to Sprints 1 & 2:** this document is the successor snapshot to
`BASELINE-ARCHITECTURE-ASSESSMENT.md` (Sprint 1, observational) and the companion to
`MIGRATION-BLUEPRINT.md` (Sprint 2, the plan). Both were written 2026-07-01, **before** the
re-seating began executing. Seven PRs (#54–#60) have since shipped. This audit re-baselines the
assessment to the post-Sprint-8 reality, records which Sprint 1/2 claims are now stale
(§1.3), and re-issues the backlog as dependency-sequenced work packages (§8). The Blueprint
remains the master plan; this document is the *current* ground truth against it.

---

## 0. Executive Summary

**Where the platform genuinely is.** The diagnosis-first re-seat is no longer a plan — it is
partially live. The reasoning chain *Athlete Model → capabilities × SKB demand → limiting
factors (D4) → priority qualities (D5) → session objective (D9) → movement requirements (D10)
→ intervention selection (D11)* now generates the actual gym plan for **run and cycle**
athletes, with muscle volume demoted to a downstream MRV ledger on that path. Build, swim, and
team-sport athletes remain 100% on the legacy volume-first planner (protected byte-identical
by `build-parity.js`). The riskiest single step the Blueprint identified — the allocator
re-seat — is behind us for two sports, executed via a parallel-model / per-sport-flip strategy
the Blueprint didn't prescribe but which honoured every preserve-invariant (G1–G9).

**The headline finding of this audit: the platform is now split-brained.** The transition
strategy that made the re-seat safe has left *two of everything* running side by side:

| Duplication | Legacy half | New half |
|---|---|---|
| Engine path | volume-first greedy fill (build/swim/team sports, Train Now) | D4→D11 diagnosis chain (run/cycle weekly plans + reflow) |
| Sport model | `lib/sports/*` emphasis vectors + priority lists (drives live plans) | SKB JSON profiles (drives diagnosis, onboarding, reflow rules) |
| Exercise vocabulary | `strengthExercises.js` quality/goal/sport flags | `exerciseQualities.js` quality/force-velocity/fatigue tags |
| Muscle model | `PATTERN_CONTRIB` (all volume accounting) | `exerciseSimilarity.js` (substitution ranking — more accurate) |
| Dose model | `allocator.scheme()` style-keyed rep/RPE/rest tables | `qualities.js` doseResponse (surfaced as text only) |
| Diagnosis | app-side Atlas pillar model (`atlas/signals.js`) | engine Performance Model (D4/D5) |
| Coaching runtime | app-side PlanService reflow (~180 lines of policy) | (target: pure engine D15) |
| Season model | `sports/_schema.js` SPORT_BLOCKS | SKB `seasonalModel` sections (unconsumed) |

Every row is a source of drift and a double maintenance cost. The rebuild's job from here is
less "build the new engine" (its spine exists and is live) and more **"finish the flip and
retire the old halves"** — plus ship the honesty band the Blueprint sequenced first and the
execution skipped (confidence tiers, recovery honesty, the validator suite, constraints-first).

**Quantified state against the frozen set** (details §6):
- ~**90%** of what users receive is still produced by the volume-first core (all build/swim
  users; and even on the D11 path, region, dose, structure, and MRV gating are legacy-shared).
- ~**20%** of the scientific constants that make coaching decisions are in governed knowledge
  (the evidence KB, SKB, injury profiles); ~80% remain code literals (Article 17 conflict).
- The **generation core emits zero rationale** (R7–R36 in the Decision Register); only the
  new chain and the runtime-signal layer explain themselves (Article 14 conflict).
- **Three determinism leaks** (`PlanGenerator.js:163`, `periodization.js:34`,
  `periodization.js:125` — clock reads) contradict Article 18 for undated/sport profiles.
- **No validator suite exists** — the MRV ceiling is inside the selection loop; injuries are
  still a post-generation filter on the legacy path (Article 19 conflict, the largest
  outstanding structural gap).
- The **engine boundary is breached in both directions**: the runtime coaching half
  (reflow, deload force/defer, Train Now policy, ACWR display bands) lives in `apps/mobile`,
  while the engine ships UI copy and theme tokens (`Readiness.js`, `Utils.js`).

**Reusability verdict** (details §7): roughly **60% keep / 30% refactor / 10% replace or
delete**, LoC-weighted. This is a re-seating, not a rewrite — confirmed, and further along
than the planning documents record.

**Top five priorities for the next 90 days** (details §10.8): (1) close the safety gaps that
cost nothing (gate deploys on tests, fix the three clock leaks, wire D11 into Train Now);
(2) extract the validator suite (Article 19); (3) make confidence and recovery operative
(W1–W2); (4) Sprint 9 — SKB-primary, retire `lib/sports/*`, then the swim re-seat; (5) build
the Team data spine *with an RLS test harness first* — the infrastructure audit found the
backend's manual-migration, zero-RLS-test posture is the single riskiest place to be adding
the product's first cross-user access.

---

## 1. Task 1 — The Current System (Architectural Map)

### 1.1 High-level shape

```
┌─────────────────────────────────────────────────────────────────────────┐
│ apps/mobile (React 18 + Vite PWA, ~14.8k LoC)                            │
│                                                                          │
│  24 screens ── components ── ui/ primitives          styles/main.css     │
│       │                                               (2,600 lines)      │
│  trainingStore (Zustand, 543) ←─ buildView() reads localStorage          │
│       │              │ setRuntime() ──────────────┐                      │
│  SyncService (798) ──┼── Supabase-first writes    │                      │
│       │              │   + localStorage cache     ▼                      │
│  Database.js (813, sync localStorage tables)   PlanService (818)         │
│  Storage.js (namespaced per-user keys)         ├ plan facade (memoised)  │
│                                                ├ ADAPTIVE REFLOW ★       │
│                                                ├ generateTrainNow ★      │
│                                                └ injury/primer decoration│
└──────────────┬──────────────────────────────────────────┬───────────────┘
               │ workspace dependency                      │
┌──────────────▼──────────────────────────────────────────▼───────────────┐
│ packages/engine (@performance-os/engine — pure, ~8.2k lib + 1.1k data   │
│                  + 8.8k SKB JSON)                                        │
│                                                                          │
│  generatePlan(profile[, opts])  ← PURE (3 clock leaks, see §6.1)         │
│   ├ performanceModelForProfile ── athlete/ ─ performance/ (D1,D2,D4,D5)  │
│   ├ resolveProgram (strength/program + sports/* legacy model)            │
│   ├ resolvePeriodization (plan/periodization + SPORT_BLOCKS)             │
│   ├ weeklyMuscleTargets (strength/targets — MEV→MAV ramp)                │
│   ├ allocateGym (plan/allocator, 913 LoC god module)                     │
│   │   ├ [legacy] anchor + greedy deficit fill (build/swim/team sports)   │
│   │   └ [NEW]   D9 objective → D10 requirements → D11 selectInterventions│
│   │             (gate: sport ∈ {run, cycle} ∧ priorityQualities > 0)     │
│   ├ scheduler (interference-penalty day assignment) → despine pass       │
│   └ shared: scheme() dose tables · structuring · MRV ledger · durations  │
│                                                                          │
│  runtime signals: indices/ (readiness v1/v2) · trainingLoad (ACWR) ·     │
│                   recovery/ · load/ · injury/ (post-gen filter) ·        │
│                   sportKnowledge/ rules → reflowAdjust                   │
│  knowledge: knowledge/ (22-entry evidence KB) · data/ tables ·           │
│             sport-knowledge/*.json (10 SKB profiles)                     │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│ supabase/ — Postgres + Auth + Storage + 5 Deno edge functions             │
│  13+ tables, blanket RLS auth.uid()=user_id, owner-only raw vitals        │
│  wearables: OAuth callbacks + google-health/strava sync + HR enrichment   │
└───────────────────────────────────────────────────────────────────────────┘

apps/web — Next.js 14 + TS coach dashboard & marketing site, 100% mock data
packages/shared — reserved, empty
CI: test.yml (117-file node suite + golden masters) · deploy.yml (NOT gated
on tests) · web-ci.yml
```

### 1.2 Data flow (verified)

**Writes:** screen → store action → `validation/validate.js` → `SyncService` → Supabase
upsert (when signed in) → `Database.js` (localStorage). Session-lifecycle writes are
offline-first (synchronous local write, fire-and-forget cloud). **Reads:** `buildView()`
reads localStorage synchronously; `syncFromCloud()` does a wholesale pull on sign-in.
Violations found: `Settings.jsx` reads Database directly (export/counts);
`trainingStore.replaceAll` imports a backup without ever syncing it; `sessionOverrides.js`
writes raw localStorage (deliberate, but makes freeze pins device-local); PlanService reads
`Database.services.getProfile()` directly and receives runtime state via a module-singleton
`setRuntime()` side-channel. **No offline outbox exists** — writes made offline reach the
cloud only if the same row is touched again while online.

### 1.3 Corrections to the Sprint 1 Baseline (what is now stale)

The Baseline's headline claims that are **no longer true** after PRs #54–#60:

| Stale claim (Baseline §) | Current reality |
|---|---|
| "`npm test` broken; no CI runs tests" (§1, §17, §18) | Fixed (Sprint 0): `tests/run-all.mjs` + `.github/workflows/test.yml` gate PRs |
| "SKB ~95% dormant, only decisionRules consumed" (§1, §6) | SKB drives onboarding sport list, positions, `demandProfile`, and (via diagnosis) live run/cycle plan content |
| "Diagnosis and adaptation targets do not exist" (§5, §9-A5) | D4/D5 live (`performance/diagnose.js`, `prioritise.js`), with rationale + confidence |
| "Volume drives planning" (§5, §9-A6) | True for build/swim only; run/cycle volume is a downstream ledger |
| EDS map: D4/D5/D10 "Missing", D11 "deficit-driven" (§10) | All built; D11 value-ordered with a stopping rule for run/cycle |
| "Missing: quality taxonomy, limiting-factor model, movement→quality maps, exercise tags" (§6) | All four exist (`qualities.js`, `diagnose.js`, `qualityMovementMap.js`, `exerciseQualities.js` — all 118 exercises tagged) |
| "Three sport vocabularies, unreconciled" (§11) | Bridged by `sportEngineBinding.js`; full reconciliation is Sprint 9 |
| Golden master = inviolable byte-identical gate | Protection model evolved: byte-identical for untouched paths (`build-parity.js`) + nature-of-change gates (`d11-runner-quality.js`) for re-seated paths |

Claims that **remain true and open**: no validator suite; confidence not operative
platform-wide; recovery not intensity-aware; injuries post-filtered on the legacy path;
reflow app-side with mutable `_runtime`; no 6-call public API; Team package absent below the
mock layer; the Blueprint's W1–W4 honesty band unshipped.

---

## 2. Task 2 — Domain Map

Every functional domain, with files, responsibilities, dependencies, interfaces, and problems.
(Paths under `packages/engine/` unless prefixed `app:` = `apps/mobile/src/`.)

| Domain | Files | Responsibility / public interface | Depends on | Current problems |
|---|---|---|---|---|
| **Athlete Assessment (D1)** | `lib/athlete/` (schema, fieldRegistry, validation, builder); `app:lib/AthleteModelService.js`; `app:lib/onboardingModel.js` | Build/persist the versioned Athlete Model; every stored field justified against D1–D16 | data/trainingAgeBands, capabilityPriors | Only maxStrength has a measured path; 9 qualities are pure priors; dual-write alongside legacy profile (by design, mid-migration) |
| **Athlete Capability (Performance Model)** | `lib/performance/` (estimation, derivePerformanceModel, forProfile) | `performanceModelForProfile(profile, asOf)` → capabilities per 10 qualities + confidence | athlete/, SKB, data/ | Capability priors quality-invariant; recency bands + BW multiples hardcoded |
| **Sport Model / Demand** | `data/sport-knowledge/*.json` (10 profiles); `lib/sportKnowledge/` (schema, registry, rules, reflowAdjust, selectable); `data/sportQualityMap.js`, `sportEngineBinding.js`; **legacy:** `lib/sports/*` | SKB: 21-section evidence-tagged profiles; demand → PM qualities; selectable sports; decision rules. Legacy: emphasis vectors + priority lists + season blocks | — | **Two sport models** (the central duplication); 8 SKB qualities unmapped to the PM vocabulary (the swim gap); rugby/soccer SKB are 55-line stubs; SKB `exerciseLibrary`/`seasonalModel` unconsumed |
| **Diagnosis (D4/D5)** | `lib/performance/diagnose.js`, `prioritise.js`; `data/qualityCompatibility.js` | `limitingFactors[]` + `priorityQualities[]` with magnitude, rationale, confidence | demandProfile, estimation | `trainability`/`injuryRisk` neutral (=1.0); build goals get an empty diagnosis; compatibility table has one seeded pair; **the Atlas app-side pillar model is a second, disagreeing diagnosis** |
| **Session Decisions (D9/D10)** | `lib/session/` (sessionObjective, movementRequirements, sessionSpecs) | One purpose per session; movement requirements before exercises; contraindication subtraction | qualities, qualityMovementMap, injury regexes | Live D11 call passes an **empty contraindication set** (injuries still post-filtered); `deriveSessionSpecs` is test/dev-only; mobility→robustness stopgap wrong for swim |
| **Intervention Selection (D11)** | `lib/plan/selectInterventions.js`; gate in `allocator.js:759` | §34 value hierarchy, transfer-per-fatigue, fatigue-budget stopping rule | exerciseQualities, MRV ledger | Run/cycle only; fatigue budgets + value weights hardcoded; picks carry a tier number but no rationale string; Train Now bypasses it |
| **Exercise Knowledge** | `data/strengthExercises.js` (118), `exerciseQualities.js`, `exerciseSimilarity.js`, `app:data/exerciseLibrary.js` (form guide) | Catalogue + quality tags + substitution profiles + athlete-facing content | — | Two quality vocabularies; two muscle models; items carry names not ids (all joins are name-regex); form guide covers ~40/118 |
| **Volume Ledger** | `lib/plan/volume.js`, `contributions.js`, `strength/stimulus.js`, `data/muscleVolume.js` | Fractional-set counting, MEV/MAV/MRV grading (landmarks KB-sourced) | knowledge/kb | Correct target-architecture role (ledger); but the MRV *ceiling* is enforced inside the selection loop, not as a named validator |
| **Programming / Dose (D12)** | `allocator.scheme()` (:118-169), rest tables, power dosing; `data/qualities.js` doseResponse | Rep/RPE/rest per style×intent; deload/taper variants | — | Entire dose model is style-keyed code literals; the quality-keyed doseResponse exists but doesn't build items; readiness scales volume only |
| **Periodisation (D7)** | `lib/plan/periodization.js`; `sports/_schema.js` SPORT_BLOCKS | Block profiles, season derivation, `continueBlock` | sports registry | Clock reads (impure); profiles hardcoded with comment-only citations; SKB seasonalModel duplicates unconsumed |
| **Weekly Planning / Split (D8)** | `lib/plan/split.js`, `strength.js`, `frequency.js` | Day templates; sport emphasis-weighted region days | program emphasis | Style-switched, not objective-driven; feeds even the D11 path its region |
| **Scheduling (D13)** | `lib/plan/scheduler.js`, `PlanGenerator.chooseDays` | Brute-force day assignment minimising interference penalties | constraints | Penalty weights hardcoded; vestigial doubles/long-run machinery |
| **Session Construction** | `allocator.js` structuring/finaliseSlot: ordering, supersets, titles, durations; `plan/primers.js`; `plan/despine.js`, `axial.js` | Order blocks, superset pairing, honest labels/durations, primer, axial management | liftProgression | All inside the 913-line god module; despine mutates in place |
| **Load / Weights** | `lib/liftProgression.js`, `strength/exerciseLoad.js` | e1RM (Epley), autoregulation, coefficient-based suggested kg on every item | strengthExercises | Coefficient table cited only in comments; standards duplicated app-side |
| **Recovery / Readiness / Load signals** | `lib/indices/` (10 files), `Readiness.js`, `recovery/`, `load/`, `plan/trainingLoad.js` | `{value, confidence, band, contributors, missingInputs}` contract; ACWR demoted to soft input | knowledge/kb | Readiness.js mixes score maths with UI copy/theme tokens; deload thresholds (50/70, ≤2/≥4) hardcoded; ACWR display bands live in the app store |
| **Injury** | `lib/injury/` (profiles, rules, filter, symptomAssessment); `data/injuryTaxonomy.js`, `rehabExercises.js`; `app:screens/Injuries.jsx` (711) | Evidence-tagged per-region contraindications, rehab, prevention, triage | knowledge | Post-generation filter (Art 19 wants pre-shaping); name-regex matching; triage UI flow embedded in one huge screen |
| **Runtime Adaptation (D15)** | `app:lib/PlanService.js` (adaptedPhases, weekTarget, missedWindowVolume, generateTrainNow); `lib/plan/rollingVolume.js`, `constraints.js` | Current-week reflow: readiness/ACWR/deload force-defer, catch-up distribution, sport-day lightening, forgiveness | engine primitives via deep imports | **In the app layer** with mutable `_runtime`; mirrors generator formulas ("must match" comments); Train Now on legacy fill; forgiveness invisible to users |
| **Freeze-on-commit** | `app:lib/sessionOverrides.js` + store pin-on-start | Started sessions never recompute | localStorage | Pins are device-local — cross-device breaks the invariant |
| **Monitoring / Wearables** | `supabase/functions/*` (5); `app:` store sync orchestration, `sessionWorkoutMatch.js`, `wearableConnections.js` | OAuth, google-health daily metrics, Strava workouts, HR enrichment | edge env secrets | "fitbit-*" names actually Google; HRR zoning exists only in Deno (orphan comment points to a nonexistent mirror); hardcoded APP_URL |
| **Learning (D16)** | `learnedPriors` structure on the Athlete Model; neutral seams in D4 | — | — | Not built (correctly deferred); seams alive |
| **Explainability** | rationale fields on D4/D5/D9/D10 outputs; `app:verdicts.js`, `coachNote.js`; reason strings on load/recovery/injury outputs | Plain-English signals | — | No trace/read-model; generation core silent; reflow reshaping + forgiveness unsurfaced |
| **Knowledge governance** | `lib/knowledge/` (schema, 22 entries, kb accessor) | Evidence-tagged constants, fail-fast access, staleness check | — | Working as designed; covers ~20% of decision constants |
| **Configuration** | `app:data/activityTypes.js`, providers.js; vite config; `supabase/config.toml` | Registries + build config | — | No engine feature-flag discipline issue found (good); `readiness_v2` flag defaults on in the store |
| **Coach surface (future Team)** | `apps/web/` (dashboard views, mockApi seam, derive.ts roll-up, statusLogic) | Decision-led coach dashboard on mocks | — | No auth middleware (dashboard publicly routable); client-side roll-up must become engine `rollUp()` server-side; Midnight design system duplicated in Tailwind |
| **Identity / Auth / Sync** | `app:stores/authStore.js`, `supabaseClient.js`, `SyncService.js`, `Storage.js`, `Database.js` | Sessions, OAuth, per-user cache isolation, online-first sync | Supabase | Hand-parsed `sb-*-auth-token` for `uid()`; no outbox/retry; wholesale pull, last-write-wins |

---

## 3. Task 3 — The Decision Register

Every place a coaching decision is made. **R1–R53** live in the engine (full detail retained
in the engine audit; condensed here), **A1–A14** in the app layer. Columns: owner in the
target architecture (per Blueprint Part 2), and whether it emits rationale today.

### 3.1 Engine — program & periodisation

| # | Decision | Location | Logic (condensed) | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R1 | Goal → style/emphasis/priorities | `strength/program.js:25-68` | goal_type switch; sport delegates to `sports/*`; inline emphasis bumps (bodybuilding shoulders/arms ×1.1, functional core ×1.2) | L | D2 (goal-as-sport profiles) | none |
| R2 | Season derivation | `periodization.js:30-53` | event-date windows ≤56d in / ≤120d pre | L | D7 · **impure (clock)** | none |
| R3 | Block length / phases / deloads | `periodization.js:62-108` + `sports/_schema.js` | style→PROFILES; sport→SPORT_BLOCKS | L | D7 + knowledge/programming | comments only |
| R4 | End-of-block continuation | `periodization.js:124-167` | checkin → recalibrate/bridge/repeat/progress | L | D7/D15 · **impure** | none |
| R5 | Taper trigger + length | `PlanGenerator.js:163-169` | event in block+1wk → 1–2wk taper | L | D7 · **impure fallback** | theme copy |
| R6 | Sport volume scalar | `strength/sportLoad.js:23-33` | season × goal × days × systemic, clamp 0.5–1.0 | L | D12 | none |

### 3.2 Engine — volume & frequency

| # | Decision | Location | Logic | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R7 | Weekly per-muscle set target | `strength/targets.js:55-100` | MEV→MAV ramp × STYLE_TOP × emphasis × scalar; deload→MEV | L core | D12 output / D14 ledger | none |
| R8 | Weekly MRV ceiling + slot caps | `allocator.js:660-675` | in-loop delivered-volume gate | S | **D14 validator** | none |
| R9 | Stimulus credit per set | `strength/stimulus.js` | loadClass × level factor | S | knowledge/exercises | none |
| R10 | Optimal frequency | `plan/frequency.js` | volume ÷ 32-set sweet spot | L | D8 | none |
| R11 | Rolling catch-up | `plan/rollingVolume.js` | 10-day deficit spread, MRV-rate-capped | L runtime | D15 | partial (`forgiven`) |

### 3.3 Engine — split, scheduling, structure

| # | Decision | Location | Logic | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R12 | Training split | `plan/split.js:44-136` | day templates; sport emphasis-weighted regions | L (feeds D11 too) | D8/D9 | none |
| R13 | Gym weekday choice | `PlanGenerator.js:53-93` | prefer non-sport days, maximise min gap | L | D13 | none |
| R14 | Session→day assignment | `scheduler.js:70-141` | penalty-minimising permutation search | L | D13 (retain) | none |
| R15 | Session internal ordering | `allocator.js:341-422` | anchor first; power→primary→accessory→iso→health | S | D11/D12 | none |
| R16 | Supersets | `allocator.js:327-376` | CNS/shared-muscle constrained pairing; B-rest 20s | S | D12 | none |
| R17 | De-spine swap | `plan/despine.js` + `axial.js` | day-after-heavy axial swap | L | D13/D14 | none |
| R18 | Clash-day lightening | `plan/constraints.js:57-66` | −1 set per item on sport days | L | D8/D15 | `lightened` flag |

### 3.4 Engine — exercise selection

| # | Decision | Location | Logic | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R19 | **Legacy greedy pick** | `allocator.js:443-539` | urgency-weighted useful volume × ~10 tuned multipliers − overshoot penalty | L | superseded by D11 | **none — opaque score** |
| R20 | Anchor selection | `allocator.js:713,740-751` | sport priority lift (rotated) / split-pattern barbell | L | D11 | none |
| R21 | Primary caps / press demotion | `allocator.js:229-234,452-459` | ≤2 primaries; run/cycle hpush demoted | L | D11/D14 | none |
| R22 | Power gating | `allocator.js:97-101` | power only if goal wants it | L | D10 competency | none |
| R23 | Filler pass | `allocator.js:853-861` | 1 light filler if muscle ≥⅓ short | L | delete (Art 7 / L5 tension) | none |
| R24 | Supportive finisher | `allocator.js:552-582` | factor-0 work to time cap | L | D11 tier 6–7 | none |
| R25 | **D11 selection** | `selectInterventions.js:55-103` | §34 tiers, transfer÷fatigue, budget stop, 2/pattern cap | **N** | D11 (extend) | tier only |
| R26 | D11 gate | `allocator.js:759-761` | sport ∈ {run,cycle} ∧ priorities>0 | gate | dissolves at full flip | comment |
| R27 | Substitution ranking | `plan/substitutions.js:72-128` | tier-gated multi-axis likeness | L runtime | D11-adjacent (retain) | score surfaced |
| R28 | Primer selection | `plan/primers.js:47-82` | first-seen patterns → primer moves | L | D12 (retain) | none |

### 3.5 Engine — prescription

| # | Decision | Location | Logic | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R29 | Rep/RPE scheme | `allocator.js:118-169` | 4 styles × 3 intents + deload/taper tables | S (D11 reuses) | **D12 + knowledge/programming keyed by quality** | comments |
| R30 | Power dosing | `allocator.js:183-187` | 4×4 @RPE7 /150s | S | D12 | note string |
| R31 | Rest | `allocator.js:251-267` | role × style × CNS | S | D12 | none |
| R32 | Rep caps/floors/female bump | `allocator.js:193-223` | regex edits on set strings | S | D12/knowledge | none |
| R33 | Suggested weights | `liftProgression.js` + `exerciseLoad.js` | e1RM × coefficient × Epley | S | D12 (retain) | none |
| R34 | e1RM progression | `liftProgression.js:97-105` | RPE-delta ±0.02 step | L runtime | D16-adjacent (retain) | none |
| R35 | Session duration | `allocator.js:307-314` | Σ sets × min/set; 75-min ceiling | S | D14 honesty validator | none |
| R36 | Session title | `allocator.js:589-622` | realised-volume label | S | D9 (purpose-named) | honest by construction |

### 3.6 Engine — runtime signals & injury

| # | Decision | Location | Logic | Path | Target owner | Rationale? |
|---|---|---|---|---|---|---|
| R37 | ACWR load decision | `trainingLoad.js:89-100` | KB-sourced sustained bands | S | D15 input (retain) | ✓ |
| R38 | Deload recommendation | `trainingLoad.js:126-148` | corroborated fatigue forces / fresh defers; readiness 50/70, recovery ≤2/≥4 hardcoded | S | D15 + knowledge | ✓ |
| R39 | Recovery → volume modifier | `recovery/recovery.js:29-44` | bands 70/50 → 1/0.9/0.78 | S | D15 + knowledge | ✓ |
| R40 | ACWR-only floor | `load/load.js:27-39` | never below 0.85 alone | S | D15 (retain — the demotion pattern) | ✓ |
| R41 | Readiness derivation | `Readiness.js:66-133` | sleep/HRV/RHR deviations, hardcoded weights | S | deriveReadiness API + knowledge | ✓ (UI-flavoured) |
| R42 | Readiness Index v2 | `indices/readinessIndex.js` | KB-weighted composition | S flagged | same | ✓ contract |
| R43 | SKB rule reflow | `sportKnowledge/reflowAdjust.js` | fired rules → volume multiplier | N runtime | D15 | ✓ ruleIds |
| R44 | Injury contraindication policy | `injury/injuryRules.js:19-32` | severity thresholds 1/4 | S | D10 input | forcedPhase |
| R45 | Modify vs replace session | `injury/injuryFilter.js` | >70% blocked + severity ≥4 → rehab session | S post-gen | D10/D14 | ✓ banner |
| R46 | Prevention injection | `injuryFilter.js:154-197` | recovered ×2 / recurrence risk | S | D11 tier 3 | ✓ note |
| R47 | Pattern-contraindication bridge | `movementRequirements.js:22-33` | name-regex majority vote per pattern | N | dissolves with exercise ids | ✓ |

### 3.7 Engine — the new diagnosis chain

| # | Decision | Location | Path | Rationale? |
|---|---|---|---|---|
| R48 | D1 capability estimate | `performance/estimation.js:24-53` | N | ✓ evidence string |
| R49 | D2 demand profile | `performance/demandProfile.js:9-36` | N | ✓ evidence ids |
| R50 | **D4 diagnosis** | `performance/diagnose.js:7-29` | N | ✓ per-factor |
| R51 | **D5 prioritisation** | `performance/prioritise.js:9-31` | N | ✓ |
| R52 | **D9 session objective** | `session/sessionObjective.js:45-102` | N | ✓ |
| R53 | **D10 movement requirements** | `session/movementRequirements.js:35-68` | N | ✓ |

### 3.8 App layer (the second coaching brain)

| # | Decision | Location | Logic / constants | Belongs in engine? |
|---|---|---|---|---|
| A1 | **Adaptive reflow** (two-week horizon, deload force/defer application, volume multipliers, travel cap 0.7, sport-day lightening, forgiveness) | `app:PlanService.adaptedPhases` (:213-392) | ~180 lines of runtime coaching policy; recovery = mean of last **4** sessions, bands ≤2/≥4 | **YES — D15**, the largest single relocation |
| A2 | Programming-context reconstruction | `PlanService.gymCtx` (:82-107) | mirrors PlanGenerator (experience fallback chain, ceilings, now the diagnosis too) | YES — dissolves into the D15 API |
| A3 | Week volume target re-derivation | `PlanService.weekTarget` (:131-143) | duplicates the generator's blockFrac formula ("must match" comment) | YES — shared decision function (TAS T10) |
| A4 | Training-debt ledger | `PlanService.missedWindowVolume` (:167-182) | what counts as missed, in-epoch, in-window | YES — D15 |
| A5 | **Train Now** | `PlanService.generateTrainNow` (:769-804) | bonus-session threshold ≤5 missed sets; ctx omits D11 fields → **legacy fill for sport athletes** | YES — D15; ctx fix is a quick win |
| A6 | Today's recommended session | `PlanService.recommendedSession` (:593-620) | today's slot → first unfinished → next | borderline (orchestration-ish) |
| A7 | Primer decoration + legacy strip | `PlanService.decorateSections` (:404-411) | regex-strips engine P1–P4 items, prepends curated primer | YES — engine should emit final sessions |
| A8 | ACWR display bands | `app:trainingStore.js:140` | <0.8 under / >1.5 over / >1.3 high — **exists nowhere else** | YES — knowledge (the engine deliberately exports no bands; the app re-invented them) |
| A9 | Readiness wiring | `trainingStore.js:103-135` | `greenCut: 67`, last-4 averaging, 14-day windows, `readiness_v2` flag | YES — deriveReadiness contract |
| A10 | Lift-log update policy | `trainingStore.logLiftSets` (:437-450) | any returned e1RM updates ability | YES-ish — D16-adjacent |
| A11 | Pin-on-start (freeze rule) | `trainingStore.js:313-333` + `sessionOverrides.js` | freeze implemented as store side-effect; **device-local** | rule → engine contract; persistence → synced |
| A12 | **Atlas parallel diagnosis** | `app:lib/atlas/signals.js` + `athletePillars.js` + `pillars.js:49` | LEVEL_BASE {32/40/55/70}, aerobic `chronic/120`, "focus = pillar furthest from elite" — a second D4/D5 by a different model | YES — replace with Performance Model read |
| A13 | Fitness age model | `app:lib/fitnessAge.js:26-34` | expectedHRV = 68−0.45×(age−20); 3.5ms≈1yr; weights 0.6/0.4 | knowledge (keep screen) |
| A14 | Goal milestones + status | `app:lib/goals.js:31-78` | next-band auto-target; ≥75/≥40 status cuts | eventually D-catalogue |
| A15 | Session→steps expansion | `app:screens/SessionRunner.buildSteps` (:33-105) | circuit rounds, superset interleave, rest-on-last-set | lib/engine execution layer (it's exported for tests — already acknowledged as logic) |

**Register verdict.** 53 engine decisions + 15 app decisions. The new chain (R48–R53, R25)
matches the frozen decision-contract shape. The generation core (R7–R36) is procedural,
unexplained, and knowledge-laden. The app layer holds one entire decision domain (D15) plus a
duplicate diagnosis (A12) and clinical thresholds that exist nowhere else (A8).

---

## 4. Task 4 — Knowledge Leakage

Scientific/coaching knowledge embedded in decision code, categorised, with its correct home
per the Knowledge Architecture's 12 domains.

### 4.1 The good pattern (exists and works — extend it)

`knowledge/entries.js` (22 evidence entries with L1–L5 evidence level, confidence, citation,
lastReviewed, staleness checker) is **actually read by live code**: `VOLUME_LANDMARKS`
(`muscleVolume.js:49`), ACWR thresholds/policy (`trainingLoad.js:14-16`), readiness index
weights. The SKB validator enforces per-recommendation provenance and the raw-vitals privacy
rule. `injury/profiles.js` is evidence-tagged data. `exerciseQualities.js` honestly
self-labels `evidence: 'seed', needsReview: true`. **Coverage: ~20% of decision constants.**

### 4.2 The leakage catalogue (constant → where it should live)

| Location | Leaked knowledge | Target domain |
|---|---|---|
| `allocator.js:124-168` | **The full rep/RPE/rest scheme tables** (4 styles × 3 intents + deload/taper) — the platform's entire dose model | **Programming**, keyed by (quality, phase) — the D12 enabler |
| `allocator.js:251-267, 183-187, 417` | Rest 180/120/150/90/75/60/20s; power 4×4@7/150s | Programming |
| `allocator.js:443-539` | Selection multipliers: priority ×1.35, quality ×1.15/0.7, stretch ×1.12 (Maeo/Pedrosa cited in comments), repeat ×0.82ⁿ, overshoot 0.1, threshold 0.25 | Programming / Exercise |
| `allocator.js:307-314, 51, 81-82, 218, 459` | Time model 2.8/1.5/1.2 min/set; 75-min ceiling; finisher 30/15; female +2 reps; primary caps 2/3 | Programming + Validation (duration honesty) |
| `allocator.js:67-74` | `cnsTier` physiological classification heuristic | Exercise (cost tags) |
| `selectInterventions.js:16-17, 48-53, 84` | **D11 value-hierarchy weights**: FATIGUE_BUDGET {4,6,8}, fatigue units {1,2,3}, transfer 2/1/0.5, SKB boost 1.5, pattern cap 2 — EDS §34 knowledge | Programming (near-constitutional — the §34 hierarchy itself) |
| `targets.js:31-37, 91` | STYLE_TOP {0.6/1.0/1.4/0.6}, LEVEL_START, LEVEL_TOP_BONUS, MEV floor formula | Programming |
| `periodization.js:41-43, 62-81` | Season windows 56/120 days; the three build block profiles | Programming |
| `sports/_schema.js:38-50`, `sports/*.js` | SPORT_BLOCKS, DEFAULT_SEASON_VOLUME, every emphasis vector (e.g. running-long calves 1.40 / chest 0.45), priority lists, systemic factors | **Sport (SKB)** — derive or retire (Sprint 9) |
| `scheduler.js:76-108` | Interference penalties 12/14/10/9/8/3/2 (concurrent-training science) | Programming / Recovery |
| `sportLoad.js`, `frequency.js:19`, `rollingVolume.js:23` | GOAL_FACTOR, day factors, 32-set sweet spot, 10-day window | Programming / Recovery |
| `trainingLoad.js:128-136` | **Deload thresholds** readiness 50/70, recovery ≤2/≥4 — the strongest behavioural call in the runtime layer, not KB-sourced | Recovery/Fatigue/Load |
| `recovery.js:39-44`, `Readiness.js:66-133`, `indices/trainingLoadIndex.js:22-28` | Volume modifiers 1/0.9/0.78; sleep 480-min target, ±200% scaling, 0.7/0.3 blend, 45% deep+REM; ACWR→score map | Recovery/Fatigue/Load |
| `liftProgression.js`, `exerciseLoad.js` | BW-multiple standards, FEMALE_FACTOR, ~50 StrengthLevel coefficients, 0.02 autoreg step | Athlete + Programming (cite per-entry) |
| `estimation.js`, `demandProfile.js:9`, `prioritise.js` | STRONG_BW_MULTIPLE, recency 30/180d, default BW 80; PRIMARY_FLOOR 0.9; k = 1/2/3 by confidence | Athlete / Sport / Quality domains |
| `injuryFilter.js:9-12, 87-89` | 0.70 replacement threshold; severity ≥4 | Injury |
| `app:trainingStore.js:140` | ACWR display bands (only home of these clinical thresholds) | Recovery/Fatigue/Load |
| `app:fitnessAge.js:26-34` | The whole fitness-age physiological model | Athlete |
| `app:atlas/signals.js:32-135`, `athletePillars.js:19-84` | LIFT_MUSCLES, LEVEL_BASE, elite benchmarks (estimates) | Athlete / Quality — or retire with the Atlas re-base |
| `app:PlanService.js:311, 793` | Travel-easy cap 0.7; Train Now ≤5-set threshold | Recovery + Programming |
| `supabase/functions/enrich-sessions` | Karvonen/HRR zoning — exists **only** in Deno | Recovery domain (one home; the commented JS mirror doesn't exist) |

**Objective:** every row above becomes a governed knowledge entry (evidence level, confidence,
source, lastReviewed) read by the decision that uses it. §8 sequences this as WP-14…WP-18 —
extraction is mechanical once the validator suite exists to catch regressions.

---

## 5. Task 5 — Architectural Violations

Each violation: what/why wrong, why it happened, how it should work, priority (P1 critical →
P3), complexity (S/M/L), risk of fixing.

### V1 — No validator suite; construction and validation are fused (Constitution Art 19; EDS §35; audit checklist #13–14) — **P1 · L · High-risk-to-skip**
The MRV ceiling runs *inside* the allocator's selection loop (`allocator.js:660-675`); injury
handling is a post-generation strip-and-patch filter; duration/equipment/purpose checks are
implicit in construction. **Why it happened:** the greedy fill *is* the guardrail in a
volume-first design. **Target:** a separable `validation/` layer — 16 pure validators
returning `{pass|trim|veto, reason, confidence}` + the six-tier conflict order + a validation
report (D14) that any construction path (deterministic, AI, human override) must pass. This is
the largest outstanding structural conflict and the precondition for the AI seam.

### V2 — The runtime coaching half lives in the app (TAS T7/T18/T23; EDS SA4/SA5; checklist #2, #29, #31) — **P1 · L · High**
`PlanService.adaptedPhases` + `weekTarget` + `missedWindowVolume` + `generateTrainNow` are
D15 implemented app-side, fed by a mutable module-singleton `_runtime`, mirroring generator
formulas with "must match PlanGenerator" comments (drift-by-design). The store computes
readiness wiring and holds ACWR bands. **Why:** the reflow grew organically where the data
was. **Target:** TAS §4.1 — pure `reflow(plan, liveState, knowledge, priors)` in the engine;
PlanService becomes the L3 orchestrator (fetch/invoke/cache/persist, zero coaching, zero
mutable globals).

### V3 — Knowledge encoded as logic, two sport models (Constitution Art 17; KA §1 names `lib/sports/*` as *the* anti-pattern; TAS T15/T16) — **P1 · M · Medium**
§4.2's entire catalogue, plus the SKB/`lib/sports` duplication where a swimmer's demands are
asserted twice in two vocabularies. **Target:** Sprint 9 (SKB-primary) + the knowledge
extraction packages.

### V4 — Determinism leaks (Constitution Art 18; EDS P12; checklist #1) — **P1 · S · Low**
`PlanGenerator.js:163` (`new Date()` fallback when `plan_start_date` absent),
`periodization.js:34` (`deriveSeason` reads the clock), `periodization.js:125`
(`continueBlock`). Same profile can produce different plans across midnight. **Target:**
`asOf` injected everywhere (the discipline the new chain already follows).

### V5 — Explainability absent from the generation core (Constitution Art 14; EDS L11/SA10; checklist #18) — **P1 · M · Low**
A rendered item carries `num/name/sets/rpe/note/restSec` — no target, no why, no confidence.
R19's selection score is opaque even to developers. Runtime reshaping is invisible: a reflowed
session shows no badge; forgiven volume (`_lastForgiven`) is dev-only; substitutions carry no
rationale; the catch-up "Done" silently banks an unrated session. **Target:** every decision
output carries `{value, confidence, rationale}`; a decision trace feeds an explain
read-model; the UI renders it (never re-derives it).

### V6 — A second diagnosis engine in the app (Constitution Arts 4/5; Ontology §1.3) — **P2 · M · Low**
Atlas's pillar model (A12) computes capability, gaps, and a "focus" priority with different
maths than the shipped D4/D5 — two diagnoses that will disagree on the same screen the user
trusts. **Why:** Atlas predates the Performance Model. **Target:** Atlas renders
`getPerformanceModel()` output; pillar mapping becomes presentation.

### V7 — Injuries post-filtered on the legacy path; D11 gets an empty contraindication set (EDS L8/§36; checklist #13) — **P2 · M · Medium**
`contraindicatedPatternsFrom` exists (D10) but the live D11 call passes no injuries
(`allocator.js:770-774`); the general mechanism is still strip-and-patch after generation.
**Target:** constraints computed before content on every path (W4).

### V8 — Freeze-on-commit is device-local (Constitution Art 10; EDS SA6; TAS T4) — **P2 · S · Low**
Pins/Train-Now snapshots/substitutions live in raw localStorage. Start a session on the
phone, open the iPad: the pin doesn't exist there — the exact bug pin-on-start was built to
prevent, resurfacing across devices. **Target:** freezes persist portably (sessions row or
dedicated table).

### V9 — Confidence not operative platform-wide (Constitution Art 13; EDS §28.3; checklist #19) — **P2 · M · Low**
The evidence KB stores confidence and D4/D5 use it locally (weakest-input, k-scaling), but no
gate/soft/reported authority mechanism exists; the ACWR demotion is done ad hoc in `load.js`
rather than by tier. **Target:** W1 — a tier helper the KB feeds, read at every consuming
decision.

### V10 — Recovery not honest per the target (EDS A7/D12; W2) — **P2 · M · Medium**
Readiness scales volume only (intensityModifier is a permanent 1); subjective wellness enters
via check-ins but doesn't outweigh objective signals; illness/travel are binary flags with a
hardcoded 0.7 cap app-side. **Target:** W2 — readiness scales volume AND intensity;
subjective ≥ objective; graded state.

### V11 — Engine boundary porous in both directions (TAS §4.1/T21; EDS §7.3) — **P2 · M · Medium**
`package.json` subpath exports expose the whole tree; the app deep-imports 20+ paths
(`allocateGym`, `resolveSplit`, `despineWeek`…), so allocator internals are already de facto
public API. Meanwhile the engine ships UI copy/theme tokens (`Readiness.js:18-38`) and DOM
helpers (`Utils.escapeHtml`, `chevronRight`). **Target:** the 6-call public API; UI content
moves app-side.

### V12 — Stringly-typed prescriptions and name-keyed joins — **P2 · M/L · Medium**
Sets are human strings ("4 × 5") regex-parsed and regex-mutated in ≥6 places; injuries,
despine, volume, primers, and substitutions all join on lowercase rendered *names*;
`movementRequirements` reverse-engineers patterns from name regexes by majority vote. One
renamed exercise silently breaks volume accounting and injury safety. **Target:** items carry
exercise ids + structured dose objects; render strings at the edge.

### V13 — Mixed responsibilities / god module — **P2 · L · High-if-rushed**
`allocator.js` (913 LoC): dose knowledge + selection policy + structuring + labelling +
durations + the D11 branch + the shared ledger, with 17-argument internals. The Blueprint
called its refactor "the single highest-complexity step"; half is done (D11 extracted,
`finaliseSlot` split). Finish the decomposition as knowledge extraction proceeds.

### V14 — Dead / vestigial code — **P3 · S · None**
Scheduler doubles/long-run machinery (gym-only cleanup left it orphaned);
`recovery.intensityModifier ≡ 1`; `resolveIntents`' unused `level` param; app
`SessionProgress.js`; legacy P1–P4 primer strip regex; `wearable_readings` +
`ai_recommendations` tables; `TrainingCalendar.jsx`; phantom `hrZones.js` comment in the
enrich edge function.

### V15 — Team-readiness gaps in the platform layer (Constitution Art 11; TAS §4.4; T19) — **P1 when Team starts · M · High**
Hand-pasted SQL-editor migrations with mixed naming conventions and no ledger; `schema.sql`
drift (missing ~6 tables/columns vs migrations); **zero RLS tests**; no staging project;
deploy not gated on tests; `apps/web` roll-up is client-side (`derive.ts`) where the TAS
requires server-side `rollUp()`; `/dashboard` has no auth middleware. None of this violates
the frozen set *today* (single-tenant), but the first coach policy written against this
posture risks the platform's hardest rule.

### V16 — Sync integrity gaps — **P2 · M · Medium**
No offline outbox/retry (offline writes can permanently miss the cloud); wholesale pull with
last-write-wins; `SyncService.uid()` hand-parses the supabase-js token storage format (a
library update silently degrades the app to local-only). Not a frozen-set violation per se,
but it undermines "Athlete State is ground truth" (Ontology §8) and will bite multi-device.

---

## 6. Task 6 — Reusability Assessment

Classification of every major module. (Full per-module tables live in §2 and the source
audits; this is the roll-up.)

### 6.1 Engine (`packages/engine`, ~9.3k LoC JS + 8.8k SKB JSON)

| Category | Modules | ~LoC share |
|---|---|---|
| **KEEP** | knowledge/, sportKnowledge/, athlete/, performance/, session/, injury/, indices/, recovery/, load/, trainingLoad, volume/contributions/stimulus/axial, rollingVolume, constraints, frequency, primers, substitutions, liftProgression+exerciseLoad, adapters/, all data/ tables, SKB JSON | ~62% |
| **Minor refactor** | selectInterventions (externalise weights, add rationale), targets (constants→KB), periodization (inject clock, profiles→KB), split, scheduler (delete vestiges, weights→KB), despine, PlanGenerator (clock, dedupe model build, thread rationale) | ~20% |
| **Major refactor** | **allocator.js** (decompose: scheme→knowledge, selection, structuring, finalisation), Readiness (split maths/UI), Utils (split), strength/program + priorityIntents (superseded by the diagnosis; keep intent-chain mechanics) | ~14% |
| **Replace (long-term)** | `sports/*` legacy sport model (fold into SKB — Sprint 9; keep until then, it drives live plans) | ~4% |
| **Delete** | scheduler doubles/long-run machinery, permanent-1 intensityModifier, dead params | <1% |

### 6.2 App (`apps/mobile`, ~14.8k LoC)

| Category | Modules | ~LoC share |
|---|---|---|
| **KEEP** | Database, Storage, AthleteModelService, onboardingModel, verdicts, coachNote, validation/, sessionWorkoutMatch, wearableConnections, supabaseClient, avatarUpload, previewSeed/DevPlayground, most screens/components/ui, main.css | ~72% |
| **Minor refactor** | SyncService (outbox, uid() fix, split wearable concerns), trainingStore (thresholds→engine), sessionOverrides (sync pins), fitnessAge (model→knowledge), goals, Injuries.jsx + SessionRunner (extract logic), App routeMeta | ~16% |
| **Major refactor** | **PlanService** (the D15 re-seat: policy→engine, keep memoisation/calendar/glue) | ~6% |
| **Replace** | atlas/signals + athletePillars + data/sports (re-base on the Performance Model) | ~4% |
| **Delete** | SessionProgress.js, legacy primer strip (after engine stops emitting P1–P4), TrainingCalendar.jsx (confirm), legacy v3 keys | ~2% |

### 6.3 Infrastructure & web

**KEEP:** Supabase schema + RLS posture, edge functions (rename/dedupe zoning later), test
corpus (117 files) + golden-master pattern, monorepo layout, apps/web UI + mockApi seam +
privacy-split types. **Minor refactor:** CI (gate deploy on tests), migrations (adopt ledger
+ reconcile schema.sql), web auth middleware. **Replace:** `apps/web/lib/derive.ts` (→ engine
`rollUp()` server-side, per TAS Appendix A). **Build new:** teams/team_members/player_status
+ RLS tests; `packages/shared` stays empty until the web app consumes the real engine.

### 6.4 Headline estimate (LoC-weighted, whole repo)

- **Reusable without change: ~60%**
- **Requiring refactor (minor+major): ~30%**
- **Requiring replacement or deletion: ~10%**

Consistent with the EDS §18 stance: a re-seating, not a rewrite. The replace slice is almost
entirely the two "second halves" (legacy sport model, Atlas diagnosis, derive.ts) whose new
halves already exist.

---

## 7. Task 7 — Target Architecture Map

The complete target, per the frozen set (TAS layers, EDS decision graph, KA domains). This is
a restatement for traceability — the frozen docs are authoritative.

```
L0 GOVERNANCE  Constitution ▸ Ontology + Knowledge Architecture ▸ EDS ▸ engine/01-05 ▸ TAS
                                    │ validates everything below
L2 KNOWLEDGE (versioned data, no dependencies)
   12 domains: Athlete · Sport(SKB) · Quality&Adaptation · Movement · Exercise ·
   Programming · Recovery/Fatigue/Load · Constraint · Injury · Evidence&Confidence ·
   Validation · Learning
   Each entry: {id, rule, value, appliesTo, evidenceLevel L1–L5, confidence, source,
   lastReviewed} · registries validate on load · composed into a versioned KnowledgeSet
                                    │ injected (never imported by name)
L1 THE ENGINE (pure, isomorphic — client AND server)
   orchestrator → decision graph → validator suite → explain read-model
   ┌─ Reasoning spine (D1→D16) ──────────────────────────────────────────────┐
   │ D1 athlete assessment → D2 demand (SKB) → D3 position refinement        │
   │ → D4 LIMITING-FACTOR DIAGNOSIS ★pivot → D5 priority qualities           │
   │ → D6 strategy → D7 block objective → D8 weekly objective                │
   │ → D9 session objective → D10 movement requirements                      │
   │ → D11 intervention selection (§34 hierarchy, stopping rule)             │
   │ → D12 dose (volume as OUTPUT) → D13 scheduling                          │
   │ → D14 VALIDATION ★ (16 validators, conflict order, report)              │
   │ → D15 runtime reflow (re-runs D9–D14, pending-only, freezes honoured)   │
   │ → D16 learning (async, priors only)                                     │
   │ Rails on every step: Constraints · Priors · Confidence                  │
   └──────────────────────────────────────────────────────────────────────────┘
   Public API (6 calls): plan · reflow · deriveReadiness/deriveLoad · validate ·
   explain · rollUp    — every output carries a decision trace + provenance stamp
   (engineVersion × knowledgeSetVersion)
                                    │ invoked by
L3 ORCHESTRATION (PlanService successor — impure adapter)
   four verbs only: fetch state · invoke L1 · cache derived artefacts (keyed by
   signature(state × knowledgeVersion × engineVersion)) · persist  + AI-dispatch
   ZERO coaching logic · ZERO mutable globals
L4 PLATFORM  Identity&Auth · Membership&Access (Org⊃Team⊃Athlete; is_coach_of()
   extends auth.uid(), default-deny) · Persistence&Sync (offline-first, portable
   priors+freezes, versioned migrations) · SERVER-SIDE derived coach surface
   (the only raw-data crossing) · Wearable anti-corruption layer · Audit log
L5 LEARNING (off the request path) — Athlete Learning (private) + Population
   Learning (aggregated, derived-only) → writes PRIORS, the only channel into L1
L6 EXPERIENCE  player app · coach dashboard · future native — render artefacts +
   the explanation read-model, capture input + Overrides, compute NO coaching
   Both surfaces consume the SAME L1 engine + L2 knowledge.
AI SEAM: substitutes a specific decision behind its contract, async, deterministic
   engine always runs first; AI proposes, VALIDATORS DISPOSE; key server-side only.
PRIVACY: raw vitals (HRV/sleep/RHR) never cross a person boundary; derived signals
   only; enforced by a build-failing validator; roll-up computed server-side.
```

**Decision flow** = the spine above. **Knowledge flow** = authored → validated on load →
registry → KnowledgeSet → injected → access traced → output stamped. **Configuration flow** =
nine categories, one home each; coaching science (L2) never mixes with coach preference
(config/overrides); no engine feature flag may change reasoning. **Data flow** = state in L4;
plans derived, cached, never stored as truth; freezes + priors portable.

**Current-to-target delta in one sentence per layer:** L1 exists and is ~40% re-seated (the
spine is live for run/cycle; D6/D12/D14/D16 missing; D15 in the wrong layer); L2 exists at
~20% coverage; L3 is PlanService with coaching logic and a mutable global still inside; L4 is
single-tenant-solid, multi-tenant-unready; L5 is seams only; L6 mobile mostly renders
(minus Atlas/A15), web renders mocks.

---

## 8. Task 8 — Implementation Backlog

Dependency-sequenced work packages, each ≤ ~1 focused day. Conventions: every WP ends with
`npm test` green; golden-master changes only via deliberate `UPDATE=1` re-baseline with
review; `build-parity.js` must stay green through every engine WP (build is never touched
until the final flip); frozen docs never edited. **Rollback for every WP = revert the PR** —
each is a small, independent branch. Effort: S ≤ ½ day, M ≈ 1 day.

### Phase A — Hygiene & safety (no dependencies; do first; all low-risk)

**WP-01 · Gate deploys on tests** — S
`deploy.yml` gains `needs:` on the test job (or a reusable workflow). *Accept:* a red suite
blocks Pages deploy (prove by pushing a deliberate failure to a branch). *Risk:* none.

**WP-02 · Fix the date-dependent test** — S
`tests/reflow-start-consistency.js` anchors to real `new Date()` (:41, :81). Inject a fixed
date. *Accept:* test passes on every weekday (run with faked TZ dates). *Risk:* none.

**WP-03 · Close the three determinism leaks (V4)** — M
Thread `asOf` through `PlanGenerator.js:163`, `deriveSeason` (`periodization.js:34`),
`continueBlock` (:125); derive from `profile.plan_start_date` per the established invariant.
*Accept:* new test — same profile, mocked different clock days ⇒ byte-identical plan; golden
master unchanged (dated profiles already deterministic). *Science check:* none (behaviour-
preserving for dated profiles). *Risk:* low; undated-profile output may legitimately shift —
review that diff.

**WP-04 · Wire D11 into Train Now (A5)** — S
`generateTrainNow` ctx (`PlanService.js:800`) gains `sport/power/priorityQualities/season/
skbIds` (same pattern as `gymCtx`). *Accept:* new test — run-athlete Train Now session
contains D11-consistent selections (no chest flyes); build Train Now byte-identical.
*Risk:* low.

**WP-05 · Reflow D11 regression test** — S
Clone `d11-runner-quality.js` to drive a run profile through `PlanService.getPhases()`/
`adaptedPhases()` (with `setRuntime`), asserting D11 content. Closes the "proven by
inspection only" gap. *Risk:* none.

**WP-06 · Engine-local test entry + worktree fix** — S
Give `packages/engine` a `test` script (run the engine-only subset) and document/automate the
worktree symlink (memory: worktrees resolve the engine to the main repo). *Accept:* engine
edits in a worktree fail the suite when broken. *Risk:* none.

**WP-07 · Migration discipline** — M
Adopt `supabase db push` + linked migration history; renumber to one convention; reconcile
`schema.sql` (add wearable_connections, workouts, RPCs, 008/010 columns); create a staging
project; add `.env.local.example`. *Accept:* fresh project bootstraps from the migration
chain alone. *Risk:* low (additive; no prod DDL).

### Phase B — Honesty band (Blueprint W1–W4; unblocks the AI seam and Team)

**WP-08 · Confidence authority tiers (S1/W1, V9)** — M
`knowledge/authority.js`: `authorityOf(entry) → gate|soft|reported`, driven by KB confidence;
the evidence→authority mapping is itself a KB entry (KA Domain 10). Consume it in
`load.js`/`trainingLoad.js` (ACWR formally `reported/soft`). *Accept:* unit tests per tier;
ACWR alone can never force anything (existing behaviour, now by mechanism not ad hoc).
*Science:* Impellizzeri 2019/2020 citations already in KB. *Risk:* low.

**WP-09 · Deload thresholds → KB** — S
`trainingLoad.js:128-136` (readiness 50/70, recovery ≤2/≥4) and `recovery.js` bands/modifiers
become KB entries with provenance. *Accept:* behaviour identical (golden master + runtime
tests unchanged); constants read via `kb.value()`. *Risk:* none (pure relocation).

**WP-10 · Recovery honesty (S2/W2, V10)** — M
Readiness scales intensity as well as volume (activate `intensityModifier`; map readiness
band → RPE/load adjustment via a KB entry); subjective wellness (stress/illness/travel from
`daily_metrics`) weighted ≥ objective in the readiness index; replace the app-side 0.7 travel
cap with a graded KB-sourced rule. *Accept:* new tests — low subjective + high objective ⇒
eased plan; illness ⇒ forced-deload unchanged; run archetype intensity drops on low
readiness. *Science:* Saw 2016 (subjective ≥ objective) — already cited in the KB. *Risk:*
medium (behaviour change by design; document in the re-baseline).

**WP-11 · Validator suite I: extraction scaffold + MRV (S3/W3, V1)** — M
Create `packages/engine/src/lib/validation/` with the validator contract
`validate(week, athleteState, knowledge) → {verdict, reason, confidence, authority}` + a
runner emitting a ValidationReport. Extract the MRV ceiling as the first named GATE validator
(construction may still pre-trim for efficiency, but the validator is authoritative).
*Accept:* golden master byte-identical; a synthetic over-MRV week is trimmed with a recorded
reason. *Risk:* medium — in-loop vs post-hoc trimming can diverge; keep the in-loop cap and
assert the validator finds zero residual violations.

**WP-12 · Validator suite II: duration honesty, equipment, purpose, injury** — M
Add four more validators (duration ceiling, equipment availability, session-purpose
coherence, injury contraindication) + the six-tier conflict order. Surface the
ValidationReport on `plan.meta`. *Accept:* each validator unit-tested with a violating
synthetic week; live plans produce all-pass reports. *Risk:* low-medium.

**WP-13 · Constraints-first injuries (S4/W4, V7)** — M
Pass real injuries into the live D10 call (`allocator.js:770-774` empty set → actual
`contraindicatedPatternsFrom`); on the D11 path the post-filter becomes a validator backstop.
Legacy path keeps the filter until its own flip. *Accept:* run athlete with a hamstring
strain never sees a hinge selected (not stripped after); injury tests + golden masters green
(build untouched). *Science:* existing injury profiles. *Risk:* medium.

### Phase C — Knowledge extraction (parallelisable after WP-11)

**WP-14 · Dose schemes → knowledge/programming (D12 enabler)** — M
Move `allocator.scheme()` tables + rest + power dosing into a Programming knowledge module
**keyed by (quality, phase)** with a style→quality bridge for the legacy path. This is the
Blueprint's D12 sprint, step 1. *Accept:* golden masters byte-identical through the bridge;
schemes carry provenance. *Risk:* medium (the bridge must reproduce the tables exactly).

**WP-15 · D11 weights + targets constants → KB** — S
FATIGUE_BUDGET/UNIT/transfer weights/SKB boost (`selectInterventions.js:16-53`), STYLE_TOP/
LEVEL_* (`targets.js:31-37`). *Accept:* behaviour identical; run/cycle golden master
unchanged. *Risk:* low.

**WP-16 · Scheduler penalties + periodisation profiles + sportLoad factors → KB** — S
*Accept:* identical output. *Risk:* low.

**WP-17 · Merge the two muscle models** — M
Fold `exerciseSimilarity` overrides (the more accurate profiles) into one canonical
per-exercise muscle table consumed by both volume accounting and substitution. *Accept:*
volume-accounting diffs reviewed deliberately (this is a *correction*, expect small target
shifts); substitution tests green. *Science:* the overrides encode the documented
rear-delt/hinge fixes. *Risk:* medium — re-baseline with review.

**WP-18 · Exercise ids + structured dose on items (V12)** — L → split
18a: add `exerciseId` to every generated item (S); 18b: migrate injury/despine/volume/primers
joins from name-regex to id (M); 18c: structured `dose {sets, reps, seconds, rpe, restSec}`
alongside the display string (M). *Accept:* rename-an-exercise test proves no silent
accounting break; golden master stable (additive fields). *Risk:* medium, mechanical.

### Phase D — Complete the re-seat (strictly ordered)

**WP-19 · Sprint 9: SKB-primary (W7)** — L → split into three
19a: D2/D11 read SKB `exerciseLibrary` transfer ratings + demand directly; derive
muscle-emphasis from demand for run/cycle (M). 19b: map the 8 unmapped SKB qualities or
route them via movement-specific SKB categories — **the swim vocabulary fix** (M). 19c:
retire `lib/sports/*` for D11 sports; SPORT_BLOCKS → SKB seasonalModel; one sport vocabulary
(M). *Accept:* run/cycle plans improve or hold on `d11-runner-quality.js`-style gates;
build-parity green; `sports/` imports gone from the D11 path. *Science:* SKB provenance
already per-item. *Risk:* HIGH — the second-biggest re-seat step; per-sport flip again.

**WP-20 · Swim re-seat** — M (after WP-19)
Add `'swim'` to `D11_SPORTS`; D11 selects from the swim SKB `exerciseLibrary` (upper-pull,
shoulder ER, anti-rotation, durability compound); differentiated days; proper dose. *Accept:*
new `d11-swim-quality.js` (upper-pull + shoulder + core present; NOT posterior-chain-only;
NOT under-dosed; days differentiated); swim golden-master archetypes re-baselined
deliberately; build-parity green. *Science:* `swimming.json` gymPhilosophy. *Risk:* medium —
the HANDOFF spec is detailed and validated by probe.

**WP-21 · D12 dose assignment by quality** — M (after WP-14)
Items on the D11 path dose from the quality's doseResponse (via the WP-14 knowledge module);
readiness scaling applies to both axes (WP-10). *Accept:* sprint-discipline runner gets
power-appropriate doses distinct from long-distance; nature-of-change gate. *Risk:* medium.

**WP-22 · Build-goal demand profiles (goal-as-sport)** — M
Author `goal-knowledge` demand profiles (get_stronger / build_muscle / functional) so D4
produces a real diagnosis for build athletes; **do not flip build selection yet** — parallel
output only, verified unused. *Accept:* build diagnosis non-empty + sane; golden master
byte-identical. *Risk:* low (parallel).

**WP-23 · Build + remaining sports flip** — L (after WP-19/20/21/22 all stable)
The final flip: build goals and gaa/rugby/soccer (requires authoring rugby/soccer SKB stubs
to depth or explicitly gating them) onto the diagnosis path; legacy greedy fill retired to a
fallback validator-checked path, then deleted. *Accept:* the big deliberate re-baseline;
per-goal nature-of-change gates (a bodybuilding plan must remain recognisably hypertrophy-
focused — Art 3). *Risk:* HIGH — the last, largest behaviour change; only after months of
D11 confidence.

### Phase E — Engine boundary (Blueprint W8; parallel with C/D after WP-11)

**WP-24 · Reflow into the engine (V2)** — L → split into three
24a: extract `weekTarget`/`missedWindowVolume`/epoch logic into engine `plan/reflow.js`,
PlanService delegates (M). 24b: move `adaptedPhases` policy (deload force/defer application,
multipliers, lightening, forgiveness) into pure
`reflowWeek(baselineWeek, runtimeState, knowledge) → AdaptedWeek` (M). 24c: PlanService
becomes L3 (memoise/calendar/Database glue; `_runtime` replaced by explicit args) (M).
*Accept:* parity test — old vs new reflow byte-identical on a matrix of runtime states
(the golden-master trick applied to the reflow); `reflow-start-consistency` + WP-05 test
green. *Risk:* HIGH — mitigate with the parity-first pattern that de-risked Sprint 8.

**WP-25 · The 6-call public API (T21)** — M (after WP-24)
`plan/reflow/deriveReadiness/deriveLoad/validate/explain` on the barrel; narrow subpath
exports; repoint the app's 20+ deep imports. *Accept:* app imports only the API; deep-import
lint rule added. *Risk:* medium (mechanical, wide).

**WP-26 · Engine/UI content split (V11)** — S
Readiness copy/theme tokens + Utils DOM helpers move to `apps/mobile`. *Accept:* engine
greps clean of `--moss|escapeHtml|svg`; screens unchanged. *Risk:* low.

**WP-27 · Provenance stamps** — S
`plan.meta.provenance = {engineVersion, knowledgeSetVersion}`; version the KB/data exports.
*Accept:* every generated plan + reflow output stamped. *Risk:* none.

**WP-28 · Portable freezes (V8)** — M
Persist pins/Train-Now snapshots/substitutions to the sessions row (or `session_pins`) via
SyncService, localStorage as cache; migration included. *Accept:* start on device A, open
device B ⇒ same frozen content (simulated two-namespace test). *Risk:* medium (conflict
semantics: frozen wins — per Art 10).

**WP-29 · Atlas re-base (V6)** — M
Atlas renders `getPerformanceModel()` capabilities + D4 gaps; pillar mapping becomes
presentation config; retire `atlas/signals` capability maths + `data/sports/`. *Accept:*
Atlas "focus" equals the engine's top limiting factor for sport athletes; one diagnosis.
*Risk:* low-medium (visible UI change — preview-verify).

**WP-30 · Explainability surfacing (V5)** — M → split
30a: D11 picks + legacy anchors carry rationale strings; plan meta carries the D4→D5→D9
chain summary (S). 30b: reflowed sessions get a "adjusted — why" badge from reflow reasons;
forgiveness surfaced in UI (was dev-only); substitution rationale shown (M). *Accept:*
preview-verified; no UI re-derivation (reads emitted reasons only). *Risk:* low.

**WP-31 · Sync outbox (V16)** — M
Queue failed/offline writes; drain on reconnect/sign-in; replace hand-parsed `uid()` with
`supabase.auth.getSession()`. *Accept:* airplane-mode write → reconnect → row lands in
Supabase (simulated); no behaviour change online. *Risk:* medium.

### Phase F — Team package (Blueprint W11; after WP-07; ideally after WP-25 for rollUp)

**WP-32 · RLS test harness** — M
Scripted pgTAP-or-SQL tests against staging proving: player sees own rows only; no
cross-player reads; raw-vitals tables reject any non-owner. Runs in CI against a shadow DB.
*Accept:* the harness fails when a deliberately over-broad policy is applied. *Risk:* low —
**do this before any Team DDL.**

**WP-33 · Team data spine** — M (after WP-32)
`teams`, `team_members`, `player_status` (derived-only columns), `is_coach_of()` SECURITY
DEFINER, additive coach-read policies on `player_status` ONLY; versioned migration.
*Accept:* RLS tests — coach reads own team's derived status; coach CANNOT read
daily_metrics/wearable_readings/set_logs; players can't see each other. *Risk:* HIGH —
mitigated by WP-32 + staging.

**WP-34 · Server-side rollUp + web live data** — L → split
34a: engine `rollUp(athleteState, knowledge) → CoachVisibleStatus` (pure; replaces
`derive.ts` per TAS Appendix A) + a scheduled edge function writing `player_status` (M).
34b: web auth middleware + swap `mockApi.ts` bodies for Supabase queries (M). *Accept:* grep
proves no raw-vital field name reaches web components (the check `derive.ts` already
rehearses); dashboard renders live team. *Risk:* medium.

**WP-35 · Team schedule → constraints** — M
`teams.schedule` jsonb; PlanService/orchestrator feeds it into `deriveConstraints`/D13 so
player plans avoid sport-load clashes (pure generator untouched). *Accept:* player on a
team with Tue/Thu pitch sessions gets gym days placed around them. *Risk:* medium.

### Phase G — Learning seams (Blueprint W9; anytime after Phase B)

**WP-36 · Enrich the D4 neutral seams** — M
`injuryRisk` from the injury registry (region ↔ quality map); `trainability` from the
quality registry × training age. *Accept:* diagnosis tests show a hamstring-history runner's
durability limiter boosted; confidence unchanged. *Science:* injury profiles' risk factors.
*Risk:* low-medium (run/cycle re-baseline).

**WP-37 · Typed priors read-path** — M
`learnedPriors` (population defaults) formally read by D1 estimation + D12 dose with
per-prior provenance; still no writer (D16 stays future). *Accept:* overriding a prior in a
test changes the decision; live output unchanged (defaults identical). *Risk:* low.

**Sequencing summary:** A (all, immediately) → B (08→09→10; 11→12→13) → C parallel after 11 →
D strictly 19→20, 14→21, 22→…→23 last → E parallel after 11 (24 before 25) → F after 07+32,
34 after 25 → G anytime after B. Total: ~40 focused days of engineering across 37 packages.

---

## 9. Task 9 — High-Risk Areas & Mitigations

| # | Risk | Why it's the failure mode | Mitigation (before starting) |
|---|---|---|---|
| H1 | **Team RLS on the current backend posture** | First cross-user access in the product, written via hand-pasted migrations, no ledger, no staging, zero RLS tests; a mis-scoped coach policy on `daily_metrics` breaches Article 11 irreversibly | WP-07 + WP-32 are hard prerequisites; policies additive on `player_status` only; the build-failing privacy validator (SKB pattern) extended to schema tests |
| H2 | **The reflow re-seat (WP-24)** | Runtime coaching with a mutable singleton, date-sensitive memoisation, freeze interactions, and positional-key epochs — the most stateful code in the repo | The Sprint-8 pattern: build the pure function in parallel, prove old-vs-new byte-identical across a runtime-state matrix, then flip; keep `reflow-start-consistency` + WP-05 as canaries |
| H3 | **Golden-master erosion during intentional change** | The re-seat *means* re-baselining; each `UPDATE=1` is only as good as the human diff review of a 1.7 MB snapshot | Keep the three-layer net: byte-identical parity for untouched paths (`build-parity`), nature-of-change gates per flipped path (`d11-*-quality`), plus the validator suite (WP-11/12) as an independent floor — validators don't re-baseline |
| H4 | **Allocator decomposition (WP-14/23)** | 913 LoC, both engine paths, most leaked knowledge; the Blueprint's "highest-complexity step"; losing sound behaviour (supersets, axial, durations) silently | Extract knowledge first (WP-14/15) with byte-identical bridges; decompose only behind green goldens; `finaliseSlot` precedent shows the method works |
| H5 | **The swim/quality vocabulary gap (WP-19b/20)** | The fixed-10 PM vocabulary can't express "upper-pull" — the deep reason swim failed its first re-seat; same trap awaits gaa/rugby/soccer (sprint speed, change-of-direction unmapped) | Route movement-specific needs through SKB `exerciseLibrary` categories rather than forcing them into quality gaps; treat the 8 unmapped qualities as an explicit design decision, not a TODO |
| H6 | **PWA stale clients during schema churn** | Documented incident: old bundle wrote null fields post-deploy; Team-era schema changes raise the stakes | Version-check on `syncFromCloud` (client build vs a `min_client_version` row) + keep 010-style `NOT VALID` constraints; consider a forced-reload prompt on version mismatch |
| H7 | **Multi-device state divergence** | Device-local pins (V8) + no outbox (V16) + last-write-wins already produce silent divergence; worsens with any second surface (coach acting on stale `player_status`) | WP-28 + WP-31 before Team launch; `player_status` recomputed server-side on a schedule, never trusted from clients |
| H8 | **Architecture-astronautics on a solo cadence** | 37 packages, a 16-decision graph, 16 validators — for one part-time builder; the Blueprint's own Part 10.4 warning | Every WP ships user-visible value or closes a named violation; no speculative seams (Art 20); phases A/B are deliberately boring and finishable; stop-lines: D16, population learning, AI stay unbuilt until consumers exist |
| H9 | **Scientific pseudo-precision** | Seed-tagged quality/fatigue/transfer numbers (`needsReview: true`) now steer live plans for run/cycle; nobody has reviewed them since | A one-day evidence pass over `exerciseQualities.js` + `qualities.js` doseResponse before WP-21 doses from them; keep `needsReview` flags surfaced in `/dev` |
| H10 | **Performance of always-on diagnosis** | `generatePlan` builds the athlete model 1–2× per plan, per reflow memo-miss; fine now, quadratic-ish once Team recompute fans out | Fix the double-build (WP-03 adjacency); TAS signature-keyed caching lands with WP-24c |

---

## 10. Task 10 — Principal Engineer Review

*(As presented to a CTO and an Olympic Head of Performance.)*

### 10.1 Greatest strengths
1. **The pure, deterministic engine with a real regression net.** Same profile ⇒ same plan,
   golden-mastered, CI-gated, with a proven parallel-build/per-sport-flip migration method.
   This is the asset everything else stands on — most teams attempting a coaching-engine
   rebuild have nothing like it.
2. **The governance stack is real, not shelfware.** Frozen constitution → ontology →
   EDS → TAS, with the field-registry gate (a *test fails* if an athlete-model field lacks a
   documented decision justification) proving the docs are mechanically enforced.
3. **The diagnosis spine is live.** D1→D4→D5→D9→D10→D11 generating real plans for two sports,
   emitting rationale and confidence, with muscle volume correctly demoted to a ledger. The
   pivot the whole redesign hinges on is de-risked.
4. **Exemplary knowledge subsystems to generalise from:** the evidence KB (contested science
   tagged low-confidence and *demoted in code* — the ACWR handling is textbook Article 13),
   the injury system, and the SKB with per-recommendation provenance and a privacy validator.
5. **Privacy discipline ahead of need:** owner-only raw vitals end-to-end, service-role
   confined to edge functions, the web dashboard's privacy split rehearsed in its types
   before a single real row exists.

### 10.2 Biggest architectural weaknesses
1. **Split-brain duality everywhere** (§0's table): two engines, two sport models, two muscle
   models, two dose models, two diagnoses. Transitional by design — but every month it
   persists, the halves drift.
2. **No validation layer** (Article 19). Construction is its own judge; no independent floor
   exists for AI, overrides, or the re-seated paths.
3. **The runtime coaching half lives in the app** with a mutable global and mirrored
   formulas (TAS T7/T10/T18) — the largest single relocation outstanding.
4. **Knowledge coverage ~20%**; the dose model — the thing a coach would most want to review
   — is a code literal.
5. **The generation core cannot explain itself**, and what the runtime *does* explain
   (forgiveness, reshaping) never reaches the athlete.

### 10.3 Technical debt to address first
Deploy-not-gated-on-tests (one line); the three clock leaks; the Train Now D11 gap (an
athlete's ad-hoc session is programmed by an older brain than their plan — a coherence bug
users can feel); the date-dependent test; migration discipline + staging before any Team DDL.
All of Phase A is under a week and none of it blocks anything else.

### 10.4 Scientific debt to address first
(1) The seed-evidence pass (H9) — live plans now depend on unreviewed coefficients. (2) The
quality-vocabulary gap (H5) — it already broke swim; decide the SKB-library route *before*
re-seating more sports. (3) Recovery honesty (WP-10) — the system collects subjective
wellness and then under-uses it, contradicting its own cited evidence (Saw 2016). (4) The
deload thresholds' provenance (WP-09). Everything else scientific is genuinely defensible.

### 10.5 Design decisions that should never change
Purity/determinism + golden masters; freeze-on-commit; raw-vitals privacy by build-failing
validation; evidence-tagged knowledge with confidence read in code; diagnosis before
prescription; volume as ledger, never target; the re-seating method itself (parallel build →
parity proof → per-cohort flip); validators get the last word over any construction path,
including future AI.

### 10.6 Assumptions to challenge
1. **The fixed-10 quality vocabulary.** Adequate for run/cycle; already failed swim; will
   fail field sports. Challenge before Sprint 9, not after three more sports.
2. **"Build stays byte-identical" as a permanent invariant.** Correct during transition —
   but build users are the majority and are frozen out of every improvement (diagnosis,
   explainability, better dosing). Set an explicit expiry (WP-22/23), don't let the safety
   rail become the product.
3. **The MRV muscle ledger gating D11.** Volume landmarks are hypertrophy science (L5, low
   confidence in the KB); using them as the binding constraint on a *sport support* session
   deserves scrutiny — recoverability (fatigue budget) may be the truer ceiling, with MRV as
   a soft sanity check.
4. **Positional session keys + epoch guards + reclaim deletes** — a three-part invariant
   defending against a design smell; a per-plan id dissolves the class.
5. **Team at the back of the queue.** The stated product priority sits behind W8/W9 in the
   blueprint ordering; after WP-07/32, the data spine (WP-33) is buildable earlier than the
   sequence implies. Challenge the ordering deliberately rather than by default.
6. **"The app must stay a PWA for now"** — fine, but the stale-client incident plus Team-era
   schema churn makes the version-handshake (H6) non-optional, not nice-to-have.

### 10.7 What would prevent this becoming the world's best sports-science coaching platform?
Not the architecture — the trajectory there is right and unusually well-governed. Three
things could: (1) **assessment data poverty** — the diagnosis is capability-estimation-bound;
9 of 10 qualities are population priors from a questionnaire. Without cheap, real capability
measurement (EDS Q3) and wearable-derived capability signals, D4 stays a well-reasoned guess
and "diagnosis-first" risks being theatre. (2) **No outcome loop** — nothing yet checks
whether a diagnosis was *right* (did the limiter close? did the KPI move?). D16 is correctly
deferred, but a lightweight block-boundary re-diagnosis comparison (the falsifiable-
hypothesis check, EDS FR5) should not wait for the full learning system. (3) **Solo-cadence
concentration risk** — the platform's biggest single point of failure is that its
constitution, engine, and operations live in one head. The governance docs mitigate this
better than most VC-backed teams manage; keep them current as a matter of survival, not
compliance.

### 10.8 Next 90 days
1. **Weeks 1–2 — Phase A entire** (safety, determinism, Train Now, migration discipline).
2. **Weeks 3–6 — Phase B** (confidence tiers, recovery honesty, validator suite I–II,
   constraints-first) + the H9 seed-evidence pass.
3. **Weeks 7–10 — WP-19 Sprint 9 (SKB-primary) then WP-20 swim re-seat** — one sport model,
   four D11 sports, the vocabulary decision made properly.
4. **Weeks 11–13 — WP-24 reflow re-seat (parity-first) + WP-30 explainability surfacing.**
5. **In parallel, low-intensity:** WP-32 RLS harness + WP-33 Team data spine on staging — so
   the Stage-5 product priority is unblocked the moment the coach surface is wanted.
Deliberately *not* in the 90 days: the build flip (WP-23), D16/learning, AI — each needs the
above to land first.

---

## Appendix — Source materials for this audit
Five parallel deep-audits (2026-07-03): frozen governing set digest (35-point checklist);
Sprint 1/2 document digest + staleness audit; `packages/engine` deep audit (module inventory,
R1–R53, leakage catalogue, dual-engine map); `apps/mobile` audit (A1–A15, data-flow
verification, state/persistence); infrastructure audit (Supabase/migrations/RLS, wearables,
117-file test suite + CI, monorepo tooling, apps/web). Verified against `HANDOFF.md`
(2026-07-03) and `docs/architecture/ATHLETE-MODEL.md`.
