# Equipment- & Recovery-Aware Exercise Priority — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make exercise priorities intent-based so they resolve to the best *available* exercise for the athlete's equipment, and pick the concrete lift at fill-time by an axial-load budget so spinal load is managed within and across sessions.

**Architecture:** Priorities become `{ intent, chain:[ids] }` rows whose chain heads equal today's curated lists. A resolver turns each intent into the equipment-available candidate list. The allocator boosts the per-intent member that fits the session's axial budget; the scheduler spaces high-axial days; a post-schedule de-spine pass fixes any day still landing after a high-axial day.

**Tech Stack:** Node ESM (no build), pure functions in `packages/engine/src/`. Tests are plain Node scripts (`node tests/NAME.js`) using a local `assert` helper that sets `process.exitCode = 1` on failure — mirror `apps/mobile/tests/golden-master.js`. Engine is imported via `@performance-os/engine/...`; relative `../src/lib/...` for the onboarding model. Run all test commands from `apps/mobile/`.

## Global Constraints

- **Preservation principle (verbatim):** chain heads = today's curated `GOAL_PRIORITY` entries and the axial budget engages only under load, so a full-gym, well-rested, low-frequency plan must be byte-identical to today. Verify: full-gym golden-master archetypes unchanged.
- **Do NOT regenerate the golden-master snapshot until Task 7.** Intermediate tasks intentionally drift it; regenerating mid-stream makes the final review unreadable. Intermediate tasks run only their OWN new test files, which must pass.
- **Tunable constants:** `AXIAL_SESSION_CAP = 4`, `HIGH_DAY_THRESHOLD = 3` — named exports/consts, calibrated in Task 7.
- **`axialLoad` default is `0`** when the field is absent. Always read it as `ex.axialLoad ?? 0`.
- All imports use explicit `.js` extensions (ESM). Both relevant `package.json` are `"type":"module"`.
- Commit after each task (messages given per task).

## File Structure

- `packages/engine/src/data/strengthExercises.js` — **modify**: add `axialLoad` field to loaded exercises (Task 1).
- `packages/engine/src/lib/strength/priorityIntents.js` — **create**: intent data + `resolveIntents` (Task 2).
- `packages/engine/src/lib/strength/program.js` — **modify**: call `resolveIntents`, expose `priorityByIntent`, sport shim (Task 3).
- `packages/engine/src/lib/PlanGenerator.js` — **modify**: thread `priorityByIntent`; call de-spine pass (Tasks 3, 6).
- `packages/engine/src/lib/plan/strength.js` — **modify**: pass `priorityByIntent` to allocator ctx (Task 3/4).
- `packages/engine/src/lib/plan/allocator.js` — **modify**: axial budget, intent-aware boost, session `axialLoad`, `preferredMember` export (Task 4).
- `packages/engine/src/lib/plan/scheduler.js` — **modify**: high-axial spacing penalty; carry `axialLoad`/`dayIdx` on returned sessions (Tasks 5, 6).
- `packages/engine/src/lib/plan/despine.js` — **create**: `despineWeek` refinement (Task 6).
- `apps/mobile/tests/{axial-data,intents,program-intents,axial-select,axial-schedule,despine}.js` — **create** (Tasks 1–6).
- `apps/mobile/tests/__snapshots__/engine-golden-master.json` — **regenerate** (Task 7).

---

### Task 1: `axialLoad` exercise tagging

**Files:**
- Modify: `packages/engine/src/data/strengthExercises.js`
- Test: `apps/mobile/tests/axial-data.js`

**Interfaces:**
- Produces: every `EXERCISES[i]` may carry `axialLoad: 0|1|2`; absent ⇒ treat as `0`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/axial-data.js`

```js
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const ax = (id) => { const e = EXERCISES.find(x => x.id === id); return e ? (e.axialLoad ?? 0) : null; };

// high (2)
['back_squat','front_squat','deadlift','deficit_deadlift','barbell_row','good_morning','rack_pull','ohp']
  .forEach(id => assert(ax(id) === 2, `${id} axialLoad=2 (got ${ax(id)})`));
// moderate (1)
['trap_bar_dl','rdl','db_rdl','db_row','split_squat','db_ohp','landmine_press','farmer_carry','suitcase_carry']
  .forEach(id => assert(ax(id) === 1, `${id} axialLoad=1 (got ${ax(id)})`));
// none (0) — explicit or default
['chest_supported_row','cable_row','lat_pulldown','hack_squat','leg_curl','leg_ext','hip_thrust','pushup','pause_squat']
  .forEach(id => assert(ax(id) === 0, `${id} axialLoad=0 (got ${ax(id)})`));

console.log(process.exitCode ? 'axial-data FAILURES' : `PASS: axial-data — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/axial-data.js`
Expected: FAIL (e.g. `back_squat axialLoad=2 (got 0)`).

- [ ] **Step 3: Add `axialLoad` to the loaded exercises**

In `strengthExercises.js`, add `axialLoad: 2` to: `back_squat`, `front_squat`, `box_squat`(2), `deadlift`, `deficit_deadlift`, `barbell_row`, `good_morning`, `rack_pull`, `ohp`. Add `axialLoad: 1` to: `trap_bar_dl`, `rdl`, `db_rdl`, `db_row`, `chest_supported_row`→**leave 0**, `split_squat`, `bw_split_squat`(1), `walking_lunge`(1), `db_ohp`, `landmine_press`, `tall_kneeling_landmine`(1), `farmer_carry`, `suitcase_carry`, `kb_swing`(1), `hip_thrust`→**leave 0** (supported). Example edit:

```js
{ id: 'back_squat', axialLoad: 2, name: 'Back squat', pattern: 'squat', equip: 'barbell', level: 0, role: 'primary', liftKey: 'squat', minLevelForPrimary: 'returning' },
{ id: 'barbell_row', axialLoad: 2, name: 'Barbell row', pattern: 'hpull', equip: 'barbell', level: 1, role: 'primary', minLevelForPrimary: 'intermediate', sportTags: ['swim'] },
{ id: 'trap_bar_dl', axialLoad: 1, name: 'Trap-bar deadlift', pattern: 'hinge', equip: 'barbell', level: 0, role: 'primary', liftKey: 'deadlift' },
```

Everything else stays unset (= 0).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/axial-data.js`
Expected: `PASS: axial-data — 26 assertions`

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/data/strengthExercises.js apps/mobile/tests/axial-data.js
git commit -m "feat(engine): tag exercises with axialLoad (spinal demand 0/1/2)"
```

---

### Task 2: `priorityIntents.js` + `resolveIntents`

**Files:**
- Create: `packages/engine/src/lib/strength/priorityIntents.js`
- Test: `apps/mobile/tests/intents.js`

**Interfaces:**
- Produces: `BUILD_INTENTS` (`{ strength, bodybuilding, functional }`, each `Array<{intent, chain:string[]}>`); `resolveIntents(intents, equip, level) → { list: string[], byIntent: Map<string,string[]> }` where `equip` is a `Set` from `availableEquip(...)` and `level` is a `LEVELS` number.

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/intents.js`

```js
import { BUILD_INTENTS, resolveIntents } from '@performance-os/engine/lib/strength/priorityIntents.js';
import { availableEquip, LEVELS } from '@performance-os/engine/data/strengthExercises.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

const FULL = availableEquip(['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight']);
const DB = availableEquip(['dumbbell','bodyweight']);

// Full-gym strength reproduces today's curated heads, in order.
const CURRENT_STRENGTH = ['back_squat','deadlift','bench','pause_squat','rack_pull','deficit_deadlift','jm_press','close_grip_bench','floor_press','barbell_row','ohp','trap_bar_dl','front_squat','hip_thrust','farmer_carry','ab_wheel','seated_box_jump'];
const full = resolveIntents(BUILD_INTENTS.strength, FULL, LEVELS.advanced);
assert(JSON.stringify(full.list) === JSON.stringify(CURRENT_STRENGTH), `full-gym strength == current list (got ${full.list.join(',')})`);

// DB-only strength: curated DB substitutes, never the barbell heads.
const db = resolveIntents(BUILD_INTENTS.strength, DB, LEVELS.advanced);
assert(db.list.length >= 8, `DB strength resolves a full list (got ${db.list.length})`);
['back_squat','deadlift','bench','barbell_row','ohp'].forEach(id => assert(!db.list.includes(id), `DB list excludes barbell ${id}`));
['goblet_squat','db_rdl','db_bench','db_row','db_ohp'].forEach(id => assert(db.list.includes(id), `DB list includes ${id}`));

// byIntent exposes the full equipment-available chain for axial fallback.
const hpull = db.byIntent.get('h_pull') || [];
assert(hpull.includes('chest_supported_row'), `h_pull byIntent has chest_supported_row (got ${hpull.join(',')})`);

console.log(process.exitCode ? 'intents FAILURES' : `PASS: intents — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/intents.js`
Expected: FAIL with `Cannot find module '.../priorityIntents.js'`.

- [ ] **Step 3: Create `priorityIntents.js`**

```js
/**
 * priorityIntents — goal priorities as movement INTENTS with equipment-ordered
 * fallback chains. The chain head is the goal's ideal/curated exercise; later
 * entries are equipment substitutes (free weight → machine/DB → bodyweight).
 * resolveIntents resolves each intent to the candidates the athlete can actually
 * perform, so a dumbbell athlete still gets a curated strength list (not 1/17),
 * and the allocator can pick a lower-axial member of a chain when needed.
 *
 * Heads are ordered to reproduce the former flat GOAL_PRIORITY lists verbatim at
 * full equipment (the preservation principle), so full-gym plans don't change.
 */
import { EXERCISES, LEVELS } from '../../data/strengthExercises.js';

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export const BUILD_INTENTS = {
  strength: [
    { intent: 'squat',       chain: ['back_squat','front_squat','box_squat','goblet_squat','bw_split_squat'] },
    { intent: 'hinge',       chain: ['deadlift','trap_bar_dl','rdl','db_rdl','sl_hinge'] },
    { intent: 'h_press',     chain: ['bench','db_bench','incline_db','dip','pushup'] },
    { intent: 'squat_var',   chain: ['pause_squat','box_squat','tempo_squat','bw_split_squat'] },
    { intent: 'hinge_var',   chain: ['rack_pull','good_morning','rdl','db_rdl'] },
    { intent: 'hinge_var2',  chain: ['deficit_deadlift','rdl','db_rdl'] },
    { intent: 'tri_press',   chain: ['jm_press','close_grip_bench','diamond_pushup'] },
    { intent: 'press_acc',   chain: ['close_grip_bench','floor_press','dip','diamond_pushup'] },
    { intent: 'press_acc2',  chain: ['floor_press','db_bench','pushup'] },
    { intent: 'h_pull',      chain: ['barbell_row','db_row','chest_supported_row','cable_row','inverted_row'] },
    { intent: 'v_press',     chain: ['ohp','db_ohp','pike_pushup'] },
    { intent: 'hinge_tb',    chain: ['trap_bar_dl','rdl','db_rdl'] },
    { intent: 'squat_front', chain: ['front_squat','goblet_squat','hack_squat'] },
    { intent: 'glute',       chain: ['hip_thrust','glute_bridge','glute_bridge_single_leg'] },
    { intent: 'carry',       chain: ['farmer_carry','suitcase_carry','bw_carry'] },
    { intent: 'trunk',       chain: ['ab_wheel','pallof','side_plank','hanging_knee'] },
    { intent: 'power',       chain: ['seated_box_jump'] }
  ],
  // bodybuilding / functional priorities are already DB/cable/bodyweight-friendly,
  // so they ship as single-candidate intents (heads = former GOAL_PRIORITY lists).
  bodybuilding: ['incline_db_curl','spider_curl','overhead_cable_ext','low_high_cable_fly','seated_leg_curl','heel_elevated_goblet','reverse_pec_deck','prone_y_raise','prone_t_raise','prone_w_raise','db_pullover','leg_curl','leg_ext','chest_fly','lateral_raise','rear_fly','biceps_curl','triceps_pushdown','overhead_ext'].map(id => ({ intent: id, chain: [id] })),
  functional: ['bird_dog','dead_bug','pallof','side_plank','ab_wheel','suitcase_carry','farmer_carry','split_squat','step_up','serratus_wall_slide','serratus_punch_cable','half_kneeling_pallof','tall_kneeling_landmine','seated_box_jump','bounding_a_skip','hip_flexor_90_90','glute_bridge_activation','band_pull_apart','thoracic_foam_roller','prone_hip_extension'].map(id => ({ intent: id, chain: [id] }))
};

// Resolve each intent to its equipment+level-available candidates (chain order).
// Returns { list, byIntent }: `list` is the flat ordered id set (the ×1.35 boost
// pool, deduped — same shape resolveProgram returned before); `byIntent` maps each
// intent to its available candidate ids (for the allocator's axial pick + despine).
export function resolveIntents(intents = [], equip, level = LEVELS.intermediate) {
  const byIntent = new Map();
  const list = [];
  const seen = new Set();
  for (const { intent, chain } of intents) {
    const avail = chain.filter(id => {
      const ex = BY_ID.get(id);
      return ex && equip.has(ex.equip) && ex.level <= level;
    });
    byIntent.set(intent, avail);
    if (avail.length && !seen.has(avail[0])) { list.push(avail[0]); seen.add(avail[0]); }
  }
  return { list, byIntent };
}

export default { BUILD_INTENTS, resolveIntents };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/intents.js`
Expected: `PASS: intents — N assertions` (≈11).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/strength/priorityIntents.js apps/mobile/tests/intents.js
git commit -m "feat(engine): intent fallback chains + resolveIntents"
```

---

### Task 3: Wire `resolveIntents` into `resolveProgram` and thread `priorityByIntent`

**Files:**
- Modify: `packages/engine/src/lib/strength/program.js`
- Modify: `packages/engine/src/lib/PlanGenerator.js:92-101` (`buildGymWeek`)
- Modify: `packages/engine/src/lib/plan/strength.js:125-132` (allocateGym ctx)
- Test: `apps/mobile/tests/program-intents.js`

**Interfaces:**
- Consumes: `resolveIntents`, `BUILD_INTENTS` (Task 2).
- Produces: `resolveProgram(profile)` returns the same `exercisePriority` (flat list) **plus** `priorityByIntent: Map<string,string[]>`. `buildWeek`/`allocateGym` ctx gain `priorityByIntent`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/program-intents.js`

```js
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const P = (o) => ({ goal_type: 'build', strength_style: 'strength', experience: { gym: 'advanced' }, access: o.access });

const full = resolveProgram(P({ access: ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'] }));
assert(full.exercisePriority[0] === 'back_squat', `full-gym strength still leads back_squat (got ${full.exercisePriority[0]})`);
assert(full.priorityByIntent instanceof Map, 'priorityByIntent is a Map');

const db = resolveProgram(P({ access: ['dumbbell','bodyweight'] }));
assert(db.exercisePriority.length >= 8, `DB strength priority no longer ~1 (got ${db.exercisePriority.length})`);
assert(db.exercisePriority.includes('db_bench') && !db.exercisePriority.includes('bench'), 'DB strength uses db_bench, not bench');

console.log(process.exitCode ? 'program-intents FAILURES' : `PASS: program-intents — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/program-intents.js`
Expected: FAIL (`db.exercisePriority.length >= 8` — currently ~1; `priorityByIntent` undefined).

- [ ] **Step 3: Wire `program.js`**

Add imports at top of `program.js`:

```js
import { availableEquip, LEVELS } from '../../data/strengthExercises.js';
import { BUILD_INTENTS, resolveIntents } from './priorityIntents.js';
```

Replace the build-goal return (the final `return { goalType: 'build', ... exercisePriority: GOAL_PRIORITY[style] || [] }`) with:

```js
  const equip = availableEquip(profile.access || []);
  const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
  const { list, byIntent } = resolveIntents(BUILD_INTENTS[style] || [], equip, lvlNum);
  return {
    goalType: 'build', style, emphasis, volumeScalar: 1.0, power: style === 'functional',
    sport: null, season: null, level,
    exercisePriority: list, priorityByIntent: byIntent
  };
```

In the sport branch, wrap the module priority list through the same resolver. Replace `exercisePriority: (byD && byD.priorityExercises) || (mod && mod.priorityExercises) || []` with:

```js
    exercisePriority: (() => { sportPriority = (byD && byD.priorityExercises) || (mod && mod.priorityExercises) || []; return sportPriority; })()
```

…then, just before the sport `return`, build the resolved pair (declare `let sportPriority = []` above) and set `exercisePriority` + `priorityByIntent`:

```js
    const equip = availableEquip(profile.access || []);
    const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
    const intents = sportPriority.map(id => ({ intent: id, chain: [id] }));
    const { list, byIntent } = resolveIntents(intents, equip, lvlNum);
    return { goalType: 'sport', style: 'sport', emphasis: ..., volumeScalar: ..., power: ..., sport, season, level, exercisePriority: list, priorityByIntent: byIntent };
```

(Keep the existing `emphasis`/`volumeScalar`/`power` expressions; only `exercisePriority` changes and `priorityByIntent` is added.) `GOAL_PRIORITY` may be deleted once unused.

- [ ] **Step 4: Thread `priorityByIntent` through the builders**

`PlanGenerator.js` `buildGymWeek` — add to the `strength.buildWeek({...})` object:

```js
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map()
```

`plan/strength.js` `buildWeek` — in the `allocateGym({ ... ctx: { ... } })` ctx object, add:

```js
      priorityByIntent: ctx.priorityByIntent || new Map(),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/program-intents.js`
Expected: `PASS: program-intents — 4 assertions`. Also run `node tests/intents.js && node tests/axial-data.js` (still green). **Do not run golden-master yet.**

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/strength/program.js packages/engine/src/lib/PlanGenerator.js packages/engine/src/lib/plan/strength.js apps/mobile/tests/program-intents.js
git commit -m "feat(engine): resolve equipment-aware priorities via intents; expose priorityByIntent"
```

---

### Task 4: Allocator — within-session axial selection

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js`
- Test: `apps/mobile/tests/axial-select.js`

**Interfaces:**
- Consumes: `ctx.priorityByIntent` (Task 3); `ex.axialLoad`.
- Produces: exported `preferredMember(candidates, slotAxial, cap)`; each session spec gains `axialLoad: number`; priority-driven items gain `item.intent`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/axial-select.js`

```js
import { preferredMember, allocateGym } from '@performance-os/engine/lib/plan/allocator.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

// candidates with their axialLoad: barbell_row(2), db_row(1), chest_supported_row(0)
const cands = ['barbell_row','db_row','chest_supported_row'];
assert(preferredMember(cands, 0, 4) === 'barbell_row', 'fresh spine → head (barbell row)');
assert(preferredMember(cands, 4, 4) === 'chest_supported_row', 'spent spine → lowest-axial (chest-supported)');
assert(preferredMember(['barbell_row'], 4, 4) === 'barbell_row', 'no alternative → head regardless');

// session specs expose axialLoad
const sessions = allocateGym({
  targets: { back: 12, quads: 12, chest: 8 },
  slots: [{ minutes: 60 }],
  ctx: { style: 'strength', intent: 'base', level: 'advanced', sex: 'male',
         access: ['barbell','dumbbell','machine','cable','bodyweight'], exercisePriority: ['back_squat','barbell_row'] }
});
assert(typeof sessions[0].axialLoad === 'number', `session exposes axialLoad (got ${sessions[0].axialLoad})`);

console.log(process.exitCode ? 'axial-select FAILURES' : `PASS: axial-select — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/axial-select.js`
Expected: FAIL (`preferredMember` not exported).

- [ ] **Step 3: Add the axial machinery to `allocator.js`**

Near the top constants (after `SESSION_CEILING_MIN`):

```js
// Spinal/axial-load budget. A session may accumulate up to AXIAL_SESSION_CAP units
// of axial load (back squat 2 + deadlift 2 fills it); beyond that, intents resolve
// to their lowest-axial available member so we don't keep reloading the spine.
export const AXIAL_SESSION_CAP = 4;
const axialOf = (ex) => (ex && ex.axialLoad != null ? ex.axialLoad : 0);
```

Add the exported helper (module scope, near `bestExercise`):

```js
// The member of an intent's available chain to boost given the slot's spent axial
// budget: the head (equipment-best) when it still fits, else the lowest-axial member.
export function preferredMember(candidates = [], slotAxial = 0, cap = AXIAL_SESSION_CAP) {
  if (!candidates.length) return null;
  const ax = (id) => axialOf(EX_BY_ID.get(id));
  const head = candidates[0];
  if (slotAxial + ax(head) <= cap) return head;
  let best = head, bestAx = ax(head);
  for (const id of candidates) { const a = ax(id); if (a < bestAx) { best = id; bestAx = a; } }
  return best;
}
```

Add an id→exercise map near the existing `EXERCISES` import usage:

```js
const EX_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
```

In `allocateGym`, after `const prioritySet = ...`, build the intent helpers:

```js
  const priorityByIntent = ctx.priorityByIntent instanceof Map ? ctx.priorityByIntent : new Map();
  const idToIntent = new Map();
  for (const [intent, ids] of priorityByIntent) for (const id of ids) if (!idToIntent.has(id)) idToIntent.set(id, intent);
  // Boost test used in scoring: is `id` the axial-preferred member of its intent now?
  const priorityFor = (id, slotAxial) => {
    const intent = idToIntent.get(id);
    if (!intent) return prioritySet ? prioritySet.has(id) : false; // sport/no-intent fallback
    return preferredMember(priorityByIntent.get(intent) || [], slotAxial, AXIAL_SESSION_CAP) === id;
  };
```

Track axial load per slot: add `axialLoad: 0` to each `work` slot object, and in `place(slot, pick)` add after `slot.exUsed.add(ex.id);`:

```js
    slot.axialLoad = (slot.axialLoad || 0) + axialOf(ex);
    const intent = idToIntent.get(ex.id);
    if (intent) item.intent = intent;   // tag for the de-spine pass
```

Pass `priorityFor` to `bestExercise`: append it to the three call sites' args (after `weeklyExCount`) and to the signature (`..., weeklyExCount = {}, priorityFor = () => false`). Replace the boost line:

```js
    if (priorityFor(ex.id, slot.axialLoad)) score *= 1.35;     // intent's axial-preferred member
```

(Remove the old `if (prioritySet && prioritySet.has(ex.id)) score *= 1.35;`. `prioritySet` is still used by `powerAllowed`/`patternAnchor` — keep it.)

Expose session axial load in the final return map (where `discipline:'gym', focus, duration, ...` is built):

```js
      axialLoad: Object.values(slot.picks).reduce((a, p) => a + axialOf(p.ex), 0),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/axial-select.js`
Expected: `PASS: axial-select — 4 assertions`. Also `node tests/intents.js tests/program-intents.js tests/axial-data.js` green.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/allocator.js apps/mobile/tests/axial-select.js
git commit -m "feat(engine): within-session axial budget steers intent boost to de-spined member"
```

---

### Task 5: Scheduler — space high-axial sessions apart

**Files:**
- Modify: `packages/engine/src/lib/plan/scheduler.js`
- Test: `apps/mobile/tests/axial-schedule.js`

**Interfaces:**
- Consumes: `spec.axialLoad` (Task 4).
- Produces: `HIGH_DAY_THRESHOLD` const; the penalty `score()` avoids adjacent high-axial days; `scheduleWeek` return objects gain `axialLoad` and `dayIdx`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/axial-schedule.js`

```js
import { scheduleWeek } from '@performance-os/engine/lib/plan/scheduler.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };
const spec = (focus, axialLoad) => ({ discipline: 'gym', focus, duration: '~45 min', items: [], intensity: 'hard', axialLoad, muscleVol: {} });

// Two high-axial sessions + one low, 3 of 7 days → high-axial must not be adjacent.
const out = scheduleWeek({ sportSpecs: [spec('A', 4), spec('B', 4), spec('C', 0)], dayNames: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] });
const highDays = out.filter(s => s.axialLoad >= 3).map(s => s.dayIdx).sort((a,b) => a - b);
assert(highDays.length === 2, `two high-axial days (got ${highDays.length})`);
assert((highDays[1] - highDays[0]) >= 2, `high-axial days not adjacent (got gap ${highDays[1]-highDays[0]})`);

console.log(process.exitCode ? 'axial-schedule FAILURES' : `PASS: axial-schedule — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/axial-schedule.js`
Expected: FAIL (`s.axialLoad`/`s.dayIdx` undefined; spacing not applied).

- [ ] **Step 3: Add the spacing penalty + carry metadata**

In `scheduler.js`, add near the top consts:

```js
const HIGH_DAY_THRESHOLD = 3;
const isHighAxial = (s) => (s.axialLoad || 0) >= HIGH_DAY_THRESHOLD;
```

In `score()`, inside the `if (g <= 1)` block (near the `legStrength`/`legTaxingRun` term), add:

```js
      if (isHighAxial(cur.spec) && isHighAxial(nxt.spec)) pen += 9; // recover the spine between heavy axial days
```

In the final `return all.map(...)`, add `axialLoad` and `dayIdx` to the returned object:

```js
    return {
      title: `${IDX_DAY[x.idx]} · ${x.spec.focus}`,
      duration: x.spec.duration,
      items,
      axialLoad: x.spec.axialLoad || 0,
      dayIdx: x.idx,
      ...(onSportDay ? { lightened: true } : {})
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/axial-schedule.js`
Expected: `PASS: axial-schedule — 3 assertions`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/scheduler.js apps/mobile/tests/axial-schedule.js
git commit -m "feat(engine): scheduler spaces high-axial sessions apart; sessions carry axialLoad/dayIdx"
```

---

### Task 6: De-spine refinement pass (cross-day)

**Files:**
- Create: `packages/engine/src/lib/plan/despine.js`
- Modify: `packages/engine/src/lib/PlanGenerator.js` (call after `scheduleWeek`)
- Test: `apps/mobile/tests/despine.js`

**Interfaces:**
- Consumes: scheduled sessions with `axialLoad`/`dayIdx` (Task 5) and items with `intent` (Task 4); `priorityByIntent`; `applyWeights` (`liftProgression.js`); `axialOf`/`preferredMember` semantics.
- Produces: `despineWeek(sessions, { priorityByIntent, lifts, level, bodyweight }) → sessions` (mutates items in place, returns the array).

- [ ] **Step 1: Write the failing test** — `apps/mobile/tests/despine.js`

```js
import { despineWeek } from '@performance-os/engine/lib/plan/despine.js';
let pass = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else pass++; };

// Day 0 = heavy axial; Day 1 (adjacent) holds a barbell row tagged with its intent.
const sessions = [
  { dayIdx: 0, axialLoad: 4, items: [{ name: 'Back squat', sets: '4 × 5', rpe: 'RPE 7' }] },
  { dayIdx: 1, axialLoad: 2, items: [{ num: 'A1', name: 'Barbell row', sets: '4 × 5', rpe: 'RPE 7', intent: 'h_pull' }] }
];
const byIntent = new Map([['h_pull', ['barbell_row','db_row','chest_supported_row','cable_row','inverted_row']]]);
despineWeek(sessions, { priorityByIntent: byIntent, lifts: {}, level: 'advanced' });
assert(sessions[1].items[0].name === 'Chest-supported row', `day-after-squat row de-spined (got ${sessions[1].items[0].name})`);

// Well-spaced day is untouched.
const spaced = [
  { dayIdx: 0, axialLoad: 4, items: [{ name: 'Back squat', sets: '4 × 5', rpe: 'RPE 7' }] },
  { dayIdx: 3, axialLoad: 2, items: [{ num: 'A1', name: 'Barbell row', sets: '4 × 5', rpe: 'RPE 7', intent: 'h_pull' }] }
];
despineWeek(spaced, { priorityByIntent: byIntent, lifts: {}, level: 'advanced' });
assert(spaced[1].items[0].name === 'Barbell row', 'spaced row left as barbell row');

console.log(process.exitCode ? 'despine FAILURES' : `PASS: despine — ${pass} assertions`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/despine.js`
Expected: FAIL (`Cannot find module '.../despine.js'`).

- [ ] **Step 3: Create `despine.js`**

```js
/**
 * despine — post-schedule refinement. The scheduler spaces high-axial sessions
 * apart, but on tight weeks one can still land the day after another. Here we keep
 * the spine recovering: on a training day whose PREVIOUS training day was high-axial
 * (and adjacent), swap that day's high-axial, intent-tagged lifts for the lowest-
 * axial member of the same intent (e.g. barbell row → chest-supported row), then
 * re-apply the suggested weight. Pure-ish: mutates the items it swaps; returns the
 * sessions. Sessions must carry `dayIdx`, `axialLoad`, and items may carry `intent`.
 */
import { EXERCISES } from '../../data/strengthExercises.js';
import { applyWeights } from '../liftProgression.js';

const HIGH_DAY_THRESHOLD = 3;
const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const axialOf = (ex) => (ex && ex.axialLoad != null ? ex.axialLoad : 0);
const dist = (a, b) => { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); };

export function despineWeek(sessions = [], { priorityByIntent = new Map(), lifts = {}, level = 'intermediate', bodyweight = null } = {}) {
  const ordered = [...sessions].sort((a, b) => (a.dayIdx ?? 0) - (b.dayIdx ?? 0));
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1], cur = ordered[i];
    if ((prev.axialLoad || 0) < HIGH_DAY_THRESHOLD) continue;       // prior day wasn't spine-heavy
    if (dist(cur.dayIdx ?? 0, prev.dayIdx ?? 0) > 1) continue;       // not adjacent → spacing handled it
    let swapped = false;
    for (const it of cur.items || []) {
      const ex = BY_NAME.get(String(it.name || '').toLowerCase());
      if (!ex || axialOf(ex) < 2 || !it.intent) continue;           // only de-spine high-axial intent lifts
      const cands = priorityByIntent.get(it.intent) || [];
      // lowest-axial available candidate of this intent
      let best = null, bestAx = Infinity;
      for (const id of cands) { const c = BY_ID.get(id); if (c && axialOf(c) < bestAx) { best = c; bestAx = axialOf(c); } }
      if (best && best.id !== ex.id && bestAx < axialOf(ex)) {
        it.name = best.name; it.weight = undefined; swapped = true;
      }
    }
    if (swapped) applyWeights(cur.items, lifts, level, bodyweight);  // refresh suggested loads
  }
  return sessions;
}

export default { despineWeek };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/despine.js`
Expected: `PASS: despine — 2 assertions`.

- [ ] **Step 5: Wire it into `PlanGenerator.js`**

Add import:

```js
import { despineWeek } from './plan/despine.js';
```

Replace the `const sessions = scheduleWeek({ ... });` line (in the week loop) with:

```js
      let sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles });
      sessions = despineWeek(sessions, { priorityByIntent: program.priorityByIntent || new Map(), lifts: resolveLifts(profile), level: getGymLevel(profile), bodyweight: profile.bodyweight_kg });
```

- [ ] **Step 6: Run the de-spine + upstream tests**

Run: `node tests/despine.js tests/axial-select.js tests/axial-schedule.js`
Expected: all PASS. Confirm `node -e "import('@performance-os/engine/lib/PlanGenerator.js').then(m=>{m.generatePlan({goal_type:'build',strength_style:'strength',experience:{gym:'advanced'},access:['barbell','dumbbell','machine','cable','bodyweight'],availability:{days_per_week:5,days:['mon','tue','wed','fri','sat']},bodyweight_kg:85});console.log('ok')})"` prints `ok` (no throw).

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/lib/plan/despine.js packages/engine/src/lib/PlanGenerator.js apps/mobile/tests/despine.js
git commit -m "feat(engine): post-schedule de-spine pass for days following a high-axial day"
```

---

### Task 7: Regenerate golden-master, calibrate, verify full suite

**Files:**
- Modify: `apps/mobile/tests/__snapshots__/engine-golden-master.json` (regenerate)

- [ ] **Step 1: See the drift before regenerating**

Run: `node tests/golden-master.js 2>&1 | grep -E 'plan drifted' | wc -l`
Expected: only `·dumbbell` / `·bodyweight` / high-frequency archetypes drift; the `·full` strength/bodybuilding archetypes should NOT appear. Inspect:

Run: `node tests/golden-master.js 2>&1 | grep 'plan drifted'`
Confirm full-gym archetypes are absent (preservation principle). If a `·full` archetype drifted, STOP — a chain head diverged from the old `GOAL_PRIORITY`; fix the offending chain head in `priorityIntents.js` before continuing.

- [ ] **Step 2: Calibrate via the batch tool**

Run: `node scripts/rate-batch.js 20 5000`
Expected: the DB-strength plan's `prio` jumps from `1/17` toward full coverage; no high-axial session immediately follows another where days allow. If `AXIAL_SESSION_CAP`/`HIGH_DAY_THRESHOLD` look mis-tuned, adjust the consts in `allocator.js`/`scheduler.js`/`despine.js` (keep all three `HIGH_DAY_THRESHOLD` in sync) and re-run.

- [ ] **Step 3: Regenerate the snapshot**

Run: `UPDATE=1 node tests/golden-master.js`
Expected: `UPDATED golden-master snapshot: 19 archetypes`.

- [ ] **Step 4: Run the full suite**

Run: `for t in tests/*.js; do node "$t" >/tmp/o 2>&1 && ! grep -q '^FAIL' /tmp/o || echo "FAIL: $t"; done; echo done`
Expected: only `done` (no `FAIL:` lines).

- [ ] **Step 5: Build check**

Run (from repo root): `npm run build`
Expected: `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/tests/__snapshots__/engine-golden-master.json packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/plan/scheduler.js packages/engine/src/lib/plan/despine.js
git commit -m "test(engine): regenerate golden-master for equipment/axial-aware priorities"
```

---

## Self-Review

**Spec coverage:** axialLoad tag → T1; intent chains + resolveIntents → T2; resolveProgram wiring + priorityByIntent + sport shim → T3; within-session axial budget + intent-aware boost + session axialLoad + item.intent → T4; scheduler spacing → T5; de-spine pass → T6; preservation/golden-master + calibration → T7. All spec components mapped.

**Placeholder scan:** none — every step has concrete code/commands. (T3's sport-branch edit references the file's existing `emphasis`/`volumeScalar` expressions deliberately — they are not rewritten, only `exercisePriority`/`priorityByIntent` change.)

**Type consistency:** `resolveIntents → { list, byIntent:Map }` (T2) consumed identically in T3/T4/T6; `priorityByIntent` is a `Map<string,string[]>` throughout; `preferredMember(candidates, slotAxial, cap)` defined T4, semantics reused in despine T6; `axialLoad`/`dayIdx`/`intent` produced in T4/T5 and consumed in T6; `HIGH_DAY_THRESHOLD = 3` duplicated in scheduler.js and despine.js (kept in sync per T7 note).
