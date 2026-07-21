# Sprint 2 — Session Intelligence (RPE & weight by exercise role)

**Date:** 2026-07-20
**Status:** Design for review
**Scope:** packages/engine (additive plan-item fields + core-load targets) +
apps/mobile (runner behaviour). Golden-master impact expected and audited.

## The problem (observed in real use, 2026-07-20)

1. The runner asked Simon for an **RPE on cat-cow** — a mobility drill with no
   meaningful effort rating.
2. **Pallof press had no weight target** and no weight tracking, even though
   it's a loadable cable exercise.

Root cause for both: the runner decides "is this a strength set?" by parsing
the item's text ("N × R" → set steps with RPE + weight UI), because plan items
don't carry the catalogue's knowledge of what the exercise *is*. The catalogue
already knows: every exercise has `role` (primary · accessory · iso · core ·
plyo) and `equip` (`strengthExercises.js:15–18`) — e.g. `pallof` is
`role: 'core', equip: 'cable', loadClass: 'isoCore'` (line 91). That knowledge
just never reaches the UI.

## Design

### 1. Thread exercise identity onto plan items (engine, additive)

Plan items gain two fields at generation time: `exerciseId` and `role`
(catalogue values; rehab/mobility items from the rehab library get
`role: 'mobility'`). Purely additive — no existing field changes, the engine
stays pure. Golden master will change by these added keys only; re-baseline
with `UPDATE=1` and audit key-by-key that **only** `exerciseId`/`role`
appeared.

The runner's `buildSteps` then reads `item.role` directly, with the current
text-parsing kept as fallback for old pinned sessions (freeze-on-start
snapshots created before this change won't have the new fields — behaviour for
those stays exactly as today).

### 2. RPE gating (app)

RPE is collected **only** for effort-based work:

| role | RPE asked? | Weight UI? |
|---|---|---|
| primary, accessory, iso | yes | yes (as today) |
| core — loadable equip (cable/machine/dumbbell/kettlebell/band/barbell) | yes | **yes (new)** |
| core — bodyweight | no | no |
| plyo | no | no |
| mobility / rehab / primer | no | no |

Non-effort items keep a simple "Done" step (the existing `prep` step type).
The session log simply omits `actual_rpe` for those items — no schema change
(the column already allows null).

### 3. Weight targets for loadable core work (engine + app)

Pallof-class exercises can't use the 1RM path (`liftKey` ties targets to
squat/bench/deadlift 1RMs; core work has no 1RM). Design:

- **First exposure:** the engine prescribes no number (it has no basis for
  one); the runner shows "pick a weight you can hold with good form" and an
  **enabled** weight stepper (today it's disabled when no target exists,
  `SessionRunner.jsx:281,349`). The logged weight goes through the existing
  `logLiftSets` autoregulation path.
- **Subsequent sessions:** the runner surfaces "last time: X kg" from
  `setLogsBySession` history as the pre-filled target. Progression stays
  user-led (these are stability movements — chasing load is the wrong
  incentive; Art 6: adaptation before dose).
- This is deliberately a **runtime/app-side** memory, not an engine
  prescription — the pure generator can't read history (it would break
  same-profile-same-plan). The engine's only change is the two additive item
  fields; the runner decides loadability by looking up the exercise's `equip`
  in the catalogue via `exerciseId` (the catalogue is already exported from
  `@performance-os/engine`, which the app imports today).

## What this does NOT do

- No change to which exercises are selected, session structure, doses, or rest.
- No change to the RPE scale or autoregulation logic for strength work.
- No schema/migration changes.

## Testing & verification

- Engine: unit test that generated plan items carry `exerciseId`/`role`;
  golden-master re-baseline audited to show only additive keys.
- App: `npm run dev` manual pass — a session containing cat-cow-style mobility
  (no RPE, no weight), Pallof press (weight stepper enabled, last-time
  pre-fill on second run), and a normal strength lift (unchanged).
- Old pinned session (pre-change snapshot) still runs exactly as before.
- `npm test` + `npm run lint` from repo root.

## Execution & merge policy

Implement overnight after Sprint 1. The engine change is additive but touches
the golden master, so the PR ships with the key-by-key baseline audit in its
description. Merge autonomously only if the audit shows purely additive keys;
anything unexpected in the baseline diff → pause for Simon.

## Implementation note (2026-07-20, pre-build discovery)

Plan items ALREADY carry `exId` (WP-46) and the catalogue is already exported to the
app — so the "thread exerciseId/role through the engine" step in this spec is
unnecessary. The sprint ships app-only: a classifier resolves items against the
exported catalogue (by exId, name fallback). No engine change, no golden-master change.
