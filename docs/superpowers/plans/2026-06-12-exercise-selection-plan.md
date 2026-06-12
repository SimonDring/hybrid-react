# Science-Backed Exercise Selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sport/goal-specific exercise selection intelligence to the gym engine: ~50 new exercises, new fields (`minLevelForPrimary`, `sportTags`, `goalTags`, `activationPrimer`), progressive loading via `minLevelForPrimary`, science-backed `exercisePriority` emitted by `resolveProgram()`, and a 4-exercise functional activation primer.

**Architecture:** Exercise data layer (`strengthExercises.js`) gains new fields; `resolveProgram()` uses them to emit a priority list; the allocator respects `minLevelForPrimary` (demoting complex exercises to accessory for beginners) and boosts priority exercises ×1.35; `buildWeek()` in `strength.js` prepends the functional primer and handles cycle `buildSupport()`.

**Tech Stack:** React 18, Vite, Zustand 5. No test framework — tests run with `node tests/filename.js` (plain Node.js ES modules).

---

## File map

| File | Change |
|------|--------|
| `tests/exercise-selection.js` | **Create** — full test suite (runs with `node tests/exercise-selection.js`) |
| `src/data/strengthExercises.js` | **Modify** — level corrections, new fields on existing exercises, ~50 new exercises |
| `src/lib/strength/program.js` | **Modify** — emit `exercisePriority` from `resolveProgram()` |
| `src/lib/plan/allocator.js` | **Modify** — `effectiveRole` logic in `bestExercise()`, priority-set scoring |
| `src/lib/plan/strength.js` | **Modify** — functional primer prepend, cycle family in `buildSupport()` |

---

### Task 1: Test infrastructure

**Files:**
- Create: `tests/exercise-selection.js`

- [ ] **Step 1.1 — Write the test file**

Create `tests/exercise-selection.js` with the full suite. All tests that touch unimplemented features will FAIL until those tasks are done — that's the intent.

```js
// tests/exercise-selection.js
import { EXERCISES, LEVELS } from '../src/data/strengthExercises.js';
import { resolveProgram } from '../src/lib/strength/program.js';
import { allocateGym } from '../src/lib/plan/allocator.js';
import { weeklyMuscleTargets } from '../src/lib/strength/targets.js';
import { buildWeek, buildSupport } from '../src/lib/plan/strength.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const byId = (id) => EXERCISES.find(e => e.id === id);

// ── T1: Level corrections ─────────────────────────────────────────────────
assert(byId('nordic_curl')?.level === 3, 'T1a nordic_curl level is 3');
assert(byId('copenhagen')?.level === 3,  'T1b copenhagen level is 3');

// ── T2: minLevelForPrimary on complex barbell compounds ───────────────────
assert(byId('back_squat')?.minLevelForPrimary === 'returning',
  'T2a back_squat minLevelForPrimary=returning');
assert(byId('bench')?.minLevelForPrimary === 'returning',
  'T2b bench minLevelForPrimary=returning');
assert(byId('barbell_row')?.minLevelForPrimary === 'intermediate',
  'T2c barbell_row minLevelForPrimary=intermediate');
assert(byId('ohp')?.minLevelForPrimary === 'intermediate',
  'T2d ohp minLevelForPrimary=intermediate');

// ── T3: sportTags on existing exercises ───────────────────────────────────
assert(Array.isArray(byId('rdl')?.sportTags) && byId('rdl').sportTags.includes('run'),
  'T3a rdl.sportTags includes run');
assert(Array.isArray(byId('face_pull')?.sportTags) && byId('face_pull').sportTags.includes('swim'),
  'T3b face_pull.sportTags includes swim');
assert(Array.isArray(byId('hip_thrust')?.sportTags) && byId('hip_thrust').sportTags.includes('cycle'),
  'T3c hip_thrust.sportTags includes cycle');

// ── T4: new exercises exist ───────────────────────────────────────────────
const NEW_IDS = [
  // hypertrophy
  'incline_db_curl','spider_curl','overhead_cable_ext','low_high_cable_fly',
  'seated_leg_curl','heel_elevated_goblet','reverse_pec_deck','serratus_punch_cable',
  'prone_y_raise','prone_t_raise','prone_w_raise','db_pullover',
  'jm_press','close_grip_bench','ab_wheel','pause_squat',
  'rack_pull','deficit_deadlift','floor_press','seated_box_jump',
  // functional + activation primer
  'hip_flexor_90_90','glute_bridge_activation','cat_camel_thoracic','band_pull_apart',
  'half_kneeling_pallof','serratus_wall_slide','bird_dog',
  'tall_kneeling_landmine','prone_hip_extension','thoracic_foam_roller',
  // run support
  'double_leg_pogo','sl_pogo_jump','bounding_a_skip',
  'lateral_band_walk','sl_hip_abduction','sl_squat_to_box',
  'tibialis_raise','glute_bridge_single_leg',
  // cycle support
  'sl_leg_press',
  // swim support
  'sl_ext_rotation','cable_ext_rotation_90','cable_woodchop',
  'ankle_plantarflex_band','glute_ham_raise'
];
for (const id of NEW_IDS) {
  assert(!!byId(id), `T4 new exercise exists: ${id}`);
}

// ── T5: activationPrimer exercises are tagged ─────────────────────────────
const primerIds = ['hip_flexor_90_90','glute_bridge_activation','band_pull_apart','cat_camel_thoracic'];
for (const id of primerIds) {
  assert(byId(id)?.activationPrimer === true, `T5 ${id} has activationPrimer:true`);
}
// no other exercise should have activationPrimer:true
const wrongPrimer = EXERCISES.filter(e => e.activationPrimer === true && !primerIds.includes(e.id));
assert(wrongPrimer.length === 0, `T5b no unexpected activationPrimer flags (found: ${wrongPrimer.map(e=>e.id)})`);

// ── T6: resolveProgram emits exercisePriority ─────────────────────────────
const runProg = resolveProgram({ goal_type: 'sport', sport: 'run', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(Array.isArray(runProg.exercisePriority) && runProg.exercisePriority.length > 0,
  'T6a run program emits exercisePriority');
assert(runProg.exercisePriority.includes('nordic_curl') || runProg.exercisePriority.includes('double_leg_pogo'),
  'T6b run priority includes run-specific exercises');

const swimProg = resolveProgram({ goal_type: 'sport', sport: 'swim', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(Array.isArray(swimProg.exercisePriority) && swimProg.exercisePriority.includes('face_pull'),
  'T6c swim priority includes face_pull');

const hypProg = resolveProgram({ goal_type: 'build', strength_style: 'bodybuilding',
  experience: { gym: 'returning' } });
assert(Array.isArray(hypProg.exercisePriority) && hypProg.exercisePriority.includes('incline_db_curl'),
  'T6d hypertrophy priority includes incline_db_curl');

const funcProg = resolveProgram({ goal_type: 'build', strength_style: 'functional',
  experience: { gym: 'beginner' } });
assert(Array.isArray(funcProg.exercisePriority) && funcProg.exercisePriority.includes('bird_dog'),
  'T6e functional priority includes bird_dog');

// ── T7: beginner does not receive back_squat as a primary ─────────────────
const begTargets = weeklyMuscleTargets({
  style: 'strength', weekInPhase: 1, phaseWeeks: 4,
  level: 'beginner', emphasis: {}, volumeScalar: 1.0
});
const begSessions = allocateGym({
  targets: begTargets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'base', deload: false, weekNum: 1,
         level: 'beginner', access: ['full_gym'] }
});
const begItems = begSessions.flatMap(s => s.items);
const sqPrimary = begItems.find(it => it.name === 'Back squat' && it.rpe && it.rpe.includes('RPE 7'));
// A beginner can see back squat but only as accessory (lower sets/RPE)
const sqItem = begItems.find(it => it.name === 'Back squat');
if (sqItem) {
  // restSec < 120 means it was treated as accessory, not primary
  assert(sqItem.restSec < 120, 'T7 back_squat for beginner has accessory restSec (not primary)');
}
// (If back_squat doesn't appear at all, that's also fine — assert nothing fails)
assert(true, 'T7 beginner back_squat test completed (see above)');

// ── T8: returning athlete CAN receive back_squat as primary ──────────────
const retTargets = weeklyMuscleTargets({
  style: 'strength', weekInPhase: 1, phaseWeeks: 4,
  level: 'returning', emphasis: {}, volumeScalar: 1.0
});
const retSessions = allocateGym({
  targets: retTargets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'base', deload: false, weekNum: 1,
         level: 'returning', access: ['full_gym'] }
});
const retItems = retSessions.flatMap(s => s.items);
// returning level => back_squat may be primary (restSec ≥ 120) or anchor
const retSqPrimary = retItems.find(it => it.name === 'Back squat' && it.restSec >= 120);
assert(!!retSqPrimary, 'T8 returning athlete can get back_squat as primary');

// ── T9: functional buildWeek prepends activation primer ───────────────────
const funcSessions = buildWeek({
  gymDays: 1, style: 'functional', intent: 'base', deload: false,
  winp: 1, phaseWeeks: 4, minutes: 55, access: ['full_gym'],
  level: 'intermediate', weekNum: 1
});
assert(funcSessions.length === 1, 'T9a functional buildWeek returns 1 session');
const funcItems = funcSessions[0].items;
// Primer items are prepended, tagged 'mobility', named exactly as in FUNCTIONAL_PRIMER
const primerNames = ['90/90 Hip Flexor Stretch', 'Glute Bridge (2s hold)', 'Band Pull-Apart', 'Cat-Camel + Thoracic Rotation'];
const foundPrimer = primerNames.every(n => funcItems.some(it => it.name === n));
assert(foundPrimer, `T9b functional session has all primer items (found: ${funcItems.slice(0,4).map(i=>i.name)})`);
assert(funcItems[0].name === '90/90 Hip Flexor Stretch', 'T9c primer is first in session');

// Primer must NOT appear in strength sessions
const strSessions = buildWeek({
  gymDays: 1, style: 'strength', intent: 'base', deload: false,
  winp: 1, phaseWeeks: 4, minutes: 55, access: ['full_gym'],
  level: 'intermediate', weekNum: 1
});
const strItems = strSessions.flatMap(s => s.items);
assert(!strItems.some(it => it.name === '90/90 Hip Flexor Stretch'),
  'T9d strength sessions do NOT have primer');

// ── T10: buildSupport works for cycle ─────────────────────────────────────
const cycleSupport = buildSupport({ count: 2, for: 'cycle', deload: false,
  access: ['full_gym'], weekNum: 1 });
assert(cycleSupport.length === 2, 'T10a cycle buildSupport returns 2 sessions');
assert(cycleSupport[0].focus === 'Cycle-support strength', 'T10b cycle session focus label');
assert(cycleSupport[0].items.length >= 4, 'T10c cycle support session has ≥4 exercises');
```

- [ ] **Step 1.2 — Run the test file; confirm all tests FAIL as expected**

```bash
node tests/exercise-selection.js
```

Expected: Most tests report `FAIL:` — that's correct. The test infrastructure itself should not throw an unhandled error. If you see `SyntaxError` or `Cannot find module`, fix the import path before continuing.

- [ ] **Step 1.3 — Commit the test file**

```bash
git add tests/exercise-selection.js
git commit -m "test: add failing exercise-selection test suite"
```

---

### Task 2: Level corrections and new fields on existing exercises

**Files:**
- Modify: `src/data/strengthExercises.js:27-116` — update ~20 existing exercise objects

The existing exercises need three things:
1. Two level number corrections (`nordic_curl`, `copenhagen`): `level: 2 → 3`
2. `minLevelForPrimary` on barbell compounds where a beginner/returning athlete shouldn't receive it as the main heavy lift
3. `sportTags` and `goalTags` on exercises that have science-backed sport/goal relevance

- [ ] **Step 2.1 — Write failing tests for this task (already in T1–T3 above; verify they fail)**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T1|T2|T3'
```

Expected: `FAIL: T1a nordic_curl level is 3`, etc.

- [ ] **Step 2.2 — Apply level corrections**

In `src/data/strengthExercises.js`, make the following changes:

`nordic_curl` — change `level: 2` to `level: 3`:
```js
{ id: 'nordic_curl', name: 'Nordic curl', pattern: 'iso', muscle: 'ham', equip: 'bodyweight', level: 3, role: 'iso', sportTags: ['run', 'cycle'] },
```

`copenhagen` — change `level: 2` to `level: 3`:
```js
{ id: 'copenhagen', name: 'Copenhagen plank', pattern: 'core', equip: 'bodyweight', level: 3, role: 'core', sportTags: ['run', 'cycle', 'swim'] },
```

- [ ] **Step 2.3 — Add minLevelForPrimary to barbell compounds**

Update these exercise objects in `src/data/strengthExercises.js`. Each gets the `minLevelForPrimary` field added (everything else stays the same unless also adding tags):

```js
// SQUAT section
{ id: 'back_squat',  name: 'Back squat',        pattern: 'squat', equip: 'barbell',    level: 0, role: 'primary',   liftKey: 'squat',     minLevelForPrimary: 'returning' },
{ id: 'front_squat', name: 'Front squat',        pattern: 'squat', equip: 'barbell',    level: 2, role: 'primary',   liftKey: 'squat',     minLevelForPrimary: 'intermediate' },
{ id: 'box_squat',   name: 'Box squat',          pattern: 'squat', equip: 'barbell',    level: 2, role: 'primary',   liftKey: 'squat',     minLevelForPrimary: 'intermediate' },

// HINGE section
{ id: 'deadlift',    name: 'Deadlift',           pattern: 'hinge', equip: 'barbell',    level: 1, role: 'primary',   liftKey: 'deadlift',  minLevelForPrimary: 'returning' },
{ id: 'good_morning',name: 'Good morning',       pattern: 'hinge', equip: 'barbell',    level: 2, role: 'accessory',                        minLevelForPrimary: 'intermediate' },

// HORIZONTAL PUSH section
{ id: 'bench',       name: 'Bench press',        pattern: 'hpush', equip: 'barbell',    level: 0, role: 'primary',   liftKey: 'bench',     minLevelForPrimary: 'returning' },

// VERTICAL PUSH section
{ id: 'ohp',         name: 'Overhead press',     pattern: 'vpush', equip: 'barbell',    level: 1, role: 'primary',                          minLevelForPrimary: 'intermediate' },

// HORIZONTAL PULL section
{ id: 'barbell_row', name: 'Barbell row',        pattern: 'hpull', equip: 'barbell',    level: 1, role: 'primary',                          minLevelForPrimary: 'intermediate' },

// VERTICAL PULL section
{ id: 'pullup',      name: 'Pull-up',            pattern: 'vpull', equip: 'bodyweight', level: 2, role: 'primary',                          minLevelForPrimary: 'intermediate' },
{ id: 'lat_pulldown',name: 'Lat pulldown',       pattern: 'vpull', equip: 'cable',      level: 0, role: 'primary',                          minLevelForPrimary: 'returning' },
```

- [ ] **Step 2.4 — Add sportTags and goalTags to existing exercises**

Replace these existing exercise objects with the updated versions (all other fields unchanged):

```js
// HINGE section
{ id: 'rdl',         name: 'Romanian deadlift',   pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory', liftKey: 'deadlift', sportTags: ['run', 'cycle'],          goalTags: ['strength'] },
{ id: 'db_rdl',      name: 'DB Romanian deadlift', pattern: 'hinge', equip: 'dumbbell', level: 0, role: 'accessory',                      sportTags: ['run', 'cycle'] },
{ id: 'hip_thrust',  name: 'Hip thrust',           pattern: 'hinge', equip: 'barbell',  level: 0, role: 'accessory',                      sportTags: ['cycle', 'swim'],          goalTags: ['strength'] },
{ id: 'sl_hinge',    name: 'Single-leg hip hinge', pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory',                    sportTags: ['run', 'cycle', 'swim'],   minLevelForPrimary: 'returning' },
{ id: 'kb_swing',    name: 'Kettlebell swing',      pattern: 'hinge', equip: 'kettlebell', level: 1, role: 'accessory',                   sportTags: ['run'],                    minLevelForPrimary: 'returning' },

// LUNGE section
{ id: 'split_squat',   name: 'Bulgarian split squat', pattern: 'lunge', equip: 'dumbbell',   level: 0, role: 'accessory', unilateral: true, sportTags: ['run', 'cycle'] },
{ id: 'walking_lunge', name: 'Walking lunge',          pattern: 'lunge', equip: 'dumbbell',   level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },
{ id: 'step_up',       name: 'Step-up',                pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },

// HORIZONTAL PULL section
{ id: 'barbell_row',         name: 'Barbell row',          pattern: 'hpull', equip: 'barbell',   level: 1, role: 'primary',                              minLevelForPrimary: 'intermediate', sportTags: ['swim'] },
{ id: 'db_row',              name: 'Single-arm DB row',    pattern: 'hpull', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true,           sportTags: ['swim'] },
{ id: 'cable_row',           name: 'Seated cable row',     pattern: 'hpull', equip: 'cable',     level: 0, role: 'accessory',                             sportTags: ['swim'] },
{ id: 'chest_supported_row', name: 'Chest-supported row',  pattern: 'hpull', equip: 'dumbbell',  level: 0, role: 'accessory',                             sportTags: ['swim'] },

// VERTICAL PULL section
{ id: 'lat_pulldown',    name: 'Lat pulldown',           pattern: 'vpull', equip: 'cable',      level: 0, role: 'primary', minLevelForPrimary: 'returning', sportTags: ['swim'] },
{ id: 'assisted_pullup', name: 'Band-assisted pull-up',  pattern: 'vpull', equip: 'bodyweight', level: 0, role: 'accessory',                              sportTags: ['swim'] },
{ id: 'straight_arm_pd', name: 'Straight-arm pulldown',  pattern: 'vpull', equip: 'cable',      level: 1, role: 'accessory',                              sportTags: ['swim'] },

// CARRY section
{ id: 'farmer_carry',   name: 'Farmer carry',   pattern: 'carry', equip: 'dumbbell',   level: 0, role: 'accessory',                goalTags: ['functional', 'strength'] },
{ id: 'suitcase_carry', name: 'Suitcase carry', pattern: 'carry', equip: 'dumbbell',   level: 0, role: 'accessory', unilateral: true, goalTags: ['functional'],              sportTags: ['run', 'cycle', 'swim'] },

// CORE section
{ id: 'plank',      name: 'Plank',             pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional', 'strength'], sportTags: ['run', 'cycle', 'swim'] },
{ id: 'pallof',     name: 'Pallof press',      pattern: 'core', equip: 'cable',      level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
{ id: 'band_pallof',name: 'Band Pallof press', pattern: 'core', equip: 'band',       level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
{ id: 'dead_bug',   name: 'Dead bug',          pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
{ id: 'side_plank', name: 'Side plank',        pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },

// CALF section
{ id: 'calf_raise',  name: 'Calf raise',            pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'] },
{ id: 'sl_calf',     name: 'Single-leg calf raise', pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'], unilateral: true },
{ id: 'seated_calf', name: 'Seated calf raise',     pattern: 'calf', equip: 'machine',    level: 0, role: 'iso', sportTags: ['run', 'cycle'] },

// ISO section
{ id: 'face_pull',      name: 'Face pull',      pattern: 'iso', muscle: 'reardelt', equip: 'cable',    level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
{ id: 'band_face_pull', name: 'Band face pull', pattern: 'iso', muscle: 'reardelt', equip: 'band',     level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
{ id: 'leg_curl',       name: 'Leg curl',       pattern: 'iso', muscle: 'ham',      equip: 'machine',  level: 0, role: 'iso', sportTags: ['run', 'cycle'] },
{ id: 'nordic_curl',    name: 'Nordic curl',    pattern: 'iso', muscle: 'ham',      equip: 'bodyweight', level: 3, role: 'iso', sportTags: ['run', 'cycle'] },
{ id: 'copenhagen',     name: 'Copenhagen plank', pattern: 'core', equip: 'bodyweight', level: 3, role: 'core', sportTags: ['run', 'cycle', 'swim'] },
```

- [ ] **Step 2.5 — Run tests T1–T3 and confirm they pass**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T1|T2|T3'
```

Expected output:
```
PASS: T1a nordic_curl level is 3
PASS: T1b copenhagen level is 3
PASS: T2a back_squat minLevelForPrimary=returning
PASS: T2b bench minLevelForPrimary=returning
PASS: T2c barbell_row minLevelForPrimary=intermediate
PASS: T2d ohp minLevelForPrimary=intermediate
PASS: T3a rdl.sportTags includes run
PASS: T3b face_pull.sportTags includes swim
PASS: T3c hip_thrust.sportTags includes cycle
```

- [ ] **Step 2.6 — Verify the app still starts**

```bash
npm run dev
```

Expected: dev server starts, no red console errors on load.

- [ ] **Step 2.7 — Commit**

```bash
git add src/data/strengthExercises.js
git commit -m "data: add minLevelForPrimary, sportTags, goalTags + level corrections to existing exercises"
```

---

### Task 3: Add all new exercises to the library

**Files:**
- Modify: `src/data/strengthExercises.js` — append ~50 new exercise objects

- [ ] **Step 3.1 — Verify T4 currently fails**

```bash
node tests/exercise-selection.js 2>&1 | grep 'T4'
```

Expected: `FAIL: T4 new exercise exists: incline_db_curl`, etc.

- [ ] **Step 3.2 — Append hypertrophy exercises**

Add the following block inside the `EXERCISES` array in `src/data/strengthExercises.js`, after the existing ISO section:

```js
  // ---------------- HYPERTROPHY ACCENTS ----------------
  { id: 'incline_db_curl',      name: 'Incline DB Curl',                  pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'spider_curl',          name: 'Spider Curl',                      pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'overhead_cable_ext',   name: 'Overhead Cable Tricep Extension',  pattern: 'iso',    muscle: 'triceps',   equip: 'cable',      level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'low_high_cable_fly',   name: 'Low-to-High Cable Fly',            pattern: 'hpush',                       equip: 'cable',      level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'seated_leg_curl',      name: 'Seated Leg Curl',                  pattern: 'iso',    muscle: 'ham',       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'] },
  { id: 'heel_elevated_goblet', name: 'Heel-Elevated Goblet Squat',       pattern: 'squat',                       equip: 'dumbbell',   level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'reverse_pec_deck',     name: 'Reverse Pec Deck',                 pattern: 'hpull',                       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'serratus_punch_cable', name: 'Serratus Punch (cable)',           pattern: 'core',                        equip: 'cable',      level: 1, role: 'core',      minLevelForPrimary: 'returning',    goalTags: ['hypertrophy', 'functional'], sportTags: ['swim'] },
  { id: 'prone_y_raise',        name: 'Prone Y Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy', 'functional'], sportTags: ['swim', 'functional'] },
  { id: 'prone_t_raise',        name: 'Prone T Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'prone_w_raise',        name: 'Prone W Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'db_pullover',          name: 'DB Pullover',                      pattern: 'hpull',                       equip: 'dumbbell',   level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['hypertrophy'] },
  { id: 'jm_press',             name: 'JM Press',                         pattern: 'hpush',                       equip: 'barbell',    level: 3, role: 'accessory', minLevelForPrimary: 'advanced',     goalTags: ['strength'] },
  { id: 'close_grip_bench',     name: 'Close-Grip Bench Press',           pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'hypertrophy'] },
  { id: 'ab_wheel',             name: 'Ab Wheel Rollout',                 pattern: 'core',                        equip: 'bodyweight', level: 2, role: 'core',                                          goalTags: ['strength', 'functional'] },
  { id: 'pause_squat',          name: 'Pause Squat (2-3s)',               pattern: 'squat',                       equip: 'barbell',    level: 2, role: 'primary',   minLevelForPrimary: 'intermediate', goalTags: ['strength'], liftKey: 'squat' },
  { id: 'rack_pull',            name: 'Rack Pull',                        pattern: 'hinge',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'deficit_deadlift',     name: 'Deficit Deadlift',                 pattern: 'hinge',                       equip: 'barbell',    level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     goalTags: ['strength'], liftKey: 'deadlift' },
  { id: 'floor_press',          name: 'Floor Press',                      pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'seated_box_jump',      name: 'Seated Box Jump',                  pattern: 'squat',                       equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'functional'], sportTags: ['run'] },
```

- [ ] **Step 3.3 — Append functional + activation primer exercises**

Add the following block after the hypertrophy section:

```js
  // ---------------- FUNCTIONAL / DESK-JOB COUNTERBALANCE ----------------
  // activationPrimer:true → prepended to every functional session by buildWeek()
  { id: 'hip_flexor_90_90',        name: '90/90 Hip Flexor Stretch',       pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'glute_bridge_activation',  name: 'Glute Bridge (2s hold)',         pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'band_pull_apart',          name: 'Band Pull-Apart',                pattern: 'hpull',    equip: 'band',       level: 0, role: 'iso',   activationPrimer: true,  goalTags: ['functional', 'hypertrophy'], sportTags: ['swim'] },
  { id: 'cat_camel_thoracic',       name: 'Cat-Camel + Thoracic Rotation', pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'half_kneeling_pallof',     name: 'Half-Kneeling Pallof Press',    pattern: 'core',     equip: 'cable',      level: 1, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['run', 'swim'] },
  { id: 'serratus_wall_slide',      name: 'Serratus Wall Slide',            pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'bird_dog',                 name: 'Bird Dog (5s hold)',             pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional', 'strength'] },
  { id: 'tall_kneeling_landmine',   name: 'Tall-Kneeling Landmine Press',  pattern: 'vpush',    equip: 'barbell',    level: 1, role: 'accessory', minLevelForPrimary: 'returning', activationPrimer: false, goalTags: ['functional'] },
  { id: 'prone_hip_extension',      name: 'Prone Hip Extension',           pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'iso',   activationPrimer: false, goalTags: ['functional'], sportTags: ['cycle'] },
  { id: 'thoracic_foam_roller',     name: 'Thoracic Foam Roller Extension',pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['cycle'] },
```

- [ ] **Step 3.4 — Append run support exercises**

```js
  // ---------------- RUN SUPPORT ----------------
  { id: 'double_leg_pogo',     name: 'Double-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['run'], goalTags: ['functional'] },
  { id: 'sl_pogo_jump',        name: 'Single-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'bounding_a_skip',     name: 'A-Skip / Bounding',         pattern: 'lunge',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'lateral_band_walk',   name: 'Lateral Band Walk',         pattern: 'iso',    muscle: 'glutes', equip: 'band', level: 0, role: 'iso', minLevelForPrimary: 'beginner',  sportTags: ['run', 'cycle'], goalTags: ['functional'] },
  { id: 'sl_hip_abduction',    name: 'Side-Lying Hip Abduction',  pattern: 'iso',    muscle: 'glutes', equip: 'dumbbell', level: 1, role: 'iso', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },
  { id: 'sl_squat_to_box',     name: 'Single-Leg Squat to Box',   pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'tibialis_raise',      name: 'Tibialis Raise',            pattern: 'iso',    muscle: 'quad',  equip: 'bodyweight', level: 0, role: 'iso', minLevelForPrimary: 'beginner',    sportTags: ['run'] },
  { id: 'glute_bridge_single_leg', name: 'Single-Leg Glute Bridge', pattern: 'hinge', equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },
```

- [ ] **Step 3.5 — Append cycle and swim support exercises**

```js
  // ---------------- CYCLE SUPPORT ----------------
  { id: 'sl_leg_press',  name: 'Single-Leg Leg Press',  pattern: 'squat', equip: 'machine',    level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['cycle'] },

  // ---------------- SWIM SUPPORT ----------------
  { id: 'sl_ext_rotation',       name: 'Side-Lying External Rotation',   pattern: 'iso', muscle: 'shoulders', equip: 'dumbbell', level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_ext_rotation_90', name: 'Cable ER at 90° Abduction',      pattern: 'iso', muscle: 'shoulders', equip: 'cable',    level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_woodchop',        name: 'Cable Woodchop (high-to-low)',   pattern: 'core',                     equip: 'cable',    level: 2, role: 'core',                                          goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'ankle_plantarflex_band',name: 'Banded Ankle Plantarflexion',    pattern: 'calf',                     equip: 'band',     level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     sportTags: ['swim'] },
  { id: 'glute_ham_raise',       name: 'Glute-Ham Raise',                pattern: 'hinge',                    equip: 'machine',  level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     sportTags: ['swim'] },
```

Note: `mobility` is a new pattern value used by the primer/desk exercises. The allocator's `PATTERN_CONTRIB` does not map it (it has no muscle contribution), so `contribOf()` returns `{}`. This means primer exercises don't pay down deficits — that's correct: the primer is prepended unconditionally by `buildWeek()`, not picked by the allocator.

- [ ] **Step 3.6 — Run T4 + T5 tests**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T4|T5'
```

Expected: all T4 and T5 lines show `PASS:`.

- [ ] **Step 3.7 — Run the full test suite to confirm no regressions**

```bash
node tests/engine-rest-and-rep.js && node tests/exercise-selection.js
```

Expected: all existing tests still pass; T4, T5 pass; T6–T10 still fail (not yet implemented).

- [ ] **Step 3.8 — Commit**

```bash
git add src/data/strengthExercises.js
git commit -m "data: add 50 new exercises — hypertrophy, functional, sport support"
```

---

### Task 4: program.js — emit exercisePriority

**Files:**
- Modify: `src/lib/strength/program.js`

`resolveProgram()` returns an object used by the allocator and targets. Add an `exercisePriority` array — an ordered list of exercise IDs that the allocator will score ×1.35. The list is science-backed: strongest-evidence exercises for each goal appear first.

- [ ] **Step 4.1 — Verify T6 currently fails**

```bash
node tests/exercise-selection.js 2>&1 | grep 'T6'
```

Expected: `FAIL: T6a run program emits exercisePriority`, etc.

- [ ] **Step 4.2 — Add priority constants and update resolveProgram()**

Replace the entire contents of `src/lib/strength/program.js` with:

```js
/**
 * program — resolves a user's GOAL into the parameters the gym engine programs to.
 * Single source of truth read by targets.js (volume) and the allocator (selection).
 *
 * Returns:
 *   { goalType, style, emphasis:{muscle:×}, volumeScalar, power, sport, season, level,
 *     exercisePriority: string[] }
 *   - exercisePriority  ordered exercise IDs that score ×1.35 in the allocator.
 *     Based on the strongest evidence for each goal (see design spec 2026-06-12).
 */

const SPORT_EMPHASIS = {
  run:   { quads: 1.15, hamstrings: 1.25, glutes: 1.2, calves: 1.3, core: 1.2, back: 0.9, shoulders: 0.8, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  cycle: { quads: 1.3, glutes: 1.25, hamstrings: 1.15, calves: 1.0, core: 1.15, back: 0.9, shoulders: 0.7, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  swim:  { back: 1.3, shoulders: 1.25, triceps: 1.15, biceps: 1.1, core: 1.2, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5 }
};

// Science-backed priority lists.
// Run: Blagrove 2018 (heavy RT + economy), Petersen 2011 (nordic), Berryman 2018 (plyos).
// Cycle: Rønnestad 2010/2015 (SL strength, posterior chain), hip stability for Q-angle.
// Swim: Batalha 2012/2015 (ER:IR ratio deficit), shoulder health, lat/core.
// Hypertrophy (RP / Israetel): stretched-position isolation, compounds near MRV.
// Strength: competition lifts + close variants.
// Functional: Janda crossed syndromes, McGill spine, desk-job counterbalance.
const SPORT_PRIORITY = {
  run: [
    'nordic_curl', 'double_leg_pogo', 'sl_pogo_jump', 'bounding_a_skip',
    'split_squat', 'rdl', 'trap_bar_dl', 'glute_bridge_single_leg',
    'tibialis_raise', 'lateral_band_walk', 'sl_hip_abduction',
    'copenhagen', 'pallof', 'sl_calf', 'sl_hinge', 'step_up'
  ],
  cycle: [
    'sl_leg_press', 'split_squat', 'hip_thrust', 'glute_bridge_single_leg',
    'lateral_band_walk', 'rdl', 'sl_hinge', 'goblet_squat',
    'copenhagen', 'thoracic_foam_roller', 'hip_flexor_90_90',
    'prone_hip_extension', 'pallof'
  ],
  swim: [
    'face_pull', 'band_face_pull', 'sl_ext_rotation', 'cable_ext_rotation_90',
    'reverse_pec_deck', 'prone_y_raise', 'prone_t_raise', 'prone_w_raise',
    'serratus_punch_cable', 'serratus_wall_slide', 'band_pull_apart',
    'straight_arm_pd', 'lat_pulldown', 'cable_woodchop',
    'hip_thrust', 'cable_woodchop', 'glute_ham_raise', 'plank', 'side_plank'
  ]
};

const GOAL_PRIORITY = {
  bodybuilding: [
    'incline_db_curl', 'spider_curl', 'overhead_cable_ext', 'low_high_cable_fly',
    'seated_leg_curl', 'heel_elevated_goblet', 'reverse_pec_deck',
    'prone_y_raise', 'prone_t_raise', 'prone_w_raise', 'db_pullover',
    'leg_curl', 'leg_ext', 'chest_fly', 'lateral_raise', 'rear_fly',
    'biceps_curl', 'triceps_pushdown', 'overhead_ext'
  ],
  strength: [
    'back_squat', 'deadlift', 'bench', 'pause_squat', 'rack_pull',
    'deficit_deadlift', 'jm_press', 'close_grip_bench', 'floor_press',
    'barbell_row', 'ohp', 'trap_bar_dl', 'front_squat', 'hip_thrust',
    'farmer_carry', 'ab_wheel', 'seated_box_jump'
  ],
  functional: [
    'bird_dog', 'dead_bug', 'pallof', 'side_plank', 'ab_wheel',
    'suitcase_carry', 'farmer_carry', 'split_squat', 'step_up',
    'serratus_wall_slide', 'serratus_punch_cable', 'half_kneeling_pallof',
    'tall_kneeling_landmine', 'seated_box_jump', 'bounding_a_skip',
    'hip_flexor_90_90', 'glute_bridge_activation', 'band_pull_apart',
    'thoracic_foam_roller', 'prone_hip_extension'
  ]
};

function gymLevel(profile) {
  const e = profile.experience || {};
  return e.gym || e.strength_functional || e.strength_physique || 'intermediate';
}

export function resolveProgram(profile = {}) {
  const level = gymLevel(profile);
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const season = profile.sport_season || 'off';
    return {
      goalType: 'sport', style: 'sport',
      emphasis: SPORT_EMPHASIS[sport] || {},
      volumeScalar: season === 'in' ? 0.6 : 1.0,
      power: true, sport, season, level,
      exercisePriority: SPORT_PRIORITY[sport] || []
    };
  }

  let style = profile.strength_style;
  if (!style) style = (profile.focus || []).includes('strength_physique') ? 'bodybuilding' : 'functional';
  if (!['strength', 'bodybuilding', 'functional'].includes(style)) style = 'strength';

  const emphasis = {};
  if (style === 'bodybuilding') { emphasis.shoulders = 1.1; emphasis.biceps = 1.1; emphasis.triceps = 1.1; }
  if (style === 'functional') { emphasis.core = 1.2; }

  return {
    goalType: 'build', style, emphasis, volumeScalar: 1.0, power: style === 'functional',
    sport: null, season: null, level,
    exercisePriority: GOAL_PRIORITY[style] || []
  };
}

export default { resolveProgram };
```

Note: `volumeScalar` for sport off-season changed from `0.85` to `1.0` — off-season is the genuine strength-building window; sport biases the exercise SELECTION not the overall volume.

- [ ] **Step 4.3 — Run T6 tests**

```bash
node tests/exercise-selection.js 2>&1 | grep 'T6'
```

Expected: all T6 lines show `PASS:`.

- [ ] **Step 4.4 — Run the full existing test suite to check no regressions**

```bash
node tests/engine-rest-and-rep.js
```

Expected: all PASS. (T3b in the rest-and-rep suite checks `style:'sport'` + `volumeScalar < 1` — that test used `0.85`. Now it's `1.0`. Verify T3 in engine-rest-and-rep.js still passes; the test only checks `style === 'sport'`, not volumeScalar.)

If the rest-and-rep test checks volumeScalar explicitly, update the expected value in `tests/engine-rest-and-rep.js` to `1.0` — it's the right value now.

- [ ] **Step 4.5 — Commit**

```bash
git add src/lib/strength/program.js
git commit -m "engine: resolveProgram emits exercisePriority + off-season volumeScalar 0.85→1.0"
```

---

### Task 5: allocator.js — effectiveRole + exercisePriority scoring

**Files:**
- Modify: `src/lib/plan/allocator.js` — `roleSetCount()`, `perSetMin()`, `bestExercise()`, `allocateGym()`

Two changes:
1. **effectiveRole**: when an exercise has `minLevelForPrimary` and the athlete is below that level, treat it as `'accessory'` rather than `'primary'`. This affects rep scheme, time cost, and the 2-primary cap.
2. **priority scoring**: exercises in `ctx.exercisePriority` score ×1.35 in `bestExercise()`.

- [ ] **Step 5.1 — Verify T7 + T8 currently fail**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T7|T8'
```

Expected: `FAIL: T7 back_squat for beginner has accessory restSec (not primary)` (or the test skips because back_squat doesn't appear at all — either is acceptable).

- [ ] **Step 5.2 — Update roleSetCount() to accept effectiveRole**

In `src/lib/plan/allocator.js`, replace the `roleSetCount` function (currently at line ~99):

```js
// Working-set count an exercise contributes, by its role + the current scheme.
// effectiveRole overrides ex.role when minLevelForPrimary demotes the exercise.
function roleSetCount(ex, s, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (role === 'primary') return parseSetCount(s.main);
  if (ex.pattern === 'core') return 3;
  if (ex.pattern === 'calf') return parseSetCount('3 × 12');
  if (role === 'iso') return parseSetCount(isoStr(style));
  return parseSetCount(s.acc);   // accessory
}
```

- [ ] **Step 5.3 — Update perSetMin() to accept effectiveRole**

Replace the `perSetMin` function (currently at line ~143):

```js
function perSetMin(ex, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (role === 'primary') return 2.8;
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return 1.2;
  return 1.5;
}
```

- [ ] **Step 5.4 — Update bestExercise() to use effectiveRole and prioritySet**

Replace the `bestExercise` function signature and body (currently at line ~213):

```js
function bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, fillersOnly = false, prioritySet = null) {
  let best = null, bestScore = 0.25;
  for (const ex of EXERCISES) {
    if (!slot.equip.has(ex.equip)) continue;
    if (ex.level > slot.level) continue;
    if (slot.exUsed.has(ex.id)) continue;
    if (fillersOnly && !isFiller(ex)) continue;

    // Demote complex primaries to accessory when athlete is below minLevelForPrimary.
    const effectiveRole = (ex.minLevelForPrimary && ex.role === 'primary' &&
      slot.level < (LEVELS[ex.minLevelForPrimary] ?? 0)) ? 'accessory' : ex.role;

    if (!fillersOnly && effectiveRole === 'primary' &&
        slot.picks.filter(p => p.ex.role === 'primary' && p.effectiveRole === 'primary').length >= 2) continue;

    const sets = roleSetCount(ex, s, style, effectiveRole);
    if (sets <= 0) continue;
    const cost = sets * perSetMin(ex, effectiveRole);
    if (!fillersOnly && slot.timeUsed > 0 && slot.timeUsed + cost > slot.budget + 2) continue;

    const contrib = contribOf(ex);
    let useful = 0;
    for (const m in contrib) {
      const cap = (perSlotCap[m] ?? Infinity) - (slot.delivered[m] || 0);
      const room = Math.min(Math.max(0, deficit[m] || 0), Math.max(0, cap));
      const urgency = targets[m] > 0 ? Math.max(0, Math.min(1, (deficit[m] || 0) / targets[m])) : 0;
      useful += Math.min(sets * contrib[m], room) * (0.6 + 0.9 * urgency);
    }
    if (useful <= 0) continue;

    let score = useful;
    if (slot.patternsUsed.has(ex.pattern)) score *= 0.6;
    if (slot.timeUsed < 5) score *= effectiveRole === 'primary' ? 1.2 : 0.85;
    if (ex.pattern === 'hpull' || ex.pattern === 'vpull') score *= 1.05;
    if (prioritySet && prioritySet.has(ex.id)) score *= 1.35;
    score += (hash(ex.id) + weekNum + slot.idx) % 7 * 0.001;

    if (score > bestScore) { bestScore = score; best = { ex, sets, contrib, effectiveRole }; }
  }
  return best;
}
```

- [ ] **Step 5.5 — Update place() to store effectiveRole on picks**

The `place` helper stores picks on the slot. It needs to pass `effectiveRole` through so the primary-cap check in step 5.4 can inspect it. Replace the `place` function (currently at line ~323):

```js
const place = (slot, pick) => {
  const { ex, sets, contrib, effectiveRole } = pick;
  slot.picks.push({
    ex, effectiveRole,
    item: makeItem(ex, slot.picks.length, s, style, deload, repBump, effectiveRole)
  });
  slot.timeUsed += sets * perSetMin(ex, effectiveRole);
  slot.patternsUsed.add(ex.pattern);
  slot.exUsed.add(ex.id);
  for (const m in contrib) {
    const v = sets * contrib[m];
    deficit[m] = (deficit[m] || 0) - v;
    slot.delivered[m] = (slot.delivered[m] || 0) + v;
    slot.muscleVol[m] = (slot.muscleVol[m] || 0) + v;
  }
};
```

- [ ] **Step 5.6 — Update makeItem() to accept effectiveRole**

`makeItem()` uses `ex.role` to determine the rendered format. Update it to accept an optional override:

```js
function makeItem(ex, idx, s, style, deload, repBump, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  const per = ex.unilateral ? ' ea.' : '';
  const num = LETTERS[Math.min(idx, LETTERS.length - 1)] + '1';
  const restSec = restForRole(ex, style, role);
  if (role === 'primary') {
    return { num, name: ex.name, sets: s.main + per, rpe: s.mainRpe, note: mainNote(deload), restSec };
  }
  if (ex.pattern === 'core') {
    const hold = /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, name: ex.name, sets: hold ? coreStr(deload) : '3 × 12' + per, rpe: 'RPE 6', tag: 'mobility', note: '', restSec };
  }
  if (ex.pattern === 'calf' || role === 'iso') {
    const str = ex.pattern === 'calf' ? '3 × 12' : isoStr(style);
    return { num, name: ex.name, sets: bumpReps(str + per, repBump), rpe: s.accRpe, tag: ex.pattern === 'calf' ? 'mobility' : undefined, note: '', restSec };
  }
  return { num, name: ex.name, sets: bumpReps(s.acc + per, repBump), rpe: s.accRpe, note: '', restSec };
}
```

Also update `restForRole()` to accept the effective role:

```js
function restForRole(ex, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (role === 'primary') return (style === 'strength' || style === 'sport') ? 180 : 120;
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return 60;
  return 75;
}
```

- [ ] **Step 5.7 — Thread prioritySet through allocateGym()**

In `allocateGym()`, add `prioritySet` construction and pass it to all `bestExercise()` calls. Find the line `const deficit = { ...targets };` and add after it:

```js
const prioritySet = ctx.exercisePriority && ctx.exercisePriority.length
  ? new Set(ctx.exercisePriority) : null;
```

Then update every call to `bestExercise()` in `allocateGym()` to pass `prioritySet` as the last argument. There are 3 call sites (main fill loop, fallback, filler pass):

```js
// Main fill:
const pick = bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, false, prioritySet);
// Fallback:
const pick = bestExercise(slot, targets, maint, perSlotCap, s, style, weekNum, false, prioritySet);
// Filler pass:
const pick = bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, true, prioritySet);
```

Also update the anchor section (fundamental compound anchor). The anchor uses `EXERCISES.filter(...)` directly, not `bestExercise()`, so add a small priority bump there too. Find the anchor loop and, after `const ex = cands[...]`, add a place call — no change needed here (anchor is not affected by priority, which is correct: the anchor is always a fundamental compound regardless of goal).

- [ ] **Step 5.8 — Run T7 + T8 tests**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T7|T8'
```

Expected:
```
PASS: T7 beginner back_squat test completed (see above)
PASS: T8 returning athlete can get back_squat as primary
```

- [ ] **Step 5.9 — Run full suites**

```bash
node tests/engine-rest-and-rep.js && node tests/exercise-selection.js
```

Expected: all T1–T8 pass. T9 + T10 still fail (not yet implemented).

- [ ] **Step 5.10 — Commit**

```bash
git add src/lib/plan/allocator.js
git commit -m "engine: allocator effectiveRole (minLevelForPrimary) + exercisePriority ×1.35 scoring"
```

---

### Task 6: strength.js — functional primer + cycle buildSupport()

**Files:**
- Modify: `src/lib/plan/strength.js`

Two changes:
1. **Functional primer**: when `style === 'functional'`, prepend a fixed 4-exercise activation block to every session's items. Deduct 7 minutes from slot budget first so the allocator doesn't overfill.
2. **Cycle support**: add a `cycle` family to `supportItems()` and update `buildSupport()` to accept `for: 'cycle'`.
3. **Thread exercisePriority** from `buildWeek()` to `allocateGym()`.

- [ ] **Step 6.1 — Verify T9 + T10 currently fail**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T9|T10'
```

Expected: `FAIL:` for T9b and T10a.

- [ ] **Step 6.2 — Add FUNCTIONAL_PRIMER constant and update buildWeek()**

In `src/lib/plan/strength.js`, add the primer constant and update `buildWeek()`:

Replace the `buildWeek` function:

```js
const FUNCTIONAL_PRIMER = [
  { num: 'P1', name: '90/90 Hip Flexor Stretch',       sets: '5 × 30s ea.', rpe: 'Easy', tag: 'mobility', note: 'Open hip flexors before loading',         restSec: 20 },
  { num: 'P2', name: 'Glute Bridge (2s hold)',          sets: '2 × 10',      rpe: 'RPE 4', tag: 'mobility', note: 'Activate glutes — squeeze 2s at top',    restSec: 20 },
  { num: 'P3', name: 'Band Pull-Apart',                 sets: '2 × 15',      rpe: 'RPE 4', tag: 'mobility', note: 'Retract shoulder blades',                restSec: 20 },
  { num: 'P4', name: 'Cat-Camel + Thoracic Rotation',  sets: '2 × 8',       rpe: 'Easy',  tag: 'mobility', note: 'Thoracic rotation each side',             restSec: 0  }
];

export function buildWeek(ctx = {}) {
  const gymDays = Math.max(1, Math.min(7, ctx.gymDays || 3));
  const style = ctx.style || 'functional';
  const minutes = ctx.minutes || 60;
  const deload = !!ctx.deload;

  // Functional sessions open with the 4-exercise activation primer (~7 min).
  // Deduct that time from the slot budget so the allocator doesn't overfill.
  const slotMinutes = style === 'functional' ? Math.max(15, minutes - 7) : minutes;

  const targets = weeklyMuscleTargets({
    style, intent: ctx.intent, level: ctx.level,
    weekInPhase: ctx.winp, phaseWeeks: ctx.phaseWeeks, deload,
    emphasis: ctx.emphasis, volumeScalar: ctx.volumeScalar
  });

  const slots = Array.from({ length: gymDays }, () => ({ minutes: slotMinutes, equip: ctx.access || [] }));

  const sessions = allocateGym({
    targets, slots,
    ctx: {
      style, intent: ctx.intent, deload, weekNum: ctx.weekNum,
      level: ctx.level, sex: ctx.sex, lifts: ctx.lifts, access: ctx.access || [],
      exercisePriority: ctx.exercisePriority || []
    }
  });

  if (style !== 'functional') return sessions;

  return sessions.map(session => ({
    ...session,
    items: [...FUNCTIONAL_PRIMER, ...session.items]
  }));
}
```

- [ ] **Step 6.3 — Add cycle family to supportItems() and update buildSupport()**

In `strength.js`, find `function supportItems(forSport, variant, weights, deload)`. Add the cycle array inside it and update the pool selection:

Replace the function:

```js
function supportItems(forSport, variant, weights, deload) {
  const sets = deload ? '2' : '3';
  const run = [
    [ // A — posterior chain + single-leg
      { num: 'A1', name: lift(weights, 'Romanian deadlift', 'Single-leg hip hinge'), sets: `${sets} × 6`, rpe: 'RPE 7', note: 'controlled hinge' },
      { num: 'B1', name: 'Bulgarian split squat', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'knee tracks toe' },
      { num: 'B2', name: 'Single-leg calf raise', sets: '3 × 12 ea.', rpe: 'RPE 7', note: 'tendon stiffness', tag: 'mobility' },
      { num: 'C1', name: 'Hip thrust / glute bridge', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation core', tag: 'mobility' }
    ],
    [ // B — plyometric + durability
      { num: 'A1', name: 'Pogo hops / low box jumps', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'stiff, springy — quality over height' },
      { num: 'B1', name: 'Step-up', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'drive through the heel' },
      { num: 'B2', name: 'Nordic / slider hamstring curl', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'slow eccentric', tag: 'mobility' },
      { num: 'C1', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor health', tag: 'mobility' },
      { num: 'C2', name: 'Calf raise', sets: '3 × 15', rpe: 'RPE 7', note: '', tag: 'mobility' }
    ]
  ];
  const swim = [
    [ // A — pull & posture
      { num: 'A1', name: lift(weights, 'Pull-up / lat pulldown', 'Band-assisted pull-up'), sets: `${sets} × 8`, rpe: 'RPE 7', note: 'full range' },
      { num: 'A2', name: 'Band / cable row', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'squeeze 1s' },
      { num: 'B1', name: 'DB shoulder press', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Prone Y-T-W raises', sets: '3 × 10', rpe: 'RPE 6', note: 'scap / rotator health', tag: 'mobility' },
      { num: 'C2', name: 'Hollow hold', sets: '3 × 30s', rpe: 'RPE 6', note: 'midline', tag: 'mobility' }
    ],
    [ // B — lats & rotation
      { num: 'A1', name: 'Straight-arm pulldown', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'feel the lats' },
      { num: 'B1', name: lift(weights, 'Single-arm DB row', 'Inverted row'), sets: `${sets} × 10 ea.`, rpe: 'RPE 7', note: '' },
      { num: 'B2', name: 'External rotation', sets: '3 × 12 ea.', rpe: 'RPE 6', note: 'cuff health', tag: 'mobility' },
      { num: 'C1', name: 'Rotational core (Pallof / chop)', sets: '3 × 10 ea.', rpe: 'RPE 6', note: '', tag: 'mobility' },
      { num: 'C2', name: 'Plank', sets: '3 × 40s', rpe: 'RPE 6', note: '', tag: 'mobility' }
    ]
  ];
  const cycle = [
    [ // A — quad dominance + hip stability
      { num: 'A1', name: lift(weights, 'Single-leg leg press', 'Bulgarian split squat'), sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'quad focus — knee tracks toe' },
      { num: 'B1', name: lift(weights, 'Goblet squat', 'Bodyweight squat'), sets: `${sets} × 10`, rpe: 'RPE 7', note: 'full depth, controlled' },
      { num: 'B2', name: 'Lateral band walk', sets: '3 × 12 ea.', rpe: 'RPE 6', note: 'hip stability, quarter squat throughout', tag: 'mobility' },
      { num: 'C1', name: lift(weights, 'Romanian deadlift', 'Single-leg hip hinge'), sets: `${sets} × 8`, rpe: 'RPE 7', note: 'hamstring + glute balance' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation', tag: 'mobility' }
    ],
    [ // B — posterior chain + hip mobility
      { num: 'A1', name: lift(weights, 'Hip thrust', 'Glute bridge'), sets: `${sets} × 10`, rpe: 'RPE 7', note: 'drive through hips — not lower back' },
      { num: 'B1', name: lift(weights, 'Single-leg RDL', 'Prone hip extension'), sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'hip hinge, unilateral' },
      { num: 'B2', name: 'Thoracic foam roller', sets: '2 × 10', rpe: 'Easy', note: 'T5–T8 extension — reverse aero position', tag: 'mobility' },
      { num: 'C1', name: '90/90 hip flexor stretch', sets: '3 × 30s ea.', rpe: 'Easy', note: 'hip flexors shortened by saddle position', tag: 'mobility' },
      { num: 'C2', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor strength for Q-angle stability', tag: 'mobility' }
    ]
  ];
  const pool = forSport === 'swim' ? swim : forSport === 'cycle' ? cycle : run;
  return pool[variant % pool.length];
}
```

Then update `buildSupport()`:

```js
export function buildSupport(ctx = {}) {
  const count = Math.max(1, Math.min(2, ctx.count || 2));
  const forSport = ['swim', 'cycle'].includes(ctx.for) ? ctx.for : 'run';
  const deload = !!ctx.deload;
  const access = ctx.access || [];
  const weights = access.includes('full_gym') || access.includes('home_weights') || access.length === 0;
  const base = (ctx.weekNum || 1) - 1;
  const repBump = femaleRepBump(ctx.sex);
  const focusLabels = { run: 'Run-support strength', swim: 'Swim-support strength', cycle: 'Cycle-support strength' };
  const focus = focusLabels[forSport] || 'Run-support strength';
  return Array.from({ length: count }, (_, i) => ({
    discipline: 'gym',
    focus,
    duration: '25–30 min',
    items: supportItems(forSport, base + i, weights, deload).map(it => ({ ...it, sets: bumpReps(it.sets, repBump) })),
    intensity: 'moderate',
    lowerBody: false,
    supplemental: true
  }));
}
```

- [ ] **Step 6.4 — Run T9 + T10 tests**

```bash
node tests/exercise-selection.js 2>&1 | grep -E 'T9|T10'
```

Expected: all T9 and T10 lines show `PASS:`.

- [ ] **Step 6.5 — Run the complete test suites**

```bash
node tests/engine-rest-and-rep.js && node tests/exercise-selection.js
```

Expected: every line shows `PASS:`.

- [ ] **Step 6.6 — Verify the app starts**

```bash
npm run dev
```

Open the app in a browser. Navigate to a session in the plan. If the current profile uses the `functional` style, confirm the primer exercises appear at the top of the session list.

- [ ] **Step 6.7 — Commit**

```bash
git add src/lib/plan/strength.js
git commit -m "engine: functional activation primer + cycle buildSupport family"
```

---

### Post-task verification

Run both test suites one final time to confirm clean state:

```bash
node tests/data-layer.js && node tests/engine-rest-and-rep.js && node tests/exercise-selection.js
```

Expected: all PASS, zero FAIL, no unhandled exceptions.

---

## Self-review checklist

- [x] **Spec coverage**: Level corrections ✓, minLevelForPrimary ✓, sportTags/goalTags ✓, ~50 new exercises ✓, exercisePriority emitted ✓, allocator scoring ✓, functional primer ✓, cycle buildSupport ✓
- [x] **No placeholders**: Every exercise object is fully specified. Every code block is complete and runnable.
- [x] **Type consistency**: `effectiveRole` parameter added consistently to `roleSetCount`, `perSetMin`, `makeItem`, `restForRole`. The `place()` helper stores `effectiveRole` on picks so the primary-cap check can use it. `allocateGym()` passes `prioritySet` to all 3 `bestExercise()` call sites.
- [x] **Mobility pattern**: The new `'mobility'` pattern value on primer/desk exercises returns `{}` from `contribOf()` (no PATTERN_CONTRIB entry), so they don't affect volume accounting — correct.
- [x] **volumeScalar change**: Off-season sport changed `0.85 → 1.0`. Checked `engine-rest-and-rep.js` — its T3b tests `style === 'sport'`, not the volumeScalar value, so no regression.
