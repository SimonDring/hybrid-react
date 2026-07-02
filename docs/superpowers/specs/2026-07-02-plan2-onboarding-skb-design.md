# Sprint 3 — Plan 2: Sport/Position-driven onboarding + SKB demand wiring — Design Spec

- **Status:** Approved design (2026-07-02). Ready for implementation planning.
- **Builds on:** Plan 1 (Athlete & Performance Model foundation, merged) + Sprint 0 (test safety net + CI gate, merged).
- **Governs against (frozen, do NOT edit):** Constitution, EDS, Decision Ontology, Knowledge Architecture, TAS.

---

## 0. One-paragraph summary

Plan 1 built the Athlete Model + a Performance Model whose `demandProfile` is a `null` scaffold. This
plan realises the user's coaching philosophy — **the sport + position carry the demand (from the
evidence-backed Sport Knowledge Base); the athlete supplies the subjective/individual layer; the
engine couples them** — by (a) revising onboarding so the sport list is **derived from the SKB
registry** (authoring a flagship SKB profile automatically makes it selectable), with a
position/event sub-step sourced from that sport's SKB `positions`, plus the missing individual
questions (session duration, measurable training age, movement competency); and (b) **switching on
the demand**: populating the Performance Model's `demandProfile` from the SKB's `physicalProfile`
qualities + the chosen position. The **live plan generator is unchanged** — an adapter maps the
richer sport+position back to today's engine sport/discipline, and the (now-green, CI-gated) golden
master proves plans are unchanged for existing archetypes. Computing limiting factors / priority
adaptations and making the plan *position-aware* are the **next** (diagnosis) sprint — now unblocked
because the athlete + demand are both modelled.

---

## 1. Decisions locked with the user

| # | Decision | Choice |
|---|---|---|
| A | Plan 2 depth | **Capture + demand profile.** Rich onboarding capture INTO the model + populate `demandProfile` from the SKB. Live plan generation unchanged. Diagnosis (limiting factors → plan) is the next sprint. |
| B | Sport coverage | **SKB is the single source of truth.** The onboarding sport list is derived from the SKB registry, gated to sufficiently-authored profiles (`completeness()`); authoring a new flagship profile auto-adds it. |
| C | Sport → plan mapping | A resolver maps each SKB sport → the live engine sport module (+ discipline) that plans it, with a sensible default + per-sport override, so the live plan stays sane. |
| D | Goal framing | Sport athletes: outcome is implicit (*perform in your sport*) — the "training style" question is dropped for them. Build (non-sport): keep outcome selection (get stronger / build muscle / general health). |
| E | New questions | Session duration, measurable training age (years RT + years sport), light movement-competency (squat/hinge/press/pull). |
| F | Safety net | Backward-compatible: golden master stays green for existing archetypes; new tests for the SKB→demand mapping and the new-question→model mapping. |

---

## 2. Part 1 — What exists (from exploration)

- **SKB (`packages/engine/src/data/sport-knowledge/*.json`, accessor `lib/sportKnowledge/`):** 8 flagship
  profiles (cycling, gaelic_football, hurling, running_sprint/middle/long, swimming, triathlon) + 2
  stubs (rugby, soccer). Each flagship carries a 21-section contract including `physicalProfile.qualities`
  (18–19 ranked qualities, importance 1–10, with provenance), `positions` (event/role archetypes with
  primary qualities + injuries + gym priorities), and `injuryProfile`. Accessor exposes `get(id)`,
  `has(id)`, `all()`, `ids()`, `section(id,name)`, `normalizeSportId(id)`, `completeness(id)`. **Only the
  reflow `decisionRules` are consumed today; the demand profiles + positions are dormant.**
- **Live engine sport modules (`lib/sports/*.js`, registry `index.js`):** run, cycle, swim, rugby, soccer,
  gaa. Each provides `emphasis` (per-muscle), `priorityExercises`, `periodization`, `seasonModifiers`,
  `systemicFactor`. `resolveProgram`/`resolvePeriodization` consume these; **only running uses
  `byDiscipline` (sprint/middle/long); no module uses position.**
- **Onboarding today:** offers 3 hard-coded sports (run/cycle/swim); captures `run_discipline` for running;
  no position concept; no session-duration/training-age-years/movement-competency questions.
- **Performance Model:** `derivePerformanceModel` returns `demandProfile: null` (scaffold).
- **Athlete Model (Plan 1) already has the fields** Plan 2 needs to populate: `sportingContext.position`,
  `competitiveLevel`, `weeklySportSchedule`; `trainingHistory.resistanceTrainingYears`, `sportYears`,
  `movementCompetency`; `constraints.sessionDurationMin`. **Plan 2 populates them; it does not extend the
  schema** (except the demand-mapping knowledge, below).

---

## 3. Architecture

```
                 SKB registry (sportKnowledge)  ── single source of truth for selectable sports
                        │  completeness()-gated → selectableSports()
                        ▼
Onboarding wizard:  Sport → Discipline/Position (from SKB positions) → new individual questions
                        │  (apps/mobile: onboardingModel — answers → model inputs, backward-compatible)
                        ▼
                 Athlete Model  (Plan 1 schema; sportingContext.position + individual fields populated)
                        │  derivePerformanceModel(model, knowledge, asOf)
                        ▼
                 Performance Model  ── demandProfile NOW populated from SKB physicalProfile + position
                        │  athleteModelToEngineInput(model)  — maps sport+position → legacy engine sport/discipline
                        ▼
                 Engine input → generatePlan(...)  (UNCHANGED; golden master green)
```

### 3.1 New / changed modules
```
packages/engine/src/
  data/
    sportQualityMap.js         # NEW: SKB quality vocab → Performance-Model quality ids (+ which SKB
                               #      qualities have no PM home yet, documented)
    sportEngineBinding.js      # NEW: SKB sport id → { engineSport, discipline? } resolver (default + overrides)
  lib/sportKnowledge/
    selectable.js              # NEW: selectableSports() — SKB ids gated by completeness; positionsFor(sportId)
  lib/performance/
    demandProfile.js           # NEW: buildDemandProfile(sportId, positionId) → quality→importance (0..1).
                               #      Imports the in-package SKB accessor directly (same pattern as
                               #      estimation.js importing qualities/capabilityPriors) — so
                               #      derivePerformanceModel's (model, asOf) signature is UNCHANGED.
    derivePerformanceModel.js  # MODIFY: populate demandProfile via buildDemandProfile (signature unchanged)
  lib/adapters/
    athleteModelToEngineInput.js  # MODIFY: map sportingContext.primarySport+position → engine sport + run_discipline
    profileToAthleteModel.js      # MODIFY: carry position; set primarySport as the SKB id

apps/mobile/src/
  components/OnboardingWizard.jsx  # MODIFY: SKB-driven sport step + position sub-step + 3 new question steps
  lib/onboardingModel.js           # MODIFY: BLANK_ANSWERS new fields; answersToProfilePatch backward-compatible;
                                   #         answersToAthleteModelInputs enriched with the new rich fields
  screens/Onboarding.jsx           # (unchanged wiring — dual-write already in place from Plan 1)
```

---

## 4. SKB-driven sport selection (Decision B/C)

- **`selectableSports()`** (`lib/sportKnowledge/selectable.js`): returns the SKB sports whose
  `completeness(id).score >= THRESHOLD` (flagships), each as `{ id, label, family, disciplineOf }`. Stubs
  (rugby/soccer) are automatically excluded until authored. **Authoring a new flagship JSON → it appears in
  onboarding with zero onboarding-code change.**
- **Sport family grouping:** running_sprint/middle/long collapse into one **"Running"** family with a
  discipline sub-step; other sports are their own family. `selectableSports()` returns the family list; a
  discipline/position step resolves the concrete SKB profile id.
- **`positionsFor(sportId)`**: reads `section(sportId,'positions')` → the list the position sub-step renders.
- **`sportEngineBinding.js`**: `bindingFor(skbSportId) → { engineSport, discipline? }`. Defaults via
  `normalizeSportId` (swimming→swim, cycling→cycle, running_*→run+discipline, gaelic_football/hurling→gaa);
  explicit overrides for the rest (triathlon→{engineSport:'run'} — its SKB names run as the binding
  constraint). The **adapter** uses this so the legacy engine still biases the plan. A sport with no clean
  binding is **not** offered (guards against generating a weak plan) — `selectableSports()` intersects
  completeness-gated ∩ has-binding.

---

## 5. Revised onboarding question set (Decision D/E) — existing wizard components

Reuse the wizard's `Chip`/`OptionGrid`/`Field`/slider primitives + `steps`-array pattern (no visual
redesign). Changes:

1. **Sport step** — options from `selectableSports()` (not the hard-coded `SPORTS`). For a sport athlete the
   **outcome is implicit** ("perform in your sport") — the build-only "training style" step does not show.
2. **Discipline/Position step** (sport path) — from `positionsFor(...)`. Running first picks discipline
   (sprint/middle/long → the SKB profile), then event/position; other sports pick position directly. Stored
   as `sportingContext.position` (+ the resolved SKB profile id as `primarySport`).
3. **Session duration** — new `Field`/slider: minutes per session → `constraints.sessionDurationMin`.
4. **Training age** — new: years resistance training (+ years in sport) → `trainingHistory.resistanceTrainingYears`
   / `sportYears`. The coarse level chip becomes an optional `selfRatedLevel` fallback.
5. **Movement competency** — new light step: squat/hinge/press/pull → novice/intermediate/advanced →
   `trainingHistory.movementCompetency`.
6. **Build (non-sport) path** — keep the outcome step (get stronger / build muscle / general health).

Every new/changed question is justified by the field-registry entry it populates (Plan 1's gate still
passes — these fields already have registry entries).

---

## 6. Switching on the demand (Decision A — the key wiring)

- **`sportQualityMap.js`**: maps SKB quality names → Performance-Model quality ids, e.g.
  `explosivePower → explosiveStrength`, `aerobicEndurance → aerobicCapacity`,
  `anaerobicEndurance → anaerobicCapacity`, `relativeStrength/maxStrength → maxStrength`,
  `reactiveStrength → reactiveStrength`, `mobility → mobility`, `stability/balance → stability`,
  `durability → robustness`. SKB qualities with no PM home yet (sprintSpeed, acceleration, coordination,
  changeOfDirection, rotationalPower, gripStrength, neckStrength, repeatSprintAbility) are **documented as
  unmapped** (they belong to future quality expansion / sport-skill layer, not this sprint's strength-seed
  vocabulary).
- **`demandProfile.js` — `buildDemandProfile(sportId, positionId)`**: imports the in-package SKB accessor
  directly (consistent with `estimation.js` importing `qualities`/`capabilityPriors`); reads
  `physicalProfile.qualities` (base) + the chosen position's `primaryQualities` (override/boost), maps via
  `sportQualityMap`, and returns `[{ qualityId, importance(0..1), source: 'skb', evidence }]`. Pure;
  deterministic. Unmapped SKB qualities are dropped (with a note), never crash on a stub/missing position.
- **`derivePerformanceModel(model, asOf)` (signature UNCHANGED):** now populates `demandProfile` via
  `buildDemandProfile(model.sportingContext.primarySport, model.sportingContext.position)` when a sport is
  present; stays `null` for non-sport. `limitingFactors`/`priorityAdaptations` remain scaffolded (next
  sprint). Because the SKB is in-package pure data, no new argument is threaded through — Plan 1's callers
  and tests keep working unchanged (only the demandProfile value differs for sport athletes).

---

## 7. Legacy engine compatibility (Decision F)

- **`athleteModelToEngineInput`**: maps `sportingContext.primarySport` (an SKB id) + `position` back to the
  legacy engine `sport` + `run_discipline` via `bindingFor(...)`, so `generatePlan` sees the same fields it
  reads today. Non-sport unchanged.
- **`profileToAthleteModel`**: for existing users, maps the legacy `sport`/`run_discipline` up to the SKB id
  + (best-effort) position, so the round-trip holds.
- **Golden master:** the Sprint-0 net (now green + order-insensitive) proves the existing archetypes still
  produce byte-identical plans through the round-trip. Backward compatibility is the gate.

---

## 8. Testing

Node scripts under `apps/mobile/tests/` (the Sprint-0 runner + CI gate now enforce these):
- `selectableSports` — derives from the SKB, completeness-gated, excludes stubs, includes a newly-authored
  flagship (fixture), and only returns has-binding sports.
- `sportEngineBinding` — every selectable sport maps to a valid engine sport module.
- `sportQualityMap` / `demandProfile` — SKB qualities map to PM ids; unmapped ones dropped; position overrides
  applied; deterministic; never throws on a stub/missing position.
- `derivePerformanceModel` — demandProfile populated for a sport athlete (evidence-backed), null for build.
- **Adapter round-trip** — new sport+position models map to a valid engine input; **the existing engine
  golden master stays green** (no new drift for the current archetypes).
- `answersToAthleteModelInputs` — the new questions populate the model fields; legacy profile mapping unchanged.
- Wizard: browser-verified (preview) — SKB-driven sport list renders, position sub-step populates, new
  questions persist into `users.profile.athlete_model`.

---

## 9. Scope boundaries (non-goals this plan)

- **No plan-generation change from demand** — `demandProfile` is populated + surfaced in the model, but
  exercise selection / emphasis still come from today's engine (adapter-mapped). Position-aware plans =
  next sprint.
- **No diagnosis** — `limitingFactors` / `priorityAdaptations` stay scaffolded.
- **No new engine sport modules / no SKB authoring** — Plan 2 wires what's authored; authoring rugby/soccer
  to flagship (which would auto-add them) is separate content work.
- **No visual redesign** — question content only, existing wizard components.
- **No new quality ids** — SKB qualities with no Performance-Model home are documented as unmapped, not
  invented here.

---

## 10. Success criteria

- Onboarding's sport list is **derived from the SKB** (authoring a flagship profile auto-adds it), with a
  position sub-step from the SKB.
- Session duration, measurable training age, and movement competency are captured into the Athlete Model.
- The Performance Model's `demandProfile` is **populated from the SKB** (sport + position), evidence-tagged.
- The live plan is **unchanged** — golden master green; existing archetypes byte-identical.
- New functionality covered by tests; frozen docs untouched.
- The platform now models both **who the athlete is** and **what their sport/position demands** — the two
  inputs the diagnosis engine will couple next.
