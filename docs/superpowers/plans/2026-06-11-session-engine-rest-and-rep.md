# Session Engine: Rest Prescriptions, Sport Scheme, 2-Primary Cap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evidence-based rest prescriptions to every exercise item, a dedicated sport rep scheme for run/cycle/swim athletes, and a hard cap of 2 primary compound lifts per session.

**Architecture:** All changes are engine-only — three files, no UI changes. `restSec` is added as a first-class field on items in `makeItem()`. The sport scheme is a new row in the existing `scheme()` table. The 2-primary cap is a `primaryCount` counter per slot in `allocateGym()`. The `restSec` field is ready for the UI to consume later without further engine changes.

**Tech Stack:** Vanilla ES modules (Node 26, `"type": "module"`). No build step needed for tests — `node tests/engine-rest-and-rep.js` runs directly.

---

## Files

| File | Change |
|---|---|
| `tests/engine-rest-and-rep.js` | New — test script covering all three changes |
| `src/lib/strength/targets.js` | Add `sport: 0.6` to `STYLE_TOP` |
| `src/lib/strength/program.js` | Return `style: 'sport'` for sport athletes |
| `src/lib/plan/allocator.js` | Style guard, sport scheme, `restSec`, superset-B 20s, primary cap |

---

## Task 1: Write the test script

**Files:**
- Create: `tests/engine-rest-and-rep.js`

- [ ] **Step 1: Write the test file**

```js
// tests/engine-rest-and-rep.js
import { resolveProgram } from '../src/lib/strength/program.js';
import { weeklyMuscleTargets } from '../src/lib/strength/targets.js';
import { allocateGym } from '../src/lib/plan/allocator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── T1: resolveProgram returns style:'sport' for sport athletes ────────────
const prog = resolveProgram({ goal_type: 'sport', sport: 'run', sport_season: 'off',
  experience: { gym: 'intermediate' } });
assert(prog.style === 'sport', "T1 resolveProgram sport → style:'sport'");

// ── T2: weeklyMuscleTargets handles 'sport' style without crashing ─────────
const targets = weeklyMuscleTargets({
  style: 'sport', weekInPhase: 1, phaseWeeks: 4, level: 'intermediate',
  emphasis: prog.emphasis, volumeScalar: prog.volumeScalar
});
assert(typeof targets === 'object' && targets.quads > 0,
  'T2 weeklyMuscleTargets handles sport style');

// ── T3: sport base scheme uses 3×5 on primaries ───────────────────────────
const sportSessions = allocateGym({
  targets,
  slots: [{ minutes: 60, equip: ['full_gym'] }],
  ctx: { style: 'sport', intent: 'base', deload: false, weekNum: 1,
         level: 'intermediate', access: ['full_gym'] }
});
const sportPrimaries = sportSessions[0].items.filter(it => it.restSec >= 120);
assert(sportPrimaries.length >= 1, 'T3a sport session has at least one primary');
assert(sportPrimaries.some(it => /3\s*[×x]\s*5/.test(it.sets)),
  'T3b sport base primary uses 3×5');

// ── T4: every item has a positive restSec ─────────────────────────────────
const allItems = sportSessions.flatMap(s => s.items);
assert(allItems.length > 0, 'T4a session has items');
assert(allItems.every(it => typeof it.restSec === 'number' && it.restSec > 0),
  'T4b every item has restSec > 0');

// ── T5: primary restSec is 180 (strength/sport) or 120 (functional/bb) ────
const primItems = allItems.filter(it => it.restSec >= 120);
assert(primItems.every(it => it.restSec === 180 || it.restSec === 120),
  'T5 primary restSec is 180 or 120');
assert(sportPrimaries.every(it => it.restSec === 180),
  'T5b sport primaries have restSec 180');

// ── T6: no session has more than 2 primaries (restSec >= 120) ─────────────
const longSessions = allocateGym({
  targets: weeklyMuscleTargets({ style: 'strength', weekInPhase: 2, phaseWeeks: 4,
    level: 'intermediate' }),
  slots: [{ minutes: 90, equip: ['full_gym'] }, { minutes: 90, equip: ['full_gym'] }],
  ctx: { style: 'strength', intent: 'build', deload: false, weekNum: 2,
         level: 'intermediate', access: ['full_gym'] }
});
const maxPrimaries = Math.max(...longSessions.map(s =>
  s.items.filter(it => it.restSec >= 120).length));
assert(maxPrimaries <= 2, `T6 no session has >2 primaries (got ${maxPrimaries})`);

// ── T7: superset B items get restSec 20 ───────────────────────────────────
const paired = allItems.filter(it => it.superset);
const bItems = paired.filter(it => it.num.endsWith('2'));
if (bItems.length > 0) {
  assert(bItems.every(it => it.restSec === 20),
    `T7 superset B items have restSec 20 (checked ${bItems.length} items)`);
} else {
  console.log('SKIP T7: no superset B items in this session');
}

console.log('\nAll tests done.');
```

- [ ] **Step 2: Run it to confirm all tests fail (engine not updated yet)**

```bash
node tests/engine-rest-and-rep.js
```

Expected: Several `FAIL:` lines. `T1` through `T7` should all fail. No crash — the script handles failures gracefully via `process.exitCode`.

---

## Task 2: Add `sport` to `STYLE_TOP` in `targets.js`

**Files:**
- Modify: `src/lib/strength/targets.js:30`

Sport athletes get the same lean volume ramp as `strength` (0.6) — they are not chasing maximum volume, just maintaining neuromuscular quality while their endurance training carries the main load.

- [ ] **Step 1: Edit `targets.js`**

Find line 30:
```js
const STYLE_TOP = { strength: 0.6, functional: 1.0, bodybuilding: 1.4 };
```

Replace with:
```js
const STYLE_TOP = { strength: 0.6, functional: 1.0, bodybuilding: 1.4, sport: 0.6 };
```

- [ ] **Step 2: Run tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected: `T2` now passes (weeklyMuscleTargets no longer falls back to functional for sport style). All others still fail.

---

## Task 3: Return `style: 'sport'` in `program.js`

**Files:**
- Modify: `src/lib/strength/program.js:41-46`

- [ ] **Step 1: Edit `program.js`**

Find the sport branch return (around line 41):
```js
    return {
      goalType: 'sport', style: 'strength',
      emphasis: SPORT_EMPHASIS[sport] || {},
      volumeScalar: season === 'in' ? 0.6 : 0.85,
      power: true, sport, season, level
    };
```

Replace with:
```js
    return {
      goalType: 'sport', style: 'sport',
      emphasis: SPORT_EMPHASIS[sport] || {},
      volumeScalar: season === 'in' ? 0.6 : 0.85,
      power: true, sport, season, level
    };
```

- [ ] **Step 2: Run tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected: `T1` now passes. Others still fail — `allocateGym` doesn't accept `'sport'` as a valid style yet.

---

## Task 4: Update `allocator.js` — style guard and sport scheme

**Files:**
- Modify: `src/lib/plan/allocator.js`

Two changes in this task: (1) add `'sport'` to the style allowlist so it isn't silently replaced with `'functional'`, and (2) add the sport row to the `scheme()` table.

- [ ] **Step 1: Extend the style validation in `allocateGym()`**

Find line 262 (inside `allocateGym`):
```js
  const style = ['strength', 'bodybuilding', 'functional'].includes(ctx.style) ? ctx.style : 'functional';
```

Replace with:
```js
  const style = ['strength', 'bodybuilding', 'functional', 'sport'].includes(ctx.style) ? ctx.style : 'functional';
```

- [ ] **Step 2: Add sport scheme to `scheme()` and update the deload guard**

Find the `scheme()` function (lines 43–63). Replace the entire function with:

```js
function scheme(style, intent, deload) {
  if (deload) {
    if (style === 'sport') return { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 5', accRpe: 'RPE 5' };
    return { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' };
  }
  const table = {
    strength: {
      base:  { main: '4 × 5', acc: '3 × 8', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 4', acc: '3 × 6', mainRpe: 'RPE 8',   accRpe: 'RPE 7→8' },
      peak:  { main: '4 × 3', acc: '3 × 5', mainRpe: 'RPE 8→9', accRpe: 'RPE 8' }
    },
    bodybuilding: {
      base:  { main: '3 × 12', acc: '3 × 12', mainRpe: 'RPE 7',   accRpe: 'RPE 8' },
      build: { main: '4 × 10', acc: '3 × 12', mainRpe: 'RPE 8',   accRpe: 'RPE 8→9' },
      peak:  { main: '4 × 8',  acc: '3 × 10', mainRpe: 'RPE 8→9', accRpe: 'RPE 9' }
    },
    functional: {
      base:  { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 6', acc: '3 × 8',  mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
      peak:  { main: '3 × 5', acc: '3 × 6',  mainRpe: 'RPE 8',   accRpe: 'RPE 8' }
    },
    sport: {
      base:  { main: '3 × 5', acc: '3 × 8', mainRpe: 'RPE 7',   accRpe: 'RPE 6' },
      build: { main: '4 × 4', acc: '3 × 8', mainRpe: 'RPE 8',   accRpe: 'RPE 7' },
      peak:  { main: '4 × 3', acc: '3 × 6', mainRpe: 'RPE 8→9', accRpe: 'RPE 7→8' }
    }
  };
  return (table[style] || table.functional)[intent] || table.functional.base;
}
```

- [ ] **Step 3: Run tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected: `T1`, `T2`, `T3a`, `T3b` now pass. `T4`–`T7` still fail (no `restSec` yet).

---

## Task 5: Add `restSec` to `makeItem()` in `allocator.js`

**Files:**
- Modify: `src/lib/plan/allocator.js`

Every item needs a `restSec` field set at creation time. Primary strength/sport items get 180s (3 min — Schoenfeld). Primary hypertrophy/functional items get 120s (2 min). Accessories get 75s (supersetted, so actual recovery = the other exercise's work time). Fillers (iso, core, calf) get 60s.

- [ ] **Step 1: Add the `restForRole` helper just above `makeItem()`**

Find the line `// Build the rendered item for a chosen exercise…` (around line 99). Insert the helper immediately before it:

```js
// Rest prescription per role and style — surfaced as `restSec` on every item.
// The UI reads this field to show a static label and seed the rest timer.
// Superset B exercises get their value overridden to 20s in structureItems().
function restForRole(ex, style) {
  if (ex.role === 'primary') return (style === 'strength' || style === 'sport') ? 180 : 120;
  if (ex.role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return 60;
  return 75; // accessory compound — supersetted, so actual rest ≈ partner's work time
}
```

- [ ] **Step 2: Add `restSec` to every return in `makeItem()`**

Find the full `makeItem()` function (lines 100–115) and replace it with:

```js
function makeItem(ex, idx, s, style, deload, repBump) {
  const per = ex.unilateral ? ' ea.' : '';
  const num = LETTERS[Math.min(idx, LETTERS.length - 1)] + '1';
  const restSec = restForRole(ex, style);
  if (ex.role === 'primary') {
    return { num, name: ex.name, sets: s.main + per, rpe: s.mainRpe, note: mainNote(deload), restSec };
  }
  if (ex.pattern === 'core') {
    const hold = /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, name: ex.name, sets: hold ? coreStr(deload) : '3 × 12' + per, rpe: 'RPE 6', tag: 'mobility', note: '', restSec };
  }
  if (ex.pattern === 'calf' || ex.role === 'iso') {
    const str = ex.pattern === 'calf' ? '3 × 12' : isoStr(style);
    return { num, name: ex.name, sets: bumpReps(str + per, repBump), rpe: s.accRpe, tag: ex.pattern === 'calf' ? 'mobility' : undefined, note: '', restSec };
  }
  return { num, name: ex.name, sets: bumpReps(s.acc + per, repBump), rpe: s.accRpe, note: '', restSec };
}
```

- [ ] **Step 3: Run tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected: `T4a`, `T4b`, `T5`, `T5b` now pass. `T6` (primary cap) and `T7` (superset B) still fail.

---

## Task 6: Override superset B items to `restSec: 20` in `structureItems()`

**Files:**
- Modify: `src/lib/plan/allocator.js`

The second exercise in a superset pair gets 20s rest because the first exercise's work time acts as its recovery. The override is applied during structuring, after items already carry their default `restSec` from `makeItem()`.

- [ ] **Step 1: Edit the `blk.forEach` inside `structureItems()`**

Find this block near line 181 (inside `structureItems`):

```js
  blocks.forEach((blk, bi) => {
    const g = LET[Math.min(bi, 7)];
    const paired = blk.length > 1;
    blk.forEach((p, pos) => items.push({ ...p.item, num: `${g}${pos + 1}`, group: g, superset: paired }));
  });
```

Replace with:

```js
  blocks.forEach((blk, bi) => {
    const g = LET[Math.min(bi, 7)];
    const paired = blk.length > 1;
    blk.forEach((p, pos) => {
      const restSec = (paired && pos > 0) ? 20 : p.item.restSec;
      items.push({ ...p.item, num: `${g}${pos + 1}`, group: g, superset: paired, restSec });
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected: `T7` now passes (or skipped if no superset pairs appeared — that's fine, the logic is correct). `T6` still fails.

---

## Task 7: Add the 2-primary cap to `allocateGym()`

**Files:**
- Modify: `src/lib/plan/allocator.js`

Three small edits to enforce the cap: add a counter to slot state, increment it in `place()`, and pass a `noPrimary` flag to `bestExercise()` once the cap is hit. The filler pass is unaffected — fillers are never primaries.

- [ ] **Step 1: Add `noPrimary` param to `bestExercise()`**

Find the `bestExercise` function signature (around line 192):

```js
function bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, fillersOnly = false) {
```

Replace with:

```js
function bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, fillersOnly = false, noPrimary = false) {
```

Inside the `for (const ex of EXERCISES)` loop, add a check right after the `fillersOnly` guard:

```js
    if (fillersOnly && !isFiller(ex)) continue;
    if (noPrimary && ex.role === 'primary') continue;   // ← add this line
```

- [ ] **Step 2: Add `primaryCount` to slot state initialisation**

Find the `work` array initialisation (around line 275):

```js
  const work = slots.map((slot, idx) => ({
    idx,
    minutes: slot.minutes || 60,
    equip: availableEquip(slot.equip || ctx.access || []),
    level: LEVELS[ctx.level] ?? 0,
    budget: slotBudget(slot.minutes || 60),
    timeUsed: 0,
    picks: [],
    patternsUsed: new Set(),
    exUsed: new Set(),
    delivered: {},
    muscleVol: {}
  }));
```

Replace with:

```js
  const work = slots.map((slot, idx) => ({
    idx,
    minutes: slot.minutes || 60,
    equip: availableEquip(slot.equip || ctx.access || []),
    level: LEVELS[ctx.level] ?? 0,
    budget: slotBudget(slot.minutes || 60),
    timeUsed: 0,
    picks: [],
    patternsUsed: new Set(),
    exUsed: new Set(),
    delivered: {},
    muscleVol: {},
    primaryCount: 0
  }));
```

- [ ] **Step 3: Increment the counter in `place()`**

Find the `place` arrow function (around line 298):

```js
  const place = (slot, pick) => {
    const { ex, sets, contrib } = pick;
    slot.picks.push({ ex, item: makeItem(ex, slot.picks.length, s, style, deload, repBump) });
```

Replace with:

```js
  const place = (slot, pick) => {
    const { ex, sets, contrib } = pick;
    if (ex.role === 'primary') slot.primaryCount++;
    slot.picks.push({ ex, item: makeItem(ex, slot.picks.length, s, style, deload, repBump) });
```

- [ ] **Step 4: Pass the cap to the greedy fill loop**

Find the greedy fill loop (step 2, around line 327):

```js
    for (const slot of work) {
      if (slot.timeUsed >= slot.budget) continue;
      const pick = bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum);
      if (!pick) continue;
```

Replace with:

```js
    for (const slot of work) {
      if (slot.timeUsed >= slot.budget) continue;
      const noPrimary = slot.primaryCount >= 2;
      const pick = bestExercise(slot, targets, deficit, perSlotCap, s, style, weekNum, false, noPrimary);
      if (!pick) continue;
```

- [ ] **Step 5: Pass the cap to the fallback (empty-slot) loop**

Find the empty-slot fallback loop (around line 340):

```js
    while (go && slot.timeUsed < slot.budget) {
      const pick = bestExercise(slot, targets, maint, perSlotCap, s, style, weekNum);
      if (!pick) { go = false; break; }
```

Replace with:

```js
    while (go && slot.timeUsed < slot.budget) {
      const noPrimary = slot.primaryCount >= 2;
      const pick = bestExercise(slot, targets, maint, perSlotCap, s, style, weekNum, false, noPrimary);
      if (!pick) { go = false; break; }
```

- [ ] **Step 6: Run all tests**

```bash
node tests/engine-rest-and-rep.js
```

Expected output — every test passes (or T7 is skipped if the generated session has no superset pairs):

```
PASS: T1 resolveProgram sport → style:'sport'
PASS: T2 weeklyMuscleTargets handles sport style
PASS: T3a sport session has at least one primary
PASS: T3b sport base primary uses 3×5
PASS: T4a session has items
PASS: T4b every item has restSec > 0
PASS: T5 primary restSec is 180 or 120
PASS: T5b sport primaries have restSec 180
PASS: T6 no session has >2 primaries (got ...)
PASS/SKIP: T7 ...

All tests done.
```

- [ ] **Step 7: Verify dev build**

```bash
npm run dev
```

Expected: Vite starts with no errors in the terminal. Open `http://localhost:5173/hybrid-react/` and navigate to a session — it should render normally (no visual change, since UI is untouched).

- [ ] **Step 8: Commit**

```bash
git add tests/engine-rest-and-rep.js src/lib/strength/targets.js src/lib/strength/program.js src/lib/plan/allocator.js
git commit -m "$(cat <<'EOF'
Engine: rest prescriptions, sport rep scheme, 2-primary cap

- Every exercise item now carries restSec (180s strength/sport primary,
  120s hypertrophy/functional primary, 75s accessory, 60s filler,
  20s superset B) — ready for UI timer integration
- New 'sport' scheme (3×5 base → 4×4 build → 4×3 peak, RPE 7–9) for
  run/cycle/swim athletes; resolveProgram returns style:'sport'
- Hard cap of 2 primary compounds per session (evidence: neural quality
  degrades after 2; Schoenfeld + NSCA canonical session structure)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
