# Sport-load-aware planning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the gym plan support a trained sport instead of competing with it — restructure sport onboarding (compete→season / recreational→goal), scale gym volume to real sport load, cap per-session fatigue, and route gym days around sport days.

**Architecture:** All engine logic is pure functions in `packages/engine`. We extend existing tables (`DEFAULT_SEASON_VOLUME`, `SPORT_BLOCKS`, sport modules), add one new pure helper (`sportLoadScalar`), and patch four engine functions (`deriveSeason`, `resolveProgram`'s sport branch, the allocator fill loop, `chooseDays`). Onboarding changes live in `onboardingModel.js` (pure mapping, unit-tested) + `OnboardingWizard.jsx` (UI).

**Tech Stack:** React 18 + Vite (apps/mobile), pure-ESM engine (packages/engine), Node test files run via `node tests/<name>.js` from `apps/mobile/` (custom `assert`, no framework). Spec: `docs/superpowers/specs/2026-06-28-sport-load-aware-planning-design.md`.

## Global Constraints

- Engine functions stay **pure** — same profile ⇒ same plan; no `Date.now()` in generation paths.
- Volume scalar is **clamped to `[0.50, 1.00]`**.
- Per-muscle `emphasis` is unchanged — the scalar only changes magnitude, not shape.
- Tests run from `apps/mobile/` as `node tests/<name>.js`; engine imported as `@performance-os/engine/lib/...`.
- All commits end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- `npm run build` (from repo root) must pass at the end.
- Onboarding answer values are user-facing (`'in_season'`/`'off_season'`); the **profile** stores engine season keys (`'in'`/`'off'`). `sport_season` in the profile is `'in'|'off'|null`; `sport_goal` is `'build_base'|'get_stronger'|'stay_durable'|null`.

---

### Task 1: Onboarding model — new fields + `build_base` migration

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js` (`BLANK_ANSWERS`, `answersToProfilePatch`)
- Test: `apps/mobile/tests/sport-onboarding-model.js` (create)

**Interfaces:**
- Produces: profile fields `sport_intent: 'compete'|'recreational'`, `sport_season: 'in'|'off'|null`, `sport_goal: 'build_base'|'get_stronger'|'stay_durable'|null`. Consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-onboarding-model.js`:

```js
// tests/sport-onboarding-model.js — onboarding → profile mapping for the new
// compete/season + recreational/goal model, plus build_base migration.
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', ...o });
let fails = 0;
const eq = (got, want, msg) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${JSON.stringify(got)} want ${JSON.stringify(want)})`)); if (!ok) fails++; };

// compete + in-season → engine key 'in', no goal
let p = answersToProfile(A({ sportIntent: 'compete', sportSeason: 'in_season' }));
eq(p.sport_intent, 'compete', 'compete intent preserved');
eq(p.sport_season, 'in', 'in_season → engine key in');
eq(p.sport_goal, null, 'compete has no sport_goal');

// compete + off-season → 'off'
p = answersToProfile(A({ sportIntent: 'compete', sportSeason: 'off_season' }));
eq(p.sport_season, 'off', 'off_season → engine key off');

// recreational + goal → goal set, season null
p = answersToProfile(A({ sportIntent: 'recreational', sportGoal: 'get_stronger' }));
eq(p.sport_intent, 'recreational', 'recreational intent');
eq(p.sport_season, null, 'recreational leaves sport_season null');
eq(p.sport_goal, 'get_stronger', 'recreational goal preserved');

// MIGRATION: legacy build_base intent → recreational + build_base goal
p = answersToProfile(A({ sportIntent: 'build_base' }));
eq(p.sport_intent, 'recreational', 'legacy build_base → recreational');
eq(p.sport_goal, 'build_base', 'legacy build_base → build_base goal');

// recreational with no goal → defaults build_base
p = answersToProfile(A({ sportIntent: 'recreational' }));
eq(p.sport_goal, 'build_base', 'recreational default goal = build_base');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-onboarding-model.js`
Expected: FAIL — `sportSeason`/`sportGoal` not in `BLANK_ANSWERS`, no migration; several assertions fail.

- [ ] **Step 3: Add the answer fields** — in `onboardingModel.js`, in `BLANK_ANSWERS`, replace the line `sportIntent: '', // 'compete' | 'recreational' | 'build_base'` and add the new fields:

```js
  sportIntent: '',              // 'compete' | 'recreational'
  sportSeason: '',              // compete only: 'in_season' | 'off_season'
  sportGoal: '',                // recreational only: 'build_base' | 'get_stronger' | 'stay_durable'
```

- [ ] **Step 4: Implement the mapping + migration** — in `answersToProfilePatch`, add normalisation just before the `return {`:

```js
  // Sport intent / season / goal (new model). Legacy 'build_base' intent migrates to
  // recreational + build_base goal so old answers + saved profiles still resolve.
  let sportIntent = a.sportIntent || null;
  let sportGoal = a.sportGoal || null;
  if (sportIntent === 'build_base') { sportIntent = 'recreational'; sportGoal = sportGoal || 'build_base'; }
  if (sportIntent === 'recreational' && !sportGoal) sportGoal = 'build_base';
  const sportSeasonKey = a.sportSeason === 'in_season' ? 'in' : a.sportSeason === 'off_season' ? 'off' : null;
  const seasonOut = (isSport && sportIntent === 'compete') ? sportSeasonKey : null;
  const goalOut = (isSport && sportIntent === 'recreational') ? sportGoal : null;
```

Then in the returned object replace `sport_intent: isSport ? (a.sportIntent || 'recreational') : null,` with:

```js
    sport_intent: isSport ? (sportIntent || 'recreational') : null,
    sport_season: seasonOut,                       // 'in' | 'off' | null (compete only)
    sport_goal: goalOut,                           // recreational training goal | null
```

Also update the `plan_weeks` pseudo-profile (inside `answersToProfilePatch`) so periodisation sees the migrated values — replace its `sport_intent` line with `sport_intent: isSport ? (sportIntent || 'recreational') : null,` and add `sport_season: seasonOut, sport_goal: goalOut,` alongside it.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-onboarding-model.js`
Expected: PASS — `all passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/sport-onboarding-model.js
git commit -m "feat(onboarding): compete/season + recreational/goal model with build_base migration"
```

---

### Task 2: Sport schema — pull back off-season volume, de-peak, add `systemicFactor`

**Files:**
- Modify: `packages/engine/src/lib/sports/_schema.js` (`DEFAULT_SEASON_VOLUME`, `SPORT_BLOCKS.off`)
- Modify: `packages/engine/src/lib/sports/swimming.js`, `running.js`, `cycling.js` (add `systemicFactor`)
- Test: `apps/mobile/tests/sport-schema-loadfactors.js` (create)

**Interfaces:**
- Produces: `DEFAULT_SEASON_VOLUME.off === 0.90`; `SPORT_BLOCKS.off` ends on a `build` segment (no `peak`); sport modules expose `systemicFactor` (swim 0.95, run 0.90, cycle 0.95). Consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-schema-loadfactors.js`:

```js
// tests/sport-schema-loadfactors.js — schema constants for sport-load awareness.
import { DEFAULT_SEASON_VOLUME, SPORT_BLOCKS } from '@performance-os/engine/lib/sports/_schema.js';
import swimming from '@performance-os/engine/lib/sports/swimming.js';
import running from '@performance-os/engine/lib/sports/running.js';
import cycling from '@performance-os/engine/lib/sports/cycling.js';
let fails = 0;
const eq = (got, want, msg) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };

eq(DEFAULT_SEASON_VOLUME.off, 0.90, 'off-season base pulled back to 0.90');
eq(DEFAULT_SEASON_VOLUME.in, 0.60, 'in-season base unchanged 0.60');
eq(SPORT_BLOCKS.off.split.some(s => s.intent === 'peak'), false, 'no-event off block has no peak segment');
eq(SPORT_BLOCKS.off.split.reduce((a, s) => a + s.weeks, 0), 12, 'off block still totals 12 weeks');
eq(swimming.systemicFactor, 0.95, 'swim systemicFactor 0.95');
eq(running.systemicFactor, 0.90, 'run systemicFactor 0.90');
eq(cycling.systemicFactor, 0.95, 'cycle systemicFactor 0.95');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-schema-loadfactors.js`
Expected: FAIL — off is 1.0, off block has a peak segment, modules lack `systemicFactor`.

- [ ] **Step 3: Edit `_schema.js`** — change the two constants:

```js
export const DEFAULT_SEASON_VOLUME = { off: 0.90, pre: 0.85, in: 0.6, transition: 0.7 };
```

and in `SPORT_BLOCKS`, change the `off` entry's split so the trailing `peak` merges into `build` (peaking is owned by the event-date taper, not the block):

```js
  off:        { totalWeeks: 12, split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 7 }], deloads: [5, 10] },
```

- [ ] **Step 4: Add `systemicFactor` to the three endurance modules.** In `swimming.js`, add `systemicFactor: 0.95,` next to `power: true,`. In `running.js`, add `systemicFactor: 0.90,`. In `cycling.js`, add `systemicFactor: 0.95,`. (Leave team-sport modules without it — they default to 1.0 in Task 4.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-schema-loadfactors.js`
Expected: PASS — `all passed`.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/sports/_schema.js packages/engine/src/lib/sports/swimming.js packages/engine/src/lib/sports/running.js packages/engine/src/lib/sports/cycling.js apps/mobile/tests/sport-schema-loadfactors.js
git commit -m "feat(engine): off-season volume pullback, de-peak no-event blocks, add systemicFactor"
```

---

### Task 3: Season resolution honours explicit season + recreational goal

**Files:**
- Modify: `packages/engine/src/lib/plan/periodization.js` (`deriveSeason`)
- Test: `apps/mobile/tests/sport-season-resolution.js` (create)

**Interfaces:**
- Consumes: profile `sport_intent`, `sport_season` (`'in'|'off'`), `sport_goal`, `event_date` (from Task 1).
- Produces: `deriveSeason(profile)` → `'off'|'pre'|'in'|'transition'|null`. Consumed by `resolvePeriodization` (block) and Task 4 (scalar base).

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-season-resolution.js`:

```js
// tests/sport-season-resolution.js — season key from the new onboarding model.
import { deriveSeason } from '@performance-os/engine/lib/plan/periodization.js';
const P = (o) => ({ sport: 'swim', ...o });
let fails = 0;
const eq = (got, want, msg) => { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };

eq(deriveSeason(P({ sport_intent: 'compete', sport_season: 'in' })), 'in', 'compete in-season → in');
eq(deriveSeason(P({ sport_intent: 'compete', sport_season: 'off' })), 'off', 'compete off-season → off');
eq(deriveSeason(P({ sport_intent: 'compete' })), 'off', 'compete w/o season defaults off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'build_base' })), 'off', 'build_base → off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'get_stronger' })), 'off', 'get_stronger → off');
eq(deriveSeason(P({ sport_intent: 'recreational', sport_goal: 'stay_durable' })), 'in', 'stay_durable → in (maintenance)');
eq(deriveSeason({}), null, 'no sport → null');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-season-resolution.js`
Expected: FAIL — `stay_durable` returns `off`; compete reads `sport_intent` not `sport_season`.

- [ ] **Step 3: Implement** — in `periodization.js`, replace the "No event date — use declared intent" block (the current lines 46–49) with:

```js
  // No event date — use the explicit season (compete) or the training goal (recreational).
  const intent = profile.sport_intent;
  if (intent === 'compete') return profile.sport_season || 'off';   // 'in' | 'off'
  if (profile.sport_goal === 'stay_durable') return 'in';            // maintenance-style low volume
  return 'off';  // build_base | get_stronger | legacy | unset → off-season build
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-season-resolution.js`
Expected: PASS — `all passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/periodization.js apps/mobile/tests/sport-season-resolution.js
git commit -m "feat(engine): deriveSeason honours explicit season + recreational training goal"
```

---

### Task 4: `sportLoadScalar` — volume pullback from season × goal × sport-days × sport-type

**Files:**
- Create: `packages/engine/src/lib/strength/sportLoad.js`
- Modify: `packages/engine/src/lib/strength/program.js` (sport branch `volumeScalar`)
- Test: `apps/mobile/tests/sport-load-scalar.js` (create)

**Interfaces:**
- Consumes: `DEFAULT_SEASON_VOLUME` (Task 2), `deriveSeason` (Task 3), profile fields (Task 1), sport module (`seasonModifiers`, `systemicFactor`).
- Produces: `sportLoadScalar(profile, { season, mod }) → number` clamped `[0.5, 1.0]`; `sportDayFactor(n) → number`. Consumed by `resolveProgram` and the allocator's targets.

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-load-scalar.js`:

```js
// tests/sport-load-scalar.js — the sport-load volume scalar.
import { sportLoadScalar, sportDayFactor } from '@performance-os/engine/lib/strength/sportLoad.js';
import swimming from '@performance-os/engine/lib/sports/swimming.js';
let fails = 0;
const near = (got, want, msg, tol = 0.005) => { const ok = Math.abs(got - want) <= tol; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (got ${got} want ${want})`)); if (!ok) fails++; };
const days = (n) => Array.from({ length: n }, (_, i) => ['mon','tue','wed','thu','fri','sat','sun'][i]);

near(sportDayFactor(2), 1.0, 'dayFactor ≤2 = 1.0');
near(sportDayFactor(3), 0.92, 'dayFactor 3 = 0.92');
near(sportDayFactor(4), 0.85, 'dayFactor 4 = 0.85');
near(sportDayFactor(5), 0.78, 'dayFactor ≥5 = 0.78');

// in-season swim ×3/wk: 0.60 × 1.0 × 0.92 × 0.95 = 0.524
near(sportLoadScalar({ sport_intent: 'compete', sport_days: days(3) }, { season: 'in', mod: swimming }), 0.524, 'in-season swim ×3');
// off-season build_base ×3/wk: 0.90 × 1.0 × 0.92 × 0.95 = 0.786
near(sportLoadScalar({ sport_intent: 'recreational', sport_goal: 'build_base', sport_days: days(3) }, { season: 'off', mod: swimming }), 0.786, 'off build_base swim ×3');
// off get_stronger ×2/wk: 0.90 × 0.90 × 1.0 × 0.95 = 0.7695
near(sportLoadScalar({ sport_intent: 'recreational', sport_goal: 'get_stronger', sport_days: days(2) }, { season: 'off', mod: swimming }), 0.7695, 'off get_stronger swim ×2');
// clamp floor: in-season swim ×5/wk would be 0.60×0.78×0.95=0.4446 → clamp 0.5
near(sportLoadScalar({ sport_intent: 'compete', sport_days: days(5) }, { season: 'in', mod: swimming }), 0.5, 'floor clamps to 0.5');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-load-scalar.js`
Expected: FAIL — module `sportLoad.js` does not exist.

- [ ] **Step 3: Create `packages/engine/src/lib/strength/sportLoad.js`:**

```js
/**
 * sportLoad — the generation-time pullback that keeps the gym plan SUPPORTING a
 * trained sport rather than competing with it. Pure: scalar = season base × goal
 * factor × sport-day factor × sport systemic factor, clamped to a maintenance floor.
 *
 * The reactive wearable ACWR layer (plan/trainingLoad.js) handles total load once
 * data flows; this is the proactive, day-one layer that needs no history.
 * See docs/superpowers/specs/2026-06-28-sport-load-aware-planning-design.md §5.
 */
import { DEFAULT_SEASON_VOLUME } from '../sports/_schema.js';

const GOAL_FACTOR = { build_base: 1.0, get_stronger: 0.90, stay_durable: 1.0 };
export const VOLUME_FLOOR = 0.5, VOLUME_CEIL = 1.0;

// More sport sessions a week ⇒ less room for gym. Each day beyond two trims ~0.07.
export function sportDayFactor(n) {
  if (n <= 2) return 1.0;
  if (n === 3) return 0.92;
  if (n === 4) return 0.85;
  return 0.78;             // ≥5
}

export function sportLoadScalar(profile = {}, { season = 'off', mod = null } = {}) {
  const seasonBase = ((mod && mod.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0;
  const goalFactor = profile.sport_intent === 'recreational'
    ? (GOAL_FACTOR[profile.sport_goal] ?? 1.0) : 1.0;
  const dayFactor = sportDayFactor(Array.isArray(profile.sport_days) ? profile.sport_days.length : 0);
  const systemic = (mod && typeof mod.systemicFactor === 'number') ? mod.systemicFactor : 1.0;
  const raw = seasonBase * goalFactor * dayFactor * systemic;
  return Math.max(VOLUME_FLOOR, Math.min(VOLUME_CEIL, raw));
}

export default { sportLoadScalar, sportDayFactor };
```

- [ ] **Step 4: Wire into `program.js`.** Add an import at the top of `program.js`:

```js
import { sportLoadScalar } from './sportLoad.js';
```

In `resolveProgram`'s sport branch, replace the `volumeScalar` line (currently
`volumeScalar: ((mod && mod.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0,`) with:

```js
      volumeScalar: sportLoadScalar(profile, { season, mod }),
```

(`DEFAULT_SEASON_VOLUME` may now be unused in `program.js`; if so, remove its import line to keep lint clean.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-load-scalar.js`
Expected: PASS — `all passed`.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/lib/strength/sportLoad.js packages/engine/src/lib/strength/program.js apps/mobile/tests/sport-load-scalar.js
git commit -m "feat(engine): sport-load volume scalar (season × goal × sport-days × type)"
```

---

### Task 5: Allocator — cap working items per sport session (keep prehab)

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (round-robin + filler loops in `allocateGym`)
- Test: `apps/mobile/tests/sport-session-density.js` (create)

**Interfaces:**
- Consumes: `program.style === 'sport'` flag (already threaded as `ctx.style`).
- Produces: no sport session has more than `SPORT_WORK_ITEM_CAP` (6) working items (`volumeFactor > 0`); factor-0 prehab/mobility finisher items are exempt.

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-session-density.js`:

```js
// tests/sport-session-density.js — sport sessions stay lean (≤6 working items).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const FULL = ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', experienceLevel: 'intermediate', sex: 'male', bodyweight_kg: 80, daysPerWeek: 3, days: ['mon','wed','fri'], equipment: FULL, lifts: { squat: 95, bench: 70, deadlift: 100, ohp: 50, pull: 2 }, pullMode: 'reps', ...o });
let fails = 0; let maxWork = 0;
const plan = generatePlan(answersToProfile(A({ sportIntent: 'recreational', sportGoal: 'build_base', sportDays: ['tue','thu','sat'] })));
for (const ph of plan.phases) for (const wk of ph.weeks) for (const s of wk.sessions) {
  const work = (s.items || []).filter(it => it.tag !== 'mobility' && (it.volumeFactor ?? 1) > 0).length;
  maxWork = Math.max(maxWork, work);
}
const ok = maxWork <= 6;
console.log((ok ? 'PASS' : 'FAIL') + `: no sport session exceeds 6 working items (max seen ${maxWork})`);
if (!ok) fails++;
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-session-density.js`
Expected: FAIL — current build/peak sport sessions reach 7–9 working items.

- [ ] **Step 3: Implement the cap.** In `allocator.js`, add a constant near `SESSION_CEILING_MIN` (top of file):

```js
// Sport sessions stay lean to leave recovery for the sport: cap fatiguing (working)
// items per session. The factor-0 prehab/mobility finisher is exempt — it's
// non-fatiguing — and priority prehab is picked first, so it survives the cap.
export const SPORT_WORK_ITEM_CAP = 6;
```

Inside `allocateGym`, after `const style = ...` (near the top of the function), add a helper:

```js
  const workCount = (slot) => slot.picks.filter(p => (p.item?.volumeFactor ?? 1) > 0).length;
  const overSportCap = (slot) => style === 'sport' && workCount(slot) >= SPORT_WORK_ITEM_CAP;
```

In the round-robin fill loop, change the slot guard from:

```js
      if (slot.timeUsed >= slot.budget) continue;
```
to:
```js
      if (slot.timeUsed >= slot.budget || overSportCap(slot)) continue;
```

In the filler pass `while` condition, change:

```js
    while (added < numMains + 1 && slot.timeUsed < slot.budget) {
```
to:
```js
    while (added < numMains + 1 && slot.timeUsed < slot.budget && !overSportCap(slot)) {
```

(The factor-0 supportive finisher loop below is left unchanged — that's the prehab/mobility we keep.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-session-density.js`
Expected: PASS — `max seen` ≤ 6.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/plan/allocator.js apps/mobile/tests/sport-session-density.js
git commit -m "feat(engine): cap working items per sport session, keep factor-0 prehab"
```

---

### Task 6: `chooseDays` routes gym around sport days for any availability

**Files:**
- Modify: `packages/engine/src/lib/PlanGenerator.js` (`chooseDays`)
- Test: `apps/mobile/tests/sport-schedule-availability.js` (create)

**Interfaces:**
- Consumes: `suggestGymDays` (already imported in `PlanGenerator.js` via `constraints.js`).
- Produces: gym day names that avoid sport days when the available set allows, spread for recovery.

- [ ] **Step 1: Write the failing test** — create `apps/mobile/tests/sport-schedule-availability.js`:

```js
// tests/sport-schedule-availability.js — gym routes around swim days for ANY availability.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
const FULL = ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const NAME2KEY = { Monday:'mon', Tuesday:'tue', Wednesday:'wed', Thursday:'thu', Friday:'fri', Saturday:'sat', Sunday:'sun' };
const A = (o) => ({ ...BLANK_ANSWERS, goalType: 'sport', sport: 'swim', experienceLevel: 'intermediate', sex: 'male', daysPerWeek: 3, equipment: FULL, sportIntent: 'recreational', sportGoal: 'build_base', sportDays: ['tue','thu','sat'], ...o });
let fails = 0;
const gymDayKeys = (answers) => {
  const plan = generatePlan(answersToProfile(answers));
  return plan.phases[0].weeks[0].sessions.map(s => NAME2KEY[(s.title || '').split(' · ')[0]] || (s.title || ''));
};
const noClash = (keys, msg) => { const swim = new Set(['tue','thu','sat']); const clash = keys.filter(k => swim.has(k)); const ok = clash.length === 0; console.log((ok ? 'PASS' : 'FAIL') + ': ' + msg + (ok ? '' : ` (clash on ${clash.join(',')})`)); if (!ok) fails++; };

// All weekdays available → must NOT land on tue/thu/sat, and must be spread (Mon/Wed/Fri).
const all = gymDayKeys(A({ days: ['mon','tue','wed','thu','fri','sat','sun'] }));
noClash(all, 'all-days availability avoids swim days');
console.log('  resolved gym days:', JSON.stringify(all));

// Mon–Fri available → still avoids tue/thu.
noClash(gymDayKeys(A({ days: ['mon','tue','wed','thu','fri'] })), 'mon-fri availability avoids swim days');

// Blank availability → unchanged suggestGymDays behaviour, still no clash.
noClash(gymDayKeys(A({ days: [] })), 'blank availability avoids swim days');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/sport-schedule-availability.js`
Expected: FAIL — all-days + mon–fri land on Tue (clash), because `chooseDays` does `slice(0, n)`.

- [ ] **Step 3: Implement.** In `PlanGenerator.js`, replace the whole `chooseDays` function body with a version that subtracts sport days from the user's available set:

```js
function chooseDays(availability, n, sportDays = []) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const sport = new Set(sportDays);

  if (days.length === 0) {
    // No explicit picks → suggest spread around sport (existing behaviour).
    days = sportDays.length ? suggestGymDays({ sportDays, gymDays: n }) : (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n));
  } else {
    // Explicit availability → prefer free (non-sport) days, spread for recovery;
    // only borrow sport days when there aren't enough free ones (those clash sessions
    // are lightened downstream by the scheduler via lightenItems).
    const free = days.filter(d => !sport.has(d));
    const clash = days.filter(d => sport.has(d));
    if (free.length >= n) {
      days = spreadKeys(free, n);
    } else {
      days = [...free, ...clash.slice(0, n - free.length)]
        .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    }
  }
  return days.map(d => DAY_NAMES[d]);
}

// Pick k keys from a week-ordered list, spread as evenly as possible (so 3 of
// Mon/Wed/Fri/Sun isn't bunched). Mirrors constraints.spreadPick.
function spreadKeys(arr, k) {
  if (k >= arr.length) return arr.slice();
  const out = []; const denom = k - 1 || 1;
  for (let i = 0; i < k; i++) out.push(arr[Math.round(i * (arr.length - 1) / denom)]);
  return [...new Set(out)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}
```

Confirm `suggestGymDays` is imported in `PlanGenerator.js` (it is — `import { deriveConstraints, suggestGymDays } from './plan/constraints.js';`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/sport-schedule-availability.js`
Expected: PASS — all-days resolves to `["mon","wed","fri"]`; no clashes.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/lib/PlanGenerator.js apps/mobile/tests/sport-schedule-availability.js
git commit -m "fix(engine): route gym around sport days for any availability (no Mon/Tue/Wed clash)"
```

---

### Task 7: Onboarding wizard UI — branch compete? → season / goal

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx` (the sport step + intent constants)

**Interfaces:**
- Consumes: the answer fields from Task 1 (`sportIntent`, `sportSeason`, `sportGoal`).
- Produces: UI that sets those answers; no engine interface.

- [ ] **Step 1: Read the current sport step.** Open `OnboardingWizard.jsx` and locate: the intent options constant (around line 33, `compete/recreational/build_base`), and the sport step (`isSport && { title: 'Which sport — and where are you?' ...}` around line 251) including the `sportIntent` chips (line 274) and the `a.sportIntent === 'compete'` event-date block (line 278). Note the `STYLES`/`SPORTS`/`Chip`/`OptionGrid` helpers in use.

- [ ] **Step 2: Replace the intent options + add season/goal option lists.** Near line 33, replace the three-way intent list with a two-way list plus season + goal lists:

```js
const SPORT_INTENTS = [
  { key: 'compete',      label: 'I compete',   hint: 'Races, meets or matches — training stays sport-specific.' },
  { key: 'recreational', label: "I don't compete", hint: 'No events — strength that supports your sport.' }
];
const SPORT_SEASONS = [
  { key: 'off_season', label: 'Off-season', hint: 'Build phase — more gym, away from competition.' },
  { key: 'in_season',  label: 'In-season',  hint: 'Maintenance — keep strength, stay fresh for competition.' }
];
const SPORT_GOALS = [
  { key: 'build_base',  label: 'Build my base',       hint: 'General strength + conditioning for your sport.' },
  { key: 'get_stronger', label: 'Get stronger',       hint: 'Heavier, lower-volume strength support.' },
  { key: 'stay_durable', label: 'Stay durable',       hint: 'Lower-volume, injury-proofing focus.' }
];
```

- [ ] **Step 3: Rework the sport step's validity + render.** Update the sport step's `valid` to require the branch to be answered:

```js
    isSport && { title: 'Which sport — and where are you?', subtitle: 'We program supportive strength: heavier, lower-volume, tuned to your sport.',
      valid: () => !!a.sport && !!a.sportIntent
        && (a.sport !== 'run' || !!a.runDiscipline)
        && (a.sportIntent !== 'compete' || !!a.sportSeason)
        && (a.sportIntent !== 'recreational' || !!a.sportGoal),
      render: () => (/* sport chips + run-discipline (unchanged), then: */
        // Intent chips:
        // <OptionGrid cols={1}>{SPORT_INTENTS.map(opt => <Chip key={opt.key} selected={a.sportIntent === opt.key} onClick={() => set({ sportIntent: opt.key })} label={opt.label} hint={opt.hint} />)}</OptionGrid>
        // If compete → season chips + optional event date:
        // {a.sportIntent === 'compete' && <OptionGrid cols={2}>{SPORT_SEASONS.map(opt => <Chip key={opt.key} selected={a.sportSeason === opt.key} onClick={() => set({ sportSeason: opt.key })} label={opt.label} hint={opt.hint} />)}</OptionGrid>}
        // {a.sportIntent === 'compete' && (the existing event-date <input> block, now labelled "Key event date? (optional)")}
        // If recreational → goal chips:
        // {a.sportIntent === 'recreational' && <OptionGrid cols={1}>{SPORT_GOALS.map(opt => <Chip key={opt.key} selected={a.sportGoal === opt.key} onClick={() => set({ sportGoal: opt.key })} label={opt.label} hint={opt.hint} />)}</OptionGrid>}
      ) },
```

Implement the render with the real JSX (the existing file uses `OptionGrid` + `Chip`; mirror the existing `sportIntent` chip markup at line 274 and keep the event-date `<input>` block from line 278, changing its surrounding condition to also show only for `compete` and its hint copy to "Leave blank if you just want a season-based block.").

- [ ] **Step 4: Update the summary line.** The summary (around line 454) references `a.sportIntent === 'compete' ? 'competing' : a.sportIntent === 'build_base' ? 'building base' : 'recreational'`. Replace with:

```js
          ? `Support ${SPORTS.find(s => s.key === a.sport)?.label || 'sport'} · ${a.sportIntent === 'compete' ? (a.sportSeason === 'in_season' ? 'in-season' : 'off-season') : (SPORT_GOALS.find(g => g.key === a.sportGoal)?.label || 'recreational')}`
```

- [ ] **Step 5: Verify the build compiles.**

Run: `npm run build` (from repo root)
Expected: build succeeds (no unresolved identifiers, JSX valid).

- [ ] **Step 6: Smoke-check the wizard renders (best-effort).** Start the dev server and load onboarding; confirm the sport step shows compete/don't-compete and the correct follow-up. If onboarding is auth-gated and can't be reached headless, rely on the build + Task 1 model test for correctness and note it.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/OnboardingWizard.jsx
git commit -m "feat(onboarding): branch sport step into compete/season vs recreational/goal"
```

---

### Task 8: Reconcile existing tests + regenerate golden master + full verification

**Files:**
- Modify: existing engine tests whose expectations changed intentionally (e.g. `program-resolution.js`, `periodization.js`, `sport-*.js`, `volume-*.js`) — only where the new behaviour is correct.
- Modify: `apps/mobile/tests/__snapshots__/engine-golden-master.json` (regenerate)

- [ ] **Step 1: Run the full engine test suite and capture failures.**

Run (from `apps/mobile`):
```bash
for f in tests/*.js; do echo "=== $f ==="; node "$f" 2>&1 | tail -3; done
```
Expected: the new Task 1–6 tests PASS; several existing tests FAIL because behaviour changed on purpose (lower sport `volumeScalar`, de-peaked off block, new season mapping, leaner sport sessions, new schedule). List each failing file.

- [ ] **Step 2: Categorise each failure** as (a) **intentional** — the test asserts an old value the spec deliberately changes (update the expectation to the new correct value, keeping the test meaningful), or (b) **regression** — an unintended break (fix the code). Do NOT blanket-update; read each assertion. Likely intentional updates: any `volumeScalar === 1.0` for sport, any assertion that a no-event off-season sport plan contains a `peak` phase, any hard-coded sport gym-day expectation that assumed `slice(0,n)`.

- [ ] **Step 3: Regenerate the golden master (intentional behaviour change).**

Run (from `apps/mobile`): `UPDATE=1 node tests/golden-master.js`
Then eyeball the diff: `git --no-pager diff --stat apps/mobile/tests/__snapshots__/engine-golden-master.json` and spot-check that swim/cycle/run archetypes show lower weekly sets, leaner sessions, and de-peaked finals. Re-run `node tests/golden-master.js` to confirm it now PASSES against the new snapshot.

- [ ] **Step 4: Re-run the full suite to green.**

Run (from `apps/mobile`):
```bash
for f in tests/*.js; do node "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
```
Expected: every line `PASS`.

- [ ] **Step 5: End-to-end sanity on the review profile.** Run a throwaway dump (the swimmer: intermediate, swims Tue/Thu/Sat, gym 3×, all-weekday availability) and confirm: in-season weekly sets ≈ half of the old plan, sport sessions ≤6 working items, gym on Mon/Wed/Fri, and no "Peak & Sharpen / taper" phase when there's no event. Delete the throwaway script after.

- [ ] **Step 6: Build.**

Run (repo root): `npm run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/tests
git commit -m "test(engine): reconcile expectations + regenerate golden master for sport-load changes"
```

---

## Self-Review

**Spec coverage:**
- §3 onboarding model + migration → Task 1 (model) + Task 7 (UI). ✓
- §4 periodisation mapping + de-peak → Task 2 (de-peak block) + Task 3 (season/goal resolution). ✓
- §5 sport-load scalar → Task 4. ✓
- §6 session-density guardrail → Task 5. ✓
- §7 scheduling fix → Task 6. ✓
- §9 verification (unit tests, golden master, e2e, build) → Tasks 1–6 unit tests + Task 8. ✓

**Type consistency:** `sportLoadScalar(profile, { season, mod })` and `sportDayFactor(n)` used identically in Task 4 source + test. Profile fields `sport_intent`/`sport_season`/`sport_goal`/`sport_days` produced in Task 1 and consumed in Tasks 3–6 with matching values (`'in'`/`'off'` engine keys; `'compete'`/`'recreational'`). `SPORT_WORK_ITEM_CAP` defined and used in Task 5 only. `workCount`/`overSportCap` defined before use. `spreadKeys` defined in Task 6 alongside its caller.

**Placeholder scan:** Task 7 Step 3 gives the JSX as guided comments rather than a full literal block (the surrounding step text instructs mirroring the existing `Chip`/`OptionGrid` markup at specific line numbers) — acceptable because it edits a large existing render function; all other steps contain literal code.

**Decisions deferred:** `get_stronger` shares the off-season block (differentiated only by the 0.90 goal factor) per spec §10 — no separate block template in this plan.
