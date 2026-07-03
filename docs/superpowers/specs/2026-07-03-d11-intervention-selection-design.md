# Design spec — D11 intervention selection re-seat (sport athletes) · Blueprint Sprint 8 (W6c)

_Date: 2026-07-03. Status: approved for planning. Author: engine re-seating stream._

## 1. Context & why this sprint exists

Sprints 5–7 built the diagnosis-first reasoning chain as parallel model output: the exercise-quality
tags (S5), the diagnosis (S6, D4/D5), and per-session **objectives + movement requirements** (S7,
D9/D10). None of it steers the live plan yet.

**This is the re-seat.** D11 (intervention selection) is the first decision where **live plans
intentionally change**: instead of the greedy per-muscle **volume-deficit** fill in
`allocator.js bestExercise`, it selects the **minimum-effective set of exercises that satisfy the
D9/D10 requirements**, ordered by **transfer-per-fatigue toward the target quality**, following the
EDS §34 value hierarchy with a **stopping rule** — "beyond the recoverable dose, bank the time"
(EDS L5). Muscle-volume stops being the *driver* and becomes a **downstream ledger** (fatigue landing
+ the MRV ceiling — EDS §31).

**Scope decision (confirmed): SPORT athletes only.** The diagnosis is richest for sport and the win is
clearest there (the EDS in-season runner gets durability work and **no chest flyes**, and stops early).
**Build athletes are untouched** — their plans stay byte-identical (parity-gated). MRV stays an
**in-loop ledger guardrail** (the validator-suite extraction is a later sprint). D12 (rep/RPE dose
schemes) and SKB-primary candidate selection are **deferred**.

Blueprint mapping: **Sprint 8 / Wave W6c**, decision **D11** (Part 2 line 129-130; Part 4 "D-h …
Refactor deficit-fill → transfer-per-fatigue value order, complexity L, risk HIGH"); EDS **§34** (the
value hierarchy), **§32** (the intervention model), **§22** (the worked runner/sprinter D11 output).

## 2. Goal, non-goals, success

**Goal.** For sport athletes, re-seat exercise selection to a value-ordered fill that satisfies the
D9/D10 requirements and stops at the fatigue budget — driven by the diagnosis, with muscle-volume
demoted to a ledger. Build athletes unchanged.

**Success.**
- The in-season-runner archetype selects durability/economy work (Nordic/RDL, reactive calf) and
  **excludes chest/arm (hpush/iso-arm) work**, and its sessions are **leaner** (fewer working items —
  the stopping rule) than today.
- **Build archetypes are byte-identical** to before (a parity test proves it).
- Sport archetypes' golden master is re-baselined deliberately, and a `/dev` sweep confirms the change
  is an improvement, not a regression (no empty/junk sessions; MRV never breached).

**Non-goals (YAGNI / risk control).**
- No change to **build** athletes (their `bestExercise` path is untouched).
- No **D12** — rep/RPE/rest schemes stay style-based (`allocator.js scheme`) for now.
- No **validator-suite extraction** — the MRV ceiling stays in the allocator loop as the ledger check.
- No **SKB-primary** candidate selection (Sprint 9) — D11 selects from the engine catalogue, using the
  SKB `exerciseLibrary` only as a transfer *boost*.
- No new onboarding, no schema change, no frozen-doc edits.

## 3. The D11 selection algorithm

New pure module `packages/engine/src/lib/plan/selectInterventions.js`:

```js
selectInterventions({ slot, requirement, ctx, ledger }) → Array<pick>   // pick = { ex, sets, contrib, effectiveRole, tier }
```

- **`requirement`** is the slot's D9/D10 output (from S7): `{ objective: {targetQuality, fatigueBudget,
  ...}, requirements: {movementPatterns, forceVelocity, contraindicated, ...} }`.
- **Candidate gate** — a catalogue exercise is eligible iff: equipment available + level OK (as today);
  it **trains the target quality** (its S5 `exerciseQualities` lists the target as primary or
  secondary) OR it is a value-hierarchy support role (prevention/core/mobility); its pattern is among
  the requirement's `movementPatterns` (or it's a support-tier exercise); it is **not**
  injury-contraindicated; and it doesn't breach the **MRV ledger** (`ledger` carries weeklyDelivered +
  weeklyCeiling, reused from the allocator).
- **Tiering (EDS §34).** Each eligible candidate is assigned a tier:
  1. **primary compound** — a compound (role `primary`, multi-joint) whose S5 **primary** quality is the target
  2. **secondary compound** — a compound whose S5 **secondary** quality includes the target
  3. **sport injury-prevention** — an exercise in the athlete's injury-prevention protocols, or the
     sport's SKB `exerciseLibrary` "prehab" categories, or `loadClass:'health'`
  4. **sport accessory** — `sportTags` includes the sport (a sport-demanded movement)
  5. **lagging-muscle hypertrophy** — an `iso`/accessory, included **only if** a muscle is genuinely
     below MEV in the ledger (a real gap), and within MRV
  6. **core** — `pattern:'core'`
  7. **mobility** — `pattern:'mobility'` / `loadClass:'health'` mobility
- **Value within a tier** — `value = transfer / fatigue`, where
  `transfer = qualityMatch (primary=2, secondary=1) × skbBoost (in the sport's exerciseLibrary → 1.5, else 1.0)`
  and `fatigue = fatigueScalar(exercise.fatigueCost from S5)` (dominant of neural/metabolic/mechanical
  → 1/2/3). Ties break by the existing rotation jitter (determinism preserved).
- **Fill + stopping rule.** Walk the tiers in order; within each, take the highest-value candidate,
  add it, accrue its fatigue cost. **Stop when the accrued fatigue reaches the session's fatigue budget**
  (`fatigueBudget.level` → a numeric ceiling: `low→4, moderate→6, high→8` fatigue-units), or when no
  eligible candidate remains. Whatever budget is unspent is **banked** (the session is deliberately
  short — the minimum-effective-dose win). A hard floor of **one primary/anchor pick** guarantees no
  empty session (EDS "never empty or junk-filled").

The output picks are handed to the allocator's **existing** `structureItems` / `applyWeights` /
duration machinery unchanged.

## 4. Architecture — where D11 slots in

- **`allocator.js` branches.** `allocateGym` gains, in `ctx`, `priorityQualities` (the diagnosis) +
  `season`. For **sport** style with a non-empty `priorityQualities`, each slot is filled by
  `selectInterventions` (D11); for **build** (or sport with no diagnosis), the existing `bestExercise`
  round-robin fill runs **unchanged**. Slot setup, the MRV ledger, `structureItems`, `applyWeights`,
  durations, and the scheduler are **shared and untouched**.
- **Per-slot requirement.** The D9/D10 requirement for a sport slot is computed at allocation time from
  the block's target quality (round-robin over `priorityQualities`, via S7's `assignTargetQualities`) +
  the slot **region** + `season`/`level`/injuries, reusing S7's `deriveSessionObjective` /
  `deriveMovementRequirements` (S7's first live consumption). **Region derivation:** a small helper maps
  the slot's split-day focus/anchors to a region when it is clearly regional (a build-style lower/upper
  day), else defaults to **`'full'`** — which is the common case for sport, whose days deliberately
  thread the priority quality through the whole week rather than splitting by body region. `'full'`
  makes D10 keep the target quality's full required-pattern set (its soft region-intersect is a no-op),
  which is the intended behaviour for sport.

## 5. The wiring — how the diagnosis reaches the plan

- **Shared pure helper** `packages/engine/src/lib/performance/forProfile.js`:
  `performanceModelForProfile(profile, asOf) → PerformanceModel | null`. It infers the SKB sport id
  from the legacy profile (`run`+`run_discipline` → `running_sprint|middle|long`; `cycle`→`cycling`;
  `swim`→`swimming`; a small deterministic table), builds the Athlete Model
  (`profileToAthleteModel`, augmented with the inferred `sportingContext.primarySport`), and derives
  the Performance Model. Pure (injected `asOf`); returns `null` for a non-sport / unknown profile.
- **`generatePlan(profile, opts?)`** — `opts.performanceModel` is an optional override; when absent
  and the profile is a sport goal, `generatePlan` derives it via the helper (`asOf` from
  `plan_start_date`). It threads `priorityAdaptations` + `season` into `buildWeek → allocateGym`. This
  means **the golden master exercises the real D11 behavior with no caller change**, and existing
  non-sport callers are unaffected (build → no PM → legacy path).
- **`PlanService` reflow** uses the same helper (from the stored `athlete_model` when present, else the
  profile) and threads `priorityAdaptations` + `season` into its direct `allocateGym` call, so
  **reflowed sport weeks stay diagnosis-driven and consistent** with the baseline. Freeze-on-start is
  unaffected (a frozen/pinned session is never recomputed — the existing guard holds).

## 6. Transfer knowledge

Primary mechanism: the **S5 `exerciseQualities`** tags (quality match + fatigue cost). The sport's SKB
`exerciseLibrary` (keyed by the same engine exercise ids) gives a **transfer boost** (×1.5) and hints
the prevention tier via its categories. Full SKB-primary candidate selection is **Sprint 9** — not
this sprint.

## 7. Golden-master + parity strategy (the safety net for an intentional change)

- **Build parity (hard gate).** A new test `apps/mobile/tests/build-parity.js` snapshots the **build**
  archetypes only and asserts them **byte-identical** across the change (they must not move). This is
  the guarantee that the sport re-seat did not leak into the build path.
- **Sport golden master (deliberate re-baseline).** The main `golden-master.js` snapshot is regenerated
  (`UPDATE=1`) **after** review: the implementer diffs the snapshot and confirms **only the sport
  archetypes changed**, in the intended direction (durability in, chest flyes out, leaner sessions),
  and **no build archetype moved**. The re-baseline is a reviewed, intentional commit.
- **Sport unit tests.** Selection/content tests that encode the old sport behavior are updated to the
  new behavior: `sport-anchor.js`, `sport-session-density.js`, `session-density.js`,
  `session-sequence.js`, `sport-generate.js` (audit each; some assertions become the new expectation,
  some are deleted as obsolete). Sport **scheduling / periodization / onboarding / SKB** tests are
  **invariant** and must stay green untouched (`sport-schedule*.js`, `sport-season-resolution.js`,
  `sport-load-scalar.js`, `sport-knowledge.js`, `sport-onboarding*.js`, `sport-engine-binding.js`,
  `sport-quality-map.js`, `adapter-sport-position.js`, `taper.js`).

## 8. Quality validation (prove it improved, not just changed)

- **`apps/mobile/tests/d11-runner-quality.js`** — build the EDS in-season-runner archetype, generate
  the plan, and assert: a session contains eccentric-hamstring durability work (Nordic or RDL) and
  reactive calf; **no** chest fly / arm-isolation appears in any sport session; the working-item count
  per session is **≤ the old count** (leaner). Plus a novice-sprinter archetype: a strength-base
  session (squat/hinge), **no** competency-gated plyo.
- **Invariants for every sport archetype:** no empty session; no muscle over MRV in the ledger; every
  selected exercise traces to a requirement or a value-hierarchy tier (explainability).
- **`/dev` sweep:** eyeball 3-4 sport archetypes in the DevPlayground (session content + the existing
  volume ledger readout) to confirm sane, coach-plausible sessions.

## 9. Files

**New:**
- `packages/engine/src/lib/plan/selectInterventions.js` — D11 value-ordered selection + stopping rule.
- `packages/engine/src/lib/performance/forProfile.js` — `performanceModelForProfile` + legacy→SKB inference.
- `apps/mobile/tests/select-interventions.js`, `apps/mobile/tests/d11-runner-quality.js`,
  `apps/mobile/tests/build-parity.js`, `apps/mobile/tests/performance-for-profile.js` — the suites above.
- This spec.

**Edited:**
- `packages/engine/src/lib/plan/allocator.js` — branch sport slots to `selectInterventions`; thread
  `priorityQualities`/`season` through `ctx`; compute the per-slot requirement. (Build path untouched.)
- `packages/engine/src/lib/plan/strength.js` (`buildWeek`) — pass `priorityQualities`/`season` into `allocateGym`.
- `packages/engine/src/lib/PlanGenerator.js` (`generatePlan`) — accept `opts.performanceModel`; derive via the helper; thread through.
- `packages/engine/index.js` — export `performanceModelForProfile`, `selectInterventions`.
- `apps/mobile/src/lib/PlanService.js` — derive the PM (helper) and thread it into the reflow's `allocateGym`.
- `apps/mobile/tests/golden-master.js` — re-baseline (sport archetypes) via `UPDATE=1` after review.
- The sport selection/content unit tests listed in §7.
- `docs/architecture/ATHLETE-MODEL.md` §5.7; `HANDOFF.md` (pointer → Sprint 9 / next re-seat step).

**Untouched (by design):** the build `bestExercise` path, `structureItems`, `applyWeights`,
`strength/targets.js` (still the ledger), `scheduler.js`, and the entire FROZEN governance set.

## 10. Validation against the frozen governance

- **EDS L5 (bank the time), §34 (value hierarchy), §31/§32 (qualities as primitive; muscle-volume as
  ledger), Constitution Art 4/5/6:** this sprint implements exactly the re-seat those name. Aligned.
- **Preserve-outright invariants (Blueprint §"Preserve"):** pure/deterministic `generatePlan` + the
  golden master (re-baselined, still the safety net), the injury subsystem, the SKB schema,
  freeze-on-commit, privacy-by-validation — all retained.
- **Art 11 / privacy:** the PM references raw vitals via readiness only; no vitals enter the plan.
- **Frozen set:** not edited.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sport re-seat leaks into build (breaks byte-identity) | `build-parity.js` hard gate + the allocator branch keys strictly on sport-style + non-empty diagnosis. |
| Determinism breaks (PM derivation adds clock/order dependence) | `asOf` from `plan_start_date` (deterministic, as the golden master already anchors dates); `selectInterventions` pure; determinism asserted in tests. |
| Sport sessions become too lean / empty | Hard floor of ≥1 primary pick; MRV ledger + "never empty/junk" invariant tested; `/dev` sweep. |
| Legacy→SKB inference wrong/incomplete | Small explicit deterministic table, unit-tested (`performance-for-profile.js`); `null` (→ legacy path) for anything unmapped, so an unknown sport degrades safely, never crashes. |
| Golden-master re-baseline hides a real regression | Re-baseline only after diffing + confirming build unchanged and sport changes match the intended direction; the quality test (`d11-runner-quality.js`) gates the *nature* of the change, not just that it changed. |

## 12. Traceability

Blueprint **Sprint 8 / Wave W6c**, decision **D11** (Part 2 129-130; Part 4 D-h; Part 7/8 "gated by
golden-master + parity tests") · EDS **§34** (value hierarchy + stopping rule), **§32** (intervention
model), **§31** (muscle-volume as ledger), **§22** (worked runner/sprinter D11) · Constitution
**Art 4/5/6** · builds on **S5** (quality/cost tags), **S6** (diagnosis), **S7** (D9/D10 requirements) ·
**deferred to later sprints:** D12 dose schemes, the validator-suite extraction (MRV → validator), and
SKB-primary selection (Sprint 9).
