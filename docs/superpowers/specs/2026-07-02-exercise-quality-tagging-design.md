# Design spec — Exercise-quality tagging (Blueprint Sprint 5 / Wave W5)

_Date: 2026-07-02. Status: approved for planning. Author: engine re-seating stream._

## 1. Context & why this sprint exists

The diagnosis-first engine rebuild has, so far, been additive: the Performance Model already
computes a **diagnosis** — `limitingFactors` (D4) and `priorityAdaptations` (D5) — that speaks in
**physical qualities** (the fixed 10: `maxStrength, hypertrophy, explosiveStrength, reactiveStrength,
strengthEndurance, aerobicCapacity, anaerobicCapacity, mobility, stability, robustness`). None of it
steers the live plan yet.

Before the diagnosis can steer exercise selection (the later re-seating, Blueprint S7→S8 / D9/D10/D11),
the engine needs a bridge it does not currently have:

> **The gap:** `generatePlan` selects exercises by which *muscle* they train (`muscleContribution` →
> the per-muscle volume allocator). The diagnosis speaks in *qualities/adaptations*. Nothing maps an
> exercise to the quality/adaptation it develops, its force-velocity character, or its fatigue cost.
> Until that mapping exists, the diagnosis literally cannot choose exercises.

This sprint builds that mapping — **the missing organising primitive** — as **parallel knowledge**.
It is Blueprint **Sprint 5 (Wave W5)**: "Build the Quality & Adaptation taxonomy + dose-response +
assessments; tag exercises by adaptation/cost/force-velocity." It is the enabler every later steering
step depends on.

**Scope decision (confirmed):** the on-path enabler only. No plan output changes this sprint.
**Evidence posture (confirmed):** author complete coverage now, honestly tagged with explicit
confidence + a `needsReview` marker (no expert S&C review is available this sprint).

## 2. Goal, non-goals, success

**Goal.** Represent, for the whole exercise catalogue, the physical qualities each exercise develops
(plus force-velocity profile and fatigue cost), and give every quality a dose + assessment — as pure,
evidence-tagged, deterministic knowledge behind a clean accessor, consumed by nothing in the live
plan path.

**Success (per blueprint):** the engine can *represent* "reactive strength" — i.e. ask "which
exercises develop reactiveStrength, at what force-velocity and fatigue cost?" and get a principled,
tested answer. The volume ledger and plan output are unchanged (proven by the golden masters).

**Non-goals (YAGNI / risk control):**
- No change to `generatePlan`, `resolveProgram`, the allocator, targets, or plan output.
- No transfer ratings / value-ordering (that is D11 / Sprint 8).
- No adaptation-level dose tables — dose-response lives at the **quality** level (what the consumers need).
- No removal of the legacy coarse `quality: 'power'|'strength'|'general'` field on exercises (the
  re-seat retires it later; ripping it out now would risk plan output).
- No S&C review worksheet, no `/dev` write path — the `/dev` readout is strictly read-only.

## 3. What we build — three data pieces

### 3.1 Exercise → quality tags (the core) — `packages/engine/src/data/exerciseQualities.js`

A new **parallel** enrichment module, mirroring the proven `exerciseSimilarity.js` pattern
(pattern-defaults + per-exercise overrides, deliberately separate from the plan-driving data so plan
output is unaffected). `strengthExercises.js` is **untouched**.

For every one of the 118 exercises it resolves:

| Field | Shape | Meaning |
|---|---|---|
| `qualities` | `[{ id, role }]` | the physical qualities it trains; `role ∈ {primary, secondary}`. `id ∈` the fixed 10. |
| `adaptations` | `string[]` | **derived** — the union of the tagged qualities' `adaptations[]` via the quality registry (no double-authoring). Every id ∈ `adaptationIds()`. |
| `forceVelocity` | enum | where it sits on the force-velocity curve — a controlled vocabulary (below). |
| `fatigueCost` | `{ neural, metabolic, mechanical }` | each `low|moderate|high`; mirrors the `qualities.js` `fatigueCost` shape. The raw material for the later transfer-per-fatigue value order. |
| `evidence` | `{ level, confidence, source, needsReview }` | `level:'seed'` mostly; `confidence:'low'|'moderate'`; `needsReview: true`. |

**Force-velocity controlled vocabulary** (exported for validation):
`['maximal-force', 'strength-speed', 'speed-strength', 'ballistic', 'controlled-hypertrophy',
'endurance', 'isometric', 'mobility']`.

**Resolution strategy (minimise hand-authoring, stay principled):**
- **Pattern defaults** — a `DEFAULT_QUALITIES` table keyed by movement pattern (`squat, hinge, lunge,
  hpush, vpush, hpull, vpull, carry, core, calf, iso, mobility`), each giving a default quality
  profile + force-velocity + fatigue cost. (e.g. a heavy barbell squat pattern → `maxStrength`
  primary, `hypertrophy`/`robustness` secondary, `maximal-force`, high mechanical/neural cost.)
- **Derivation from existing flags** where they already encode intent, so we don't re-guess:
  `quality:'power'` → explosive/reactive + `ballistic`; `stretchBias` → nudge `hypertrophy` secondary;
  `role:'iso'` / `loadClass:'health'` → isolation/low-cost; `pattern:'core'` → `stability`+`robustness`;
  `pattern:'calf'` → `strengthEndurance`+`robustness`.
- **Per-exercise overrides** — a small table for the genuine exceptions the pattern default gets wrong
  (jumps, cleans, sled, tempo variants, isometric holds, carries).

Confidence is set honestly: pattern-derived defaults → `low`/`seed`; well-established mappings (heavy
compound → maxStrength; jump → reactiveStrength) may be `moderate`. Everything carries `needsReview:true`.

### 3.2 Dose-response on each quality — enrich `packages/engine/src/data/qualities.js`

Add a `doseResponse` field to every quality so the blueprint's rule holds — **no quality label
without both a dose and an assessment** (assessment already exists; dose is what's missing). Shape:

```js
doseResponse: { intensity: '≥85% 1RM', reps: '1–5', rir: '1–3', restType: 'full' }  // representative, seed
```

Evidence stays `evidence: 'seed'`. This is the seam D12 (dose assignment) consumes later; here it is
knowledge only.

### 3.3 A pure accessor — exported on the engine barrel

```js
exerciseQualities(id) → {
  qualities:   [{ id, role }],
  adaptations: string[],
  forceVelocity: <enum>,
  fatigueCost: { neural, metabolic, mechanical },
  evidence:    { level, confidence, source, needsReview }
} | null            // null-safe on unknown id
```

Added to `packages/engine/index.js` (named export) so later decisions and the `/dev` readout consume
one stable seam. Pure/deterministic; no clock, no random.

## 4. How we prove it (validation)

- **New test `apps/mobile/tests/exercise-quality-tags.js`** (named to avoid the existing
  `exercise-quality.js`, which tests the *legacy coarse* `quality` field and stays untouched):
  - **Coverage** — every id in `EXERCISES` resolves to a non-null tag with ≥1 `primary` quality (118/118).
  - **Validity** — every quality id ∈ `qualityIds()`; every derived adaptation ∈ `adaptationIds()`;
    `forceVelocity` ∈ the controlled vocab; `fatigueCost` keys + values valid; `evidence.needsReview === true`.
  - **Determinism** — calling `exerciseQualities(id)` twice is byte-identical.
- **Quality dose+assessment invariant** — extend the existing `apps/mobile/tests/athlete-qualities.js`
  (which already tests the QUALITIES/ADAPTATIONS registry): every `QUALITY` has both a `doseResponse`
  (required keys present) and an `assessment`.
- **The parallel proof** — `apps/mobile/tests/golden-master.js` and
  `apps/mobile/tests/athlete-adapter-golden-master.js` stay **byte-identical green** (the new data is
  unconsumed by `generatePlan`). Full `npm test` green.
- **Read-only `/dev` readout** — `DevPlayground.jsx` (route `/dev`) gains a read-only annotation: for
  the generated plan, show each exercise's quality tags beside it. It changes nothing about the plan;
  it is the "see it work" check the project verifies everything with. Browser-verified via the preview MCP.

## 5. Files touched

**New:**
- `packages/engine/src/data/exerciseQualities.js` — the tag data + accessor.
- `apps/mobile/tests/exercise-quality-tags.js` — the coverage/validity/determinism suite.
- `docs/superpowers/specs/2026-07-02-exercise-quality-tagging-design.md` — this spec.

**Edited:**
- `packages/engine/src/data/qualities.js` — add `doseResponse` per quality.
- `packages/engine/index.js` — export the `exerciseQualities` accessor.
- `apps/mobile/src/screens/DevPlayground.jsx` — read-only quality-tag readout.
- `apps/mobile/tests/athlete-qualities.js` — add the dose+assessment invariant to the existing registry test.
- `docs/architecture/ATHLETE-MODEL.md` — a new section documenting the exercise-quality knowledge layer.
- `HANDOFF.md` — advance the RESUME-HERE pointer to **Sprint 7 (D9/D10)** and add a "Latest work" entry.

**Untouched (by design):** `strengthExercises.js`, the allocator, `program.js`, `targets.js`,
`PlanGenerator.js`, and the entire **frozen governance set** (Constitution, Decision Ontology,
Knowledge Architecture, EDS, TAS).

## 6. Validation against the frozen governance

- **Constitution Art 4/5/6** (train qualities/adaptations, not muscle-volume-first): this sprint builds
  *toward* that target — it is the primitive those Articles require. Fully aligned, additive.
- **EDS §31** (physical qualities as the organising primitive): the tags are authored against exactly
  this vocabulary.
- **Knowledge Architecture** (8-kind taxonomy): the tags + dose-response are *Knowledge*-kind data,
  evidence-tagged (`level`/`confidence`/`source`), matching the existing `lib/knowledge` pattern.
- **Art 11 / data isolation:** N/A — pure engine knowledge, no user vitals.
- **Frozen set:** not edited. Only living docs (ATHLETE-MODEL.md, HANDOFF.md) and new specs change.

## 7. Golden-master strategy

Because the new knowledge is **unconsumed by `generatePlan`**, the correct expectation is: **both
golden masters stay byte-identical green** with no `UPDATE=1`. If either drifts, something was wired
into the live path by mistake — treat drift as a bug this sprint, not an intended change.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Seed tags are scientifically imperfect (no expert review) | Honest `evidence`/`confidence` + `needsReview:true`; pattern-derived defaults avoid per-exercise guesswork; conservative confidences. |
| Accidental plan-output change | New data kept strictly parallel (nothing in `generatePlan` reads it); both golden masters gate it green. |
| Scope creep into the D11 re-seat | Explicit non-goals: no transfer ratings, no value-ordering, no `resolveProgram` wiring. |
| Force-velocity / fatigue vocab drifts later | Controlled vocab exported + asserted in tests; single source of truth in the module. |

## 9. Traceability

Blueprint **Sprint 5 / Wave W5** (MIGRATION-BLUEPRINT Part 7 & Part 8) · EDS **§31** (quality
taxonomy) · Constitution **Art 4/5/6** · Knowledge Architecture (Knowledge kind) · future consumers
**D10** (movement/quality requirements) and **D11** (intervention selection) in Sprints 7–8.
