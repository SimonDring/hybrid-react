# Equipment- & Recovery-Aware Exercise Priority — Design

**Date:** 2026-06-27
**Status:** Approved (design) — ready for implementation plan
**Area:** decision engine (`packages/engine/src/lib`)

## Context

A 20-plan random audit (plus the prior session's reviews) graded the engine's
output against each athlete's goal. The engine is solidly "good" for coherent
inputs (A−/B+ for most full-gym plans) but has two structural blind spots:

1. **Goal–equipment incoherence.** Exercise priorities are flat, goal-keyed id
   lists (`GOAL_PRIORITY` in `strength/program.js`; sport modules'
   `priorityExercises`). The allocator's equipment filter silently deletes the
   unusable entries. A `strength` athlete with dumbbells only therefore matches
   **1 of 17** strength priorities — they get an *uncurated* plan that can't be
   recognised as strength training.
2. **Recovery-blind selection.** Even when an exercise is equipment-valid, it may
   be the wrong choice given the athlete's recent loading. The motivating case:
   after a heavy squat day, training back the next day with a **barbell row**
   reloads the lumbar spine that needs to recover — a **chest-supported row**
   trains the same muscles without the axial load, but the engine has no concept
   of spinal/axial load and always prefers the barbell row.

Both reduce to the same root: **the engine commits to a single concrete exercise
too early and too statically.** The fix is to make priority *intent*-based, and
resolve the concrete lift late — by equipment (static) and by recovery context
(dynamic).

Decisions taken during brainstorming:
- Response to a mismatch = **engine adapts silently** (no UX/onboarding work).
- Scope = **general**: every goal flows through one resolver.
- Mechanism = **intent fallback chains** (most principled).
- Recovery awareness (**axial-load management**) is **folded into this spec**.

## Goals / Non-goals

**Goals**
- Every goal resolves a priority list of the best *available* exercises for the
  athlete's equipment — no more 1/17.
- Exercise selection respects an **axial-load budget**: avoid stacking spinal
  load within a session and across adjacent days; prefer de-spined alternatives
  when budget is tight.
- **Zero regression** for full-gym, well-rested, low-frequency plans
  (the preservation principle below).

**Non-goals**
- No onboarding/UX messaging (silent adaptation).
- No change to the volume model (`targets.js`), the periodisation model, or the
  runtime readiness/ACWR reflow (that layer is daily/adaptive; this is plan-time
  structure). Axial budget here is structural, not driven by live wearable data —
  though it could later consume that signal.
- No per-(goal×tier) hand-authored lists (rejected: combinatorial).

## Design overview

Priorities become **intents** with **equipment-ordered candidate chains**. A
resolver turns each intent into the equipment-available candidate *list*. The
allocator picks the concrete member at fill-time using an **axial budget**. The
scheduler **spaces high-axial sessions apart**. A final **de-spine refinement
pass** fixes any day that still lands after a high-axial day.

```
profile
  └─ resolveProgram → resolveIntents(intents, equip, level)
        → exercisePriority: per-intent equipment-available candidate lists (+ boost set)
  └─ buildWeek → allocateGym
        → fill: per intent pick candidate by AXIAL BUDGET; track slot.axialLoad;
          annotate each priority item with its source intent; expose session axialLoad
  └─ scheduler → space high-axial sessions apart (new spacing dimension)
  └─ de-spine refinement → any day following a high-axial day:
        swap its high-axial members for the lowest-axial candidate of their intent
```

## Components

Each unit has one job, a defined interface, and stated dependencies.

### 1. `axialLoad` attribute (data)
- **What:** an integer `0 | 1 | 2` on every entry in `data/strengthExercises.js`
  (`0` none, `1` moderate, `2` high spinal/lumbar demand). Default `0` when
  omitted (most isolation/machine/supported/bodyweight work is low-axial).
- **Rubric:**
  - **2 (high):** back/front squat, deadlift, deficit deadlift, **barbell row**,
    good morning, rack pull, standing overhead press.
  - **1 (moderate):** trap-bar deadlift, RDL, single-arm DB row (braced),
    Bulgarian split squat, DB/landmine standing press, loaded carries.
  - **0 (none):** chest-supported / cable / machine rows, lat pulldown,
    leg press / hack, leg curl/ext, hip thrust, pec deck, seated/lying/supported
    work, push-ups, all isolation, plyometrics, mobility.
- **Depends on:** nothing (pure data).

### 2. `priorityIntents.js` (new data + resolver)
- **What:** for each build style, an **ordered list of intent rows**
  `{ intent: string, chain: string[] }`. The chain is the **equipment-quality**
  preference order (best free-weight compound → machine/DB → bodyweight). The
  **head of each chain is exactly today's curated entry**, so the full-gym
  resolution reproduces the current list (preservation principle).
- **Worked example (strength), heads = current `GOAL_PRIORITY.strength`:**
  ```
  squat        back_squat → front_squat → box_squat → goblet_squat → bw_split_squat
  hinge        deadlift → trap_bar_dl → rdl → db_rdl → sl_hinge
  h_press      bench → db_bench → incline_db → dip → pushup
  squat_var    pause_squat → box_squat → tempo_squat → bw_split_squat
  hinge_var    rack_pull → good_morning → rdl → db_rdl
  hinge_var2   deficit_deadlift → rdl → db_rdl
  tri_press    jm_press → close_grip_bench → diamond_pushup
  press_acc    close_grip_bench → floor_press → dip → diamond_pushup
  press_acc2   floor_press → db_bench → pushup
  h_pull       barbell_row → db_row → chest_supported_row → cable_row → inverted_row
  v_press      ohp → db_ohp → pike_pushup
  hinge_tb     trap_bar_dl → rdl → db_rdl
  squat_front  front_squat → goblet_squat → hack_squat
  glute        hip_thrust → glute_bridge → glute_bridge_single_leg
  carry        farmer_carry → suitcase_carry → bw_carry
  trunk        ab_wheel → pallof → side_plank → hanging_knee
  power        seated_box_jump
  ```
  *`*_var` rows exist so a full-gym plan still boosts multiple comp-lift variations
  (today's behaviour); on thin kit they collapse to whatever's available.*
- **`bodybuilding` / `functional`:** same structure, heads = their current
  `GOAL_PRIORITY` lists (those are already DB/cable/bodyweight-friendly, so their
  chains are short; the point is uniformity + the shared resolver).
- **`resolveIntents(intents, equip, level)`** (pure fn): for each row, pick the
  candidates whose `equip` ∈ `equip` and `level` ≤ `level`, in chain order;
  dedupe across rows. Returns `{ list, byIntent }` where `list` is the flat
  ordered id list (the ×1.35 boost set, == today's shape) and `byIntent` maps
  `intent → [available candidate ids]` (for the allocator's axial pick + the
  refinement pass).
- **Depends on:** `EXERCISES`, `LEVELS`, `availableEquip` from `strengthExercises.js`.

### 3. `resolveProgram` wiring (`strength/program.js`)
- Build goals call `resolveIntents(BUILD_INTENTS[style], equip, levelNum)` instead
  of reading `GOAL_PRIORITY[style]`. `equip = availableEquip(profile.access)`.
- Sport: a thin shim wraps each module's `priorityExercises` as single-candidate
  intents and runs the same resolver (behaviour identical today; door open to add
  fallbacks later). `byDiscipline` overrides handled the same way.
- Returns the same `exercisePriority` (flat list) **plus** a new `priorityByIntent`
  field on the program object, threaded to the allocator for axial selection.

### 4. Allocator — fill-time axial selection (`plan/allocator.js`)
This lever is **within-session only** (the allocator does not know scheduled
day-adjacency; cross-day is §5 spacing + §6 de-spine).
- New per-slot accumulator `slot.axialLoad` (sum of placed working exercises'
  `axialLoad`), and a constant `AXIAL_SESSION_CAP` (default 4 — e.g. squat 2 +
  deadlift 2 fills it).
- **Per-intent preferred member (how the boost stays axial-aware).** Today the
  ×1.35 boost is a static set. It becomes intent-driven: for each intent, the
  "preferred member" is the chain **head** when it fits the slot's remaining axial
  budget (`slot.axialLoad + head.axialLoad ≤ AXIAL_SESSION_CAP`), otherwise the
  **lowest-`axialLoad` available candidate** from `byIntent`. In `bestExercise`, a
  candidate receives the ×1.35 boost iff it is its intent's preferred member for
  the current `slot.axialLoad`. So once a session's spine budget is spent, the
  boost shifts from barbell row to chest-supported/cable row automatically.
- Each placed priority item is annotated `item.intent` (source intent) so §6 can
  find its candidate list. Non-priority deficit-fill items are not annotated; §6
  falls back to muscle-overlap matching for those.
- The slot's realised `axialLoad` is returned on the session spec (alongside the
  existing `lowerBody` / `muscleVol`) for §5 and §6.

### 5. Scheduler — high-axial spacing (`plan/scheduler.js`)
- Read each session's `axialLoad`. Add "high-axial" (session sum ≥
  `HIGH_DAY_THRESHOLD`, default 3) as a **spacing dimension** alongside the
  existing same-muscle / lower-body spacing: prefer not to place two high-axial
  sessions on consecutive training days. This is the first line of defence and
  resolves the motivating case whenever rest days allow.

### 6. De-spine refinement pass (new — `plan/despine.js`, run after scheduler)
- **Input:** the scheduled, day-ordered sessions + `priorityByIntent`.
- For each training day `D` whose **previous training day** is high-axial
  (`axialLoad ≥ HIGH_DAY_THRESHOLD`): for each of `D`'s working items with
  `axialLoad === 2`, swap it for the **lowest-`axialLoad` available candidate of
  its `item.intent`** (re-applying weights). Items without an intent are swapped
  for a lower-axial exercise with overlapping muscle contribution from the
  available pool, if one exists. Stop once `D` is within budget.
- Keep the day's anchor where possible (swap secondary high-axial work first); if
  `D` is still over budget after secondary swaps, de-spine the anchor too.
- **Why a post-schedule pass (not allocate-in-day-order):** keeps the allocator
  and scheduler decoupled (no allocator↔scheduler circular dependency), and is a
  small, isolated, independently testable transform over resolved candidate lists.

## Preservation principle

Chain heads = today's curated lists, and the axial budget only engages *under
load*. Therefore a **full-gym, well-rested, low-frequency plan is byte-identical**
to today. Only (a) dumbbell/bodyweight kit and (b) tight (5–6 day) schedules that
stack axial load see new behaviour. Golden-master expectation: `*·full` and
`strength·*·full` archetypes unchanged; `·dumbbell` / `·bodyweight` and any
high-frequency-with-adjacency archetypes change intentionally and are regenerated.

## Tunable constants (calibrated during implementation)

`AXIAL_SESSION_CAP = 4`, `HIGH_DAY_THRESHOLD = 3`. Exposed as named constants so
verification can adjust them against real output.

## Testing strategy

- **`resolveIntents` unit:** full-gym strength → reproduces current
  `GOAL_PRIORITY.strength` (id-for-id); DB-only strength → resolves to
  goblet/db_bench/db_rdl/weighted-pull-up/chest-supported-row etc., never
  back_squat/bench; bodyweight → bodyweight candidates only.
- **Axial selection unit:** a session already holding a heavy squat resolves the
  `h_pull` intent to a 0-axial row (chest-supported/cable), not barbell row.
- **De-spine pass unit:** a day placed after a high-axial day has its barbell row
  (axial 2) swapped to chest-supported row (axial 0); a well-spaced day is
  untouched.
- **Scheduler unit:** two high-axial sessions are not adjacent when a rest day is
  available.
- **`rate-batch` integration:** DB-strength `prio` hit jumps from ~1/17 to full
  coverage; no high-axial session immediately follows another where avoidable.
- **Golden-master:** regenerate; confirm the diff is confined to the intended
  archetypes (full-gym unchanged).

## Files

- `packages/engine/src/data/strengthExercises.js` — add `axialLoad`.
- `packages/engine/src/lib/strength/priorityIntents.js` *(new)* — intents +
  `resolveIntents`.
- `packages/engine/src/lib/strength/program.js` — wire `resolveIntents`; expose
  `priorityByIntent`; sport shim.
- `packages/engine/src/lib/plan/allocator.js` — axial budget at fill-time; intent
  annotation; session `axialLoad`.
- `packages/engine/src/lib/plan/scheduler.js` — high-axial spacing.
- `packages/engine/src/lib/plan/despine.js` *(new)* + wiring in `plan/strength.js`
  or `PlanGenerator.js` (after scheduling).
- `apps/mobile/tests/intents.js`, `apps/mobile/tests/axial.js` *(new)*; regenerate
  `tests/__snapshots__/engine-golden-master.json`.

## Future (out of scope, noted)

- Sport intent chains could gain real fallbacks (currently single-candidate shims).
- The axial budget could consume live readiness/ACWR so spinal-load management
  reacts to actual fatigue, not just plan structure.
