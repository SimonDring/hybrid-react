# Plan Start Date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user choose when their plan starts (Today / Tomorrow / Next Monday / Pick a date) during onboarding, instead of silently defaulting to today.

**Architecture:** A pure `resolveStartDate(option, customDate, now)` helper in `onboardingModel.js` maps the choice to a local ISO date; `answersToProfilePatch` writes it to `profile.plan_start_date` (which already drives the whole calendar — no engine change). The wizard gets one new question step. Default selection is **Today**, so behaviour is unchanged for anyone who doesn't touch it.

**Tech Stack:** React 18 (function components, no test harness for JSX — UI verified via dev server), plain Node test scripts (`node tests/*.js`) for pure logic.

## Global Constraints

- Dates are **local** `YYYY-MM-DD` (use `localISODate`), never UTC `toISOString().slice(0,10)` — UTC near midnight is off by one (the bug `localISODate` was created to fix).
- Default `startWhen` is `'today'`; any blank/unknown option resolves to today (backward-compat: existing answer seeds and `tests/plan-epoch.js` pass no `startWhen`).
- Reuse existing wizard primitives (`Chip`, `OptionGrid`, `INPUT`, `FIELD_LABEL`, `HINT`, `SummaryRow`) — do not invent styles or theme variables.
- The app must still run (`npm run dev` from repo root) and the full suite (`node tests/*.js` in `apps/mobile`) must stay green at the end of every task.

---

### Task 1: `resolveStartDate` helper + answers→profile wiring (pure logic)

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js` (add `startWhen`/`startDate` to `BLANK_ANSWERS`; add `resolveStartDate`; use it in `answersToProfilePatch`)
- Test: `apps/mobile/tests/onboarding-start-date.js` (create)

**Interfaces:**
- Produces: `resolveStartDate(option: string, customDate: string, now?: Date): string` — returns a local `YYYY-MM-DD`. `option ∈ {'today','tomorrow','monday','date'}`; anything else → today. `'date'` uses `customDate`, clamped to today if blank/invalid/in the past.
- Produces: `BLANK_ANSWERS.startWhen` (default `'today'`), `BLANK_ANSWERS.startDate` (default `''`).
- Consumes (existing): `localISODate(d?)` from the same module.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/onboarding-start-date.js`:

```js
// tests/onboarding-start-date.js
// "When do you want to start?" — resolveStartDate mapping + answersToProfilePatch wiring.
process.env.TZ = 'Europe/London';

import { resolveStartDate, answersToProfilePatch, localISODate, BLANK_ANSWERS }
  from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Reference days (verified: 2026-06-24 is a Wednesday, 2026-06-29 a Monday).
const wed = new Date(2026, 5, 24);
const mon = new Date(2026, 5, 29);
const sun = new Date(2026, 5, 28);
assert(wed.getDay() === 3 && mon.getDay() === 1 && sun.getDay() === 0, 'S0 reference weekdays are right');

assert(resolveStartDate('today', '', wed) === '2026-06-24', 'S1 today → that local day');
assert(resolveStartDate('tomorrow', '', wed) === '2026-06-25', 'S2 tomorrow → +1 day');
assert(resolveStartDate('monday', '', wed) === '2026-06-29', 'S3 next Monday from Wed → following Mon');
assert(resolveStartDate('monday', '', mon) === '2026-06-29', 'S4 Monday when today IS Monday → today');
assert(resolveStartDate('monday', '', sun) === '2026-06-29', 'S5 Monday from Sun → next day');
assert(resolveStartDate('date', '2026-07-10', wed) === '2026-07-10', 'S6 date → the chosen date');
assert(resolveStartDate('date', '2026-06-01', wed) === '2026-06-24', 'S7 past date clamps to today');
assert(resolveStartDate('date', '', wed) === '2026-06-24', 'S8 empty custom date → today');
assert(resolveStartDate('', '', wed) === '2026-06-24', 'S9 blank option → today');
assert(resolveStartDate(undefined, undefined, wed) === '2026-06-24', 'S10 undefined option → today');

// answersToProfilePatch wires it in, and stays backward-compatible.
const noField = answersToProfilePatch({ goalType: 'build', strengthStyle: 'strength', daysPerWeek: 3 });
assert(noField.plan_start_date === localISODate(new Date()), 'S11 no startWhen → today (back-compat)');

const tomorrow = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', daysPerWeek: 3, startWhen: 'tomorrow' });
const t = new Date(); t.setDate(t.getDate() + 1);
assert(tomorrow.plan_start_date === localISODate(t), 'S12 startWhen=tomorrow flows into plan_start_date');

assert(BLANK_ANSWERS.startWhen === 'today' && BLANK_ANSWERS.startDate === '', 'S13 BLANK_ANSWERS defaults');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && node tests/onboarding-start-date.js`
Expected: FAIL — `resolveStartDate` is not exported (import is `undefined`), e.g. `TypeError: resolveStartDate is not a function`.

- [ ] **Step 3: Add the two answer fields**

In `apps/mobile/src/lib/onboardingModel.js`, in `BLANK_ANSWERS`, change:

```js
  daysPerWeek: null, sessionMinutes: 60, days: [],
```
to:
```js
  daysPerWeek: null, sessionMinutes: 60, days: [],
  startWhen: 'today',           // 'today' | 'tomorrow' | 'monday' | 'date'
  startDate: '',                // ISO YYYY-MM-DD, used only when startWhen === 'date'
```

- [ ] **Step 4: Add the `resolveStartDate` helper**

In `apps/mobile/src/lib/onboardingModel.js`, immediately after the `localISODate` function (around line 41), add:

```js
// Map the onboarding "when do you want to start?" choice to a local ISO date.
// 'monday' = the soonest Monday today-or-later. 'date' uses the picked day, clamped
// to today if it's blank/invalid/in the past. Anything unknown → today (so old
// answer seeds with no startWhen keep their previous behaviour).
export function resolveStartDate(option, customDate, now = new Date()) {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight today
  if (option === 'tomorrow') { base.setDate(base.getDate() + 1); return localISODate(base); }
  if (option === 'monday') {
    base.setDate(base.getDate() + ((8 - base.getDay()) % 7)); // 0 if today is Monday
    return localISODate(base);
  }
  if (option === 'date') {
    const picked = customDate ? new Date(customDate + 'T00:00:00') : null;
    if (!picked || isNaN(picked.getTime()) || picked < base) return localISODate(base);
    return localISODate(picked);
  }
  return localISODate(base); // 'today' and any unknown/blank value
}
```

- [ ] **Step 5: Use it in `answersToProfilePatch`**

In `apps/mobile/src/lib/onboardingModel.js`, inside `answersToProfilePatch`:

Remove the now-unused line near the top of the function:
```js
  const today = localISODate();
```
(`answersToInjuries` keeps its own `const today` — leave that one.)

Change the return field:
```js
    plan_start_date: today,
```
to:
```js
    plan_start_date: resolveStartDate(a.startWhen, a.startDate),
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/mobile && node tests/onboarding-start-date.js`
Expected: PASS for S0–S13.

- [ ] **Step 7: Run the full suite (no regressions)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f" || echo "ERR $f"; done | grep -c '^PASS:'; for f in tests/*.js; do node "$f"; done | grep '^FAIL:' || echo "NO FAILURES"`
Expected: `NO FAILURES`. In particular `tests/plan-epoch.js` (asserts `plan_start_date === localISODate(new Date())` with no `startWhen`) still passes via the back-compat default.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/tests/onboarding-start-date.js
git commit -m "feat(onboarding): resolveStartDate helper + plan_start_date wiring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: The "When do you want to start?" wizard step + summary row (UI)

**Files:**
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx` (import helpers; add option catalogue; add step; add summary row)

**Interfaces:**
- Consumes: `resolveStartDate`, `localISODate` (Task 1), and existing primitives `Chip`, `OptionGrid`, `INPUT`, `FIELD_LABEL`, `HINT`, `SummaryRow` (already in this file).

There is no React test harness in this repo (tests are Node logic scripts), so this task is verified by running the app, not a unit test. All the date logic is already covered by Task 1.

- [ ] **Step 1: Import the helpers**

In `apps/mobile/src/components/OnboardingWizard.jsx`, change line 12:
```js
import { BLANK_ANSWERS } from '../lib/onboardingModel.js';
```
to:
```js
import { BLANK_ANSWERS, localISODate, resolveStartDate } from '../lib/onboardingModel.js';
```

- [ ] **Step 2: Add the option catalogue**

In `apps/mobile/src/components/OnboardingWizard.jsx`, after the `DAYS` catalogue (around line 53), add:

```js
const START_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'monday', label: 'Next Monday' },
  { key: 'date', label: 'Pick a date' }
];
```

- [ ] **Step 3: Add the step**

In the `steps` array, insert this object immediately AFTER the `'How much can you train?'` step (after its closing `},` near line 295) and BEFORE the `showLifts && {` step:

```jsx
    { title: 'When do you want to start?', subtitle: 'Your plan is laid out on the calendar from this day.',
      valid: () => a.startWhen !== 'date' || (!!a.startDate && a.startDate >= localISODate()),
      render: () => (
        <div style={{ display: 'grid', gap: 16 }}>
          <OptionGrid cols={2}>
            {START_OPTIONS.map(o => (
              <Chip key={o.key} center selected={a.startWhen === o.key}
                onClick={() => set({ startWhen: o.key })} label={o.label} />
            ))}
          </OptionGrid>
          {a.startWhen === 'date' && (
            <div>
              <label style={FIELD_LABEL}>Pick a date</label>
              <input type="date" style={INPUT} value={a.startDate || ''}
                min={localISODate()} onChange={e => set({ startDate: e.target.value })} />
            </div>
          )}
          <div style={HINT}>Weeks run Mon–Sun. Starting mid-week gives a shorter first week — pick “Next Monday” for a full first week.</div>
        </div>
      ) },
```

- [ ] **Step 4: Add the summary row**

In the `'Ready to go'` step's `render`, inside the returned `<div style={{ display: 'grid', gap: 6 }}>`, after the `Week` SummaryRow (line 387), add:

```jsx
            <SummaryRow label="Starts" value={resolveStartDate(a.startWhen, a.startDate)} />
```

- [ ] **Step 5: Run the app and verify the step**

Run: `npm run dev` (from repo root; delegates to apps/mobile).
Verify in the browser:
1. New onboarding (or the `/dev` tester, which renders `OnboardingWizard`) reaches a **"When do you want to start?"** step after "How much can you train?".
2. **Today** is pre-selected; Continue is enabled immediately.
3. Selecting **Pick a date** reveals a date input whose `min` is today; Continue is disabled until a today-or-later date is chosen.
4. Selecting **Next Monday** / **Tomorrow** keeps Continue enabled.
5. The final **Ready to go** summary shows a `Starts` row with the resolved date.
6. Completing onboarding writes the chosen `plan_start_date` (check the plan calendar anchors to that day).

- [ ] **Step 6: Run the full suite (no regressions)**

Run: `cd apps/mobile && for f in tests/*.js; do node "$f"; done | grep '^FAIL:' || echo "NO FAILURES"`
Expected: `NO FAILURES`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/OnboardingWizard.jsx
git commit -m "feat(onboarding): add 'when do you want to start?' question

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- "Add the question with Today/Tomorrow/Next Monday/Pick a date" → Task 2 Step 3 (catalogue + step). ✅
- "Write `plan_start_date` as a local ISO date" → Task 1 (`resolveStartDate` uses `localISODate`). ✅
- "Pure, unit-testable `resolveStartDate(option, customDate, now)`" → Task 1 helper + tests. ✅
- "Default to Today + the partial-first-week note" → `BLANK_ANSWERS.startWhen='today'` (Task 1 Step 3) + HINT copy (Task 2 Step 3). ✅
- "Next Monday = soonest Monday today-or-later; Pick-a-date clamped to today-or-later" → Task 1 (S3–S8) + UI `min`/`valid` (Task 2). ✅
- "No engine change; downstream already consumes `plan_start_date`" → confirmed; only onboardingModel + wizard touched. ✅
- Timezone test (local not UTC) → Task 1 runs under `TZ=Europe/London`; `localISODate` is the local-date path. ✅

**Placeholder scan:** No TBD/TODO; every code step shows the exact code. ✅

**Type consistency:** `resolveStartDate(option, customDate, now)` signature is identical in Task 1 (definition), the tests, and both Task 2 call sites (`resolveStartDate(a.startWhen, a.startDate)`). `startWhen`/`startDate` answer keys match between `BLANK_ANSWERS`, the step, and the summary row. ✅
