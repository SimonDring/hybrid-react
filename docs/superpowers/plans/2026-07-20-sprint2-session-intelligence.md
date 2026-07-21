# Sprint 2 — Session Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The runner asks for RPE/weight only where they mean something: mobility drills get a simple Done, loadable core work (Pallof press etc.) gets an enabled, history-remembering weight tracker.

**Architecture — IMPORTANT DEVIATION FROM THE SPEC (verified 2026-07-20):** the spec assumed an engine change to thread `exerciseId`/`role` onto plan items. Investigation shows **items already carry `exId`** (WP-46; emitted at `packages/engine/src/lib/dose/dose.js:179-192`, preserved through `schedule/structure.js:126`), and the catalogue (with `role`, `pattern`, `equip`) is already exported to the app (`packages/engine/index.js:84` → `EXERCISES`). So this sprint is **app-only: no engine change, no golden-master impact**. Note this deviation in the spec file (Task 1 Step 1) so the record stays honest. Spec: `docs/superpowers/specs/2026-07-20-sprint2-session-intelligence-design.md`.

**Tech Stack:** React (apps/mobile), catalogue lookup via `EXERCISES` from `@performance-os/engine`. Tests: plain node scripts in `apps/mobile/tests/`.

## Global Constraints

- Same as Sprint 1: real theme variables only; writes via store actions; `npm test` + `npm run lint` green per commit; app runs after every task; work on this worktree branch, no merge/push to main.
- The engine stays untouched this sprint. If you find yourself editing `packages/engine`, stop — you've left the design.
- Backwards compatibility: pinned sessions created before WP-46 may lack `exId`; anything unresolvable keeps today's exact behaviour (strength-style set steps with RPE).

Classification ground truth (from `packages/engine/src/data/strengthExercises.js`):
- Cat-cow = `cat_camel_thoracic` → `pattern: 'mobility'`, `equip: 'bodyweight'`, `role: 'core'` (line 146)
- Pallof press = `pallof` → `pattern: 'core'`, `equip: 'cable'`, `role: 'core'`, `loadClass: 'isoCore'` (line 91)
- Roles in the catalogue: `primary · accessory · iso · core · plyo`; mobility drills live under `role: 'core'` with `pattern: 'mobility'`.

---

### Task 1: `exerciseMeta` classifier (app lib) — TDD

**Files:**
- Create: `apps/mobile/src/lib/exerciseMeta.js`
- Test: `apps/mobile/tests/exercise-meta.js`
- Modify: `docs/superpowers/specs/2026-07-20-sprint2-session-intelligence-design.md` (append the deviation note)

**Interfaces:**
- Produces: `classifyItem(item) → { collectRpe: boolean, collectWeight: boolean, simpleDone: boolean }` and `catalogueEntryFor(item) → entry|null`. Task 2 (runner) consumes both. `lastLoggedWeightFor(name, setLogsBySession, excludeSessionId) → number|null` for Task 3.

- [ ] **Step 1: Append to the spec** (bottom, new section):

```markdown
## Implementation note (2026-07-20, pre-build discovery)

Plan items ALREADY carry `exId` (WP-46) and the catalogue is already exported to the
app — so the "thread exerciseId/role through the engine" step in this spec is
unnecessary. The sprint ships app-only: a classifier resolves items against the
exported catalogue (by exId, name fallback). No engine change, no golden-master change.
```

- [ ] **Step 2: Write the failing test** `apps/mobile/tests/exercise-meta.js` (plain-assert pattern copied from a neighbouring test):

```js
import { classifyItem, catalogueEntryFor, lastLoggedWeightFor } from '../src/lib/exerciseMeta.js';

// Resolution: by exId; by name fallback; unresolvable → null entry
// assert catalogueEntryFor({ exId: 'pallof' }).name === 'Pallof press'
// assert catalogueEntryFor({ name: 'Cat-Camel + Thoracic Rotation' }).id === 'cat_camel_thoracic'
// assert catalogueEntryFor({ name: 'Some Unknown Movement' }) === null

// Mobility → simple Done, nothing collected
// c1 = classifyItem({ exId: 'cat_camel_thoracic', sets: '2 × 8' })
// assert c1.simpleDone === true && c1.collectRpe === false && c1.collectWeight === false

// Loadable core → weight + RPE
// c2 = classifyItem({ exId: 'pallof', sets: '3 × 10' })
// assert c2.collectWeight === true && c2.collectRpe === true && c2.simpleDone === false

// Bodyweight core → reps only, no RPE/weight
// c3 = classifyItem({ exId: 'dead_bug', sets: '3 × 10' })
// assert c3.collectWeight === false && c3.collectRpe === false && c3.simpleDone === false

// Plyo → reps only, no RPE/weight
// (pick a role:'plyo' id from the catalogue, e.g. box jump if present — verify id in the file first)

// Strength (primary/accessory/iso) → unchanged full collection
// c4 = classifyItem({ exId: 'back_squat', sets: '4 × 5' })
// assert c4.collectWeight === true && c4.collectRpe === true

// Rehab-flagged items → simple Done regardless of resolution
// assert classifyItem({ name: 'Ankle circles', rehab: true }).simpleDone === true

// UNRESOLVABLE → legacy behaviour (full collection; buildSteps decides strength-ness)
// c5 = classifyItem({ name: 'Mystery Lift', sets: '3 × 8' })
// assert c5.collectWeight === true && c5.collectRpe === true && c5.simpleDone === false

// lastLoggedWeightFor scans setLogsBySession newest-first for the exercise name,
// skipping the current session id; returns actual_weight or null.
```

- [ ] **Step 3: Run to verify failure** (`node apps/mobile/tests/exercise-meta.js`). Expected: cannot find module.

- [ ] **Step 4: Implement `apps/mobile/src/lib/exerciseMeta.js`:**

```js
/**
 * exerciseMeta — resolves a plan item to its catalogue entry and decides what the
 * runner should collect for it. The catalogue already knows what each movement IS
 * (role/pattern/equip); this is the app-side read of that knowledge. Items that
 * can't be resolved (pre-WP-46 pins, off-catalogue names) keep legacy behaviour.
 */
import { EXERCISES } from '@performance-os/engine';

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const LOADABLE_EQUIP = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'band']);

export function catalogueEntryFor(item) {
  if (!item) return null;
  return (item.exId != null && BY_ID.get(item.exId))
    || BY_NAME.get(String(item.name || '').toLowerCase())
    || null;
}

export function classifyItem(item) {
  // Rehab/prevention items are protocol work — do it, tick it, no ratings.
  if (item?.rehab || item?.prevention) return { collectRpe: false, collectWeight: false, simpleDone: true };
  const e = catalogueEntryFor(item);
  if (!e) return { collectRpe: true, collectWeight: true, simpleDone: false };  // legacy: unknown = strength-style
  if (e.pattern === 'mobility') return { collectRpe: false, collectWeight: false, simpleDone: true };
  if (e.role === 'plyo') return { collectRpe: false, collectWeight: false, simpleDone: false };
  if (e.role === 'core') {
    const loadable = LOADABLE_EQUIP.has(e.equip);
    return { collectRpe: loadable, collectWeight: loadable, simpleDone: false };
  }
  return { collectRpe: true, collectWeight: true, simpleDone: false };  // primary/accessory/iso
}

// Most recent logged weight for this exercise across OTHER sessions (the runner's
// in-session carry already handles the current one). setLogsBySession: { [sessionId]: rows[] }.
export function lastLoggedWeightFor(exerciseName, setLogsBySession = {}, excludeSessionId = null) {
  let best = null;
  for (const [sid, rows] of Object.entries(setLogsBySession)) {
    if (sid === String(excludeSessionId)) continue;
    for (const r of rows || []) {
      if (r.exercise_name !== exerciseName || r.actual_weight == null) continue;
      if (!best || (r.completed_at || '') > (best.completed_at || '')) best = r;
    }
  }
  return best ? Number(best.actual_weight) : null;
}
```

- [ ] **Step 5: Run the test — pass.** Also `npm test && npm run lint` (whole suite, no regressions).

- [ ] **Step 6: Commit.**

```bash
git add apps/mobile/src/lib/exerciseMeta.js apps/mobile/tests/exercise-meta.js docs/superpowers/specs/2026-07-20-sprint2-session-intelligence-design.md
git commit -m "feat(runner): exerciseMeta classifier — what to collect per exercise, from the catalogue"
```

---

### Task 2: Gate the runner's steps by classification

**Files:**
- Modify: `apps/mobile/src/screens/SessionRunner.jsx` (`buildSteps` ~33–105; set-step render ~339–368; `logCurrentSet` ~252)
- Test: `apps/mobile/tests/runner-steps.js` (new — `buildSteps` is already exported)

**Interfaces:**
- Consumes: `classifyItem` from Task 1.
- Produces: set steps gain `collectRpe`/`collectWeight` booleans; mobility items become `prep` steps.

- [ ] **Step 1: Write the failing test** `apps/mobile/tests/runner-steps.js`:

```js
import { buildSteps } from '../src/screens/SessionRunner.jsx';
// If importing the screen fails under node (JSX), export buildSteps from a new
// plain module apps/mobile/src/lib/runnerSteps.js instead, re-import it in the
// screen, and point this test there. (Preferred if there's any parse friction.)

// session: items = [
//   { name: 'Cat-Camel + Thoracic Rotation', exId: 'cat_camel_thoracic', sets: '2 × 8', section: 'main' },
//   { name: 'Pallof press', exId: 'pallof', sets: '3 × 10', section: 'main', restSec: 60 },
//   { name: 'Back squat', exId: 'back_squat', sets: '4 × 5', weight: '80 kg', rpe: 'RPE 8', section: 'main', restSec: 180 },
// ]
// assert: cat-camel produces ONE prep step (not 2 set steps)
// assert: pallof produces 3 set steps with collectWeight === true && collectRpe === true
// assert: back squat produces 4 set steps with collectWeight === true (unchanged)
// assert: an off-catalogue "3 × 8" item still produces 3 legacy set steps (collectRpe true)
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Move `buildSteps` (plus its helpers `parseWeight`, `setsCount`) into `apps/mobile/src/lib/runnerSteps.js` (keeps the node test JSX-free), import `classifyItem`, and:
  - In `makeSetSteps(it)`: first line `const cls = classifyItem(it); if (cls.simpleDone) return [];` (mobility/rehab falls through to the existing `makePrep` path at the call-site, line 89). Then stamp each produced step with `collectRpe: cls.collectRpe, collectWeight: cls.collectWeight`.
  - `SessionRunner.jsx` imports `buildSteps` from the new module (keep a re-export `export { buildSteps }` in the screen so nothing else breaks — grep for other importers first).

- [ ] **Step 4: Gate the set-step UI.** In the set-step render (`SessionRunner.jsx` ~339–368):
  - Weight stepper: replace `const hasWeight = step.kind === 'set' && (step.targetWeight != null || step.weightLabel != null);` (line 281) with `const hasWeight = step.kind === 'set' && step.collectWeight !== false && (step.targetWeight != null || step.weightLabel != null || step.collectWeight === true);` — i.e. loadable-core steps get an ENABLED stepper even with no prescribed target.
  - RPE row: wrap the `rn-rpe-label` + `rating-row` block (lines 353–358) in `{step.collectRpe !== false && ( … )}`.
  - Target line (line 342–345): when `step.collectRpe === false`, omit the `@ RPE …` suffix; when there's no weight target but `collectWeight`, show `Target: {reps} reps · pick a load you can hold with good form`.
  - `logCurrentSet` (line 267): log `actual_rpe: step.collectRpe === false ? null : draft.rpe`.

- [ ] **Step 5: Run tests — pass** (`npm test && npm run lint`).

- [ ] **Step 6: Manual pass** (`npm run dev`): a session with cat-cow shows Done (no set counter/RPE); Pallof shows reps + enabled weight + RPE; back squat unchanged.

- [ ] **Step 7: Commit.**

```bash
git add apps/mobile/src/lib/runnerSteps.js apps/mobile/src/screens/SessionRunner.jsx apps/mobile/tests/runner-steps.js
git commit -m "feat(runner): RPE and weight collected only where they mean something"
```

---

### Task 3: "Last time" weight memory for loadable core work

**Files:**
- Modify: `apps/mobile/src/screens/SessionRunner.jsx` (draft-seeding effect, lines 176–186)

**Interfaces:**
- Consumes: `lastLoggedWeightFor` (Task 1), `setLogsBySession` (already subscribed, line 124), `sessionDbId` (line 138).

- [ ] **Step 1: Seed from history.** In the draft-seeding effect (line 179), extend the weight fallback chain:

```jsx
    const lastTime = (step.targetWeight == null && step.collectWeight)
      ? lastLoggedWeightFor(step.exerciseName, setLogsBySession, sessionDbId)
      : null;
    setDraft({
      weight: carried?.weight ?? step.targetWeight ?? lastTime,
      reps: carried?.reps ?? step.targetReps,
      rpe: carried?.rpe ?? step.targetRpe
    });
```

- [ ] **Step 2: Show the provenance.** In the set-step target line, when `lastTime` seeded the draft (no prescribed weight but history exists), render `Last time: {lastTime} kg` as a muted hint under the target line. Hold the value in a `const` computed next to `hasWeight` so render and effect agree — compute it once via `useMemo` keyed on `[cursor]`.

- [ ] **Step 3: Manual pass:** run a session with Pallof press, log 20 kg, complete; start next week's session containing Pallof → weight pre-filled 20, "Last time: 20 kg" shown.

- [ ] **Step 4: Tests + commit.**

Run: `npm test && npm run lint`. Expected: pass.

```bash
git add apps/mobile/src/screens/SessionRunner.jsx
git commit -m "feat(runner): loadable core work remembers last logged weight across sessions"
```

---

### Task 4: Sprint verification

- [ ] **Step 1:** `npm test && npm run lint` — green.
- [ ] **Step 2:** Confirm the engine is untouched: `git diff main --stat -- packages/engine` shows ONLY the spec/plan docs if anything. Golden master: `git diff main -- apps/mobile/tests/__snapshots__` → empty.
- [ ] **Step 3:** Full manual pass per the spec's Testing section (mobility Done / Pallof weight+last-time / strength unchanged / pre-change pinned session still runs).
