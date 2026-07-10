# Decision-Engine Refactor Roadmap & Contracts

_Companion to [01-PANEL-REVIEW.md](01-PANEL-REVIEW.md). Covers review outputs §7 (modular
architecture), §8 (folder structure), §9 (data contracts), §10 (refactor plan), §11 (quick wins),
§12 (long-term roadmap)._
Date: 2026-06-23.

> **Status banner (2026-07-09 governance sprint):** ARCHIVE-in-place (2026-06-23). The migration it plans (phases 0–5) is complete, and the delivered engine follows the EDS's diagnosis-first D1–D16 architecture rather than the GoalModule/SportModule registries specified here. Kept in place because the frozen EDS links it; its §9 frozen PlanOutput contract remains load-bearing. This document is preserved as written; current state lives in `HANDOFF.md`; classification in `docs/DOCUMENTATION-INDEX.md`.

> **Role in the doc set.** This is the **software design & build plan** — the orchestrator target,
> folder structure, typed data contracts, and the phased migration that operationalise the engine
> design. A *foundational* spec governed by the **[Engine Design Specification](00-ENGINE-DESIGN-SPECIFICATION.md)** (the EDS);
> **the EDS wins** on any conflict. **Canonical home for:** the target architecture's *structure*
> (folders, typed contracts), phase sequencing, quick wins, and test strategy. The EDS's migration
> (Part XI) reframes and extends this plan around the decision architecture — read them together.
> **Find elsewhere:** laws & decision architecture → [00](00-ENGINE-DESIGN-SPECIFICATION.md);
> evidence → [01](01-PANEL-REVIEW.md); sport schema → [03](03-SPORT-KNOWLEDGE-BASE.md); physiological
> metrics → [04](04-PHYSIOLOGICAL-FRAMEWORK.md). Current build status lives in the running docs
> (`HANDOFF.md`, `CLAUDE.md`). See the [index](README.md).

## Guiding constraints (non-negotiable)

1. **Refactor, don't rewrite.** Every step preserves behaviour unless explicitly flagged as a
   behaviour change (only Phase 3 is).
2. **The PlanOutput contract is frozen.** Screens depend on
   `{ phases:[{ id, title, range, weeks:[{ num, deload, taper, theme, sessions:[{ title, focus,
   duration, items, intensity }] }] }], totalWeeks }` and on item fields `{num, name, sets, rpe,
   note, restSec, group, superset, tag}`. Internal refactors must not change it.
3. **Stay green on `node tests/*.js`** at every commit, and add the golden-master net (Phase 0)
   before touching the pure core.
4. **The pure generator stays pure** — no I/O, no clock reads except via the injected
   `plan_start_date`/`event_date`. Adaptation stays a read-time projection.
5. **Reuse, don't duplicate.** Existing utilities to build on rather than reinvent: `focusLabel`,
   `muscleContribution`, `parseSetCount`, `withinEpoch`, `deriveSeason`, `resolveLifts`,
   `availableEquip`, the `volume.js` helpers, `combinedMultiplier`.

---

## §8 Folder structure (target)

Built **in place first** under `apps/mobile/src/lib/` (lowest risk), then physically relocated to
the reserved `packages/engine` workspace in Phase 5. Target shape:

```
packages/engine/src/
  core/
    orchestrator.js      # generatePlan pipeline — coordinates modules, holds NO domain knowledge
    contracts.js         # JSDoc typedefs + runtime validate*() for every contract below
  goals/
    _schema.js
    strength.js  hypertrophy.js  functional.js  athletic.js
    index.js             # registry: id -> GoalModule
  sports/
    _schema.js
    running.js  cycling.js  swimming.js  rugby.js  soccer.js  gaa.js
    index.js             # registry: id -> SportModule
  injuries/
    _schema.js
    profiles/ acl.js hamstring.js groin.js shoulder.js achilles.js low_back.js knee.js
    index.js             # registry: region -> InjuryProfile
  recovery/   recovery.js       # -> RecoveryOutput
  load/       load.js           # -> LoadOutput
  progression/
    _schema.js  strength.js hypertrophy.js power.js athletic.js  index.js
  periodization/   allocation/   scheduling/
  knowledge/
    kb.js                # loader + get(id) -> { value, ...provenance }
    rules/ volume.json acwr.json readiness.json taper.json frequency.json ...
  index.js               # public API: { generatePlan } + selected internals for /dev + tests
```

Consumers (`PlanService`, screens, `/dev`, tests) import only `packages/engine` (or, pre-Phase-5,
`src/lib/`). New sport/injury/metric/progression = **a new file + a registry entry, zero `core/`
edits.**

---

## §9 Data contracts

Each is a JSDoc `@typedef` in `core/contracts.js` plus a `validate<Name>()` that throws in dev /
returns `{ok,errors}` in prod. Contract tests assert every module's output validates.

```js
/** @typedef {Object} AthleteProfile  // EXISTING shape — documented, not changed
 *  goal_type, strength_style?, sport?, sport_intent?, run_discipline?, event_date?,
 *  experience{gym}, availability{days_per_week, session_minutes, days[]},
 *  lifts{squat,bench,deadlift,ohp,pull}, lifts_source, access[], sex, bodyweight_kg,
 *  plan_start_date, plan_weeks, load_overrides */

/** @typedef {Object} GoalModule
 *  id, frequencyPriority:number, volumeScalar:number,
 *  intensityRange:{minRpe,maxRpe}, progressionModelId:string, recoveryDemand:'low'|'med'|'high',
 *  emphasis:{[muscle]:number}, exercisePriority:string[] */

/** @typedef {Object} SportModule
 *  id, label,
 *  movementDemands:string[], forceDemands:'low'|'med'|'high', velocityDemands:'low'|'med'|'high',
 *  energySystems:{ atp_pc, glycolytic, aerobic },          // 0..1 emphasis
 *  injuryPatterns:string[],                                  // injury profile ids
 *  keyMuscles:string[], performanceDeterminants:string[], commonDeficiencies:string[],
 *  accessoryPriorities:string[],                             // exercise ids
 *  conditioningPriorities:string[],                          // documented; engine is gym-only today
 *  emphasis:{[muscle]:number},
 *  seasonModifiers:{ off:number, pre:number, in:number, transition:number },  // volume scalars
 *  priorityExercises:string[],                               // ordered; ×1.35 in allocator
 *  periodizationByDiscipline?:{ [disc]:{ off, pre, in, transition } } */     // run sprint/middle/long

/** @typedef {Object} InjuryProfile
 *  id, region,
 *  riskFactors:string[],
 *  contraindicatedPatterns:{ protect:[], early_motion:[], loading:[], return_to_sport:[] },
 *  preventionExercises:[{ id, dosing, progression:string[], evidenceId }],   // evidenceId -> KB
 *  returnToPerformance:string[] */

/** @typedef {Object} RecoveryOutput            // the contract the brief specifies
 *  readinessLevel:'high'|'moderate'|'low'|'unknown',
 *  volumeModifier:number,      // 0.5..1.0
 *  intensityModifier:number,   // 0.8..1.0 (RPE/load scaling)
 *  sessionOverride:null|'deload'|'rest'|'easy'  // illness/travel/very-low → override */

/** @typedef {Object} LoadOutput                // the contract the brief specifies
 *  riskLevel:'low'|'moderate'|'high',
 *  loadModifier:number,        // 0.5..1.0
 *  loadRecommendation:string,  // plain-English, coach-readable
 *  inputs:{ acwr:number|null, acuteAbsolute:number, weekOnWeekChange:number },  // report, don't gate
 *  confidence:'low'|'moderate' */              // ACWR-derived = low (see review §3.2)

/** @typedef {Object} ProgressionModel
 *  id, trigger, increment, deloadTrigger, regressionTrigger */

/** @typedef {Object} KnowledgeEntry
 *  id, rule, value, evidenceLevel:'L1'..'L5', source, confidence:'high'|'moderate'|'low',
 *  lastReviewed:'YYYY-MM-DD', appliesTo:string[] */

/** @typedef {Object} PlanOutput  // FROZEN — see constraints */
```

**Orchestrator composition rule:** recovery + load + injury each return a modifier/override; the
orchestrator composes them conservatively (`min` of volume modifiers; `sessionOverride` wins;
injury contraindications are a hard selection filter). No module mutates another's output.

---

## §10 Refactor plan (staged, low-regression)

Sequenced to the owner's priorities: **KB → sport modules → recovery/load contracts.**

### Phase 0 — Safety net  _(prereq; ~0.5 day)_
- Add `tests/golden-master.js`: serialise `generatePlan(profile)` over the archetype matrix from
  [../decision-engine-evaluation.md](../decision-engine-evaluation.md) §8 (build × sport × levels
  × days × minutes × equipment + injury cases). Commit the snapshots.
- Assert **byte-identical** output through Phases 1–2. This is what makes the refactor safe.

### Phase 1 — Evidence Knowledge Base  _(priority #1)_
- Create `knowledge/kb.js` + `knowledge/rules/*.json` and the `KnowledgeEntry` schema/validator.
- Migrate existing constants into KB entries — **same numbers**: MEV/MAV/MRV
  ([muscleVolume.js](../../apps/mobile/src/data/muscleVolume.js)), ACWR cut-offs + multipliers
  ([trainingLoad.js](../../apps/mobile/src/lib/trainingLoad.js)), readiness bands
  ([Readiness.js](../../apps/mobile/src/lib/Readiness.js)), taper %, volume scalars
  ([program.js](../../apps/mobile/src/lib/strength/program.js)), level multipliers
  ([targets.js](../../apps/mobile/src/lib/strength/targets.js)).
- Point the modules at `kb.get(...)`. Tag contested entries (ACWR, MRV ceiling, Nordic)
  `confidence:"low"`.
- Tests: golden-master unchanged; new **KB-coverage test** (every engine threshold has an entry);
  **staleness test** (warn on `lastReviewed` older than N months).
- Surface provenance in `/dev`. **Non-breaking.**

### Phase 2 — Pluggable sport modules  _(priority #2)_
- Define `sports/_schema.js` (`SportModule`) + `sports/index.js` registry.
- Extract `SPORT_EMPHASIS`, `SPORT_PRIORITY`, `run_*` emphasis/priority (`program.js`) and the
  sport `PROFILES` + `run_discipline` branches (`periodization.js`) into
  `sports/{running,cycling,swimming}.js`. `resolveProgram`/`resolvePeriodization` become **thin
  registry lookups** (`sports.get(profile.sport)`).
- Add **`rugby.js`, `soccer.js`, `gaa.js` as data-only scaffolds** (not yet exposed in
  onboarding) to *prove* a new sport needs zero core edits — and to seed the Team package.
- Tests: golden-master **identical** for run/cycle/swim; a new test that a scaffold sport
  produces a valid plan; `validateSportModule` over the registry.
- **Non-breaking** for existing sports.

### Phase 3 — Recovery + Load contracts  _(priority #3 — intentionally changes behaviour)_
- `recovery/recovery.js`: wrap `Readiness.js`, emit `RecoveryOutput`. **Add subjective-wellness
  ingestion** (sleep quality, soreness, mood, stress, energy — a light daily check) weighted ≥
  HRV (review §3.3); smooth HRV on the 7-day trend; map **illness / travel / very-low readiness →
  `sessionOverride`** (review §4, weakness 4).
- `load/load.js`: wrap `trainingLoad.js`, emit `LoadOutput`. **Demote ACWR from gate to one
  low-confidence input**; report absolute load + week-on-week change alongside (review §3.2);
  `confidence:"low"` on ACWR-derived risk.
- Move the readiness/load→multiplier blend **out of `PlanService`** into these modules;
  `PlanService` only *consumes* `RecoveryOutput` + `LoadOutput` and composes them.
- Tests: contract tests for both; **NOT under golden-master** (behaviour changes by design) —
  instead a `/dev` before/after comparison + targeted scenario tests (illness → override, low
  readiness → volume cut, high ACWR no longer hard-cuts on its own).

### Phase 4 — Data-driven injury module  _(later)_
- `injuries/profiles/*.js` (`InjuryProfile`) + tags on the exercise DB
  ([strengthExercises.js](../../apps/mobile/src/data/strengthExercises.js)) replacing regex
  `blockedPatterns`.
- Encode evidence-graded **prevention protocols** with dosing/progression: Copenhagen (groin,
  41% — Harøy 2019), neuromuscular warm-up patterns (FIFA 11+), Nordic (hamstring, *conditional*).
- Feed contraindications into the **allocator candidate filter** (build-right-first) instead of
  post-hoc substitution; keep the rehab-session fallback for high-severity cases.
- Tests: parity with current injury behaviour on existing cases + new prevention-dosing tests.

### Phase 5 — Extract to `packages/engine`  _(long-term)_
- Once modules are contract-tested, physically move the engine from `apps/mobile/src/lib/` into
  the reserved `packages/engine` workspace; expose a clean public API; update imports to
  `@performance-os/engine`.
- Unlocks reuse by `apps/web` (coach dashboard) and a future Claude AI layer behind `PlanService`
  (the deterministic engine + `RecoveryOutput`/`LoadOutput` are clean inputs an AI can consume or
  override — never call Claude with a key in the browser).

---

## §11 Quick wins (safe, high-confidence — ship anytime, independent of phases)

| Win | Where | Note |
|---|---|---|
| Equipment-filter the activation primer (Band Pull-Apart leak) | `FUNCTIONAL_PRIMER` in [strength.js](../../apps/mobile/src/lib/plan/strength.js) | swap to a no-kit alternative when no band |
| Session **titles from realised contents** | wire titles to `focusLabel(muscleVol)` (already exists) in [allocator.js](../../apps/mobile/src/lib/plan/allocator.js) / [scheduler.js](../../apps/mobile/src/lib/plan/scheduler.js) | trust fix |
| Replace vestigial endurance copy ("build the aerobic engine") | `PHASE_META`/`themeFor` in [PlanGenerator.js](../../apps/mobile/src/lib/PlanGenerator.js) | gym-appropriate text |
| "You're at target — extra is optional" + expose volume `_lastForgiven` | `PlanService.js` + plan screen | transparency; reframes the "fill the time" instinct (review §6) |
| Lead sport sessions with the sport's priority pattern (not squat/hinge) | already partly handled by `structureItems` anchor reorder — verify for swim/cycle | sport specificity |

---

## §12 Long-term roadmap

1. **This pass:** docs (panel review + this roadmap).
2. **Phases 0–3:** KB → sport modules → recovery/load contracts (the owner's priorities).
3. **Phase 4:** data-driven injury + evidence-based prevention protocols.
4. **Phase 5:** extract to `packages/engine`; reuse across `apps/mobile` + `apps/web`.
5. **Then (separate roadmap items, already on the product North Star):** Team-package constraints
   (coach schedule → per-player plan constraints) consuming the same modules; a Claude AI layer
   behind `PlanService` consuming `RecoveryOutput`/`LoadOutput`/the deterministic plan; eventual
   real endurance-session programming via a `conditioning/` module mirroring `sports/`.

---

## Testing & validation strategy (all phases)

- **Golden-master / snapshot** — Phases 0–2 must be byte-identical; the regression guarantee.
- **Per-contract `validate*()`** tests — every module output validates against its schema.
- **KB-coverage + staleness** tests — no orphan magic numbers; science is forced to be reviewed.
- **Invariants kept green** (existing sweep): no crashes, determinism, sessions == requested days,
  no empty sessions, equipment legality, level gating, weekly MRV ceiling.
- **Behaviour-change gate (Phase 3 only):** `/dev` before/after + scenario tests, since recovery/
  load outputs change by design.
- **App still runs:** `npm run dev` from repo root after every change (project hard rule).
