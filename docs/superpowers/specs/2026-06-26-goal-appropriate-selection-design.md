# Design: Goal-appropriate exercise selection (training-quality gating)

**Date:** 2026-06-26
**Status:** Draft for review
**Scope:** packages/engine — exercise data (`quality` tag) + allocator selection (gate + steer) + light CNS cap

## Problem

Working-exercise selection (`bestExercise` + the slot anchors in `allocator.js`)
scores purely on muscle contribution + the priority-list boost. It **ignores
`goalTags`/`sportTags`** for working exercises, so a hang clean — tagged
`sportTags: ['run_sprint']`, `role: 'primary'`, `pattern: 'squat'` — competes as a
generic squat-pattern primary and can be programmed for a bodybuilder. Olympic
lifts and plyometrics develop **power**, a quality a hypertrophy or pure-strength
athlete doesn't want, at real CNS and skill cost with poor size/strength transfer.

The universal compounds (squat, bench, deadlift, OHP, pull-up) carry no tags and
correctly belong everywhere; the gap is that the *specialist* movements aren't
fenced off, and the strength↔hypertrophy mix isn't steered beyond the existing
priority lists.

## Decisions (from brainstorming, 2026-06-26)

1. **Scope: gating + light CNS tuning.** Hard-gate specialist (power) work; keep the
   existing 2-primary cap as the CNS backstop, flexed lightly by style.
2. **One primary `quality` per exercise:** `general` (default) · `strength` ·
   `hypertrophy` · `power`. The dominant adaptation the exercise develops.
3. **Power is a hard gate; strength↔hypertrophy is soft.** Strength and hypertrophy
   are built by mostly the same exercises separated by *loading* (the rep/RPE scheme
   table already varies that by goal), so off-quality strength/hypertrophy work is
   **de-prioritised, not excluded** (a strength athlete still gets a little
   isolation; a bodybuilder can still use a heavy specialist). Power is genuinely
   inappropriate outside power goals → **excluded**.
4. **The relevance signal for power is the resolved priority list.** It is already
   sport-discipline- and build-style-resolved (the sprint list contains cleans, the
   long-distance list does not, the functional list contains box jumps), so the gate
   needs no separate run-discipline threading.

## The quality model

A new optional exercise field `quality` (default `general`):

- **`general`** — the bread-and-butter compounds that build both strength and size:
  back/front squat, deadlift, trap-bar DL, bench, DB bench, incline press, OHP,
  rows, lat pulldown, pull-up, RDL, hip thrust, split squat, lunges, dips.
- **`hypertrophy`** — isolation / stretch-position / machine work: leg ext, leg
  curl (all), chest/cable fly, low-to-high fly, reverse pec deck, lateral raise,
  rear fly, all curls, all triceps extensions, DB pullover, hack/leg-press.
- **`strength`** — heavy specialist variants: pause squat, box squat, rack pull,
  deficit deadlift, floor press, close-grip bench, JM press, good morning.
- **`power`** — Olympic lifts + plyometrics + jumps + sled: hang clean, power clean,
  depth jump, broad jump, sled push, double-leg pogo, single-leg pogo, A-skip /
  bounding, seated box jump.

(Calf, carry, and the Piece-A health/isoCore items stay `general` — quality gates
*working* selection; supportive work is governed by `loadClass`.)

## Architecture

The goal's **primary quality** is derived from `ctx.style`: `strength` → strength,
`bodybuilding` → hypertrophy, `sport` → strength, `functional` → balanced (no
off-quality penalty). `program.power` is threaded into the allocator ctx
(`ctx.power`), like `ctx.sport` in Piece A.

### 1. Power hard-gate (`bestExercise` + anchors)

A candidate with `quality === 'power'` is **rejected** unless:

```
ctx.power === true
  && ( ctx.exercisePriority.includes(ex.id)
       || (ex.goalTags || []).includes(styleGoalTag(ctx.style)) )
```

where `styleGoalTag` maps `bodybuilding → 'hypertrophy'`, else the style itself.
Effect: bodybuilding / strength build (`power: false`) get **no** power work;
functional gets only its priority-listed jumps; a sprinter gets sprint-listed
cleans/plyos; a swimmer / long-distance runner gets essentially none (their
priority lists omit them). Non-power exercises with `sportTags` (hip thrust) are
**never** gated — `quality` is the switch that says "apply the gate here."

### 2. Soft strength↔hypertrophy steering (`bestExercise` score)

A quality multiplier folds into the existing score (alongside the 1.35× priority
boost):

- exercise `quality` === goal primary → ×1.15 (prefer on-quality)
- `general` → ×1.0 (always central)
- off-quality (the *other* of strength/hypertrophy) → ×0.7 (de-prioritise, not
  exclude)
- `power` (only ever present post-gate, i.e. wanted) → ×1.0 (neutral; it's already
  gated-in and priority-boosted)
- `functional` goal (balanced) → ×1.0 for all non-power qualities.

The shared weekly deficit still controls total volume, so this reorders *which*
exercises fill the target without changing how much.

### 3. Light CNS cap (`bestExercise` primary cap)

The existing "≤2 primaries per slot" cap flexes by style: `strength` may take a
**3rd** primary; all other styles stay at **2**. Heavy-first ordering already holds
(anchors placed first).

### Data corrections

- Add `quality` to the ~40–50 non-`general` exercises per the audit above; the big
  compounds stay default `general`.
- No tag is removed; `goalTags`/`sportTags` keep their existing (preference + power-
  relevance) roles.

## Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `strengthExercises.js` | `quality` per exercise | — |
| `resolveProgram` / `PlanGenerator` / `PlanService` | thread `ctx.power` into the allocator | program |
| `bestExercise` + anchors (`allocator.js`) | power gate + quality steer + flexed primary cap | exercise data, ctx |

`styleGoalTag` + the goal→primary-quality map are tiny pure helpers in
`allocator.js` (or `strength/program.js`).

## Testing

- Gate: a bodybuilding plan contains **no** `power` exercises; a strength plan none;
  a sprint plan **does** contain its priority cleans/plyos; a long-distance plan
  contains none.
- Hip-thrust regression: hip thrust (general, `sportTags: ['cycle','swim']`) still
  appears for a bodybuilder (not gated).
- Steering: a strength plan's accessory mix leans `strength`/`general` over
  `hypertrophy`; a bodybuilding plan leans `hypertrophy`; both still contain the
  `general` compounds.
- CNS cap: a strength session may contain 3 primaries; a bodybuilding session ≤2.
- `profile-review`: the hypertrophy archetype shows no hang cleans / box jumps; the
  sprint archetype still shows power work.
- Golden master regenerated; update `sport-anchor`, `program-resolution`,
  `split-engine` where expectations shift. Confirm `suggestOptimalFrequency`
  unchanged.

## Open items (implementation calibration)

- **Steering multipliers** (×1.15 / ×0.7) and the **strength 3rd-primary** flex —
  tune against the profile archetypes so steering is visible without starving
  volume.
- **`quality` audit completeness** — the rule + decided lists are fixed; the
  per-exercise pass over the full library happens during implementation, defaulting
  anything unclassified to `general`.

## Out of scope (YAGNI)

- A full CNS-budget model (weekly CNS-load accounting, per-exercise CNS cost) — the
  flexed primary cap + power gate cover the stated need.
- Quality *vectors* (scoring every exercise 0–3 on three axes) — rejected in
  brainstorming as more precision than the strength/hypertrophy overlap justifies.
- Changing rep/RPE schemes — already goal-tuned in the scheme table.
