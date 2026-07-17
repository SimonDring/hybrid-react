# Force-velocity-aware selection — PARKED pending a force-velocity science review

**Status: PARKED (Simon, 2026-07-16). The mechanism is built and dormant; the FLIP waits on a
science review of the force-velocity tags. Do not flip the default without the review + a fresh
audit sign-off.**

## State

- **Step 1 (merged, #217):** the flag-gated force-velocity-match nudge in `selectInterventions.valueOf`
  + the governed `SELECTION_SCORING.forceVelocityWeight` (0.15). Default OFF ⇒ byte-identical.
- **Plumbing (this change):** `opts.forceVelocityAware` threads generatePlan → ctx → buildGymWeek →
  buildWeek → allocateGym → selection. Byte-identical (default off). This makes the flag reachable so
  the flip audit is **reproducible**: `generatePlan(profile, { forceVelocityAware: true })`.
- **The flip is NOT done.** Nothing steers; every plan is unchanged.

## Why parked — the audit found the flip rests on unvalidated seed tags

The flip audit (flag OFF vs ON across the 11 sports + 4 build disciplines) found **5 of 15 archetypes
change** — all power/explosive cohorts, as designed. But the exercise swaps rest on **seed
(`needsReview`) force-velocity tags** and are **coaching-judgment calls**, not clear wins:

| Archetype | Delta | The judgment call |
|---|---|---|
| running-sprint · off | re-ordered only | benign |
| hurling · off | re-ordered only | benign |
| swimming · off | `kb_swing` → `sled_push` | is a sled push a better *explosive-strength* pick than a KB swing? |
| rugby · off | `kb_swing` → `sled_push` | same |
| build · olympic | drops `broad_jump` | should an olympic block keep the broad jump? |

Mechanically the nudge is correct: for `explosiveStrength` the map's ideal is **`strength-speed`**
(mid-continuum), so `sled_push` (`speed-strength`) out-scores `kb_swing`/`broad_jump` (both
`ballistic`, the reactive end). Whether that's a *sharpening* depends on the tags being right.

## What the science review must validate (the gate)

Before the flip, a sports-science pass on the **force-velocity knowledge** (both are `seed` /
`needsReview` today):

1. **Exercise force-velocity tags** (`data/exerciseQualities.js` → `forceVelocity`), at least for the
   movers: **`kb_swing` (ballistic?)**, **`sled_push` (speed-strength?)**, **`broad_jump`
   (ballistic?)** — and their neighbours in the explosive/reactive pool.
2. **The quality→ideal force-velocity map** (`data/qualityMovementMap.js` → `forceVelocity`), esp.
   **`explosiveStrength` = strength-speed** and **`reactiveStrength` = ballistic** — is the mid-vs-end
   assignment right?
3. If validated, **raise the tags' confidence** off `seed`; then the governed
   `SELECTION_SCORING.forceVelocityWeight` may climb from its conservative 0.15 floor.

## The flip, when the review passes

1. Re-run the audit (`generatePlan(p, { forceVelocityAware: true })` per cohort) → confirm every delta
   is now a reviewed sharpening.
2. Flip the flag on for the signed-off cohort (set `ctx.forceVelocityAware` — the plumbing is ready),
   with a scoped, expected-delta re-baseline of only the moving archetypes + Simon's coaching sign-off.
3. Rollback = flag back off → byte-identical.

Until then: the mechanism stays dormant, the goldens stay byte-identical, and no plan is steered by
unvalidated seed data — the honest state (Art 13: a low-confidence seed steers at soft input at most,
and here not at all until reviewed).
