# Working-Volume Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the volume ledger measure real working stimulus — loaded work counts full, isometric core a level-decaying fraction, health/activation zero — applied coherently in the allocator and the count; sequence supportive work last; and add a sport/goal-appropriate supportive finisher that rounds out short sessions without counting.

**Architecture:** A pure `stimulusFactor(ex, level)` (a `loadClass` × level table) is applied where volume is tallied: the allocator's selection/deficit/MRV accounting (which also stamps `item.volumeFactor`) and `countWeeklyVolume` (reads the stamp). `muscleContribution` stays a pure structural map. Session structuring sequences core-then-health last. A new finisher pass appends factor-0 supportive work, inversely to the working dose.

**Tech Stack:** JavaScript ES modules (`@performance-os/engine`), node test scripts (`node tests/*.js`).

## Global Constraints

- Engine modules stay **pure** — same profile in, same plan out.
- `CLASS_FACTOR` (verbatim): `loaded {1,1,1,1}`, `bodyweightStrength {1,0.75,0.4,0.2}`, `isoCore {0.5,0.5,0.3,0.15}`, `health {0,0,0,0}` across `beginner/returning/intermediate/advanced`. Default class `loaded`.
- The factor applies in **one shared place** (the allocator's volume math + the count via `item.volumeFactor`) so "planned vs target" stays coherent.
- `factor: 0` means "not counted," NOT "not programmed" — health work stays placeable (sport priority anchors + the finisher).
- Finisher constants: `FINISHER_TARGET_MIN = 30`, `FINISHER_CAP_MIN = 15` (tunable).
- Run tests from `apps/mobile/`: `node tests/<file>.js`. Golden-master regen: `UPDATE=1 node tests/golden-master.js`.
- The app must still run; `suggestOptimalFrequency` must be unchanged (reads targets, not counts).

---

### Task 1: Stimulus module

**Files:**
- Create: `packages/engine/src/lib/strength/stimulus.js`
- Test: `apps/mobile/tests/stimulus-factor.js` (create)

**Interfaces:**
- Produces: `stimulusFactor(ex, level) → number`; `CLASS_FACTOR` (exported).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/stimulus-factor.js`:

```js
// tests/stimulus-factor.js — stimulus factor by load class × athlete level.
import { stimulusFactor } from '@performance-os/engine/lib/strength/stimulus.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ex = (loadClass) => ({ id: 'x', loadClass });

assert(stimulusFactor(ex(undefined), 'advanced') === 1, 'default class = loaded = 1.0 at every level');
assert(stimulusFactor(ex('loaded'), 'beginner') === 1, 'loaded beginner = 1.0');
assert(stimulusFactor(ex('bodyweightStrength'), 'beginner') === 1 && stimulusFactor(ex('bodyweightStrength'), 'advanced') === 0.2, 'bodyweightStrength 1.0 → 0.2');
assert(stimulusFactor(ex('isoCore'), 'beginner') === 0.5 && stimulusFactor(ex('isoCore'), 'advanced') === 0.15, 'isoCore 0.5 → 0.15');
assert(stimulusFactor(ex('health'), 'beginner') === 0 && stimulusFactor(ex('health'), 'advanced') === 0, 'health = 0 everywhere');
assert(stimulusFactor(ex('isoCore'), undefined) === 0.3, 'missing level defaults to intermediate');

console.log('stimulus-factor done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/stimulus-factor.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `stimulus.js`**

Create `packages/engine/src/lib/strength/stimulus.js`:

```js
/**
 * stimulus — how much one working set of an exercise counts toward the volume
 * ledger, by the exercise's load class and the athlete's experience level. A
 * loaded compound counts full for everyone; a bird dog loads a novice's core but
 * is a warm-up for an advanced athlete; scapular-health work never counts.
 *
 * Pure. Applied in ONE shared place (the allocator's volume accounting, which
 * stamps item.volumeFactor; countWeeklyVolume reads the stamp) so the count and
 * the plan stay coherent. `factor: 0` means "not counted", NOT "not programmed".
 */

// stimulus factor by load class and athlete level.
export const CLASS_FACTOR = {
  loaded:             { beginner: 1.0, returning: 1.0,  intermediate: 1.0, advanced: 1.0  },
  bodyweightStrength: { beginner: 1.0, returning: 0.75, intermediate: 0.4, advanced: 0.2  },
  isoCore:            { beginner: 0.5, returning: 0.5,  intermediate: 0.3, advanced: 0.15 },
  health:             { beginner: 0,   returning: 0,    intermediate: 0,   advanced: 0    }
};

export function stimulusFactor(ex = {}, level) {
  const row = CLASS_FACTOR[ex.loadClass] || CLASS_FACTOR.loaded;
  return row[level] != null ? row[level] : row.intermediate;
}

export default { stimulusFactor, CLASS_FACTOR };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/stimulus-factor.js`
Expected: all PASS, `stimulus-factor done`.

- [ ] **Step 5: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/strength/stimulus.js apps/mobile/tests/stimulus-factor.js
git commit -m "feat(engine): stimulusFactor — volume credit by load class × level

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Classify exercises (`loadClass` data)

**Files:**
- Modify: `packages/engine/src/data/strengthExercises.js`
- Test: `apps/mobile/tests/load-class.js` (create)

**Interfaces:**
- Produces: `loadClass` on the bodyweight-strength / isometric-core / health exercises. Nothing reads it yet (Task 3 wires it), so behaviour is unchanged.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/load-class.js`:

```js
// tests/load-class.js — exercises carry the right loadClass (default loaded).
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const cls = (id) => (EXERCISES.find(e => e.id === id) || {}).loadClass;

assert(cls('back_squat') === undefined, 'loaded is the default (no loadClass on back_squat)');
assert(cls('ab_wheel') === undefined, 'ab wheel stays loaded (dynamic core)');
assert(cls('plank') === 'isoCore' && cls('dead_bug') === 'isoCore' && cls('bird_dog') === 'isoCore', 'isometric/anti-movement core = isoCore');
assert(cls('prone_y_raise') === 'health' && cls('band_pull_apart') === 'health' && cls('ankle_plantarflex_band') === 'health', 'scapular/prehab = health');
assert(cls('bw_squat') === 'bodyweightStrength' && cls('pushup') === 'bodyweightStrength', 'bodyweight strength work = bodyweightStrength');
assert(cls('pullup') === undefined, 'pull-up stays loaded (weightable, stays hard)');
assert(!EXERCISES.some(e => 'activationPrimer' in e), 'activationPrimer flag retired');

console.log('load-class done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/load-class.js`
Expected: FAIL — `plank` has no `loadClass`; `activationPrimer` still present.

- [ ] **Step 3: Add `loadClass` and retire `activationPrimer`**

In `packages/engine/src/data/strengthExercises.js`, add `loadClass: '<class>'` to each listed exercise's object (leave everything else, including default-`loaded` exercises, untouched). Remove any `activationPrimer: true|false` property wherever it appears.

`loadClass: 'isoCore'` → `plank`, `side_plank`, `pallof`, `band_pallof`, `half_kneeling_pallof`, `dead_bug`, `bird_dog`, `copenhagen`.

`loadClass: 'health'` → `prone_y_raise`, `prone_t_raise`, `prone_w_raise`, `band_pull_apart`, `serratus_wall_slide`, `serratus_punch_cable`, `prone_hip_extension`, `ankle_plantarflex_band`.

`loadClass: 'bodyweightStrength'` → `bw_squat`, `tempo_squat`, `glute_bridge`, `sl_hinge`, `bw_split_squat`, `reverse_lunge`, `step_up`, `cossack_squat`, `pushup`, `decline_pushup`, `dip`, `pike_pushup`, `inverted_row`, `bw_carry`, `glute_bridge_single_leg`.

Everything else (compounds, isolation, `ab_wheel`, `cable_woodchop`, `hanging_knee`, `pullup`, `assisted_pullup`, calf raises, plyos, mobility-pattern primer items) stays the default `loaded` — no edit.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/load-class.js`
Expected: all PASS, `load-class done`.

- [ ] **Step 5: Confirm no behaviour change yet**

Run: `cd apps/mobile && node tests/golden-master.js`
Expected: all PASS (nothing reads `loadClass` yet — no plan drift).

- [ ] **Step 6: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/data/strengthExercises.js apps/mobile/tests/load-class.js
git commit -m "feat(engine): classify exercises by loadClass; retire activationPrimer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Apply the factor (allocator accounting + count)

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js`
- Modify: `packages/engine/src/lib/plan/volume.js`
- Test: `apps/mobile/tests/working-volume.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `stimulusFactor` (Task 1), `loadClass` (Task 2).
- Produces: every allocator-built item carries `item.volumeFactor`; `countWeeklyVolume` honours it; deficit/MRV accounting is factored.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/working-volume.js`:

```js
// tests/working-volume.js — counting reflects real stimulus.
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// A prone Y raise must count ZERO toward back (was a full 1.0 set via pattern hpull).
const proneY = { items: [{ name: 'Prone Y Raise', sets: '3 × 12', volumeFactor: 0, tag: 'mobility' }] };
assert(countWeeklyVolume([proneY]).counts.back === 0, 'prone Y counts zero back (was a full set)');

// An isometric core item at volumeFactor 0.5 counts half.
const plank = { items: [{ name: 'Plank', sets: '3 × 30s', volumeFactor: 0.5 }] };
assert(countWeeklyVolume([plank]).counts.core === 1.5, 'plank 3 sets × 0.5 = 1.5 core');

// A loaded item with no factor stamped counts full (default 1).
const row = { items: [{ name: 'Barbell row', sets: '4 × 8' }] };
assert(countWeeklyVolume([row]).counts.back === 4, 'loaded row counts full (default factor 1)');

// The allocator stamps a volumeFactor on every built item.
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const specs = allocateGym({ targets: { core: 8, quads: 8, back: 8 }, slots: [{ minutes: 60, equip: FULL }], ctx: { style: 'functional', level: 'advanced', weekNum: 1, access: FULL } });
assert(specs[0].items.every(it => 'volumeFactor' in it), 'every allocated item carries volumeFactor');

console.log('working-volume done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/working-volume.js`
Expected: FAIL — `prone Y counts zero back` (today it counts a full set), and items lack `volumeFactor`.

- [ ] **Step 3: Factor the allocator accounting**

In `packages/engine/src/lib/plan/allocator.js`:

(a) Add the import near the other engine imports at the top:

```js
import { stimulusFactor } from '../strength/stimulus.js';
```

(b) Remove the unconditional mobility tag from `makeItem`'s core branch. Change:

```js
  if (ex.pattern === 'core') {
    const hold = /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, name: ex.name, sets: hold ? coreStr(deload || taper) : '3 × 12' + per, rpe: 'RPE 6', tag: 'mobility', note: '', restSec };
  }
```

to (drop `tag: 'mobility'` — the tag is now derived from the factor in `place`):

```js
  if (ex.pattern === 'core') {
    const hold = /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, name: ex.name, sets: hold ? coreStr(deload || taper) : '3 × 12' + per, rpe: 'RPE 6', note: '', restSec };
  }
```

(c) In `bestExercise`, factor the volume math. After `const contrib = muscleContribution(ex);` add:

```js
    const vf = stimulusFactor(ex, levelName);
```

Then in the useful/waste/room loop, replace each `sets * contrib[m]` with `sets * contrib[m] * vf`, and in the MRV pre-check replace `sets * contrib[m]` with `sets * contrib[m] * vf`. (A `vf` of 0 makes `useful` 0, so the fill never selects health work — it's placed only via sport anchors + the finisher.)

Add `levelName` as a parameter to `bestExercise` (append it to the signature) and pass `levelName` at all three call sites (the round-robin fill, the empty-slot fallback, the filler pass).

(d) In `allocateGym`, near the top after `const s = scheme(...)`, add:

```js
  const levelName = ctx.level || 'intermediate';
```

(e) In `place`, factor the ledger update and stamp the item. Replace the body of `place` with:

```js
  const place = (slot, pick) => {
    const { ex, sets, contrib, effectiveRole } = pick;
    const vf = stimulusFactor(ex, levelName);
    const item = makeItem(ex, slot.picks.length, s, style, deload, repBump, effectiveRole, taper);
    item.volumeFactor = vf;
    if (vf === 0) item.tag = 'mobility';        // health/activation — render + count as zero
    slot.picks.push({ ex, effectiveRole, item });
    slot.timeUsed += sets * perSetMin(ex, effectiveRole);
    slot.patternsUsed.add(ex.pattern);
    slot.exUsed.add(ex.id);
    for (const m in contrib) {
      const v = sets * contrib[m] * vf;
      deficit[m] = (deficit[m] || 0) - v;
      slot.delivered[m] = (slot.delivered[m] || 0) + v;
      slot.muscleVol[m] = (slot.muscleVol[m] || 0) + v;
      weeklyDelivered[m] = (weeklyDelivered[m] || 0) + v;
    }
  };
```

- [ ] **Step 4: Factor the count**

In `packages/engine/src/lib/plan/volume.js`, in `countWeeklyVolume`'s item loop, keep the `tag === 'mobility'` skip (it now coincides with factor-0 health + the warm-up primer) and apply the factor to the tally. Replace:

```js
      if (it.tag === 'mobility') continue; // activation/mobility primer (RPE 4) isn't working volume
      const sets = parseSetCount(it.sets);
      if (!sets) continue; // warm-ups / time-based rows aren't counted as volume
      const contrib = exerciseMuscles(it.name);
      if (!contrib) { skipped.push(it.name); continue; }
      matched++;
      for (const muscle in contrib) counts[muscle] += sets * contrib[muscle];
```

with:

```js
      if (it.tag === 'mobility') continue; // health/activation (factor 0) + warm-up primer
      const sets = parseSetCount(it.sets);
      if (!sets) continue; // warm-ups / time-based rows aren't counted as volume
      const vf = it.volumeFactor == null ? 1 : it.volumeFactor; // stimulus credit (0.5 isoCore, 1 loaded)
      if (vf === 0) continue;
      const contrib = exerciseMuscles(it.name);
      if (!contrib) { skipped.push(it.name); continue; }
      matched++;
      for (const muscle in contrib) counts[muscle] += sets * contrib[muscle] * vf;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/working-volume.js`
Expected: all PASS, `working-volume done`.

- [ ] **Step 6: Regenerate golden master + sweep**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js`, then `node tests/golden-master.js` (PASS). Then the sweep:

`cd apps/mobile && fail=0; for f in tests/*.js; do out=$(node "$f" 2>&1); echo "$out" | grep -q FAIL && { echo "❌ $f"; echo "$out" | grep FAIL | head -3; fail=1; }; done; [ $fail -eq 0 ] && echo ALL PASS`

For any failure in `volume-tracking`, `session-density`, `sport-anchor`, `split-engine`, `primer-equip`: inspect and update the expected numbers to the now-accurate stimulus-weighted volume (core counts via 0.5; prone-Y no longer inflates back). These are behaviour-tracking expectations, not contracts — update them to the new correct values, keeping each assertion's intent.

- [ ] **Step 7: Profile-review smoke check**

Run: `cd apps/mobile && node tests/profile-review.js 2>&1 | grep -E "Core|Back" | head`
Confirm core reads a real (non-zero) number and back isn't inflated by scapular work. No assertion.

- [ ] **Step 8: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/plan/volume.js apps/mobile/tests/working-volume.js apps/mobile/tests/__snapshots__/engine-golden-master.json apps/mobile/tests/*.js
git commit -m "feat(engine): apply stimulus factor in allocator accounting + count

Loaded work counts full, isometric core 0.5-decaying, health/activation zero —
applied to the allocator deficit/MRV math (and stamped on each item) and to
countWeeklyVolume. Prone-Y/T/W stop inflating back and drop from non-priority
plans; loaded core now counts. Golden master + behaviour tests regenerated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Sequence supportive work last

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (`structureItems`)
- Test: `apps/mobile/tests/session-sequence.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Produces: built sessions order working blocks first, then `isoCore`, then `health`/mobility.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/session-sequence.js`:

```js
// tests/session-sequence.js — supportive work is sequenced last: working → core → health.
import { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const classOf = (name) => { const e = EXERCISES.find(x => x.name === name); return e ? (e.loadClass || 'loaded') : 'loaded'; };
const rank = (it) => { const c = classOf(it.name); return c === 'health' || it.tag === 'mobility' ? 2 : (c === 'isoCore' ? 1 : 0); };

const spec = allocateGym({ targets: { core: 10, quads: 10, chest: 8, back: 8 }, slots: [{ minutes: 75, equip: FULL }], ctx: { style: 'functional', level: 'beginner', weekNum: 1, access: FULL } })[0];
const ranks = spec.items.map(rank);
const nonDecreasing = ranks.every((r, i) => i === 0 || r >= ranks[i - 1]);
assert(nonDecreasing, `working → core → health order (ranks: ${ranks.join('')})`);

console.log('session-sequence done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/session-sequence.js`
Expected: likely FAIL — core/health blocks aren't pushed to the tail today.

- [ ] **Step 3: Order blocks in `structureItems`**

In `allocator.js` `structureItems`, after the anchor-promotion block and before the final `items` emission, sort `blocks` so supportive work trails. Add:

```js
  // Sequence supportive work last: working sets → isoCore → health/mobility. A block's
  // rank is the max of its picks' classes (a superset with any core/health trails).
  const classRank = (p) => {
    const lc = p.ex.loadClass;
    if (lc === 'health' || (p.item && p.item.tag === 'mobility')) return 2;
    if (lc === 'isoCore') return 1;
    return 0;
  };
  const blockRank = (blk) => Math.max(...blk.map(classRank));
  // Stable sort by rank, preserving the anchor-first ordering within each rank.
  blocks = blocks
    .map((blk, i) => ({ blk, i, r: blockRank(blk) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.blk);
```

(Change `const blocks = [];` near the top of `structureItems` to `let blocks = [];` so it can be reassigned.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/session-sequence.js`
Expected: PASS, `session-sequence done`.

- [ ] **Step 5: Regenerate golden master + sweep**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js && node tests/golden-master.js 2>&1 | tail -1`, then the full sweep (as Task 3 Step 6). Item ORDER changes; update any test asserting on specific item positions.

- [ ] **Step 6: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js apps/mobile/tests/session-sequence.js apps/mobile/tests/__snapshots__/engine-golden-master.json
git commit -m "feat(engine): sequence supportive work last (working → core → health)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Supportive finisher

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (finisher pass + thread `sport` into ctx)
- Modify: `packages/engine/src/lib/PlanGenerator.js` (pass `sport` into the allocator ctx)
- Modify: `apps/mobile/src/lib/PlanService.js` (`gymCtx` carries `sport`; reflow passes it)
- Test: `apps/mobile/tests/finisher.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `ctx.sport` (sport key, or null for build goals), `ctx.exercisePriority`.
- Produces: factor-0 supportive items appended to short sessions, sequenced last, counting zero.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/finisher.js`:

```js
// tests/finisher.js — short sessions gain sport/goal-appropriate factor-0 finishers.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const week1 = (a) => generatePlan(answersToProfile({ ...BLANK_ANSWERS, equipment: FULL, ...a })).phases[0].weeks[0];

// A beginner runner's (short) session gains supportive finisher work that counts zero.
const runWk = week1({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'recreational', experienceLevel: 'beginner', daysPerWeek: 3 });
const s = runWk.sessions[0];
const finisherItems = s.items.filter(it => it.volumeFactor === 0);
assert(finisherItems.length >= 1, `beginner runner session gains >=1 factor-0 finisher (got ${finisherItems.length})`);
// Finisher items must not change counted volume — they contribute zero.
const before = countWeeklyVolume([{ items: s.items.filter(it => it.volumeFactor !== 0) }]);
const after = countWeeklyVolume([s]);
const total = (c) => Object.values(c.counts).reduce((a, b) => a + b, 0);
assert(Math.abs(total(before) - total(after)) < 0.01, 'finisher items count zero toward volume');

console.log('finisher done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/finisher.js`
Expected: FAIL — no finisher items today (no factor-0 items appended for filling).

- [ ] **Step 3: Thread `sport` into the allocator ctx**

In `packages/engine/src/lib/PlanGenerator.js`, in `buildGymWeek`, add `sport: program.sport` to the `strength.buildWeek` arg object (alongside `style: program.style`). In `packages/engine/src/lib/plan/strength.js` `buildWeek`, add `sport: ctx.sport` to the `ctx` object passed to `allocateGym` (alongside `style, intent, ...`). In `apps/mobile/src/lib/PlanService.js` `gymCtx`, add `sport: profile.sport` to the returned object, and in the reflow's `allocateGym` ctx add `sport: gctx.sport`.

- [ ] **Step 4: Implement the finisher pass**

In `allocator.js`, add constants near `SESSION_CEILING_MIN`:

```js
const FINISHER_TARGET_MIN = 30;   // round a short session out toward this many minutes…
const FINISHER_CAP_MIN = 15;      // …but never add more than this much supportive work
```

Add a helper above `allocateGym`:

```js
// Sport/goal-appropriate supportive work for the finisher: factor-0 (health) or
// mobility-pattern exercises the athlete can do, ranked by relevance (sport tag /
// build goal / priority-list membership) then variety. Returns ordered candidates.
function finisherPool(slot, ctx, levelName) {
  const sport = ctx.sport || null;
  const runTag = sport === 'run' && ctx.runDiscipline ? `run_${ctx.runDiscipline}` : null;
  const goal = ctx.style;                       // strength | bodybuilding | functional | sport
  const prio = new Set(ctx.exercisePriority || []);
  const cands = EXERCISES.filter(ex => {
    if (!slot.equip.has(ex.equip)) return false;
    if (ex.level > slot.level) return false;
    if (slot.exUsed.has(ex.id)) return false;
    const counts = stimulusFactor(ex, levelName) > 0;
    const isSupport = !counts || ex.pattern === 'mobility';   // health (0) or mobility
    return isSupport;
  });
  const relevance = (ex) => {
    let r = 0;
    if (prio.has(ex.id)) r += 3;
    const st = ex.sportTags || [];
    if (sport && (st.includes(sport) || (runTag && st.includes(runTag)))) r += 2;
    if (!sport && (ex.goalTags || []).includes(goal)) r += 1;
    if (ex.pattern === 'mobility') r += 0.5;     // general mobility is a safe fallback
    return r;
  };
  return cands.sort((a, b) => relevance(b) - relevance(a) || (hash(a.id) % 5) - (hash(b.id) % 5));
}
```

Then, in `allocateGym`, AFTER the existing filler pass loop and BEFORE the finalise `return work.map(...)`, add the finisher pass:

```js
  // Supportive finisher: round out a short session with sport/goal-appropriate
  // factor-0 work (counts nothing). Amount scales inversely to the realised working
  // dose — a long session has no gap and gets nothing.
  for (const slot of work) {
    let gap = FINISHER_TARGET_MIN - slot.timeUsed;
    if (gap <= 2) continue;
    let added = 0;
    for (const ex of finisherPool(slot, ctx, levelName)) {
      if (gap <= 2 || added >= FINISHER_CAP_MIN) break;
      const effectiveRole = ex.role;
      const item = makeItem(ex, slot.picks.length, s, style, deload, repBump, effectiveRole, taper);
      item.volumeFactor = 0;
      item.tag = 'mobility';
      slot.picks.push({ ex, effectiveRole, item });
      slot.exUsed.add(ex.id);
      const cost = parseSetCount(item.sets) * perSetMin(ex, effectiveRole) || 2;
      slot.timeUsed += cost; gap -= cost; added += cost;
    }
  }
```

(`structureItems` from Task 4 sequences these last automatically — they're `volumeFactor 0` / `tag mobility`, rank 2.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/finisher.js`
Expected: PASS, `finisher done`.

- [ ] **Step 6: Regenerate golden master + full sweep**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js && node tests/golden-master.js 2>&1 | tail -1`, then the full sweep. Update any test whose session length/item count shifted from the finisher. Re-confirm `node tests/optimal-frequency.js` and `node tests/session-density.js` still pass (the finisher adds non-counting items; counted volume and the day-count default are unchanged).

- [ ] **Step 7: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/PlanGenerator.js apps/mobile/src/lib/PlanService.js apps/mobile/tests/finisher.js apps/mobile/tests/__snapshots__/engine-golden-master.json apps/mobile/tests/*.js
git commit -m "feat(engine): supportive finisher rounds out short sessions (factor-0)

Sport/goal-appropriate health/mobility work, selected via sportTags/goalTags +
the priority list, appended inversely to the working dose (toward ~30 min, capped
at ~15). Counts zero; sequenced last. The honest fix for short-session feel.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- `loadClass` + `CLASS_FACTOR` × level → Tasks 1, 2. ✓
- Coherent factor in allocator accounting + count, item-stamped → Task 3. ✓
- Tag derived from factor; `pattern === 'core'` rule removed → Task 3 Step 3(b)/3(e). ✓
- Health work still placeable (sport anchors unaffected; fill skips factor-0) → Task 3 (useful=0) + Task 5. ✓
- Sequencing working → core → health → Task 4. ✓
- Supportive finisher, sport/goal-selected, inverse to dose, counts zero → Task 5. ✓
- Data corrections (prone Y/T/W health; retire activationPrimer) → Task 2. ✓
- No `suggestOptimalFrequency` change → verified Task 5 Step 6. ✓

**Placeholder scan:** none — every code step has full code; the data audit lists exact IDs.

**Type consistency:** `stimulusFactor(ex, level)` used identically in Tasks 1/3/5. `item.volumeFactor` written in Task 3 (`place`) + Task 5 (finisher), read in Task 3 (`countWeeklyVolume`) and the Task 4/5 tests. `ctx.sport` threaded in Task 5 from both call sites.

## Out of scope (YAGNI)

- Piece B — goal-appropriate selection of WORKING exercises (Olympic lifts out of hypertrophy) + heavy-set CNS sequencing.
- Core MEV stays 0; relative-load (%1RM) counting.
