# Goal-Appropriate Exercise Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag each exercise with a training `quality` and use it to keep power-specialist work (Olympic lifts, plyos) out of plans that don't want it, softly steer the strength↔hypertrophy mix, and let strength plans take a 3rd compound.

**Architecture:** A per-exercise `quality` field (`general` default · `strength` · `hypertrophy` · `power`) read by the allocator's `bestExercise` + anchors: a hard gate excludes `power` work unless the goal wants it and it's contextually relevant (in the resolved priority list or goal-tagged), a soft multiplier steers strength↔hypertrophy, and the per-session primary cap flexes by style. `program.power` is threaded into the allocator ctx.

**Tech Stack:** JavaScript ES modules (`@performance-os/engine`), node test scripts (`node tests/*.js`).

## Global Constraints

- Engine modules stay **pure**.
- `quality` ∈ `{ general, strength, hypertrophy, power }`, default `general`.
- **Power gate (verbatim):** a `quality:'power'` exercise is allowed iff `ctx.power === true && (prioritySet.has(ex.id) || (ex.goalTags||[]).includes(styleGoalTag(style)))`, where `styleGoalTag` maps `bodybuilding→'hypertrophy'`, else the style itself. Non-power exercises are never gated.
- **Soft steer (verbatim):** quality multiplier — on-quality ×1.15, off-quality (the other of strength/hypertrophy) ×0.7, `general`/`power` ×1.0, `functional` goal (no primary) ×1.0 for all.
- **Goal primary quality:** `strength`/`sport` → `strength`; `bodybuilding` → `hypertrophy`; `functional` → none (balanced).
- **CNS cap:** primaries-per-slot cap = 3 for `strength`, else 2.
- Run tests from `apps/mobile/`: `node tests/<file>.js`. Golden-master regen: `UPDATE=1 node tests/golden-master.js`.
- The app must still run; `suggestOptimalFrequency` must be unchanged.

---

### Task 1: Tag exercises with `quality`

**Files:**
- Modify: `packages/engine/src/data/strengthExercises.js`
- Test: `apps/mobile/tests/exercise-quality.js` (create)

**Interfaces:**
- Produces: `quality` on the strength/hypertrophy/power exercises. Nothing reads it yet (Tasks 2–3 wire it), so behaviour is unchanged.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/exercise-quality.js`:

```js
// tests/exercise-quality.js — exercises carry the right training quality (default general).
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const q = (id) => (EXERCISES.find(e => e.id === id) || {}).quality;

assert(q('back_squat') === undefined && q('bench') === undefined && q('deadlift') === undefined, 'big compounds stay general (no quality tag)');
assert(q('hip_thrust') === undefined, 'hip thrust stays general (never gated despite sportTags)');
assert(q('hang_clean') === 'power' && q('power_clean') === 'power' && q('depth_jump') === 'power' && q('sled_push') === 'power', 'Olympic lifts + plyos = power');
assert(q('leg_ext') === 'hypertrophy' && q('chest_fly') === 'hypertrophy' && q('spider_curl') === 'hypertrophy', 'isolation = hypertrophy');
assert(q('pause_squat') === 'strength' && q('rack_pull') === 'strength' && q('deficit_deadlift') === 'strength', 'heavy specialist variants = strength');

console.log('exercise-quality done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/exercise-quality.js`
Expected: FAIL — `hang_clean` etc. have no `quality`.

- [ ] **Step 3: Add `quality` to the data**

In `packages/engine/src/data/strengthExercises.js`, add `quality: '<q>'` to each listed id (leave default-`general` exercises untouched):

`quality: 'power'` → `hang_clean`, `power_clean`, `depth_jump`, `broad_jump`, `sled_push`, `double_leg_pogo`, `sl_pogo_jump`, `bounding_a_skip`, `seated_box_jump`.

`quality: 'strength'` → `pause_squat`, `rack_pull`, `deficit_deadlift`, `box_squat`, `floor_press`, `close_grip_bench`, `jm_press`, `good_morning`.

`quality: 'hypertrophy'` → `leg_ext`, `leg_curl`, `seated_leg_curl`, `chest_fly`, `low_high_cable_fly`, `reverse_pec_deck`, `lateral_raise`, `rear_fly`, `biceps_curl`, `band_curl`, `incline_db_curl`, `spider_curl`, `triceps_pushdown`, `overhead_ext`, `overhead_cable_ext`, `hack_squat`, `db_pullover`.

Use the same scripted approach as the Piece-A `loadClass` audit (zsh-safe literal id lists):

```bash
F=packages/engine/src/data/strengthExercises.js
for id in hang_clean power_clean depth_jump broad_jump sled_push double_leg_pogo sl_pogo_jump bounding_a_skip seated_box_jump; do sed -i '' -E "s/id: '$id',/id: '$id', quality: 'power',/" "$F"; done
for id in pause_squat rack_pull deficit_deadlift box_squat floor_press close_grip_bench jm_press good_morning; do sed -i '' -E "s/id: '$id',/id: '$id', quality: 'strength',/" "$F"; done
for id in leg_ext leg_curl seated_leg_curl chest_fly low_high_cable_fly reverse_pec_deck lateral_raise rear_fly biceps_curl band_curl incline_db_curl spider_curl triceps_pushdown overhead_ext overhead_cable_ext hack_squat db_pullover; do sed -i '' -E "s/id: '$id',/id: '$id', quality: 'hypertrophy',/" "$F"; done
```

Verify counts: `grep -c "quality: 'power'" "$F"` → 9, `'strength'` → 8, `'hypertrophy'` → 17.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/exercise-quality.js`
Expected: all PASS, `exercise-quality done`.

- [ ] **Step 5: Confirm no behaviour change yet**

Run: `cd apps/mobile && node tests/golden-master.js 2>&1 | tail -1`
Expected: PASS (nothing reads `quality` yet).

- [ ] **Step 6: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/strengthExercises.js apps/mobile/tests/exercise-quality.js
git commit -m "feat(engine): tag exercises with training quality (strength/hypertrophy/power)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Power hard-gate + thread `ctx.power`

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (helpers + gate in `bestExercise` and `patternAnchor`)
- Modify: `packages/engine/src/lib/plan/strength.js` (pass `power` into the allocator ctx)
- Modify: `apps/mobile/src/lib/PlanService.js` (`gymCtx` carries `power`; reflow passes it)
- Test: `apps/mobile/tests/quality-gate.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `quality` (Task 1), `ctx.power`, `ctx.exercisePriority`.
- Produces: `primaryQuality(style)`, `styleGoalTag(style)`, `powerAllowed(ex, power, prioritySet, style)` helpers in `allocator.js`; `bestExercise` gains `power` + `goalPrimary` params.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/quality-gate.js`:

```js
// tests/quality-gate.js — power work is gated to goals that want it.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const powerNames = new Set(EXERCISES.filter(e => e.quality === 'power').map(e => e.name));
const plan = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a }));
const allItemNames = (p) => p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions).flatMap(s => s.items).map(it => it.name);
const hasPower = (p) => allItemNames(p).some(n => powerNames.has(n));

assert(!hasPower(plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5 })), 'bodybuilding plan has NO power work');
assert(!hasPower(plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5 })), 'strength plan has NO power work');
assert(hasPower(plan({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 4 })), 'sprint plan DOES contain power work');

// Hip-thrust regression: general exercise with sportTags is never gated.
const bb = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 6 });
assert(allItemNames(bb).includes('Hip thrust'), 'hip thrust (general) still appears for a bodybuilder');

console.log('quality-gate done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/quality-gate.js`
Expected: FAIL — bodybuilding/strength plans currently can contain power work (e.g. hang clean as a squat anchor).

- [ ] **Step 3: Add the helpers to `allocator.js`**

In `packages/engine/src/lib/plan/allocator.js`, add near the top (after `SESSION_CEILING_MIN` / the finisher constants):

```js
// Goal's primary training quality, derived from the style.
function primaryQuality(style) {
  if (style === 'strength' || style === 'sport') return 'strength';
  if (style === 'bodybuilding') return 'hypertrophy';
  return null;   // functional = balanced
}
// Map the build style to its goalTag value (bodybuilding is tagged 'hypertrophy').
const styleGoalTag = (style) => (style === 'bodybuilding' ? 'hypertrophy' : style);
// Hard gate: a power-quality exercise is allowed only when the goal wants power AND
// it's contextually relevant (in the resolved priority list, or goal-tagged).
function powerAllowed(ex, power, prioritySet, style) {
  if ((ex.quality || 'general') !== 'power') return true;
  if (!power) return false;
  return (prioritySet && prioritySet.has(ex.id)) || (ex.goalTags || []).includes(styleGoalTag(style));
}
```

- [ ] **Step 4: Apply the gate in `bestExercise` + `patternAnchor`**

In `bestExercise`, extend the signature with `power = false, goalPrimary = null` (append after `levelName = 'intermediate'`), and add the gate right after the `slot.exUsed.has(ex.id)` guard:

```js
    if (slot.exUsed.has(ex.id)) continue;
    if (!powerAllowed(ex, power, prioritySet, style)) continue;   // power gate
```

In `allocateGym`, after `const levelName = ctx.level || 'intermediate';` add:

```js
  const power = !!ctx.power;
  const goalPrimary = primaryQuality(style);
```

Pass `power, goalPrimary` at the three `bestExercise(...)` call sites (append after `levelName`). And in the `patternAnchor` closure, add the gate to its candidate filter — change:

```js
      let cands = EXERCISES.filter(e => e.pattern === pat && slot.equip.has(e.equip) && e.level <= slot.level);
```

to:

```js
      let cands = EXERCISES.filter(e => e.pattern === pat && slot.equip.has(e.equip) && e.level <= slot.level && powerAllowed(e, power, prioritySet, style));
```

(`power`, `prioritySet`, `style` are all in `allocateGym` scope, which `patternAnchor` closes over.)

- [ ] **Step 5: Thread `ctx.power` from the callers**

In `packages/engine/src/lib/plan/strength.js`, add `power: !!ctx.power` to the `ctx` object passed to `allocateGym` (next to `sport: ctx.sport || null`). (`buildGymWeek` in `PlanGenerator.js` already passes `power: program.power` into `strength.buildWeek`.)

In `apps/mobile/src/lib/PlanService.js` `gymCtx`, add `power: !!program.power` to the returned object (next to `sport`). In the reflow's `allocateGym` ctx (the object with `exercisePriority: gctx.exercisePriority, sport: gctx.sport`), add `power: gctx.power`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/quality-gate.js`
Expected: all PASS, `quality-gate done`.

- [ ] **Step 7: Regenerate golden master + full sweep**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js >/dev/null 2>&1 && node tests/golden-master.js 2>&1 | tail -1`, then the sweep:

`cd apps/mobile && fail=0; for f in tests/*.js; do out=$(node "$f" 2>&1); echo "$out" | grep -q FAIL && { echo "❌ $f"; echo "$out" | grep FAIL | head -3; fail=1; }; done; [ $fail -eq 0 ] && echo ALL PASS`

Update `sport-anchor` / `program-resolution` / `split-engine` if their expectations shift (e.g. a build archetype that previously drew a power exercise now doesn't) — keep each assertion's intent, update to the new correct value.

- [ ] **Step 8: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/plan/strength.js apps/mobile/src/lib/PlanService.js apps/mobile/tests/quality-gate.js apps/mobile/tests/__snapshots__/engine-golden-master.json apps/mobile/tests/*.js
git commit -m "feat(engine): hard-gate power-quality exercises to goals that want them

Olympic lifts + plyos only appear when program.power and the exercise is in the
resolved priority list or goal-tagged. Keeps hang cleans/box jumps out of
hypertrophy & strength plans; hip thrust (general) is never gated. Power threaded
into the allocator ctx. Golden master regenerated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Soft strength↔hypertrophy steer + CNS cap flex

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (`qualityMult` + score + primary cap)
- Test: `apps/mobile/tests/quality-steer.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `goalPrimary` (Task 2), `quality` (Task 1).
- Produces: `qualityMult(ex, goalPrimary)` helper; the per-slot primary cap flexes by style.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/quality-steer.js`:

```js
// tests/quality-steer.js — strength↔hypertrophy steering + CNS cap flex.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const qByName = new Map(EXERCISES.map(e => [e.name, e.quality || 'general']));
const isPrimary = new Set(EXERCISES.filter(e => e.role === 'primary').map(e => e.name));
const plan = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a }));
const names = (p) => p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions).flatMap(s => s.items).map(it => it.name);
const countQ = (p, q) => names(p).filter(n => qByName.get(n) === q).length;

// Steering: a bodybuilding plan does more hypertrophy work than a strength plan; and
// a strength plan does more strength-quality work than a bodybuilding plan.
const bb = plan({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5 });
const st = plan({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'advanced', daysPerWeek: 5 });
assert(countQ(bb, 'hypertrophy') > countQ(st, 'hypertrophy'), `bodybuilding leans hypertrophy (bb ${countQ(bb,'hypertrophy')} > st ${countQ(st,'hypertrophy')})`);
assert(countQ(st, 'strength') >= countQ(bb, 'strength'), `strength leans strength-quality (st ${countQ(st,'strength')} >= bb ${countQ(bb,'strength')})`);

// CNS cap: a strength session may contain 3 primaries; bodybuilding caps at 2.
const maxPrimaries = (p) => Math.max(...p.phases.flatMap(ph => ph.weeks).flatMap(w => w.sessions)
  .map(s => s.items.filter(it => isPrimary.has(it.name)).length));
assert(maxPrimaries(st) <= 3, `strength session ≤3 primaries (got ${maxPrimaries(st)})`);
assert(maxPrimaries(bb) <= 2, `bodybuilding session ≤2 primaries (got ${maxPrimaries(bb)})`);

console.log('quality-steer done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/quality-steer.js`
Expected: likely FAIL on the steering deltas and/or the strength 3-primary allowance (cap is a flat 2 today).

- [ ] **Step 3: Add `qualityMult` and apply the steer**

In `allocator.js`, add the helper next to `primaryQuality`:

```js
// Soft steer: prefer on-quality work, de-prioritise the off-quality strength/
// hypertrophy pair; general + (gated-in) power stay neutral.
function qualityMult(ex, goalPrimary) {
  const q = ex.quality || 'general';
  if (!goalPrimary || q === 'general' || q === 'power') return 1.0;
  return q === goalPrimary ? 1.15 : 0.7;
}
```

In `bestExercise`, apply it in the score block — after the priority-boost line `if (prioritySet && prioritySet.has(ex.id)) score *= 1.35;` add:

```js
    score *= qualityMult(ex, goalPrimary);                        // goal-quality steer
```

- [ ] **Step 4: Flex the primary cap by style**

In `bestExercise`, change the 2-primary cap to flex for strength:

```js
    if (!fillersOnly && effectiveRole === 'primary' &&
        slot.picks.filter(p => p.ex.role === 'primary' && p.effectiveRole === 'primary').length >= (style === 'strength' ? 3 : 2)) continue;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/quality-steer.js`
Expected: all PASS. If a steering delta is too small to register, nudge `qualityMult`'s ×1.15 up / ×0.7 down by 0.05 and re-run (do not change the test's intent).

- [ ] **Step 6: Regenerate golden master + full sweep**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js >/dev/null 2>&1 && node tests/golden-master.js 2>&1 | tail -1`, then the full sweep (as Task 2 Step 7). Confirm `optimal-frequency`, `session-density`, `working-volume`, `finisher` still pass (steer/cap reorder selection but don't change targets or counting).

- [ ] **Step 7: Profile-review smoke check**

Run: `cd apps/mobile && node tests/profile-review.js 2>&1 | grep -iE "hang clean|box jump|pogo|depth jump" || echo "no power work in build profiles ✓"`
Expected: no power exercises in the build (hypertrophy/strength) profiles.

- [ ] **Step 8: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js apps/mobile/tests/quality-steer.js apps/mobile/tests/__snapshots__/engine-golden-master.json apps/mobile/tests/*.js
git commit -m "feat(engine): soft strength<->hypertrophy steer + strength 3rd-primary cap

qualityMult de-prioritises off-quality work (×0.7) and prefers on-quality (×1.15);
general + gated-in power stay neutral. The per-session primary cap flexes to 3 for
strength, 2 elsewhere. Golden master regenerated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- `quality` field + audit → Task 1. ✓
- Power hard-gate (`program.power` + priority/goalTag relevance) → Task 2. ✓
- `ctx.power` threading → Task 2 Step 5. ✓
- Soft strength↔hypertrophy steer (×1.15 / ×0.7, general+power neutral) → Task 3 Step 3. ✓
- Light CNS cap (strength 3, else 2) → Task 3 Step 4. ✓
- Hip-thrust never-gated regression → Task 2 Step 1. ✓
- Golden master regenerated; affected tests updated → Tasks 2/3 Step 7/6. ✓
- `suggestOptimalFrequency` unchanged → Task 3 Step 6. ✓

**Placeholder scan:** none — every code step has full code; the audit lists exact IDs.

**Type consistency:** `powerAllowed(ex, power, prioritySet, style)`, `qualityMult(ex, goalPrimary)`, `primaryQuality(style)`, `styleGoalTag(style)` defined in Task 2/3 and used consistently. `bestExercise` gains `power, goalPrimary` params (Task 2), used by the steer (Task 3). `ctx.power` written in Task 2 (strength.js + PlanService), read in `allocateGym`.

## Out of scope (YAGNI)

- A full CNS-budget model; quality *vectors* (0–3 scoring); changing rep/RPE schemes — all rejected in the spec.
