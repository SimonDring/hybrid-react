# D7 · Block Objective — Design Specification (WP-47)

- **Status:** DESIGN SPEC — *build paused for Simon's review.* This document proposes the
  coaching model and the software seam; **no engine code changes until Simon signs off** on
  the open questions in §9. Nothing here has been built.
- **Author:** continuous lead-engineer pass, 2026-07-06.
- **Implements (frozen, not modified):** EDS `docs/engine/00-ENGINE-DESIGN-SPECIFICATION.md`
  → **D7 · Periodisation / Block Objective** (and its neighbours D5, D6, D8, D16).
- **Validated against (frozen):** Constitution (Articles cited inline), Decision Ontology
  (Strategy/Block/Week/Session horizons §8), Knowledge Architecture (thresholds are governed
  knowledge, never hard-coded), TAS (pure-engine boundary, the diagnosis-steers gate pattern).
- **Backlog item:** REASSESSMENT-2026-07-05.md Priority 9 (WP-47). **Complexity L, risk
  medium-high** — this is a live-plan lever, so it ships the same way D11 did: parallel,
  golden-master-proven, gated, sport cohorts first.

---

## 1. Why this exists (the gap)

The EDS defines D7 as: *"Assign each block a single dominant adaptation objective aligned to a
priority quality and the season … Choose block length, intensity/volume trajectory, and deload
rhythm from the block objective and the athlete's recoverability — **not from a fixed style
template (A9)**."* (EDS §D7.)

**What ships today** is exactly the fixed template the EDS forbids. `resolvePeriodization(profile)`
(`packages/engine/src/lib/plan/periodization.js`) is a pure lookup:

```
goal_type + strength_style + season + run_discipline  →  { phases:[…], deloads:[…] }
```

- The **D5 priority qualities never reach it.** A block's structure is identical whether the
  diagnosis says the athlete's limiter is maximal strength, rate-of-force, or robustness.
- **Recoverability never reaches it.** Block length and deload rhythm are the same for a
  21-year-old and a fatigued masters athlete — the `learnedPriors` seam (recoveryRate,
  volumeTolerance) exists on the Athlete Model but D7 reads none of it.
- **There is no cross-block sequencing.** The EDS's D5 contract says *"conflicting high-priority
  limiters ⇒ sequence across blocks (D7), don't cram"* — but D7 has nowhere to put a deferred
  limiter. D5's `prioritise.js` already DEFERS incompatible qualities (it drops them from the
  current top-k); today they simply vanish. D7 is where they should be picked up next block.

This is the same class of gap D11 had before the diagnosis-steers work: *the diagnosis is
computed and shown, but the plan does not follow it.* WP-47 closes it for the block horizon.

**Non-goals.** D7 does not select exercises (D11), does not lay out the week around fixtures
(D8), does not read the clock (Art 18 — purity), and does not itself learn (D16 writes the priors
D7 reads; D7 never edits a plan retroactively — L9).

---

## 2. The decision, as an inspectable object

Per the Decision Ontology (every coaching decision is a first-class object with inputs,
rationale, and confidence — the EDS's remedy for "decisions are implicit in a procedural
pipeline"), D7 emits a **BlockPlan**: an ordered list of **BlockObjective** objects, one per
mesocycle across the planning horizon.

```
BlockObjective = {
  index,                 // 0-based position in the macrocycle
  objective,             // the ONE dominant adaptation, e.g. 'maxStrengthBase'
  developsQuality,       // the D5 priority-quality id this block develops (traces to a limiter)
  maintainsQualities,    // qualities held (not developed) this block — the concurrency map
  season,                // 'off' | 'pre' | 'in' | 'transition' (from D6/deriveSeason)
  lengthWeeks,           // chosen from objective + recoverability + priors (NOT a style enum)
  trajectory,            // 'accumulation' | 'transmutation' | 'realisation' | 'maintenance'
  volumeShape,           // 'ramp' (MEV→MAV) | 'hold' | 'taper'
  intensityShape,        // 'build' | 'hold' | 'peak'
  deloadWeeks,           // indices within the block (from recoverability, not a fixed 4th-week)
  isTaper,               // true when this block is the real pre-competition taper (S4)
  rationale,             // plain-English WHY (explainability floor — L11)
  confidence,            // 'low' | 'moderate' | 'high' (block lengths are heuristic — EDS ~ D7)
  source,                // 'diagnosis' when D5-steered; 'template' on the legacy fallback path
  tracesTo,              // { limiter: qualityId, strategy: <D6 ref> } — audit chain to the pivot
}
```

`BlockPlan = { blocks: BlockObjective[], sequencingNotes: [...] }` where `sequencingNotes`
records any limiter D5 deferred and which block D7 scheduled it into ("adductor robustness
deferred from block 1 (conflicts with max-strength emphasis); scheduled to block 2").

This object is the same *shape of thing* as D5's `priorityAdaptations` and D11's
`meta.diagnosis` — inspectable, testable at the decision level, and an AI/human override seam
(AIGAS Seam 1) can substitute it without touching the code around it.

---

## 3. The coaching model (what the reasoning DOES)

`deriveBlockObjective(inputs) → BlockPlan`, a **pure** function. Inputs:

- `priorityQualities` — D5 output (`[{ qualityId, magnitude, adaptations, … }]`), ranked.
- `strategy` — D6 output: the concurrency model + sequencing rule (develop/maintain map,
  interference law). *D6 does not exist as a first-class object today* — see §8 (dependency).
- `season` + `eventCalendar` — from `deriveSeason` (already pure, already asOf-anchored).
- `recoverability` — from the Athlete Model: `learnedPriors.recoveryRate`, training-age band,
  and current fatigue posture. Typed `{ value, source, confidence }` priors (the WP-59 pattern).
- `priors` — governed block-length / deload-rhythm knowledge (see §7; NOT module constants).

**Step 1 — dominant objective per block.** For each block position, choose the single
adaptation with the highest current return that the season permits:

| Season | Dominant objective | Trajectory | Volume / Intensity |
|---|---|---|---|
| off | develop the **top D5 limiter** (e.g. maxStrength base) | accumulation | ramp / build |
| pre | **convert** the base toward the sport's dominant expression (e.g. power) | transmutation | hold / build |
| in | **maintain** with minimal fatigue (Rønnestad 2×/wk dose) | maintenance | hold / hold |
| transition | recover + restore | maintenance | taper / low |

The objective is *named from the D5 limiter*, not the training style. `get_stronger` with a
maximal-strength limiter and `soccer/off` with a maximal-strength limiter get the **same** block
objective — because the diagnosis, not the goal label, drives it (this is the whole thesis).

**Step 2 — cross-block sequencing (the new capability).** D5 selects the top-k *compatible*
limiters and defers the incompatible ones (`prioritise.js` `areIncompatible`). D7 takes the
deferred set and **schedules it into the next block** whose objective is compatible, in
priority order — the EDS's "sequence across blocks, don't cram." A maximal-strength limiter and
a maximal-endurance limiter never share a block; they occupy consecutive blocks. Recorded in
`sequencingNotes` so the athlete/coach can see *why* the second thing is waiting.

**Step 3 — length, trajectory, deload from recoverability (not a style enum).** Block length and
deload rhythm are read from governed priors *modulated by the athlete's recoverability*: a low
`recoveryRate` prior shortens the block and pulls deloads earlier; a high one extends
accumulation. This is where A9 compliance actually lives — the number comes from
`objective × recoverability × prior`, never from `strength_style`.

**Step 4 — the taper (S4 / L-correct).** When `eventCalendar` places a key competition inside the
horizon, the block before it becomes `isTaper: true`: **volume down, intensity held.** This must
reuse the existing, proven event-taper logic (the reassessment confirms a real taper already
ships in the allocator/reflow layer) — D7 *marks* the taper block; it does not re-implement the
taper mechanics.

---

## 4. What stays the same

- **`deriveSeason` is reused verbatim** — it is already pure and asOf-anchored (Art 18). D7 does
  not touch season derivation.
- **The existing taper mechanics are reused** — D7 flags the block; the downstream layer executes.
- **`continueBlock` (the BlockCheckin flow) is unchanged in v0.** The block *check-in* decides
  what happens when a block *ends* (progress / repeat / recalibrate / bridge). D7 decides the
  *shape of the blocks ahead*. They compose: the check-in's "athlete struggled → repeat" is a
  recoverability signal D7's priors should eventually read (via D16 staged priors — WP-59), but
  v0 leaves the check-in exactly as is.

---

## 5. The software seam (how it ships without risk)

Mirror the D11 diagnosis-steers rollout precisely — it is the proven pattern in this codebase:

1. **New pure module** `packages/engine/src/lib/plan/blockObjective.js` exporting
   `deriveBlockObjective(inputs)`. No I/O, no clock.
2. **A single gate predicate** — `blockDiagnosisSteers({ season, priorityQualities, cohort })`,
   the D7 analogue of `diagnosisSteers()` in the allocator. It decides per-athlete whether the
   new path runs or the legacy template does. **Sport cohorts first** (they already have a real
   diagnosis and goldens constrain the build cohort); the build cohort stays on
   `resolvePeriodization` until WP-49 (Simon's paused flip).
3. **Parallel, not replacing.** `resolvePeriodization` remains the fallback. `PlanGenerator`
   calls `deriveBlockObjective` behind the gate; when the gate is false it uses the template.
   The pure generator stays deterministic (Art 18) — same profile, same plan.
4. **Golden-master proves no unintended movement.** Re-baseline is audited BY KEY (the WP-45 /
   d11-build-quality method): only the gated cohort's blocks may move, and each moved archetype
   is justified against its D5 limiter. Build-cohort goldens must stay **byte-identical** (the
   Art-3 identity gate) until WP-49.
5. **`meta.diagnosis` gains a `blockPlan`** so the BlockObjective chain is inspectable in the
   same place D11's diagnosis already surfaces — and the AIGAS Seam-1 override can target D7.

---

## 6. Explainability (L11 / the explainability floor)

Every BlockObjective carries a `rationale` and a `tracesTo` chain: *block → its D5 limiter →
the demand×capability gap that made it a limiter.* This extends the WP-43 explainability floor
from the session to the block horizon: a user asking "why is this a strength block, and why is
my power work waiting until March?" gets an honest answer sourced from the diagnosis, not a
style label. `sequencingNotes` makes the *deferral* visible — the single most coach-like thing
this feature adds.

---

## 7. Knowledge governance (thresholds are DATA, not code)

Per the Knowledge Architecture, the numbers this decision uses are **governed knowledge**, not
literals in `blockObjective.js`:

- block-length bands per objective × training-age (currently the evidence comments at the top of
  `periodization.js`: Israetel 5–6wk hypertrophy, Issurin 10–12wk strength, Bompa/Rønnestad
  10–12wk off-season, Bosquet 6wk pre-season, Rønnestad 4wk in-season) → move into a cited
  knowledge entry with a confidence tag;
- deload-rhythm-from-recoverability mapping → knowledge entry;
- the sequencing incompatibility relation → reuse D5's existing `areIncompatible` (already the
  single source); do not duplicate it.

Any such addition bumps `KNOWLEDGE_SET_VERSION` and re-baselines the ratchet manifest
(`tests/knowledge-set-ratchet.js`) — the WP-44 discipline. **These block-length priors and the
deload mapping are seed science that require Simon's sign-off** (same as the WP-38/42 seed
tables), because they are a live-plan lever.

---

## 8. Dependency: D6 Strategy must exist first (or be stubbed honestly)

D7's inputs include D6 (`strategy`: the concurrency model + develop/maintain map). **D6 does not
exist as a first-class object today** either (the reassessment lists D6/D7/D8 together as
MISSING). Two honest options:

- **8a (recommended):** ship a minimal D6 first — a small `deriveStrategy(priorityQualities,
  demandProfile) → { concurrencyModel, sequencingRule, developMaintainMap }` that encodes the
  interference law the EDS names (running interferes with lower-body strength more than cycling;
  trained athletes more affected → strength-first, modality separation). D7 then consumes a real
  object. This is a small pure module and makes both decisions inspectable.
- **8b:** fold a *provisional* strategy into D7 (develop the top limiter, maintain the rest,
  strength-first) and record the debt. Faster, but re-creates the "implicit decision" the EDS
  warns against.

This ordering choice is an **open question for Simon** (§9).

---

## 9. Open questions — REQUIRE SIMON'S REVIEW BEFORE BUILD

These are coaching-model / scientific-interpretation / sequencing decisions — exactly the class
the Programme says to pause on:

1. **D6 first, or provisional strategy inside D7?** (§8a vs §8b.) Recommendation: 8a.
2. **How aggressive is cross-block sequencing?** When two limiters conflict, do we always give a
   full block to each, or allow a develop-one/maintain-other block when the magnitudes are close?
   (Concurrency-tolerance is athlete- and evidence-dependent.)
3. **Block-length priors & the deload-from-recoverability mapping** (§7) — the actual numbers.
   These are seed science; they need your S&C sign-off before they touch a live plan.
4. **Taper trigger** — what counts as a "key competition" for `isTaper` when an athlete lists
   several events? (Reuse `event_date`; but multi-event calendars need a priority rule.)
5. **Cohort order** — confirm sport cohorts first, build cohort deferred to the WP-49 flip
   (keeps the Art-3 build-identity gate green in the interim).
6. **Interaction with `continueBlock`** — v0 leaves the check-in untouched (§4). Confirm, or
   decide whether D7 should also propose the *next* block's objective at check-in time.

---

## 10. Test plan (written red-first when built)

- **`block-objective.js`** (pure): a sport athlete with a maxStrength limiter in off-season →
  one accumulation strength block; the same athlete pre-season → a transmutation/power block;
  in-season → maintenance (no MRV ramp — matches EDS §D7 worked example line "in-season
  maintenance; no volume ramp toward MRV").
- **Sequencing**: two incompatible high-priority limiters → two consecutive blocks, never one
  crammed block; `sequencingNotes` names the deferral.
- **Recoverability**: a low `recoveryRate` prior shortens the block / pulls the deload earlier
  than a high one, from the *same* objective (proves length isn't a style enum — A9).
- **Taper**: an event inside the horizon → the preceding block `isTaper`, volume down + intensity
  held.
- **Gate identity**: with the gate OFF, `PlanGenerator` output is byte-identical to today
  (golden-master); with it ON for the sport cohort, only that cohort's blocks move, each audited
  to its limiter.
- **Explainability floor**: every BlockObjective has a non-empty `rationale` + `tracesTo`.

---

## 11. Summary

WP-47 turns D7 from a **style→template lookup** into a **diagnosis-driven, recoverability-aware,
sequenced block planner** that emits an inspectable BlockObjective chain — closing the EDS's
"sequence conflicting limiters across blocks" contract and extending the explainability floor to
the mesocycle. It ships the safe way: pure module, single gate, sport cohorts first, golden-master
identity for the build cohort, thresholds as governed knowledge. **It does not start until Simon
answers §9** — the coaching model is his call, not the engine's.
