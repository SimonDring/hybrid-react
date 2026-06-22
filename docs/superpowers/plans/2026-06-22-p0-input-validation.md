# P0 Input-Validation Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate every user-facing write before it is persisted, so out-of-range numbers are blocked (with a friendly message) and free text is trimmed/capped — at both the app layer and the database.

**Architecture:** A pure, dependency-free "rulebook" (`src/lib/validation/`) is the single source of truth for field limits and exposes per-payload validators returning `{ ok, value, errors }`. The four target store actions (`updateProfile`, `upsertDailyMetric`, `completeSession`, `addInjury`) run the matching validator before writing and return the result; the onboarding screen (the only screen with free numeric entry) surfaces errors inline. A Supabase migration mirrors the numeric ranges and length caps as `CHECK` constraints for defence in depth.

**Tech Stack:** React 18 + Vite, Zustand, Supabase (Postgres), plain ESM modules, node-script tests (`node tests/<file>.js`).

## Global Constraints

- **No new dependencies** — hand-rolled validators only (no zod/yup). Keep `package.json` deps unchanged.
- **Validators are pure** — no React, no I/O, no imports from `Database.js`/`SyncService.js`. Safe to unit-test under node.
- **`'' `/`null`/`undefined` mean "not provided"** → normalise to `null`, never an error (matches existing `numOrNull` in `src/lib/onboardingModel.js:16-20`).
- **Behaviour = "Block & explain":** out-of-range numbers and unknown enums → `ok:false` + a message; free text → silently trimmed + length-capped (never an error).
- **`validateProfile` only touches recognised keys** and passes every other key of the patch through untouched (internal patches like `lift_log`, `load_overrides`, `focus`, nulls from `clearPlan` must survive unchanged).
- **Offline-first write path is unchanged** — validators run *before* `Sync.*`; the existing synchronous-local-write-then-background-sync behaviour stays.
- **Theme/UI:** any new UI uses only real theme vars (`--rust`, `--txt-muted`, `--hairline`, …) — never invented ones.
- **Test convention:** new tests are node scripts run with `node tests/<file>.js`, using the `assert(cond, msg)` + `console.log('PASS'/'FAIL')` + `process.exitCode` pattern from `tests/atlas-and-coachnote.js`.

---

## File Structure

- **Create** `src/lib/validation/rules.js` — limit/enum/length config (the tunable source of truth).
- **Create** `src/lib/validation/validate.js` — generic helpers + the four validators.
- **Create** `tests/validation.js` — node unit tests for the rulebook.
- **Create** `supabase/migrations/010_validation_constraints.sql` — DB CHECK constraints.
- **Modify** `src/stores/trainingStore.js` — import validators; gate the 4 actions.
- **Modify** `src/screens/Onboarding.jsx` — inline error surface on submit.

---

## Task 1: Validation rulebook + generic helpers

**Files:**
- Create: `src/lib/validation/rules.js`
- Create: `src/lib/validation/validate.js`
- Test: `tests/validation.js`

**Interfaces:**
- Produces: `num(v, spec, label) -> { ok:boolean, value?:number|null, error?:string }`; `oneOf(v, allowed, label) -> { ok, value?, error? }`; `text(v, max) -> string`; and the exported config `LIMITS`, `ENUMS`, `SESSION_MINUTES`, `TEXT_MAX`.

- [ ] **Step 1: Write `src/lib/validation/rules.js`**

```js
/**
 * rules — the single, tunable source of truth for input limits. Pure data.
 * Numbers are [min, max]; `int:true` requires a whole number. Enum lists mirror
 * the values the UI already offers. Text caps are max character lengths.
 */
export const LIMITS = {
  age:                { min: 13, max: 120, int: true },
  bodyweight_kg:      { min: 30, max: 300 },
  lift:               { min: 0,  max: 500 },          // squat / bench / deadlift (kg)
  daysPerWeek:        { min: 1,  max: 7, int: true },
  rating:             { min: 1,  max: 5, int: true }, // quality/energy/recovery/soreness/mood/severity
  rpe:                { min: 1,  max: 10 },
  resting_hr:         { min: 30, max: 220 },
  hrv_ms:             { min: 1,  max: 400 },
  spo2_pct:           { min: 50, max: 100 },
  sleep_score:        { min: 0,  max: 100 },
  sleep_duration_min: { min: 0,  max: 1440 },
};

export const SESSION_MINUTES = [20, 30, 45, 60, 75, 90];

export const ENUMS = {
  goal_type:      ['build', 'sport'],
  strength_style: ['strength', 'bodybuilding', 'functional'],
  sport:          ['run', 'cycle', 'swim'],
  sport_intent:   ['compete', 'recreational', 'build_base'],
  run_discipline: ['sprint', 'middle', 'long'],
  experience:     ['beginner', 'returning', 'intermediate', 'advanced'],
  equipment:      ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  injury_status:  ['active', 'rehabbing', 'recovered', 'monitoring'],
};

export const TEXT_MAX = {
  name: 80, title: 120, notes: 2000, description: 2000,
  rehab_plan: 2000, prevention_notes: 2000, markers: 2000,
};
```

- [ ] **Step 2: Write `src/lib/validation/validate.js` (helpers only for now)**

```js
/**
 * validate — pure input validators. Each per-payload validator returns
 *   { ok:boolean, value:object, errors:{ [field]:string } }
 * where `value` is the normalised payload (text trimmed+capped, numbers parsed)
 * and `errors` is populated only when a number/enum is out of range.
 */
import { LIMITS, ENUMS, SESSION_MINUTES, TEXT_MAX } from './rules.js';

const isEmpty = (v) => v === '' || v === null || v === undefined;

// Number within [min,max]; integer when spec.int. Empty → null (not an error).
export function num(v, spec, label) {
  if (isEmpty(v)) return { ok: true, value: null };
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} must be a number.` };
  if (spec.int && !Number.isInteger(n)) return { ok: false, error: `${label} must be a whole number.` };
  if (n < spec.min || n > spec.max) return { ok: false, error: `${label} must be between ${spec.min} and ${spec.max}.` };
  return { ok: true, value: n };
}

// Value must be one of `allowed`. Empty → null (not an error).
export function oneOf(v, allowed, label) {
  if (isEmpty(v)) return { ok: true, value: null };
  if (!allowed.includes(v)) return { ok: false, error: `${label} is not a recognised value.` };
  return { ok: true, value: v };
}

// Trim and cap free text. Empty → ''. Never an error.
export function text(v, max) {
  if (isEmpty(v)) return '';
  return String(v).trim().slice(0, max);
}
```

- [ ] **Step 3: Write the failing test scaffold `tests/validation.js`**

```js
// tests/validation.js — pure input-validation rulebook.
import { num, oneOf, text } from '../src/lib/validation/validate.js';
import { LIMITS, ENUMS, TEXT_MAX } from '../src/lib/validation/rules.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ---- generic helpers -----------------------------------------------------
assert(num('', LIMITS.age, 'Age').value === null, 'H1 empty number → null, no error');
assert(num(30, LIMITS.age, 'Age').ok === true, 'H2 in-range number passes');
assert(num(999, LIMITS.age, 'Age').ok === false, 'H3 out-of-range number rejected');
assert(num(12.5, LIMITS.age, 'Age').ok === false, 'H4 non-integer rejected when int required');
assert(oneOf('strength', ENUMS.strength_style, 'Style').ok === true, 'H5 known enum passes');
assert(oneOf('ADMIN', ENUMS.strength_style, 'Style').ok === false, 'H6 unknown enum rejected');
assert(text('  hi  ', TEXT_MAX.name) === 'hi', 'H7 text trimmed');
assert(text('x'.repeat(5000), TEXT_MAX.notes).length === TEXT_MAX.notes, 'H8 text capped to max');
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/validation.js`
Expected: 8 lines beginning `PASS:` (H1–H8), exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/rules.js src/lib/validation/validate.js tests/validation.js
git commit -m "feat(validation): add rulebook + generic field validators"
```

---

## Task 2: `validateProfile`

**Files:**
- Modify: `src/lib/validation/validate.js`
- Test: `tests/validation.js`

**Interfaces:**
- Consumes: `num`, `oneOf`, `text`, `LIMITS`, `ENUMS`, `SESSION_MINUTES`, `TEXT_MAX`.
- Produces: `validateProfile(patch) -> { ok, value, errors }` — validates only recognised keys, passes all other keys through untouched.

- [ ] **Step 1: Add `safeAvatarUrl` + `validateProfile` to `src/lib/validation/validate.js`**

```js
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Only allow a data-image URL or an https URL on our own Supabase storage host.
function safeAvatarUrl(url) {
  if (isEmpty(url)) return null;
  const s = String(url);
  if (s.startsWith('data:image/')) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' && u.hostname.endsWith('.supabase.co')) return s;
  } catch { /* not a URL */ }
  return null;
}

export function validateProfile(patch = {}) {
  const value = { ...patch };
  const errors = {};
  const setNum = (key, raw, spec, label) => {
    const r = num(raw, spec, label);
    if (r.ok) value[key] = r.value; else errors[key] = r.error;
  };
  const setEnum = (key, raw, allowed, label) => {
    const r = oneOf(raw, allowed, label);
    if (r.ok) { if (r.value !== null) value[key] = r.value; } else errors[key] = r.error;
  };

  if ('age' in patch)            setNum('age', patch.age, LIMITS.age, 'Age');
  if ('bodyweight_kg' in patch)  setNum('bodyweight_kg', patch.bodyweight_kg, LIMITS.bodyweight_kg, 'Bodyweight');
  if ('name' in patch)           value.name = text(patch.name, TEXT_MAX.name);
  if ('markers' in patch)        value.markers = text(patch.markers, TEXT_MAX.markers);
  if ('goal_type' in patch)      setEnum('goal_type', patch.goal_type, ENUMS.goal_type, 'Goal');
  if ('strength_style' in patch) setEnum('strength_style', patch.strength_style, ENUMS.strength_style, 'Training style');
  if ('sport' in patch)          setEnum('sport', patch.sport, ENUMS.sport, 'Sport');
  if ('sport_intent' in patch)   setEnum('sport_intent', patch.sport_intent, ENUMS.sport_intent, 'Sport intent');
  if ('run_discipline' in patch) setEnum('run_discipline', patch.run_discipline, ENUMS.run_discipline, 'Run discipline');

  if (patch.lifts && typeof patch.lifts === 'object') {
    const lifts = { ...patch.lifts };
    for (const k of ['squat', 'bench', 'deadlift']) {
      if (k in patch.lifts) {
        const r = num(patch.lifts[k], LIMITS.lift, `${cap(k)} 1RM`);
        if (r.ok) lifts[k] = r.value; else errors[`lifts.${k}`] = r.error;
      }
    }
    value.lifts = lifts;
  }

  if (patch.availability && typeof patch.availability === 'object') {
    const av = { ...patch.availability };
    if ('days_per_week' in patch.availability) {
      const r = num(patch.availability.days_per_week, LIMITS.daysPerWeek, 'Days per week');
      if (r.ok) av.days_per_week = r.value; else errors['availability.days_per_week'] = r.error;
    }
    if ('session_minutes' in patch.availability && !isEmpty(patch.availability.session_minutes)) {
      const sm = Number(patch.availability.session_minutes);
      if (SESSION_MINUTES.includes(sm)) av.session_minutes = sm;
      else errors['availability.session_minutes'] = 'Session length is not a recognised value.';
    }
    value.availability = av;
  }

  if (patch.experience && typeof patch.experience === 'object' && 'gym' in patch.experience) {
    const r = oneOf(patch.experience.gym, ENUMS.experience, 'Experience');
    if (r.ok) value.experience = { ...patch.experience, gym: r.value };
    else errors['experience.gym'] = r.error;
  }

  if (Array.isArray(patch.access)) value.access = patch.access.filter((e) => ENUMS.equipment.includes(e));

  if (patch.avatar && typeof patch.avatar === 'object' && 'url' in patch.avatar) {
    value.avatar = { ...patch.avatar, url: safeAvatarUrl(patch.avatar.url) };
  }

  return { ok: Object.keys(errors).length === 0, value, errors };
}
```

- [ ] **Step 2: Add failing tests to `tests/validation.js`**

```js
import { validateProfile } from '../src/lib/validation/validate.js';

// ---- validateProfile -----------------------------------------------------
const okProfile = validateProfile({ age: 34, bodyweight_kg: 78, strength_style: 'strength' });
assert(okProfile.ok === true, 'P1 valid profile passes');

const badAge = validateProfile({ age: 999 });
assert(badAge.ok === false && badAge.errors.age, 'P2 out-of-range age rejected with message');

const passthrough = validateProfile({ lift_log: { squat: { e1rm: 150 } }, focus: ['gym'], strength_style: null });
assert(passthrough.ok === true && passthrough.value.lift_log.squat.e1rm === 150, 'P3 unrecognised keys pass through untouched');

const longName = validateProfile({ name: 'n'.repeat(200) });
assert(longName.value.name.length === TEXT_MAX.name && longName.ok === true, 'P4 name trimmed/capped, not an error');

const badLift = validateProfile({ lifts: { squat: 9999, bench: 100, deadlift: 180 } });
assert(badLift.ok === false && badLift.errors['lifts.squat'], 'P5 absurd lift rejected, valid ones kept');

const junkAvatar = validateProfile({ avatar: { url: 'http://evil.example/x.js', color: 'red' } });
assert(junkAvatar.value.avatar.url === null && junkAvatar.value.avatar.color === 'red', 'P6 untrusted avatar URL dropped');

const dataAvatar = validateProfile({ avatar: { url: 'data:image/jpeg;base64,abc' } });
assert(dataAvatar.value.avatar.url === 'data:image/jpeg;base64,abc', 'P7 data-image avatar URL kept');
```

- [ ] **Step 3: Run the tests**

Run: `node tests/validation.js`
Expected: H1–H8 and P1–P7 all `PASS:`, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/validate.js tests/validation.js
git commit -m "feat(validation): add validateProfile (partial-patch tolerant)"
```

---

## Task 3: `validateDailyMetric`, `validateSessionLog`, `validateInjury`

**Files:**
- Modify: `src/lib/validation/validate.js`
- Test: `tests/validation.js`

**Interfaces:**
- Produces: `validateDailyMetric(fields)`, `validateSessionLog(payload)`, `validateInjury(fields)` — each `-> { ok, value, errors }`.

- [ ] **Step 1: Append the three validators to `src/lib/validation/validate.js`**

```js
const METRIC_SPECS = {
  resting_hr: [LIMITS.resting_hr, 'Resting HR'],
  hrv_ms: [LIMITS.hrv_ms, 'HRV'],
  spo2_pct: [LIMITS.spo2_pct, 'SpO₂'],
  sleep_score: [LIMITS.sleep_score, 'Sleep score'],
  sleep_duration_min: [LIMITS.sleep_duration_min, 'Sleep duration'],
  energy: [LIMITS.rating, 'Energy'],
  soreness: [LIMITS.rating, 'Soreness'],
  mood: [LIMITS.rating, 'Mood'],
};

export function validateDailyMetric(fields = {}) {
  const value = { ...fields };
  const errors = {};
  for (const [key, [spec, label]] of Object.entries(METRIC_SPECS)) {
    if (key in fields) {
      const r = num(fields[key], spec, label);
      if (r.ok) value[key] = r.value; else errors[key] = r.error;
    }
  }
  if ('notes' in fields) value.notes = text(fields.notes, TEXT_MAX.notes);
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateSessionLog(payload = {}) {
  const value = { ...payload };
  const errors = {};
  for (const k of ['quality', 'energy', 'recovery']) {
    if (k in payload) {
      const r = num(payload[k], LIMITS.rating, cap(k));
      if (r.ok) value[k] = r.value; else errors[k] = r.error;
    }
  }
  if ('notes' in payload) value.notes = text(payload.notes, TEXT_MAX.notes);
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateInjury(fields = {}) {
  const value = { ...fields };
  const errors = {};
  if ('severity' in fields) {
    const r = num(fields.severity, LIMITS.rating, 'Severity');
    if (r.ok) value.severity = r.value; else errors.severity = r.error;
  }
  if ('status' in fields) {
    const r = oneOf(fields.status, ENUMS.injury_status, 'Status');
    if (r.ok) { if (r.value !== null) value.status = r.value; } else errors.status = r.error;
  }
  if ('title' in fields)     value.title = text(fields.title, TEXT_MAX.title);
  if ('body_part' in fields) value.body_part = text(fields.body_part, TEXT_MAX.title);
  for (const k of ['description', 'rehab_plan', 'prevention_notes']) {
    if (k in fields) value[k] = text(fields[k], TEXT_MAX.notes);
  }
  return { ok: Object.keys(errors).length === 0, value, errors };
}
```

- [ ] **Step 2: Add failing tests to `tests/validation.js`**

```js
import { validateDailyMetric, validateSessionLog, validateInjury } from '../src/lib/validation/validate.js';

// ---- daily metric / session log / injury ---------------------------------
assert(validateDailyMetric({ resting_hr: 52, energy: 4 }).ok === true, 'D1 valid daily metric passes');
assert(validateDailyMetric({ energy: 50 }).ok === false, 'D2 out-of-range rating rejected');
assert(validateDailyMetric({ resting_hr: -10 }).ok === false, 'D3 negative HR rejected');

assert(validateSessionLog({ quality: 4, energy: 3, recovery: 5, notes: 'good' }).ok === true, 'S1 valid session log passes');
assert(validateSessionLog({ quality: 999 }).ok === false, 'S2 rating overflow rejected');
assert(validateSessionLog({ notes: 'x'.repeat(9000) }).value.notes.length === TEXT_MAX.notes, 'S3 session notes capped');

assert(validateInjury({ severity: 3, status: 'active', title: 'Tweaked knee' }).ok === true, 'I1 valid injury passes');
assert(validateInjury({ severity: 12 }).ok === false, 'I2 severity overflow rejected');
assert(validateInjury({ status: 'EXPLODED' }).ok === false, 'I3 unknown status rejected');
assert(validateInjury({ title: 't'.repeat(500) }).value.title.length === TEXT_MAX.title, 'I4 injury title capped');
```

- [ ] **Step 3: Run the tests**

Run: `node tests/validation.js`
Expected: all H/P/D/S/I assertions `PASS:`, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/validate.js tests/validation.js
git commit -m "feat(validation): add daily-metric, session-log, injury validators"
```

---

## Task 4: Gate the four store actions

**Files:**
- Modify: `src/stores/trainingStore.js` (import at top; actions `updateProfile` ~305, `addInjury` ~376, `upsertDailyMetric` ~394, `completeSession` ~259)

**Interfaces:**
- Consumes: `validateProfile`, `validateDailyMetric`, `validateSessionLog`, `validateInjury`.
- Produces: each gated action returns `{ ok:true }` on success or `{ ok:false, errors }` when validation fails (and does not write).

- [ ] **Step 1: Add the import** (next to the other `../lib/...` imports near the top of `src/stores/trainingStore.js`)

```js
import { validateProfile, validateDailyMetric, validateSessionLog, validateInjury } from '../lib/validation/validate.js';
```

- [ ] **Step 2: Replace `updateProfile`** (currently `src/stores/trainingStore.js:305-308`)

```js
  // ----- Profile -----
  async updateProfile(patch) {
    const { ok, value, errors } = validateProfile(patch);
    if (!ok) return { ok: false, errors };
    await Sync.updateProfile(value);
    set(buildView());
    return { ok: true };
  },
```

- [ ] **Step 3: Replace `completeSession`** (currently `src/stores/trainingStore.js:259-262`)

```js
  completeSession(templateRef, payload) {
    const { ok, value, errors } = validateSessionLog(payload || {});
    if (!ok) return { ok: false, errors };
    Sync.completeSession(templateRef, value).catch(e => console.error('completeSession sync failed:', e));
    set(buildView());
    return { ok: true };
  },
```

- [ ] **Step 4: Replace `addInjury`** (currently `src/stores/trainingStore.js:376-379`)

```js
  // ----- Injuries -----
  async addInjury(fields) {
    const { ok, value, errors } = validateInjury(fields);
    if (!ok) return { ok: false, errors };
    await Sync.addInjury(value);
    set(buildView());
    return { ok: true };
  },
```

- [ ] **Step 5: Replace `upsertDailyMetric`** (currently `src/stores/trainingStore.js:394-397`)

```js
  // ----- Daily metrics -----
  async upsertDailyMetric(fields) {
    const { ok, value, errors } = validateDailyMetric(fields);
    if (!ok) return { ok: false, errors };
    await Sync.upsertDailyMetric(value);
    set(buildView());
    return { ok: true };
  },
```

- [ ] **Step 6: Verify the app still builds and a normal flow still saves**

Run: `npm run dev` (or the preview tooling). Then:
- Complete a session with ratings + a note → it still completes and the note saves.
- Confirm no console errors on load.

Expected: PASS — normal completion works (button ratings are always 1–5, so `ok:true`); the note is saved trimmed.

- [ ] **Step 7: Re-run the unit tests (regression guard)**

Run: `node tests/validation.js`
Expected: all assertions still `PASS:`.

- [ ] **Step 8: Commit**

```bash
git add src/stores/trainingStore.js
git commit -m "feat(validation): gate profile/session/injury/daily-metric writes"
```

---

## Task 5: Surface validation errors in onboarding

**Files:**
- Modify: `src/screens/Onboarding.jsx` (the `handleComplete` handler at `:32-37` and the returned JSX at `:39`)
- Modify: `src/styles/main.css` (one small rule for the error banner)

**Rationale:** Onboarding is the only screen with free numeric text entry (age, bodyweight, lifts) a user can push out of range. Session ratings and injury severity are 1–5 buttons and free text is capped silently, so those paths rely on the store guard + DB constraints (Task 4 / Task 6) and need no visible error here.

**Interfaces:**
- Consumes: the `{ ok, errors }` return of `updateProfile` from Task 4.

- [ ] **Step 1: Add error state + gate `handleComplete`, and render an inline banner** in `src/screens/Onboarding.jsx`

Add `useState` to the React import if not already present, then replace the handler and the `return`:

```jsx
  const [submitError, setSubmitError] = useState(null);

  const handleComplete = async (a) => {
    setSubmitError(null);
    const res = await updateProfile(answersToProfilePatch(a));
    if (!res || res.ok === false) {
      const first = res && res.errors ? Object.values(res.errors)[0] : null;
      setSubmitError(first || 'Please check your details and try again.');
      return; // block: profile not saved, onboarding stays open
    }
    await setGoals([]);   // strength-focused: no separate ranked goals; clear any legacy ones
    for (const inj of answersToInjuries(a)) await addInjury(inj);
    // onboarded:true is now in the store → App.jsx gate unmounts this screen.
  };

  return (
    <>
      {submitError && <div className="onboard-error" role="alert">{submitError}</div>}
      <OnboardingWizard initialAnswers={initialAnswers} onComplete={handleComplete} />
    </>
  );
```

- [ ] **Step 2: Add the banner style** to `src/styles/main.css`

```css
.onboard-error {
  margin: 12px 16px 0;
  padding: 10px 14px;
  border: 1px solid var(--rust);
  border-radius: var(--r-md);
  color: var(--rust);
  font-size: 13px;
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`. Start onboarding, enter **age `999`** (or bodyweight `5000`), reach the end and finish.
Expected: the red banner shows *"Age must be between 13 and 120."*, onboarding does **not** complete. Correct the value → it completes normally.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Onboarding.jsx src/styles/main.css
git commit -m "feat(validation): show inline onboarding errors on invalid input"
```

---

## Task 6: Database CHECK constraints (defence in depth)

**Files:**
- Create: `supabase/migrations/010_validation_constraints.sql`

**Notes:** Constraints are added `NOT VALID` so they enforce on all new inserts/updates without failing on any pre-existing out-of-range dev rows. A `CHECK` passes when the column is `NULL`, so optional fields stay nullable. `jsonb` columns (`users.profile`, `injuries.recovery_log`) are not covered here — their internals are enforced by the app layer (Tasks 2–3).

- [ ] **Step 1: Write `supabase/migrations/010_validation_constraints.sql`**

```sql
-- ============================================================================
-- 010_validation_constraints.sql — server-side value bounds (defence in depth)
-- ============================================================================
-- Mirrors src/lib/validation/rules.js. Run in the Supabase SQL editor.
-- Constraints are NOT VALID so they apply to new/updated rows without failing
-- on legacy data. CHECKs allow NULL, so optional fields stay optional.
-- Safe to re-run: each constraint is dropped first.
-- ============================================================================

-- session_logs: 1–5 ratings + capped notes
alter table public.session_logs drop constraint if exists chk_session_logs_quality;
alter table public.session_logs add  constraint chk_session_logs_quality  check (quality  between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_energy;
alter table public.session_logs add  constraint chk_session_logs_energy   check (energy   between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_recovery;
alter table public.session_logs add  constraint chk_session_logs_recovery check (recovery between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_notes_len;
alter table public.session_logs add  constraint chk_session_logs_notes_len check (char_length(notes) <= 2000) not valid;

-- daily_metrics: physiological + subjective bounds + capped notes
alter table public.daily_metrics drop constraint if exists chk_daily_resting_hr;
alter table public.daily_metrics add  constraint chk_daily_resting_hr   check (resting_hr between 30 and 220) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_hrv;
alter table public.daily_metrics add  constraint chk_daily_hrv          check (hrv_ms between 1 and 400) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_spo2;
alter table public.daily_metrics add  constraint chk_daily_spo2         check (spo2_pct between 50 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_score;
alter table public.daily_metrics add  constraint chk_daily_sleep_score  check (sleep_score between 0 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_dur;
alter table public.daily_metrics add  constraint chk_daily_sleep_dur    check (sleep_duration_min between 0 and 1440) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_energy;
alter table public.daily_metrics add  constraint chk_daily_energy       check (energy between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_soreness;
alter table public.daily_metrics add  constraint chk_daily_soreness     check (soreness between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_mood;
alter table public.daily_metrics add  constraint chk_daily_mood         check (mood between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_notes_len;
alter table public.daily_metrics add  constraint chk_daily_notes_len    check (char_length(notes) <= 2000) not valid;

-- weekly_checkins: bounds + capped notes (DB-level only; app wiring deferred)
alter table public.weekly_checkins drop constraint if exists chk_checkin_bodyweight;
alter table public.weekly_checkins add  constraint chk_checkin_bodyweight check (bodyweight_kg between 30 and 300) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_resting_hr;
alter table public.weekly_checkins add  constraint chk_checkin_resting_hr check (resting_hr between 30 and 220) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_rpe;
alter table public.weekly_checkins add  constraint chk_checkin_rpe        check (avg_rpe between 1 and 10) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_sleep_score;
alter table public.weekly_checkins add  constraint chk_checkin_sleep_score check (sleep_score between 0 and 100) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_knee;
alter table public.weekly_checkins add  constraint chk_checkin_knee       check (knee_rating between 1 and 5) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_notes_len;
alter table public.weekly_checkins add  constraint chk_checkin_notes_len  check (char_length(notes) <= 2000) not valid;

-- injuries: 1–5 severity, enum status, capped text
alter table public.injuries drop constraint if exists chk_injury_severity;
alter table public.injuries add  constraint chk_injury_severity check (severity between 1 and 5) not valid;
alter table public.injuries drop constraint if exists chk_injury_status;
alter table public.injuries add  constraint chk_injury_status   check (status in ('active','rehabbing','recovered','monitoring')) not valid;
alter table public.injuries drop constraint if exists chk_injury_title_len;
alter table public.injuries add  constraint chk_injury_title_len check (char_length(title) <= 120) not valid;
alter table public.injuries drop constraint if exists chk_injury_desc_len;
alter table public.injuries add  constraint chk_injury_desc_len  check (char_length(description) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_rehab_len;
alter table public.injuries add  constraint chk_injury_rehab_len check (char_length(rehab_plan) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_prevention_len;
alter table public.injuries add  constraint chk_injury_prevention_len check (char_length(prevention_notes) <= 2000) not valid;
```

- [ ] **Step 2: Review against the live schema before running**

Confirm each constrained column exists with the expected name in `supabase/schema.sql` (and migrations 006/008/20260612 for any later-added columns). If a column name differs, fix the constraint to match — do not run unverified SQL.

- [ ] **Step 3: Run it in the Supabase SQL editor** (manual, per the 001–009 convention)

Paste the file into SQL Editor → Run. Expected: `Success. No rows returned`.

- [ ] **Step 4: Smoke-test enforcement** (optional, in the SQL editor)

```sql
-- Should ERROR with a check-constraint violation:
update public.session_logs set quality = 99 where id = (select id from public.session_logs limit 1);
```
Expected: `new row ... violates check constraint "chk_session_logs_quality"`. (No row was changed.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/010_validation_constraints.sql
git commit -m "feat(validation): add DB CHECK constraints (010 migration)"
```

---

## Self-review (completed against the spec)

- **Spec coverage:** Layer 1 rulebook → Tasks 1–3; Layer 2 store wiring → Task 4; UI surface → Task 5; Layer 3 migration → Task 6. Behaviour "block & explain" (reject numbers, cap text) implemented in `num`/`text` and exercised by tests P2/P4/S2/S3/I2/I4. `validateProfile` pass-through covered by test P3. avatar.url covered by P6/P7.
- **Scope note vs spec:** the spec listed four screens for inline errors; implementation review found only onboarding has free numeric entry (others are button-constrained / silently capped), so Task 5 is onboarding-only — the other paths are still guarded at the store + DB layers. This is a deliberate narrowing, recorded here.
- **Type consistency:** every action returns `{ ok, value?, errors? }`; validators uniformly return `{ ok, value, errors }`; helper `num`/`oneOf` return `{ ok, value?, error? }` (singular `error`, aggregated into `errors` by each validator). Consistent across Tasks 1–4.
- **No placeholders:** every code/SQL step contains complete content; commands have expected output.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-22-p0-input-validation.md`.
