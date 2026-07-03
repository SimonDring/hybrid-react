# Design spec — Session objective (D9) + movement requirements (D10) · Blueprint Sprint 7 (W6b)

_Date: 2026-07-02. Status: approved for planning. Author: engine re-seating stream._

## 1. Context & why this sprint exists

The diagnosis-first rebuild has, so far, built the diagnosis (D4/D5) and the exercise-quality bridge
(Sprint 5). The next decisions in the chain are:

- **D9 · Session objective** — give each session *one named purpose* (a target quality + intensity
  zone + fatigue budget) instead of a body-part label. "The session title is its purpose" (EDS L7).
- **D10 · Movement/quality requirements** — translate that purpose into *what the session needs*
  (movement patterns + force-velocity profile + contraction emphasis), with injury-contraindicated
  patterns **subtracted up front** (EDS L8), and **before any exercise is named** (EDS P5). Output is a
  *spec*, not exercises — which is what makes interventions substitutable and explainable.

This is Blueprint **Sprint 7 / Wave W6b**: "Decide adaptation before exercise." The validation target
is the EDS's own worked pair (§22): an **in-season distance runner** and an **off-season novice
sprinter** — the *same sport* — must produce **categorically different** objectives/requirements (the
runner gets eccentric-hamstring durability and explicitly **no chest/arms**; the sprinter gets a
max-strength base). Today's engine treats both as muscle-emphasis variants.

**Scope decision (confirmed):** parallel, diagnosis-driven — model output only, nothing in
`generatePlan` reads it, both golden masters stay byte-identical. D9/D10 produce the *target spec* that
Sprint 8 (D11) will fill. The live title/selection change happens only at Sprint 8 (renaming sessions
now would break purpose-coherence, since content isn't re-selected yet).

## 2. Goal, non-goals, success

**Goal.** Two pure decisions that, per session, compute the objective (D9) and the movement/quality
requirements (D10), driven by the diagnosis + the goal, using the knowledge already built (the S5
quality tags, `doseResponse`, injury contraindications). Plus a small new knowledge table
(quality → movement requirements) and a read-only `/dev` readout showing the target-vs-current gap.

**Success (per blueprint + EDS §22):** the in-season-runner and novice-sprinter archetypes yield
**categorically different** objectives + requirements; D9 always emits all four fields; D10 requirements
**exclude contraindicated patterns**; the live plan is unchanged (both golden masters byte-identical).

**Non-goals (YAGNI / risk control):**
- No change to `generatePlan`, session titles, or exercise selection (that is Sprint 8 / D11).
- No D8 weekly-objective engine — per-session target-quality assignment is a simple deterministic
  round-robin over the block's priority qualities for this sprint.
- No dosing (sets×reps×load — that is D12) beyond the objective's intensity-zone/fatigue-budget label.
- No new onboarding, no schema change, no frozen-doc edits.

## 3. What we build

### 3.1 New knowledge — quality → movement requirements (`packages/engine/src/data/qualityMovementMap.js`)

The EDS's "adaptation→movement" knowledge, which does not yet exist. A pure, evidence-tagged table
mapping each of the 10 physical qualities → its ideal movement requirements, **reusing S5's
`FORCE_VELOCITY` vocab and the exercise `pattern` vocabulary** so the layers speak one language:

```js
QUALITY_MOVEMENT[qualityId] = {
  movementPatterns: string[],   // from the exercise pattern vocab: squat,hinge,lunge,hpush,vpush,hpull,vpull,carry,core,calf,iso,mobility
  forceVelocity: string,        // one of S5's FORCE_VELOCITY
  contraction: string,          // 'grinding' | 'controlled' | 'eccentric-emphasis' | 'explosive-concentric' | 'fast-ssc' | 'sustained' | 'isometric' | 'end-range'
  evidence: { level:'seed', confidence, source, needsReview:true }
}
```

Representative content (seed): `maxStrength → { [squat,hinge,hpush,vpush,hpull,vpull], 'maximal-force',
'grinding' }`; `robustness → { [hinge,lunge,calf,iso], 'controlled', 'eccentric-emphasis' }`;
`reactiveStrength → { [squat,lunge], 'ballistic', 'fast-ssc' }`; `explosiveStrength → { [squat,hinge],
'strength-speed', 'explosive-concentric' }`; `hypertrophy → { [squat,hinge,lunge,hpush,vpush,hpull,
vpull,iso], 'controlled-hypertrophy', 'controlled' }`; `strengthEndurance → { [lunge,carry,calf,iso],
'endurance', 'sustained' }`; `stability → { [core,carry,iso], 'isometric', 'isometric' }`;
`mobility → { [mobility], 'mobility', 'end-range' }`. The two cardio qualities (`aerobicCapacity`,
`anaerobicCapacity`) are **not gym-trained directly** — the map entries carry a documented
"gym-support only" note and are handled via the gym-support translation below (3.2), not by naming
gym movements for cardio. Accessor: `movementRequirementsFor(qualityId)` → the entry or `null`.

**Cardio → gym-support translation (`CARDIO_GYM_SUPPORT`).** The diagnosis legitimately ranks a cardio
quality as an athlete's top limiter (verified: a distance runner's #1 priority is `aerobicCapacity`),
but the **gym engine cannot train it directly** — it *supports* it. A small map translates a cardio
priority to the gym-trainable qualities that support it: `aerobicCapacity → [robustness,
reactiveStrength]` (durability + running-economy via tendon stiffness) and `anaerobicCapacity →
[strengthEndurance, maxStrength]`. This is what makes the distance-runner archetype produce the EDS's
exact gym prescription (eccentric hinge + reactive calf, **not** chest/arms) instead of an empty
requirement. Gym-trainable qualities pass through unchanged.

### 3.2 D9 — `packages/engine/src/lib/session/sessionObjective.js`

Two pure functions:

- `gymTrainableTargets(priorityQualities, goalPrimary)` → `string[]` — the ordered gym-trainable
  target qualities. For each priority quality (from `priorityAdaptations`): pass it through if it is
  gym-trainable; if it is a cardio quality, expand it via `CARDIO_GYM_SUPPORT` (3.1). De-duplicate,
  preserving order. Build athlete (empty diagnosis) → `[goalPrimary]` (strength→`maxStrength`,
  bodybuilding→`hypertrophy`, functional→`stability` as a balanced default). Empty + no goal →
  `['maxStrength']` fallback.
- `assignTargetQualities(priorityQualities, sessionCount, goalPrimary)` → `string[]` (one target
  quality per session): deterministic **round-robin** over `gymTrainableTargets(...)`
  (`targets[i % targets.length]`). This is why a distance runner (priority `aerobicCapacity` →
  `[robustness, reactiveStrength]`) gets durability + economy sessions, while a sprinter (priority
  `explosiveStrength`) gets power sessions.

- `deriveSessionObjective({ targetQuality, region, phaseIntent, deload, taper, season })` →
  ```js
  { purpose: string, targetQuality: string, intensityZone: string, fatigueBudget: {level, note}, rationale: string }
  ```
  - **intensityZone** — from `getQuality(targetQuality).doseResponse` (added in S5), adjusted:
    deload → drop a band ("~65%, RPE 6"); taper → keep intensity, note fewer sets; peak → top of band.
  - **fatigueBudget** — coarse `level` (`low|moderate|high`) from the quality's dominant `fatigueCost`,
    reduced for deload/taper and for **in-season sport** (protect the sport — the runner's "minimal
    fatigue"), with a plain-English `note`.
  - **purpose** — a sentence, e.g. "Develop max strength — lower body"; for in-season sport,
    "Maintain robustness — minimal fatigue". `region` is derived from the session's focus label.

### 3.3 D10 — `packages/engine/src/lib/session/movementRequirements.js`

- `deriveMovementRequirements({ targetQuality, region, level, contraindicatedPatterns })` →
  ```js
  { movementPatterns: string[], forceVelocity: string, contraction: string,
    contraindicated: [{ pattern, reason }], competencyNote: string|null, rationale: string }
  ```
  - Base from `movementRequirementsFor(targetQuality)`, **intersected with the session region** so
    requirements are session-appropriate (lower → {squat,hinge,lunge,calf}; upper → {hpush,vpush,
    hpull,vpull}; full → all; core → {core,carry,iso}).
  - **Subtract up front (L8):** remove any required pattern in `contraindicatedPatterns` (from
    injuries), recording `{pattern, reason:'injury'}`.
  - **Competency (L4):** for a **novice** (`level` = beginner) when the required `forceVelocity` is
    high-skill (`ballistic`/`strength-speed`), **downgrade** the force-velocity to `maximal-force`
    (keep the patterns) and record a `competencyNote` ("plyometric/Olympic velocity deferred — build
    the strength base first"). This reproduces the EDS novice-sprinter (max-strength base before
    plyometric RFD) without needing to remove movements.
  - `rationale` names the requirement in plain English ("heavy-slow hip-hinge + eccentric loading;
    knee-loaded squat patterns removed — injury").

- `contraindicatedPatternsFrom(blockedRegexes, exercises = EXERCISES)` → `Set<pattern>`: a pure helper
  mapping the injury system's **name-regex** `blockedPatterns` onto the **movement-pattern** vocabulary
  — a pattern is contraindicated when a majority (>50%) of its catalogue exercises' names match a
  blocked regex. This bridges the existing name-based injury data to D10's pattern-level requirements.

### 3.4 Assembly + app accessor + `/dev` readout

- `packages/engine/src/lib/session/sessionSpecs.js` — `deriveSessionSpecs({ priorityQualities,
  goalPrimary, sessions, level, phaseIntent, deload, taper, season, contraindicatedPatterns })`
  → an array parallel to `sessions`, each `{ objective, requirements }`. Pure/deterministic. **Region
  is derived per session** from `session.focus` inside the assembly (it varies session-to-session);
  `phaseIntent`/`deload`/`taper` are week-level, `season`/`level`/`goalPrimary`/`priorityQualities`
  are athlete/block-level. A helper `regionOf(focusLabel)` → `'lower'|'upper'|'full'|'core'` maps the
  focus label (e.g. "Lower", "Upper", "Push", "Pull", "Full body", "Core") to a region.
- App side (`apps/mobile/src/lib/`): a thin accessor pulls the Performance Model
  (`getPerformanceModel().priorityAdaptations`), `resolveProgram(profile)` (goalPrimary/season/style),
  the athlete level, and active injuries → `contraindicatedPatternsFrom(...)`, and returns the specs
  for a week's sessions. Used only by `/dev`.
- **`/dev` readout** (`DevPlayground.jsx`): under each session, show its **objective** (purpose /
  target quality / intensity zone / fatigue budget) and **requirements** (patterns / force-velocity /
  contraction, with contraindications noted), and the **gap** — what the current exercises actually
  train (from their S5 tags) vs. the target. Read-only; the plan is unchanged.

## 4. Validation

- **The archetype test (headline)** `apps/mobile/tests/session-archetypes.js` — build the EDS §22
  archetypes via `answersToAthleteModelInputs` (verified real diagnoses): an **in-season distance
  runner** (`skbSport:'running_long'`, in-season → priority `aerobicCapacity` → gym-support
  `[robustness, reactiveStrength]`) and a **novice sprinter** (`skbSport:'running_sprint'`, beginner →
  priority `explosiveStrength`). Derive their session specs and assert they are **categorically
  different**: the runner's target qualities are `{robustness, reactiveStrength}` with movement
  requirements centred on eccentric hinge + reactive calf and **excluding chest/arm (hpush) patterns**;
  the sprinter's target is `explosiveStrength` with a squat/hinge requirement whose force-velocity is
  **competency-downgraded to `maximal-force`** (base first) carrying a `competencyNote`. (Non-vacuous:
  the two share the sport of running but diverge entirely by diagnosis.)
- **D9 invariant** — every session objective has all four fields (`purpose, targetQuality,
  intensityZone, fatigueBudget`) and a non-empty rationale.
- **D10 invariant** — requirements never include a contraindicated pattern; the `contraindicated[]`
  list explains each removal; `contraindicatedPatternsFrom` maps a known injury (e.g. an ACL/knee
  profile) to the expected blocked patterns (squat/lunge/hinge).
- **Determinism** — `deriveSessionSpecs` byte-identical on repeat calls.
- **The parallel proof** — `golden-master.js` and `athlete-adapter-golden-master.js` stay
  **byte-identical** (no `UPDATE=1`); full `npm test` green.

## 5. Files

**New:**
- `packages/engine/src/data/qualityMovementMap.js` — the quality→movement knowledge + accessor.
- `packages/engine/src/lib/session/sessionObjective.js` — D9.
- `packages/engine/src/lib/session/movementRequirements.js` — D10 + `contraindicatedPatternsFrom`.
- `packages/engine/src/lib/session/sessionSpecs.js` — assembly.
- `apps/mobile/tests/session-archetypes.js`, `apps/mobile/tests/session-objective.js`,
  `apps/mobile/tests/movement-requirements.js` — the suites above.
- This spec.

**Edited:**
- `packages/engine/index.js` — export `deriveSessionSpecs` (+ the D9/D10 accessors) on the barrel.
- `apps/mobile/src/lib/` — a thin session-specs accessor for `/dev`.
- `apps/mobile/src/screens/DevPlayground.jsx` — the read-only objective/requirements/gap readout.
- `docs/architecture/ATHLETE-MODEL.md` — a new section documenting the D9/D10 session layer.
- `HANDOFF.md` — advance the RESUME-HERE pointer to Sprint 8 (D11, the allocator re-seat); add a
  Latest-work entry.

**Untouched (by design):** `generatePlan`, the allocator, `program.js`, `targets.js`,
`strengthExercises.js`, and the entire FROZEN governance set.

## 6. Validation against the frozen governance

- **EDS L7 (one purpose/session), L8 (constraints before content), P5 (requirements before exercise),
  P7 (adaptation before dose):** this sprint builds exactly these — as computed requirements upstream
  of selection. Fully aligned, additive.
- **Constitution Art 4/5/6:** train qualities/adaptations, not muscle-volume — D9/D10 reason in
  qualities and movements. Building toward the target.
- **Knowledge Architecture:** the quality→movement table is *Knowledge*-kind, evidence-tagged
  (`level/confidence/source/needsReview`), matching S5 + the existing KB.
- **Art 11 / privacy:** no vitals involved.
- **Frozen set:** not edited. Only living docs + new specs change.

## 7. Golden-master strategy

Because D9/D10 are **unconsumed by `generatePlan`**, both golden masters must stay byte-identical green
with no `UPDATE=1`. Drift = accidental wiring into the live path; treat as a bug this sprint.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| quality→movement seed table is imperfect (no S&C review) | Honest `evidence`/`confidence` + `needsReview:true`; small representative table; the archetype test is the behavioural check. |
| Accidental plan-output change | D9/D10 kept strictly parallel; both golden masters gate it green. |
| Injury name-regex → movement-pattern mapping is lossy | `contraindicatedPatternsFrom` is explicit, deterministic (>50% rule), and unit-tested against a known profile; it is used for D10 requirements only, not to change the live injury filter. |
| Scope creep into D11 (selection) | Explicit non-goals: requirements are a spec; no exercise is named or filtered in the live plan. |

## 9. Traceability

Blueprint **Sprint 7 / Wave W6b**, decisions **D9/D10** (Part 2 lines 123–127; Part 8 lines 354–355) ·
EDS **§22** (worked archetypes), **L7/L8**, **P5/P7**, **§31** (quality taxonomy) · Constitution
**Art 4/5/6** · builds on Sprint 5 (exercise-quality tags + `doseResponse`) and Sprint 6 (D4/D5
diagnosis) · consumed next by **D11** (Sprint 8, the allocator re-seat).
