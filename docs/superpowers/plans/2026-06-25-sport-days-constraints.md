# Sport Days as Scheduling Constraints — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a sport-supporting user enter the days they train their sport (e.g. swim Tue/Thu); the gym plan then prefers non-sport days, arranges heavy gym work away from sport days, lightens any gym session forced onto a sport day, and shows sport days on the calendar.

**Architecture:** A new pure `constraints.js` in the engine derives `{ busyDays, sportMuscles }` from the profile, suggests gym days around sport days, and lightens a session's working sets. The scheduler gains busy-day awareness (arrange away from sport days; lighten on them). The generator avoids sport days when choosing gym days and feeds constraints to the scheduler. The current-week reflow lightens reshaped sessions that land on a sport day. Onboarding captures `sport_days` and pre-fills the gym-day picker. The calendar shows sport days as non-clickable markers.

**Tech Stack:** Pure ES modules in `packages/engine` (Node test scripts via `node tests/*.js`), React 18 onboarding/calendar UI (verified via the dev server).

## Global Constraints

- **Gym-only stays gym-only:** sport days are *constraints*, never generated sport workouts.
- **Freeze-on-start is sacred:** nothing here may recompute on Start. The reflow adapts only PENDING sessions (on app open/refresh). See `apps/mobile/tests/reflow-start-consistency.js`.
- **Engine purity:** `generatePlan(profile)` stays a pure function of the profile — same profile → same plan → stable `p{phase}_wk{week}_s{idx}` keys.
- **Real theme variables only** in any UI (`--disc-swim`, `--accent`, etc.); reuse existing primitives (`Chip`, `OptionGrid`).
- **Weekday keys** are `mon..sun`; **weekday indices** are `0..6` (Mon=0), matching `KEY_IDX`/`DAY_ORDER` already used across the engine.
- **No regressions:** a non-sport (build) goal, or a sport goal with no `sport_days`, must produce the exact same plan as today. Full suite (`node tests/*.js` in `apps/mobile`) green at the end of every task.

---

### Task 1: `constraints.js` — `deriveConstraints(profile)` + weekday helpers

**Files:**
- Create: `packages/engine/src/lib/plan/constraints.js`
- Test: `apps/mobile/tests/sport-constraints.js` (create)

**Interfaces:**
- Produces: `weekdayIndex(key: string): number|undefined` — `'mon'→0 … 'sun'→6`.
- Produces: `deriveConstraints(profile): { busyDays: number[], sportMuscles: string[] }` — `busyDays` = sorted unique weekday indices from `profile.sport_days`; `sportMuscles` = the sport module's `keyMuscles` (e.g. swim → `['back','shoulders','core']`), or `[]`.
- Consumes (existing): `get(id)` from `../sports/index.js`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/sport-constraints.js`:

```js
// tests/sport-constraints.js — sport-day scheduling constraints (pure engine logic).
import { weekdayIndex, deriveConstraints } from '@performance-os/engine/lib/plan/constraints.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

assert(weekdayIndex('mon') === 0 && weekdayIndex('sun') === 6, 'C1 weekdayIndex maps mon→0, sun→6');
assert(weekdayIndex('xxx') === undefined, 'C2 unknown weekday → undefined');

const swim = deriveConstraints({ sport: 'swim', sport_days: ['tue', 'thu'] });
assert(eq(swim.busyDays, [1, 3]), 'C3 sport_days → sorted weekday indices');
assert(eq(swim.sportMuscles, ['back', 'shoulders', 'core']), 'C4 sportMuscles from the swim module keyMuscles');

const dupes = deriveConstraints({ sport: 'swim', sport_days: ['thu', 'tue', 'thu', 'bogus'] });
assert(eq(dupes.busyDays, [1, 3]), 'C5 de-duped, sorted, junk dropped');

const none = deriveConstraints({ sport: 'swim' });
assert(eq(none.busyDays, []) && eq(none.sportMuscles, ['back', 'shoulders', 'core']), 'C6 no sport_days → empty busyDays');

const build = deriveConstraints({ goal_type: 'build' });
assert(eq(build.busyDays, []) && eq(build.sportMuscles, []), 'C7 non-sport goal → empty constraints');

const unknownSport = deriveConstraints({ sport: 'curling', sport_days: ['mon'] });
assert(eq(unknownSport.busyDays, [0]) && eq(unknownSport.sportMuscles, []), 'C8 unknown sport → busyDays kept, no muscles');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: FAIL — `Cannot find module '.../plan/constraints.js'`.

- [ ] **Step 3: Create `constraints.js` with the helpers**

Create `packages/engine/src/lib/plan/constraints.js`:

```js
/**
 * constraints.js — sport-day scheduling constraints for the gym plan.
 *
 * A sport-supporting athlete trains their sport on fixed days (e.g. swim Tue/Thu).
 * These are pure helpers the generator + scheduler + reflow use to (1) suggest gym
 * days around the sport days, (2) arrange heavy gym work away from sport days and
 * lighten any session forced onto one. This is the individual-level version of the
 * Team package's "coach schedule as constraints" (docs/product/TEAM-ARCHITECTURE.md)
 * — same shape, different source. Gym-only: sport days are constraints, not sessions.
 */
import { get as getSportModule } from '../sports/index.js';

export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KEY_IDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

export function weekdayIndex(key) { return KEY_IDX[key]; }

// profile → { busyDays:number[] (sorted weekday indices), sportMuscles:string[] }.
// Non-sport goals and missing sport_days yield empty arrays (callers no-op).
export function deriveConstraints(profile = {}) {
  const busyDays = [...new Set(
    (profile.sport_days || []).map(k => KEY_IDX[k]).filter(i => i != null)
  )].sort((a, b) => a - b);
  const mod = profile.sport ? getSportModule(profile.sport) : null;
  const sportMuscles = (mod && Array.isArray(mod.keyMuscles)) ? mod.keyMuscles.slice() : [];
  return { busyDays, sportMuscles };
}

export default { DAY_ORDER, weekdayIndex, deriveConstraints };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: PASS for C1–C8.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/constraints.js apps/mobile/tests/sport-constraints.js
git commit -m "feat(engine): sport-day constraints — deriveConstraints + weekday helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `constraints.js` — `suggestGymDays`

**Files:**
- Modify: `packages/engine/src/lib/plan/constraints.js`
- Test: `apps/mobile/tests/sport-constraints.js` (extend)

**Interfaces:**
- Produces: `suggestGymDays({ sportDays: string[], gymDays: number }): string[]` — `gymDays` weekday KEYS, preferring days that aren't sport days, spread across the week; only falls onto sport days when there aren't enough free days. Sorted in week order.

- [ ] **Step 1: Add failing tests**

Append to `apps/mobile/tests/sport-constraints.js`:

```js
import { suggestGymDays } from '@performance-os/engine/lib/plan/constraints.js';

// Simon: swim Tue/Thu, wants 4 gym days → all 4 avoid Tue/Thu, spread out.
const s = suggestGymDays({ sportDays: ['tue', 'thu'], gymDays: 4 });
assert(s.length === 4, 'C9 suggests exactly gymDays days');
assert(!s.includes('tue') && !s.includes('thu'), 'C10 avoids sport days when there is room');
assert(eq(s, [...s].sort((a, b) => ['mon','tue','wed','thu','fri','sat','sun'].indexOf(a) - ['mon','tue','wed','thu','fri','sat','sun'].indexOf(b))), 'C11 returned in week order');

// Packed week: 6 gym days + swim Tue/Thu (only 5 free) → must reuse 1 sport day.
const packed = suggestGymDays({ sportDays: ['tue', 'thu'], gymDays: 6 });
assert(packed.length === 6, 'C12 packed week still returns gymDays days');
const overlap = packed.filter(d => d === 'tue' || d === 'thu');
assert(overlap.length === 1, 'C13 packed week reuses the minimum number of sport days');

// No sport days → just a spread of gymDays.
const noSport = suggestGymDays({ sportDays: [], gymDays: 3 });
assert(noSport.length === 3, 'C14 no sport days → spread of gymDays');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: FAIL — `suggestGymDays is not a function`.

- [ ] **Step 3: Implement `suggestGymDays`**

In `packages/engine/src/lib/plan/constraints.js`, add before the default export:

```js
// Pick k items from arr (preserving order), spread as evenly as possible.
function spreadPick(arr, k) {
  if (k <= 0) return [];
  if (k >= arr.length) return arr.slice();
  const out = [];
  const denom = k - 1 || 1;
  for (let i = 0; i < k; i++) out.push(arr[Math.round(i * (arr.length - 1) / denom)]);
  return [...new Set(out)];
}

// Suggest `gymDays` weekday keys around the sport days: prefer non-sport days
// (spread for recovery); only land on sport days when the week is too packed to
// avoid it. Returned in week order. The onboarding UI pre-fills the gym-day picker
// with this; the user can override.
export function suggestGymDays({ sportDays = [], gymDays = 3 } = {}) {
  const n = Math.max(1, Math.min(7, gymDays || 3));
  const sport = new Set((sportDays || []).filter(d => DAY_ORDER.includes(d)));
  const free = DAY_ORDER.filter(d => !sport.has(d));
  if (free.length >= n) return spreadPick(free, n);
  // Packed: take every free day + the fewest sport days needed, spread.
  const onSport = spreadPick(DAY_ORDER.filter(d => sport.has(d)), n - free.length);
  return [...free, ...onSport].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}
```

Update the default export line to include it:

```js
export default { DAY_ORDER, weekdayIndex, deriveConstraints, suggestGymDays };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: PASS for C1–C14.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/constraints.js apps/mobile/tests/sport-constraints.js
git commit -m "feat(engine): suggestGymDays — propose gym days around sport days

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `constraints.js` — `lightenItems`

**Files:**
- Modify: `packages/engine/src/lib/plan/constraints.js`
- Test: `apps/mobile/tests/sport-constraints.js` (extend)

**Interfaces:**
- Produces: `lightenItems(items: Array): Array` — returns a new items array with each working-set item's leading set count reduced by one (min 1); mobility/time-based rows untouched. Used to "lighten if forced" a gym session sharing a sport day.

- [ ] **Step 1: Add failing tests**

Append to `apps/mobile/tests/sport-constraints.js`:

```js
import { lightenItems } from '@performance-os/engine/lib/plan/constraints.js';

const items = [
  { name: 'Bench press', sets: '3 × 8', rpe: 'RPE 7' },
  { name: 'Glute Bridge', sets: '2 × 10', tag: 'mobility' },   // primer — untouched
  { name: 'Plank', sets: '3 × 30s' },                           // time-based reps, still 3 sets
  { name: 'Warm-up', sets: '5 min' },                           // no set count — untouched
  { name: 'Curl', sets: '1 × 12' }                              // already 1 set — floor
];
const lit = lightenItems(items);
assert(lit[0].sets === '2 × 8', 'C15 working sets reduced by one (3→2)');
assert(lit[1].sets === '2 × 10', 'C16 mobility/primer rows untouched');
assert(lit[2].sets === '2 × 30s', 'C17 time-rep set count still reduced (3→2)');
assert(lit[3].sets === '5 min', 'C18 non-set rows untouched');
assert(lit[4].sets === '1 × 12', 'C19 single-set items are floored, not zeroed');
assert(items[0].sets === '3 × 8', 'C20 input is not mutated');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: FAIL — `lightenItems is not a function`.

- [ ] **Step 3: Implement `lightenItems`**

In `packages/engine/src/lib/plan/constraints.js`, add before the default export:

```js
// Lighten a session's working volume by dropping one set from each working-set item
// (min 1). Mobility/primer rows (tag 'mobility') and non-set rows ("5 min") are left
// alone. Pure — returns a new array. Used when a gym session is forced onto a sport
// day: recovery beats volume on a clash day.
export function lightenItems(items = []) {
  return items.map(it => {
    if (it.tag === 'mobility') return it;
    const m = /^(\d+)(\s*[×x].*)$/.exec(it.sets || '');
    if (!m) return it;
    const n = Number(m[1]);
    if (n <= 1) return it;
    return { ...it, sets: `${n - 1}${m[2]}` };
  });
}
```

Update the default export line:

```js
export default { DAY_ORDER, weekdayIndex, deriveConstraints, suggestGymDays, lightenItems };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-constraints.js`
Expected: PASS for C1–C20.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/constraints.js apps/mobile/tests/sport-constraints.js
git commit -m "feat(engine): lightenItems — drop one working set per item

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Scheduler — arrange heavy gym work away from sport days

**Files:**
- Modify: `packages/engine/src/lib/plan/scheduler.js`
- Test: `apps/mobile/tests/sport-schedule.js` (create)

**Interfaces:**
- Consumes: `deriveConstraints` output shape (`busyDays`, `sportMuscles`).
- Produces (extends existing): `scheduleWeek({ sportSpecs, supSpecs, dayNames, allowDoubles, longRunDay, busyDays = [], sportMuscles = [] })` — same return shape `[{ title, duration, items }]`. When `busyDays` is non-empty, sessions that heavily load `sportMuscles` are placed on gym days furthest from the sport days.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/sport-schedule.js`:

```js
// tests/sport-schedule.js — scheduler keeps sport-muscle-heavy gym work off the
// days adjacent to sport days.
import { scheduleWeek } from '@performance-os/engine/lib/plan/scheduler.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const dayOf = (title) => (title || '').split(' · ')[0];

// Two gym sessions, Mon + Wed. Sport day Tue (index 1). One session is upper-heavy
// (loads back/shoulders — the swim muscles); the other is lower-heavy. The upper
// session should NOT land on Mon or Wed adjacent... both are adjacent to Tue, so use
// Mon + Thu instead: Mon(0) is adjacent to Tue(1); Thu(3) is not. Upper → Thu.
const upper = { discipline: 'gym', focus: 'Upper', duration: '~45 min', intensity: 'hard', lowerBody: false,
  muscleVol: { back: 10, shoulders: 8, biceps: 4 }, items: [] };
const lower = { discipline: 'gym', focus: 'Lower', duration: '~45 min', intensity: 'hard', lowerBody: true,
  muscleVol: { quads: 10, glutes: 8, hamstrings: 6 }, items: [] };

const out = scheduleWeek({
  sportSpecs: [upper, lower], dayNames: ['Monday', 'Thursday'],
  busyDays: [1], sportMuscles: ['back', 'shoulders', 'core']
});
const upperDay = dayOf(out.find(s => /Upper/.test(s.title)).title);
assert(upperDay === 'Thursday', `SC1 upper (swim-muscle) session avoids the day next to the sport day (got ${upperDay})`);

// Control: with no busyDays the placement is unconstrained (still returns both).
const ctrl = scheduleWeek({ sportSpecs: [upper, lower], dayNames: ['Monday', 'Thursday'] });
assert(ctrl.length === 2, 'SC2 no constraints → both sessions still scheduled');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-schedule.js`
Expected: FAIL on SC1 — without the busy-day term the assignment is arbitrary (upper may land on Monday).

- [ ] **Step 3: Add the busy-day proximity penalty**

In `packages/engine/src/lib/plan/scheduler.js`, add this helper after `sharedHeavyCount` (around line 49):

```js
// Circular distance (0–3) between two weekday indices.
function dayDistance(a, b) { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); }

// How hard a session loads the sport's key muscles — its risk of pre-fatiguing the
// sport. Sum of the session's volume on those muscles.
function sportMuscleLoad(spec, sportMuscles) {
  const mv = spec.muscleVol;
  if (!mv || !sportMuscles || !sportMuscles.length) return 0;
  let v = 0;
  for (const m of sportMuscles) v += mv[m] || 0;
  return v;
}
```

Then in `score(placed, ctx)`, inside the `for` loop over `placed`, after the long-run penalty block (after line 59 `if (ctx.lrIdx != null ...) pen += 12;`), add:

```js
    // Keep gym work that taxes the sport's muscles AWAY from sport days. Each gym
    // session on a day next to (or on) a sport day pays a penalty scaled by how much
    // it loads those muscles — so the permutation pushes the heaviest sport-muscle
    // session onto the day furthest from the athlete's sport.
    if (ctx.busyDays && ctx.busyDays.length) {
      let nearest = 99;
      for (const b of ctx.busyDays) nearest = Math.min(nearest, dayDistance(cur.idx, b));
      const proximity = nearest === 0 ? 3 : nearest === 1 ? 2 : 0;
      if (proximity) {
        pen += proximity * sportMuscleLoad(cur.spec, ctx.sportMuscles);
        if (proximity && isHard(cur.spec)) pen += proximity; // small nudge for any hard day
      }
    }
```

Update `placeSport` to forward the new ctx fields. Change its signature and the `score` call:

```js
function placeSport(sportSpecs, dayNames, lrIdx, busyDays = [], sportMuscles = []) {
```
and inside its loop change `const pen = score(placed, { lrIdx });` to:
```js
    const pen = score(placed, { lrIdx, busyDays, sportMuscles });
```

Update `scheduleWeek`'s signature and its `placeSport` call:

```js
export function scheduleWeek({ sportSpecs = [], supSpecs = [], dayNames = [], allowDoubles = true, longRunDay = null, busyDays = [], sportMuscles = [] }) {
  const lrIdx = longRunDay != null ? KEY_IDX[longRunDay] : null;
  const placedSport = placeSport(sportSpecs, dayNames, lrIdx, busyDays, sportMuscles);
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-schedule.js`
Expected: PASS SC1, SC2.

- [ ] **Step 5: Run the existing scheduler tests (no regressions)**

Run: `cd apps/mobile && node tests/scheduler-recovery.js && node tests/sport-anchor.js && node tests/sport-split.js && node tests/session-titles.js`
Expected: all PASS (the new term is inert when `busyDays` is empty, which is the default everywhere except the sport-days path).

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/plan/scheduler.js apps/mobile/tests/sport-schedule.js
git commit -m "feat(engine): scheduler keeps sport-muscle work off days near sport days

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Scheduler — lighten gym sessions forced onto a sport day

**Files:**
- Modify: `packages/engine/src/lib/plan/scheduler.js`
- Test: `apps/mobile/tests/sport-schedule.js` (extend)

**Interfaces:**
- Consumes: `lightenItems` from `./constraints.js`.
- Produces: when a placed gym session's weekday index ∈ `busyDays`, its `items` are lightened and the returned session carries `lightened: true`.

- [ ] **Step 1: Add a failing test**

Append to `apps/mobile/tests/sport-schedule.js`:

```js
// A single gym day that is ALSO a sport day (packed week, forced overlap) → the
// session that lands on the sport day is lightened.
const heavy = { discipline: 'gym', focus: 'Full body', duration: '~45 min', intensity: 'hard', lowerBody: false,
  muscleVol: { back: 6 }, items: [{ name: 'Bench press', sets: '3 × 8' }, { name: 'Row', sets: '4 × 10' }] };
const forced = scheduleWeek({ sportSpecs: [heavy], dayNames: ['Tuesday'], busyDays: [1], sportMuscles: ['back'] });
assert(forced[0].lightened === true, 'SC3 session on a sport day is flagged lightened');
assert(forced[0].items[0].sets === '2 × 8' && forced[0].items[1].sets === '3 × 10', 'SC4 working sets dropped by one on the forced day');

// A session NOT on a sport day is untouched.
const offday = scheduleWeek({ sportSpecs: [heavy], dayNames: ['Wednesday'], busyDays: [1], sportMuscles: ['back'] });
assert(!offday[0].lightened && offday[0].items[0].sets === '3 × 8', 'SC5 off-sport-day session is not lightened');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-schedule.js`
Expected: FAIL on SC3/SC4 — sessions aren't lightened yet.

- [ ] **Step 3: Lighten on busy days in `scheduleWeek`**

In `packages/engine/src/lib/plan/scheduler.js`, add the import at the top (after line 24's `const KEY_IDX`):

```js
import { lightenItems } from './constraints.js';
```

Change the final return mapping in `scheduleWeek` (the `return all.map(...)` line) to:

```js
  const busy = new Set(busyDays);
  return all.map(x => {
    const onSportDay = x.spec.discipline === 'gym' && busy.has(x.idx);
    const items = onSportDay ? lightenItems(x.spec.items) : x.spec.items;
    return {
      title: `${IDX_DAY[x.idx]} · ${x.spec.focus}`,
      duration: x.spec.duration,
      items,
      ...(onSportDay ? { lightened: true } : {})
    };
  });
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-schedule.js`
Expected: PASS SC1–SC5.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/scheduler.js apps/mobile/tests/sport-schedule.js
git commit -m "feat(engine): lighten gym sessions forced onto a sport day

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Generator — choose gym days around sport days + feed constraints to the scheduler

**Files:**
- Modify: `packages/engine/src/lib/PlanGenerator.js`
- Test: `apps/mobile/tests/sport-generate.js` (create)

**Interfaces:**
- Consumes: `deriveConstraints`, `suggestGymDays` from `./plan/constraints.js`.
- Produces: `generatePlan(profile)` with `profile.sport_days` now (a) keeps gym off sport days when there's room, and (b) lightens any week-1 session that still lands on a sport day.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/sport-generate.js`:

```js
// tests/sport-generate.js — sport_days shape the generated gym week.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const dayOf = (title) => (title || '').split(' · ')[0];

const profile = {
  goal_type: 'sport', sport: 'swim', sport_season: 'off',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: [] }, // no explicit gym days
  sport_days: ['tue', 'thu'],
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight']
};
const plan = generatePlan(profile);
const wk1 = plan.phases[0].weeks[0];
const gymDays = wk1.sessions.map(s => dayOf(s.title));
assert(!gymDays.includes('Tuesday') && !gymDays.includes('Thursday'),
  `G1 gym days avoid sport days when there is room (got ${gymDays.join(',')})`);
assert(wk1.sessions.length === 4, 'G2 still four gym sessions');

// Regression: a non-sport plan is unchanged by the new code path.
const build = generatePlan({
  goal_type: 'build', strength_style: 'strength', experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, session_minutes: 60, days: ['mon', 'wed', 'fri'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']
});
const bDays = build.phases[0].weeks[0].sessions.map(s => dayOf(s.title));
assert(JSON.stringify(bDays) === JSON.stringify(['Monday', 'Wednesday', 'Friday']),
  'G3 non-sport plan keeps the user-picked gym days exactly');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-generate.js`
Expected: FAIL on G1 — `chooseDays` ignores sport days, so the default 4-day spread (`mon,tue,thu,sat`) lands on Tue/Thu.

- [ ] **Step 3: Make `chooseDays` sport-day aware + pass constraints to the scheduler**

In `packages/engine/src/lib/PlanGenerator.js`, add the import (after line 28's `resolvePeriodization` import):

```js
import { deriveConstraints, suggestGymDays } from './plan/constraints.js';
```

Replace `chooseDays` (lines 41–50) with:

```js
// Choose the weekday slots for `n` sessions, honouring the user's preferred days and
// keeping gym off the athlete's sport days when there's room (suggestGymDays). If the
// user explicitly picked gym days we respect them; otherwise we suggest around sport.
function chooseDays(availability, n, sportDays = []) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (days.length >= n) days = days.slice(0, n);
  else if (days.length === 0 && sportDays.length) {
    days = suggestGymDays({ sportDays, gymDays: n });   // no explicit picks → suggest around sport
  } else {
    // Fill from rest-spaced defaults, preferring non-sport days first.
    const sport = new Set(sportDays);
    const def = (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n)).filter(d => !sport.has(d));
    const defSport = (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n)).filter(d => sport.has(d));
    days = [...new Set([...days, ...def, ...defSport])]
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).slice(0, n);
  }
  return days.map(d => DAY_NAMES[d]);
}
```

In `generatePlan`, compute constraints once (after line 94 `const program = resolveProgram(profile);`):

```js
  const { busyDays, sportMuscles } = deriveConstraints(profile);
```

Change the per-week scheduling (lines 131–132) from:

```js
      const dayNames = chooseDays(availability, sportSpecs.length);
      const sessions = scheduleWeek({ sportSpecs, dayNames });
```
to:
```js
      const dayNames = chooseDays(availability, sportSpecs.length, profile.sport_days || []);
      const sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles });
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-generate.js`
Expected: PASS G1–G3.

- [ ] **Step 5: Run the full engine suite (no regressions)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f" 2>&1 | grep '^FAIL:'; done || true; echo done`
Expected: no `FAIL:` lines. Pay attention to `golden-master.js`, `sport-split.js`, `sport-anchor.js`, `duration.js` — a non-sport profile (no `sport_days`) must be byte-identical, since `deriveConstraints` returns empty arrays and `chooseDays` keeps its old branch.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/PlanGenerator.js apps/mobile/tests/sport-generate.js
git commit -m "feat(engine): generate gym days around sport days + lighten clashes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Onboarding model — capture `sport_days`

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js`
- Test: `apps/mobile/tests/sport-onboarding.js` (create)

**Interfaces:**
- Produces: `BLANK_ANSWERS.sportDays` (default `[]`); `answersToProfilePatch(a).sport_days` = `a.sportDays` for sport goals, `null` for build goals.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/sport-onboarding.js`:

```js
// tests/sport-onboarding.js — sport_days captured from onboarding answers.
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

assert(eq(BLANK_ANSWERS.sportDays, []), 'O1 BLANK_ANSWERS.sportDays defaults to []');

const sport = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', sportDays: ['tue', 'thu'], daysPerWeek: 4 });
assert(eq(sport.sport_days, ['tue', 'thu']), 'O2 sport goal carries sport_days');

const build = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', sportDays: ['tue'], daysPerWeek: 3 });
assert(build.sport_days === null, 'O3 build goal clears sport_days');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-onboarding.js`
Expected: FAIL on O1 — `sportDays` not in `BLANK_ANSWERS`.

- [ ] **Step 3: Add the field + patch mapping**

In `apps/mobile/src/lib/onboardingModel.js`, in `BLANK_ANSWERS`, add after the `runDiscipline` line (line 50):

```js
  sportDays: [],                // sport goals: weekday keys the athlete trains their sport
```

In `answersToProfilePatch`, in the returned object, add after the `run_discipline:` line (line 133):

```js
    sport_days: isSport ? (a.sportDays || []) : null,
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-onboarding.js`
Expected: PASS O1–O3.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/sport-onboarding.js
git commit -m "feat(onboarding): capture sport_days for sport goals

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Onboarding UI — sport-days picker + auto-suggest gym days

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx`

**Interfaces:**
- Consumes: `suggestGymDays` from `@performance-os/engine/lib/plan/constraints.js`; existing `DAYS`, `Chip`, `OptionGrid`, `set`, `toggle`, `isSport`, `a`.

There is no JSX test harness; verify via the dev server. The `sport_days` mapping is already covered by Task 7.

- [ ] **Step 1: Import `suggestGymDays`**

In `apps/mobile/src/components/OnboardingWizard.jsx`, add after line 13 (`import { epley1RM, ... }`):

```js
import { suggestGymDays } from '@performance-os/engine/lib/plan/constraints.js';
```

- [ ] **Step 2: Add the sport-days step (sport goals only)**

In the `steps` array, insert this object immediately AFTER the sport step (the `isSport && { title: 'Which sport — and where are you?' ... }` object, after its closing `},` near line 273) and before the `'Your lifting experience'` step:

```jsx
    isSport && { title: 'When do you train your sport?', subtitle: 'We’ll build your gym days around these so they don’t clash.',
      valid: () => true,
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Sport days (optional)</label>
            <OptionGrid cols={4}>
              {DAYS.map(d => (
                <Chip key={d.key} center selected={a.sportDays.includes(d.key)}
                  onClick={() => toggle(d.key, 'sportDays')} label={d.label} />
              ))}
            </OptionGrid>
          </div>
          <div style={HINT}>
            Tell us the days you swim/run/ride and we’ll keep heavy gym work off them — and lighten anything that has to share a day.
          </div>
        </div>
      ) },
```

- [ ] **Step 3: Auto-suggest gym days from sport days**

So the gym-day picker (in the "How much can you train?" step) pre-fills around the sport days the moment they're chosen, change the sport-days `Chip`'s `onClick` in the step you just added to also suggest gym days when the user hasn't picked any:

```jsx
                <Chip key={d.key} center selected={a.sportDays.includes(d.key)}
                  onClick={() => {
                    const sportDays = a.sportDays.includes(d.key)
                      ? a.sportDays.filter(k => k !== d.key)
                      : [...a.sportDays, d.key];
                    const patch = { sportDays };
                    // Only auto-fill gym days the user hasn't customised yet.
                    if ((a.days || []).length === 0 && a.daysPerWeek) {
                      patch.days = suggestGymDays({ sportDays, gymDays: a.daysPerWeek });
                    }
                    set(patch);
                  }} label={d.label} />
```

(Replace the simpler `onClick={() => toggle(d.key, 'sportDays')}` from Step 2 with this.)

- [ ] **Step 4: Add a summary row**

In the `'Ready to go'` step's `render`, after the `Equipment` SummaryRow (line 388), add:

```jsx
            {isSport && a.sportDays.length > 0 && (
              <SummaryRow label="Sport days" value={a.sportDays.map(k => DAYS.find(d => d.key === k)?.label).join(' · ')} />
            )}
```

- [ ] **Step 5: Verify in the dev server**

Run: `npm run dev` (from repo root). In the `/dev` tester:
1. Click the **Swimmer support · off** preset (sets a sport goal).
2. Confirm a **"When do you train your sport?"** step appears after the sport step.
3. Tap Tue + Thu; confirm the **"How much can you train?"** step's gym-day picker now shows days that avoid Tue/Thu (when no gym days were pre-picked).
4. The **Ready to go** summary shows a **Sport days** row.
5. Confirm a **build** preset (e.g. Strength (4d)) shows NO sport-days step.

- [ ] **Step 6: Run the full suite (no regressions)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f" 2>&1 | grep '^FAIL:'; done || true; echo done`
Expected: no `FAIL:` lines.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/OnboardingWizard.jsx
git commit -m "feat(onboarding): sport-days picker + auto-suggest gym days

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: PlanService — regenerate on change, lighten reflowed sport-day sessions, calendar markers

**Files:**
- Modify: `apps/mobile/src/lib/PlanService.js`
- Test: `apps/mobile/tests/sport-planservice.js` (create)

**Interfaces:**
- Consumes: `deriveConstraints`, `weekdayIndex`, `lightenItems` from `@performance-os/engine/lib/plan/constraints.js`.
- Produces: `profileSignature` includes `sport_days` (changing it regenerates); the reflow lightens a reshaped current-week session whose weekday ∈ `busyDays`; `buildCalendar(...).byDate[iso]` includes non-clickable sport markers (`{ sportMarker: true, discipline, title }`) on sport weekdays within the plan range.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/sport-planservice.js`:

```js
// tests/sport-planservice.js — sport_days regenerate the plan + show as calendar markers.
process.env.TZ = 'Europe/London';
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }, clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('PASS:', msg); }

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const todayISO = localDay(new Date());

Database.services.updateProfile({
  plan_start_date: todayISO, plan_weeks: 12,
  goal_type: 'sport', sport: 'swim', sport_season: 'off', focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: [] },
  sport_days: ['tue', 'thu'],
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  onboarded: true
});
Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });

// Calendar markers: Tue/Thu within the plan show a swim marker.
const cal = Plan.buildCalendar({});
const markers = Object.values(cal.byDate).flat().filter(e => e.sportMarker);
assert(markers.length > 0, 'P1 calendar has sport markers');
assert(markers.every(m => m.discipline === 'swim'), 'P2 markers carry the sport discipline');
const someTue = Object.entries(cal.byDate).find(([iso]) => new Date(iso + 'T00:00:00').getDay() === 2);
assert(someTue && someTue[1].some(e => e.sportMarker), 'P3 a Tuesday in range carries a marker');

// Signature: changing sport_days produces a different plan signature (regenerates).
const before = JSON.stringify(Plan.getPhases().map(p => p.weeks[0].sessions.map(s => s.title)));
Database.services.updateProfile({ sport_days: ['mon', 'fri'] });
Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });
const after = JSON.stringify(Plan.getPhases().map(p => p.weeks[0].sessions.map(s => s.title)));
assert(before !== after, 'P4 changing sport_days regenerates the plan');
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && node tests/sport-planservice.js`
Expected: FAIL on P1 — no markers yet (and likely P4, since `profileSignature` ignores `sport_days`).

- [ ] **Step 3: Import the constraint helpers**

In `apps/mobile/src/lib/PlanService.js`, add after line 30 (`import { combinedMultiplier, ... }`):

```js
import { deriveConstraints, weekdayIndex, lightenItems } from '@performance-os/engine/lib/plan/constraints.js';
```

- [ ] **Step 4: Add `sport_days` to the plan signature**

In `profileSignature`, add `spd: profile.sport_days` to the returned object (after the `sps: profile.sport_season` line ~371):

```js
    sps: profile.sport_season, spd: profile.sport_days
```

- [ ] **Step 5: Lighten reflowed sessions that fall on a sport day**

In `adaptedPhases`, after `const gctx = gymCtx(profile);` (~line 252), add:

```js
  const { busyDays: sportBusy } = deriveConstraints(profile);
```

Then in the spec-build loop (the `slots.forEach((s, idx) => { ... })` that fills `specByKey`, ~lines 283–295), change the assignment so a spec landing on a sport day is lightened. Replace:

```js
    if (spec) specByKey[s.key] = applyFunctionalPrimer([spec], gctx.style, gctx.minutes, gctx.access)[0];
```
with:
```js
    if (spec) {
      let built = applyFunctionalPrimer([spec], gctx.style, gctx.minutes, gctx.access)[0];
      const wd = s.date ? s.date.getDay() === 0 ? 6 : s.date.getDay() - 1 : null; // JS Sun=0 → Mon=0 index
      if (wd != null && sportBusy.includes(wd)) built = { ...built, items: lightenItems(built.items), lightened: true };
      specByKey[s.key] = built;
    }
```

(`s.date` is the slot's scheduled `Date` from `horizonSlots`; convert JS `getDay()` Sun=0 to the Mon=0 index the constraints use.)

- [ ] **Step 6: Add sport markers to `buildCalendar`**

In `buildCalendar`, after the existing session loop fills `byDate` and before the `return` (~line 567), add sport-day markers across the plan range:

```js
  // Sport-day markers — non-clickable badges so the week reads correctly (gym-only
  // app: these mark the athlete's own sport sessions, not generated workouts).
  const profile = Database.services.getProfile() || {};
  const { busyDays: sportBusy } = deriveConstraints(profile);
  if (sportBusy.length && min) {
    const sportDisc = profile.sport === 'run' ? 'run' : profile.sport === 'cycle' ? 'cycle' : profile.sport === 'swim' ? 'swim' : 'general';
    const label = profile.sport === 'run' ? 'Run' : profile.sport === 'cycle' ? 'Ride' : profile.sport === 'swim' ? 'Swim' : 'Sport';
    for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay() === 0 ? 6 : d.getDay() - 1;     // Mon=0 index
      if (!sportBusy.includes(wd)) continue;
      const iso = localISO(d);
      (byDate[iso] = byDate[iso] || []).push({ sportMarker: true, discipline: sportDisc, title: label });
    }
  }
```

- [ ] **Step 7: Run to verify it passes**

Run: `cd apps/mobile && node tests/sport-planservice.js`
Expected: PASS P1–P4.

- [ ] **Step 8: Run the full suite (no regressions)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f" 2>&1 | grep '^FAIL:'; done || true; echo done`
Expected: no `FAIL:` lines. Check `plan-epoch.js` and `reflow-start-consistency.js` especially (the reflow path changed).

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/lib/PlanService.js apps/mobile/tests/sport-planservice.js
git commit -m "feat(plan): regenerate on sport_days, lighten reflowed clashes, calendar markers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Calendar UI — render sport-day markers

**Files:**
- Modify: `apps/mobile/src/components/TrainingCalendar.jsx`

**Interfaces:**
- Consumes: `byDate[iso]` entries that may now include `{ sportMarker: true, discipline, title }` (Task 9).

No JSX test harness — verify via the dev server. The dot rendering already colours by `discipline`, so markers get a coloured dot automatically; this task makes the day-detail render them as non-clickable lines.

- [ ] **Step 1: Render markers as non-clickable lines in the day detail**

In `apps/mobile/src/components/TrainingCalendar.jsx`, change the day-detail body (lines 101–103) from:

```jsx
        {todays.length === 0
          ? <div className="cal-rest">Recovery day — let the work land.</div>
          : todays.map(s => <SessionBlock key={s.key} s={s} onOpen={onOpen} />)}
```
to:
```jsx
        {todays.length === 0
          ? <div className="cal-rest">Recovery day — let the work land.</div>
          : todays.map((s, i) => s.sportMarker
              ? (
                <div key={`m${i}`} className="cal-session" style={{ borderLeftColor: DISC_COLOR[s.discipline] || '#888', opacity: 0.85, cursor: 'default' }}>
                  <span className="cal-session-body">
                    <span className="cal-session-title">{s.title}</span>
                    <span className="cal-session-meta">Your own {(DISC_LABEL[s.discipline] || 'sport').toLowerCase()} session</span>
                  </span>
                </div>
              )
              : <SessionBlock key={s.key} s={s} onOpen={onOpen} />)}
```

- [ ] **Step 2: Keep the "all done" / rest-day logic honest**

`allDone` (line 65) counts every entry; a sport marker has no `completed`, so a day with only a marker would never read "all done" and a day with a marker + a done session would not show "all done". Make markers not count toward completion. Change line 65 from:

```jsx
  const allDone = todays.length > 0 && todays.every(s => s.completed);
```
to:
```jsx
  const sessions = todays.filter(s => !s.sportMarker);
  const allDone = sessions.length > 0 && sessions.every(s => s.completed);
```

And change the detail head (lines 97–99) to treat a markers-only day as a sport day, not a rest day. Replace:

```jsx
          {todays.length === 0
            ? `${heading} · rest day`
            : allDone ? `${heading} · all done ✓` : heading}
```
with:
```jsx
          {sessions.length === 0
            ? (todays.length === 0 ? `${heading} · rest day` : heading)
            : allDone ? `${heading} · all done ✓` : heading}
```

And the empty-state body (line 101) should only show "Recovery day" when there's truly nothing — change `todays.length === 0` to `sessions.length === 0 && todays.length === 0` is already handled above; keep the `todays.length === 0` branch for the body as-is (a markers-only day now falls into the `.map` branch and renders the marker).

- [ ] **Step 3: Verify in the dev server**

Run: `npm run dev` (from repo root). Onboard (or use a saved sport profile) as a swimmer with sport days Tue/Thu and a Today/Monday start, then on Home:
1. The calendar strip shows a swim-coloured dot on Tue/Thu.
2. Selecting a Tue/Thu shows a **Swim** line reading "Your own swim session" that is **not** clickable.
3. A gym day still shows its tappable session block.
4. A pure rest day still says "rest day".

- [ ] **Step 4: Run the full suite (final regression gate)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f" 2>&1 | grep '^FAIL:'; done || true; echo done`
Expected: no `FAIL:` lines.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/TrainingCalendar.jsx
git commit -m "feat(calendar): show sport days as non-clickable markers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Capture `sport_days` (sport goals) → Task 7 (model) + Task 8 (UI). ✅
- Suggest gym days around sport days, user-adjustable → Task 2 (`suggestGymDays`) + Task 6 (`chooseDays`) + Task 8 (auto-fill, user can edit). ✅
- Prefer separate; arrange heavy work away from sport days → Task 4 (scheduler proximity penalty using `sportMuscles`). ✅
- Lighten if forced onto a sport day → Task 3 (`lightenItems`) + Task 5 (scheduler) + Task 9 (reflow). ✅
- `ScheduleConstraints` shape derived from profile + sport module → Task 1 (`deriveConstraints`, reuses `keyMuscles`). ✅
- Reflow respects constraints (no recompute on Start) → Task 9 lightens only reshaped PENDING sessions; freeze-on-start untouched. ✅
- Calendar sport markers → Task 9 (data) + Task 10 (render). ✅
- Regenerate when sport days change → Task 9 (`profileSignature`). ✅
- Gym-only; non-sport plans unchanged → empty constraints no-op; Task 6 G3 + full-suite gates. ✅

**Placeholder scan:** No TBD/TODO; every code step shows the exact edit. ✅

**Type consistency:** `deriveConstraints` returns `{ busyDays:number[], sportMuscles:string[] }` — consumed with those exact names in Tasks 4, 6, 9. `scheduleWeek({…, busyDays, sportMuscles})` matches between Task 4 (definition), Task 5 (lighten), and Task 6 (caller). `lightenItems(items)→items` consistent across Tasks 3, 5, 9. `suggestGymDays({ sportDays, gymDays })` matches Task 2 (def), Task 6 (`chooseDays`), Task 8 (UI). Weekday index convention (Mon=0) is consistent: `weekdayIndex`/`KEY_IDX` in the engine, and the JS `getDay()`→Mon=0 conversion is applied in Task 9's reflow and calendar code. `sportMarker`/`discipline`/`title` marker shape matches between Task 9 (producer) and Task 10 (consumer). ✅

**Scope note:** This is one cohesive feature with sequenced tasks (engine → onboarding → service → UI); each task ends with an independently testable/committable deliverable. Tasks 1–7 and 9 are TDD with Node tests; Tasks 8 and 10 are UI verified in the dev server (no JSX harness exists).
