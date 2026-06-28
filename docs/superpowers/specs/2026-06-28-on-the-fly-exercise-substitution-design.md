# On-the-fly exercise substitution (session-only) — design

**Date:** 2026-06-28
**Branch:** `feat/focused-session-runner`
**Status:** Approved in brainstorm; spec for review before implementation.

## Plain-language summary

In the gym, a piece of equipment is sometimes taken or missing. This adds a
**Substitute** action inside the focused runner so an athlete can swap the current
exercise for an equivalent one on the spot. The app shows **same-muscle alternatives,
ranked by how closely they match the original**, brings the **right weight target** for
the new lift (so intensity is preserved), and keeps everything **session-only** — the
generated plan and future weeks are never changed.

### Decisions (from the brainstorm)
- **Where:** the runner only (the in-gym, set-by-set view).
- **What's offered:** exercises that share the original's muscle groups, ranked
  same-pattern-first (squat → leg press / hack), then same-muscles-different-pattern
  (squat → split squat / lunge); never an unrelated movement (OHP). Filtered to the
  athlete's available equipment.
- **Weight:** recomputed for the substitute via the existing `exerciseLoad` machinery
  so the target intensity is preserved (a leg press shows a heavier number than a squat
  for the same %1RM, per its coefficient).
- **Scope:** a session-local override only (`sessionOverrides`). Future plans untouched.
- **Progression:** only a *true variant* (one that maps to the same tracked lift, e.g.
  front/box squat → squat) updates that lift's e1RM; a non-equivalent (leg press) logs
  its own per-set history but does not move the tracked lift. This is automatic — see
  "Progression" below.

---

## Architecture

```
ENGINE (pure)
  lib/plan/substitutions.js   NEW  substituteOptions(item, {access,lifts,level}) → ranked
                                   alternatives, each with a recomputed weight target.
APP
  stores/trainingStore.js     EDIT substituteExercise(sessionKey, itemIndex, optionId)
                                   → writes the swap into the session override.
  screens/SessionRunner.jsx   EDIT a "Substitute" affordance on each main SET step →
                                   opens a sheet of options → applies + rebuilds steps.
  components/SubstituteSheet.jsx NEW  bottom-sheet listing ranked options (reuses the
                                   ExerciseInfo sheet styling).
  styles/main.css             EDIT sheet/list styles (theme vars only).
DATA
  lib/sessionOverrides.js     REUSE (local-only, session-keyed) — no change.
```

No schema change. No change to the generated plan, the allocator, or future weeks.

---

## Component 1 — `substituteOptions` (engine, pure)

**File:** `packages/engine/src/lib/plan/substitutions.js`

```
substituteOptions(item, { access = [], lifts = {}, level = 'intermediate', max = 6 }) -> Option[]
Option = { id, name, equip, pattern, sets, rpe, weight, sameLift, reason }
```

Algorithm:
1. **Resolve the original** exercise from `item.name` via a name→EXERCISES map. If it
   isn't a known loadable exercise (e.g. a mobility/cardio row), return `[]` (no subs).
2. **Original muscle profile:** `origMC = muscleContribution(orig)`; `origTop` = its
   dominant muscle group (highest contribution).
3. **Candidates:** every `EXERCISES` entry that is
   - not the original `id`,
   - `level <= LEVELS[athlete level]`,
   - `availableEquip(access).has(equip)`,
   - **same muscle groups gate:** trains the original's dominant group
     (`muscleContribution(cand)[origTop] > 0`) **and** muscle-overlap ratio ≥ 0.5 (the
     candidate covers at least half of `origMC`'s groups). Squat→leg press (identical)
     and squat→split squat (quads+glutes overlap) pass; OHP/rows fail (no quads), and a
     marginal partial-overlap movement is rejected by the 0.5 floor. (The new test pins
     the exact accepted set; the threshold is tunable there.)
4. **Alignment score** (higher = closer to the original), each candidate:
   - `+3` same `pattern` as the original (closest movement match),
   - `+2` same `liftKey` as the original (a true variant — weight + progression carry
     across cleanly),
   - `+ overlap` = fraction of `origMC`'s groups the candidate also trains (0–1),
   - `+0.5` same `role`,
   - `−` loadability mismatch: if the original is loaded, penalise a bodyweight-only
     candidate (so a leg press ranks above a bodyweight squat for a barbell squat),
   - small deterministic `id`-hash tie-break for stable ordering.
5. **Weight per option:** clone the item with the candidate's name + the *kept* scheme
   (`sets`/`reps`/`rpe` unchanged) and run `applyWeights([clone], lifts, level)` →
   `clone.weight`. Carry it on the option (string like `"120 kg"`, or `null`/`"—"` for
   bodyweight/uncoefficiented moves).
6. Mark `sameLift = matchLift(cand.name) && matchLift(cand.name).key === matchLift(orig.name)?.key`.
7. Sort by score desc, return top `max`.

**Test** (`apps/mobile/tests/substitutions.js`):
- Back squat (full_gym) → options include `Hack / leg-press` (same pattern, ranked top
  among accessories) and a lunge-pattern split squat (same dominant group, lower); the
  list contains **no** OHP / row / press (no quad contribution).
- Every option carries a `weight` (or null) and `pattern`; the dominant-group gate holds.
- Equipment gate: a dumbbell-only `access` excludes machine/barbell-only options.
- Level gate: an advanced-only lift is excluded for a beginner.
- `sameLift` true for front/box squat, false for leg press.

---

## Component 2 — `substituteExercise` store action

**File:** `apps/mobile/src/stores/trainingStore.js`

```
substituteExercise(sessionKey, itemIndex, optionId)
```

- The runner only runs once a session is started, and `startSession` already pins the
  session as a local override (`setOverride`). So `getOverride(sessionKey)` exists; read
  its `items`.
- Build the substitute item: `{ ...origItem, name, weight, equip, substitutedFrom:
  origItem.name }` keeping `sets`/`rpe`/`section`/`num`/`superset`/`restSec`. Recompute
  `weight` via the engine (or take it from the chosen `Option`). Replace
  `items[itemIndex]`.
- `setOverride(sessionKey, { ...override, items })`, then `set(buildView())`. PlanService
  already swaps override items into the session view, so the runner re-reads the swapped
  exercise. Local-only (sessionOverrides isn't synced) — purely session-scoped.
- Expose a thin selector `substituteOptionsFor(item)` (wraps the engine call with the
  profile's `access`/`lifts`/`level`) for the sheet to list options.

---

## Component 3 — runner UI

**Files:** `apps/mobile/src/screens/SessionRunner.jsx`, new
`apps/mobile/src/components/SubstituteSheet.jsx`, `styles/main.css`.

- On each **main set step** (not primer rounds, not non-strength `done` steps), add a
  small **"Substitute"** text button under the target line.
- Tapping opens `SubstituteSheet` (bottom-sheet, ExerciseInfo styling): the original at
  top, then the ranked options — each row shows name, equipment chip, the recomputed
  weight (e.g. "Leg press · machine · 120 kg"), and a subtle "tracks your squat" tag
  when `sameLift`.
- Picking an option calls `substituteExercise(key, itemIndex, optionId)`, closes the
  sheet, and **rebuilds the runner's steps** from the updated session, moving the cursor
  to the first set of the substituted exercise (reusing the existing resume logic so
  already-logged sets are respected). The set count + rep/RPE targets are unchanged; only
  the exercise name + weight change.
- `itemIndex` mapping: each step already carries its source `item`; tag set steps with
  the override item index so the action knows which item to replace.

---

## Progression (automatic — no new logic)

The runner logs each set to `set_logs` with `exercise_name` = the (possibly substituted)
name and `exercise_key` = `matchLift(name)?.key`. On completion, `handleSubmit`'s
`topLoggedSet(l)` matches a tracked lift's logged sets by `exercise_key === l.key` (or
exact name). So:
- **front/box squat** → `matchLift` = `squat` → updates the squat e1RM (true variant).
- **leg press** → `matchLift` = `null` → its sets are saved as history but never match a
  tracked lift, so the squat e1RM is untouched.

This delivers the chosen "only true variants update progression" with zero extra code —
it's a consequence of keying logs by `matchLift`.

---

## Edge cases

- **Non-strength / primer items:** no Substitute button (cardio/mobility/primer rounds).
- **Unknown exercise name:** `substituteOptions` returns `[]`; the button is hidden when
  there are no options.
- **Mid-exercise swap:** substituting after logging some sets of the original keeps those
  logged sets as history and continues the substitute from the current set. (Rare; the
  expected use is swapping before starting the movement.)
- **Bodyweight / uncoefficiented substitute:** weight shows "—" (same as today for such
  moves); reps/RPE still drive the set.
- **Reset/cancel:** clearing or cancelling the session clears its override (existing
  behaviour), discarding substitutions — they were session-only by design.
- **Supersets:** substituting one member replaces just that exercise; the superset
  pairing/rest is preserved.

## Non-goals

No substitution from the pre-session preview (runner-only), no change to future weeks,
no new equipment-availability questionnaire (you pick from what you can do), no schema /
sync changes, no change to the allocator or generated plan.

## Testing & verification

- `node tests/substitutions.js` (new) + full engine suite green (pure addition).
- Live: in the runner, tap Substitute on Box squat → sheet lists leg press / split
  squat with weights, no OHP; pick leg press → the step becomes "Leg press" at its own
  target weight, same sets×reps; log it → `set_logs` records leg press and the squat
  e1RM is unchanged; complete and confirm the next week's squat target is unaffected
  (future plan untouched). `npm run build` clean.

## Commit plan

1. spec (this doc)
2. engine: `substituteOptions` + test
3. store: `substituteExercise` + `substituteOptionsFor`
4. runner: Substitute button + SubstituteSheet + step rebuild + CSS
