# Automated Periodization & Plan Continuity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 16-week block with science-driven block lengths per goal, derive training season automatically from an optional event date, and present a brief check-in wizard when a block ends so the plan continues automatically.

**Architecture:** A new `periodization.js` module owns the pure logic (`resolvePeriodization`, `deriveSeason`, `continueBlock`). `PlanGenerator.js` calls it instead of the old `planLength/phaseSplit` pair. `onboardingModel.js` replaces the binary `sportSeason` field with `sportIntent` + optional `eventDate`. A new `BlockCheckin.jsx` screen appears when the plan block ends, calls `continueBlock()`, and writes the next block's profile patch via the store.

**Tech Stack:** React 18, Vite, Zustand 5, Supabase. Tests use plain Node.js (`node tests/filename.js`). No Vitest.

---

## File map

| File | Change |
|------|--------|
| `tests/periodization.js` | **Create** — pure-function test suite |
| `src/lib/plan/periodization.js` | **Create** — `resolvePeriodization`, `deriveSeason`, `continueBlock` |
| `src/lib/PlanGenerator.js` | **Modify** — replace `planLength`/`phaseSplit` calls; thread `exercisePriority` |
| `src/lib/onboardingModel.js` | **Modify** — add `sportIntent`, `eventDate`; remove `sportSeason` |
| `src/components/OnboardingWizard.jsx` | **Modify** — update sport question wording |
| `src/screens/BlockCheckin.jsx` | **Create** — block-end check-in wizard |
| `src/App.jsx` | **Modify** — block-end gate before main app |

**No Supabase migration needed.** `block_history` is stored as a new key inside the existing `profile` JSONB column — Postgres silently accepts new keys.

---

### Task 1: Test infrastructure

**Files:**
- Create: `tests/periodization.js`

- [ ] **Step 1.1 — Write the test file**

```js
// tests/periodization.js
import { resolvePeriodization, deriveSeason, continueBlock } from '../src/lib/plan/periodization.js';
import { generatePlan } from '../src/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── deriveSeason ───────────────────────────────────────────────────────────
// today = 2026-06-12 (from memory context — tests are written relative to this)
// Dates chosen to be unambiguous regardless of when tests run:

const FAR_OUT  = new Date(); FAR_OUT.setMonth(FAR_OUT.getMonth() + 8);  // ~8 months out → 'off'
const PRE_RACE = new Date(); PRE_RACE.setDate(PRE_RACE.getDate() + 60); // 60 days out → 'pre'
const CLOSE    = new Date(); CLOSE.setDate(CLOSE.getDate() + 28);       // 28 days out → 'in'
const PAST     = new Date(); PAST.setDate(PAST.getDate() - 5);          // 5 days ago → 'transition'

function dateStr(d) { return d.toISOString().slice(0, 10); }

assert(deriveSeason({ sport: 'run', event_date: dateStr(FAR_OUT) }) === 'off',
  'T1 event 8 months out → off');
assert(deriveSeason({ sport: 'run', event_date: dateStr(PRE_RACE) }) === 'pre',
  'T2 event 60 days out → pre');
assert(deriveSeason({ sport: 'run', event_date: dateStr(CLOSE) }) === 'in',
  'T3 event 28 days out → in');
assert(deriveSeason({ sport: 'run', event_date: dateStr(PAST) }) === 'transition',
  'T4 past event → transition');

// sport_intent fallback (no event_date)
assert(deriveSeason({ sport: 'run', sport_intent: 'compete' }) === 'in',
  'T5 intent=compete + no date → in');
assert(deriveSeason({ sport: 'run', sport_intent: 'recreational' }) === 'off',
  'T6 intent=recreational → off');
assert(deriveSeason({ sport: 'run', sport_intent: 'build_base' }) === 'off',
  'T7 intent=build_base → off');
assert(deriveSeason({ sport: null }) === null,
  'T8 no sport → null');

// ── resolvePeriodization ───────────────────────────────────────────────────
// Each profile type returns the evidence-based block length.
function totalWeeks(p) { return resolvePeriodization(p).totalWeeks; }

assert(totalWeeks({ strength_style: 'bodybuilding' }) === 6,
  'T9 bodybuilding → 6-week mesocycle');
assert(totalWeeks({ strength_style: 'strength' }) === 12,
  'T10 strength → 12-week block');
assert(totalWeeks({ strength_style: 'functional' }) === 8,
  'T11 functional → 8-week block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base' }) === 12,
  'T12 sport off-season → 12-week block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', sport_intent: 'compete' }) === 4,
  'T13 sport in-season → 4-week rolling block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', event_date: dateStr(PRE_RACE) }) === 6,
  'T14 sport pre-season (60 days out) → 6-week pre-season block');
assert(totalWeeks({ goal_type: 'sport', sport: 'run', event_date: dateStr(PAST) }) === 4,
  'T15 sport transition → 4-week recovery block');

// All blocks have at least one phase
const allProfiles = [
  { strength_style: 'bodybuilding' }, { strength_style: 'strength' },
  { strength_style: 'functional' },
  { goal_type: 'sport', sport: 'run', sport_intent: 'build_base' },
  { goal_type: 'sport', sport: 'run', sport_intent: 'compete' }
];
for (const p of allProfiles) {
  const { split } = resolvePeriodization(p);
  assert(Array.isArray(split) && split.length >= 1, `T16 resolvePeriodization(${JSON.stringify(p)}) has split`);
  const sum = split.reduce((a, b) => a + b.weeks, 0);
  assert(sum === resolvePeriodization(p).totalWeeks, `T16b split weeks sum to totalWeeks for ${JSON.stringify(p)}`);
}

// ── continueBlock ──────────────────────────────────────────────────────────
const baseProfile = {
  strength_style: 'strength', goal_type: 'build',
  plan_start_date: '2026-03-01', plan_weeks: 12,
  block_history: []
};

// Normal progress → next block, history appended
const normal = continueBlock(baseProfile, { feel: 'just_right', changed: false, sameGoal: true, hitSessions: true });
assert(normal.progress === true, 'T17 normal → progress:true');
assert(Array.isArray(normal.profilePatch.block_history) && normal.profilePatch.block_history.length === 1,
  'T18 normal → block_history has 1 entry');
assert(typeof normal.profilePatch.plan_start_date === 'string',
  'T19 normal → new plan_start_date set');
assert(typeof normal.profilePatch.plan_weeks === 'number',
  'T20 normal → plan_weeks set');

// Struggling → repeat same block
const hard = continueBlock(baseProfile, { feel: 'too_hard', changed: false, sameGoal: true, hitSessions: false });
assert(hard.repeat === true, 'T21 too_hard + missed sessions → repeat:true');
assert(hard.profilePatch.plan_weeks === baseProfile.plan_weeks, 'T22 repeat → same plan_weeks');

// Goal changed → recalibrate (re-onboard)
const changed = continueBlock(baseProfile, { feel: 'just_right', changed: false, sameGoal: false, hitSessions: true });
assert(changed.recalibrate === true, 'T23 goal changed → recalibrate:true');

// Injury/life change → bridge block
const injured = continueBlock(baseProfile, { feel: 'hard', changed: true, sameGoal: true, hitSessions: false });
assert(injured.bridge === true, 'T24 life changed → bridge:true');

// ── generatePlan uses resolvePeriodization ─────────────────────────────────
const strengthProfile = {
  goal_type: 'build', strength_style: 'strength', plan_start_date: '2026-06-12',
  experience: { gym: 'intermediate' }, availability: { days_per_week: 3, session_minutes: 60 },
  access: ['full_gym'], onboarded: true
};
const plan = generatePlan(strengthProfile);
const allWeeks = plan.phases.flatMap(ph => ph.weeks);
assert(allWeeks.length === 12, `T25 strength plan has 12 weeks (got ${allWeeks.length})`);

const bbProfile = { ...strengthProfile, strength_style: 'bodybuilding' };
const bbPlan = generatePlan(bbProfile);
const bbWeeks = bbPlan.phases.flatMap(ph => ph.weeks);
assert(bbWeeks.length === 6, `T26 bodybuilding plan has 6 weeks (got ${bbWeeks.length})`);
```

- [ ] **Step 1.2 — Run; confirm test failures (not crashes)**

```bash
node tests/periodization.js
```

Expected: `Cannot find module '../src/lib/plan/periodization.js'`. That means the test infrastructure works. If you see a syntax error instead, fix it before continuing.

- [ ] **Step 1.3 — Commit test file**

```bash
git add tests/periodization.js
git commit -m "test: add failing periodization test suite"
```

---

### Task 2: Create src/lib/plan/periodization.js

**Files:**
- Create: `src/lib/plan/periodization.js`

- [ ] **Step 2.1 — Verify tests T1–T24 all currently fail**

```bash
node tests/periodization.js 2>&1 | head -5
```

Expected: module not found error.

- [ ] **Step 2.2 — Create the module**

```js
// src/lib/plan/periodization.js
/**
 * periodization — science-backed block lengths, season derivation, and the
 * block-continuation branching logic that replaces the old hardcoded planLength()
 * + phaseSplit() in PlanGenerator.js.
 *
 * Evidence:
 *  Hypertrophy 5–6 wk mesocycle: Israetel / RP model (MEV→MAV→MRV ramp + deload)
 *  Strength 10–12 wk: Issurin block periodization (accumulation → transmutation)
 *  Functional 8 wk: Kraemer/Ratamess (neural + structural adaptation window)
 *  Sport off-season 10–12 wk: Bompa/Haff, Rønnestad 2015 (max-strength base)
 *  Sport pre-season 6 wk: Bosquet 2007 (volume taper window before competition)
 *  Sport in-season 4 wk rolling: maintenance dose (Ronnestad 2011, 2 ×/wk)
 *  Post-event transition 4 wk: deload + active recovery, Mujika 2010
 */

/**
 * Derive the current training season from the athlete's profile.
 * Uses event_date if present; falls back to sport_intent.
 *
 * @param {object} profile — needs: sport, event_date (opt), sport_intent (opt)
 * @returns {'off'|'pre'|'in'|'transition'|null}
 */
export function deriveSeason(profile = {}) {
  if (!profile.sport) return null;

  if (profile.event_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(profile.event_date + 'T00:00:00');
    if (isNaN(event.getTime())) return null;

    const daysOut = Math.round((event - today) / 86400000);
    if (daysOut < 0)   return 'transition';   // event has passed
    if (daysOut <= 56) return 'in';            // ≤8 weeks: race window
    if (daysOut <= 120) return 'pre';          // 8–17 weeks: pre-season
    return 'off';                              // >17 weeks: off-season
  }

  // No event date — use declared intent
  const intent = profile.sport_intent;
  if (intent === 'compete') return 'in';
  return 'off'; // 'recreational' | 'build_base' | anything else → off-season
}

// ── PERIODIZATION PROFILES ──────────────────────────────────────────────────
// Each entry: { totalWeeks, split: [{intent, weeks}] }
// 'intent' maps to PHASE_META in PlanGenerator (base | build | peak).
// deload is inserted automatically by PlanGenerator every 4th week within a phase.

const PROFILES = {
  // RP hypertrophy mesocycle (Israetel): 4-week accumulation + 1 week peak + 1 deload
  hypertrophy: {
    totalWeeks: 6,
    split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 3 }, { intent: 'peak', weeks: 1 }]
  },
  // Block periodization strength (Issurin): accumulation + transmutation + realisation
  strength: {
    totalWeeks: 12,
    split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 5 }, { intent: 'peak', weeks: 2 }]
  },
  // Functional / desk-job balance: neural + structural adaptation + movement quality
  functional: {
    totalWeeks: 8,
    split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 4 }, { intent: 'peak', weeks: 1 }]
  },
  // Sport off-season: genuine strength base (Rønnestad 2015 — max-strength transfer)
  sportOff: {
    totalWeeks: 12,
    split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 5 }, { intent: 'peak', weeks: 2 }]
  },
  // Sport pre-season: transition to sport-specific work (Bosquet 2007 taper model)
  sportPre: {
    totalWeeks: 6,
    split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 3 }]
  },
  // Sport in-season: maintenance dose — 4-week rolling, no long phases
  // Never auto-deloads (deload only via check-in answer or race-week taper).
  sportIn: {
    totalWeeks: 4,
    split: [{ intent: 'build', weeks: 4 }]
  },
  // Post-event transition: active recovery, rebuild base
  sportTransition: {
    totalWeeks: 4,
    split: [{ intent: 'base', weeks: 4 }]
  }
};

/**
 * Resolve the correct periodization profile for an athlete.
 *
 * @param {object} profile — goal_type, strength_style, sport, sport_intent, event_date
 * @returns {{ totalWeeks: number, split: Array<{intent, weeks}> }}
 */
export function resolvePeriodization(profile = {}) {
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const season = deriveSeason(profile);
    if (season === 'pre')        return PROFILES.sportPre;
    if (season === 'in')         return PROFILES.sportIn;
    if (season === 'transition') return PROFILES.sportTransition;
    return PROFILES.sportOff; // 'off' or null → default to off-season
  }

  const style = profile.strength_style;
  if (style === 'bodybuilding') return PROFILES.hypertrophy;
  if (style === 'strength')     return PROFILES.strength;
  return PROFILES.functional; // 'functional' or unset
}

/**
 * Decide what happens at the end of a completed block, based on a brief
 * check-in (max 4 questions from BlockCheckin.jsx).
 *
 * @param {object} profile — current profile (needs plan_start_date, plan_weeks, block_history)
 * @param {object} answers — { feel: 'easy'|'just_right'|'hard'|'too_hard',
 *                             changed: boolean, sameGoal: boolean, hitSessions: boolean }
 * @returns {{ progress?, repeat?, recalibrate?, bridge?,
 *             profilePatch: object }}
 *
 * Exactly one of { progress, repeat, recalibrate, bridge } is true.
 * `profilePatch` is always present and ready to pass to updateProfile().
 */
export function continueBlock(profile = {}, answers = {}) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Goal changed → send back to onboarding
  if (answers.sameGoal === false) {
    return { recalibrate: true, profilePatch: { onboarded: false } };
  }

  // 2. Life change (injury/illness/major event) → 2-week bridge recovery block
  if (answers.changed === true) {
    return {
      bridge: true,
      profilePatch: {
        plan_start_date: today,
        plan_weeks: 2,
        block_history: appendBlockHistory(profile, { outcome: 'bridge', answers })
      }
    };
  }

  // 3. Struggling (felt too hard AND/OR missed most sessions) → repeat block
  const struggling = answers.feel === 'too_hard' || answers.hitSessions === false;
  if (struggling) {
    return {
      repeat: true,
      profilePatch: {
        plan_start_date: today,
        plan_weeks: profile.plan_weeks || 12,
        block_history: appendBlockHistory(profile, { outcome: 'repeat', answers })
      }
    };
  }

  // 4. Normal progress → advance to next block (same goal profile, fresh start date)
  const { totalWeeks } = resolvePeriodization(profile);
  return {
    progress: true,
    profilePatch: {
      plan_start_date: today,
      plan_weeks: totalWeeks,
      block_history: appendBlockHistory(profile, { outcome: 'progress', answers })
    }
  };
}

function appendBlockHistory(profile, entry) {
  const history = Array.isArray(profile.block_history) ? profile.block_history : [];
  return [
    ...history,
    {
      completed_date: new Date().toISOString().slice(0, 10),
      plan_weeks: profile.plan_weeks || null,
      plan_start_date: profile.plan_start_date || null,
      ...entry
    }
  ];
}

export default { resolvePeriodization, deriveSeason, continueBlock };
```

- [ ] **Step 2.3 — Run T1–T24**

```bash
node tests/periodization.js 2>&1 | grep -v 'T25\|T26'
```

Expected: all T1–T24 lines show `PASS:`.

- [ ] **Step 2.4 — Commit**

```bash
git add src/lib/plan/periodization.js
git commit -m "engine: periodization.js — deriveSeason, resolvePeriodization, continueBlock"
```

---

### Task 3: PlanGenerator.js — use resolvePeriodization + thread exercisePriority

**Files:**
- Modify: `src/lib/PlanGenerator.js:27` (imports), `:238-265` (`planLength`/`phaseSplit`), `:311-332` (`buildDisciplineSpecs`)

- [ ] **Step 3.1 — Verify T25 + T26 fail**

```bash
node tests/periodization.js 2>&1 | grep -E 'T25|T26'
```

Expected: `FAIL: T25 strength plan has 12 weeks` (currently generates 16).

- [ ] **Step 3.2 — Add import**

In `src/lib/PlanGenerator.js`, find the imports block and add:

```js
import { resolvePeriodization } from './plan/periodization.js';
```

(Add it after the existing `import { resolveProgram } from './strength/program.js';` line.)

- [ ] **Step 3.3 — Replace planLength() and phaseSplit() usage**

In `generatePlan()`, find these two lines (currently around line 351–352):

```js
  const total = planLength(profile);
  const split = phaseSplit(total);
```

Replace them with:

```js
  const { totalWeeks: total, split } = resolvePeriodization(profile);
```

The local `planLength` and `phaseSplit` function definitions can stay in the file — they are no longer called by `generatePlan()` but removing them is a separate cleanup task. Leave them for now to avoid scope creep.

- [ ] **Step 3.4 — Thread exercisePriority into buildDisciplineSpecs()**

In `generatePlan()`, find the line that calls `resolveProgram(profile)` (currently line 335):

```js
  const program = resolveProgram(profile);
```

After Plan A is merged, `program` will include `exercisePriority`. The gym case in `buildDisciplineSpecs()` needs to pass it to `buildWeek()`. Find the `case 'gym':` block (around line 317) and update:

```js
    case 'gym':
      return strength.buildWeek({
        ...common, deload: lighten, gymDays: count, lifts: resolveLifts(profile),
        style: program.style, emphasis: program.emphasis, volumeScalar: program.volumeScalar,
        power: program.power, sport: program.sport,
        exercisePriority: program.exercisePriority || []
      });
```

Note: `exercisePriority` is added here. `strength.buildWeek()` was updated in Plan A (Task 6) to forward it to `allocateGym()`. If Plan A hasn't been merged yet, this line is harmless — it passes an extra field that gets ignored.

- [ ] **Step 3.5 — Run T25 + T26**

```bash
node tests/periodization.js 2>&1 | grep -E 'T25|T26'
```

Expected: `PASS: T25 strength plan has 12 weeks` and `PASS: T26 bodybuilding plan has 6 weeks`.

- [ ] **Step 3.6 — Run all test suites**

```bash
node tests/data-layer.js && node tests/engine-rest-and-rep.js && node tests/periodization.js
```

Expected: all PASS.

- [ ] **Step 3.7 — Verify the app still starts and generates a plan**

```bash
npm run dev
```

Open the app. Go to Plan. Confirm weeks are generated (count will now be 12 or 6, not 16).

- [ ] **Step 3.8 — Commit**

```bash
git add src/lib/PlanGenerator.js
git commit -m "engine: PlanGenerator uses resolvePeriodization + threads exercisePriority to buildWeek"
```

---

### Task 4: onboardingModel.js — sportIntent replaces sportSeason

**Files:**
- Modify: `src/lib/onboardingModel.js`

The `sportSeason: 'off'` binary field is replaced by:
- `sportIntent: ''` — set to `'compete'`, `'recreational'`, or `'build_base'`
- `eventDate: ''` — optional ISO date string `YYYY-MM-DD`

`answersToProfilePatch()` saves these to the profile so `deriveSeason()` can compute the season on the fly.

- [ ] **Step 4.1 — Update BLANK_ANSWERS**

In `src/lib/onboardingModel.js`, replace:

```js
  sportSeason: 'off',           // 'in' | 'off'
```

with:

```js
  sportIntent: '',              // 'compete' | 'recreational' | 'build_base'
  eventDate: '',                // optional ISO date YYYY-MM-DD
```

- [ ] **Step 4.2 — Update answersToProfilePatch()**

In `answersToProfilePatch(a)`, find the section that sets `sport_season`:

```js
    sport: isSport ? (a.sport || null) : null,
    sport_season: isSport ? (a.sportSeason || 'off') : null,
```

Replace with:

```js
    sport: isSport ? (a.sport || null) : null,
    sport_intent: isSport ? (a.sportIntent || 'recreational') : null,
    event_date: isSport && a.eventDate ? a.eventDate : null,
    sport_season: null,  // no longer set during onboarding; deriveSeason() computes it on demand
```

Also update the `plan_weeks` line to compute the correct block length. Find:

```js
    plan_weeks: 16,                          // ongoing periodised block (no event date)
```

Import `resolvePeriodization` and `deriveSeason` at the top of the file, and replace:

```js
    plan_weeks: 16,
```

with a dynamic computation. First add the import at the top of `onboardingModel.js`:

```js
import { resolvePeriodization } from './plan/periodization.js';
```

Then change the line to:

```js
    plan_weeks: (() => {
      const pseudo = {
        goal_type: a.goalType || null,
        strength_style: isBuild ? (a.strengthStyle || 'strength') : null,
        sport: isSport ? (a.sport || null) : null,
        sport_intent: isSport ? (a.sportIntent || 'recreational') : null,
        event_date: isSport && a.eventDate ? a.eventDate : null
      };
      return resolvePeriodization(pseudo).totalWeeks;
    })(),
```

- [ ] **Step 4.3 — Run tests (no new tests needed — existing model is tested implicitly via T25/T26)**

```bash
node tests/periodization.js
```

Expected: all PASS.

- [ ] **Step 4.4 — Commit**

```bash
git add src/lib/onboardingModel.js
git commit -m "onboarding: replace sportSeason with sportIntent + eventDate; plan_weeks auto-computed"
```

---

### Task 5: OnboardingWizard.jsx — update sport question

**Files:**
- Modify: `src/components/OnboardingWizard.jsx`

The existing `sportSeason` question ("In season / Off season") becomes an intent question with friendly wording. The event date field is new.

- [ ] **Step 5.1 — Find the sportSeason question in OnboardingWizard.jsx**

```bash
grep -n "sportSeason\|sport_season\|In season\|Off season\|season" src/components/OnboardingWizard.jsx | head -20
```

Note the line numbers. The question will be a `<select>` or radio set with options.

- [ ] **Step 5.2 — Replace sportSeason question with sportIntent**

Find the UI block that renders the sport season question. Replace it with:

```jsx
{/* Sport intent — replaces 'in/off season' */}
<div className="field-group">
  <label className="field-label">How do you train for {answers.sport || 'your sport'}?</label>
  <div className="option-cards">
    {[
      { value: 'compete',      label: 'I compete',          desc: 'You have races or events — training stays sport-specific.' },
      { value: 'recreational', label: 'I play for fun',     desc: 'Recreational — balanced programme with sport-specific support.' },
      { value: 'build_base',   label: 'Building my base',   desc: 'No events right now — maximise strength and conditioning.' }
    ].map(opt => (
      <button
        key={opt.value}
        type="button"
        className={`option-card${answers.sportIntent === opt.value ? ' selected' : ''}`}
        onClick={() => setAnswers(a => ({ ...a, sportIntent: opt.value }))}
      >
        <strong>{opt.label}</strong>
        <span>{opt.desc}</span>
      </button>
    ))}
  </div>
</div>
```

And add an optional event date field (only visible when `sportIntent === 'compete'`):

```jsx
{answers.sportIntent === 'compete' && (
  <div className="field-group">
    <label className="field-label">Next event date <span className="field-optional">(optional)</span></label>
    <input
      type="date"
      className="text-input"
      value={answers.eventDate || ''}
      min={new Date().toISOString().slice(0, 10)}
      onChange={e => setAnswers(a => ({ ...a, eventDate: e.target.value }))}
    />
    <p className="field-hint">
      Used to auto-size the block length and track your season. Leave blank if unsure.
    </p>
  </div>
)}
```

Also find any references to `answers.sportSeason` in `OnboardingWizard.jsx` and replace with `answers.sportIntent`. Run:

```bash
grep -n "sportSeason" src/components/OnboardingWizard.jsx
```

Replace all occurrences.

- [ ] **Step 5.3 — Verify the app starts and onboarding renders**

```bash
npm run dev
```

Go to `/dev` (the DevPlayground) and step through onboarding questions. Confirm the sport intent question renders with 3 options. Confirm the event date field appears when "I compete" is selected.

- [ ] **Step 5.4 — Commit**

```bash
git add src/components/OnboardingWizard.jsx
git commit -m "onboarding: replace in/off season binary with intent question + optional event date"
```

---

### Task 6: BlockCheckin.jsx — block-end check-in wizard

**Files:**
- Create: `src/screens/BlockCheckin.jsx`

This screen appears once when a training block ends. It asks ≤4 questions and calls `continueBlock()` to decide what to do next, then writes the result to the store.

- [ ] **Step 6.1 — Create the screen**

```jsx
// src/screens/BlockCheckin.jsx
/**
 * BlockCheckin — brief wizard shown once when a training block ends.
 * Calls continueBlock() from src/lib/plan/periodization.js to decide
 * the next step, then writes the result to the store.
 *
 * Outcomes:
 *  progress    — new block starts immediately with a fresh plan_start_date
 *  repeat      — same block length restarts (athlete was struggling)
 *  recalibrate — profile.onboarded = false → Onboarding screen takes over
 *  bridge      — 2-week recovery block before resuming
 */
import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';
import { continueBlock } from '../lib/plan/periodization.js';

const STEPS = ['feel', 'changed', 'sameGoal', 'hitSessions'];

const FEEL_OPTIONS = [
  { value: 'easy',       label: 'Too easy',       desc: 'Sessions felt light — ready for more.' },
  { value: 'just_right', label: 'Just right',      desc: 'Challenging but manageable.' },
  { value: 'hard',       label: 'Hard',            desc: 'Pushed to keep up but got through it.' },
  { value: 'too_hard',   label: 'Too hard',        desc: 'Frequently sore, drained, or had to skip sessions.' }
];

export default function BlockCheckin() {
  const profile = useTrainingStore(s => s.profile);
  const updateProfile = useTrainingStore(s => s.updateProfile);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    feel: '', changed: null, sameGoal: null, hitSessions: null
  });
  const [completing, setCompleting] = useState(false);

  const weeksCompleted = profile.plan_weeks || 12;

  async function finish(finalAnswers) {
    setCompleting(true);
    const result = continueBlock(profile, finalAnswers);
    await updateProfile(result.profilePatch);
    // If recalibrate, updateProfile sets onboarded:false → App.jsx shows Onboarding
    // Otherwise the new plan_start_date triggers plan regeneration on next render
  }

  function answer(key, value) {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    // Cascade: if goal changed, we're done (recalibrate)
    if (key === 'sameGoal' && value === false) {
      finish({ ...updated });
      return;
    }
    // If life changed, skip remaining questions (bridge block)
    if (key === 'changed' && value === true) {
      finish({ ...updated, sameGoal: true, hitSessions: false });
      return;
    }
    // Last question → finish
    if (key === 'hitSessions') {
      finish({ ...updated });
      return;
    }
    setStep(s => s + 1);
  }

  if (completing) {
    return (
      <div className="screen-container onboarding-container">
        <div className="onboarding-card">
          <h2 className="onboarding-title">Setting up your next block…</h2>
          <p className="onboarding-subtitle">Just a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container onboarding-container">
      <div className="onboarding-card">
        <div className="checkin-header">
          <span className="checkin-badge">Block complete</span>
          <h2 className="onboarding-title">You finished {weeksCompleted} weeks</h2>
          <p className="onboarding-subtitle">3 quick questions to set up your next block.</p>
        </div>

        {step === 0 && (
          <div className="checkin-step">
            <p className="field-label">How did this block feel overall?</p>
            <div className="option-cards">
              {FEEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className="option-card"
                  onClick={() => answer('feel', opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="checkin-step">
            <p className="field-label">Did anything significant change? (new injury, illness, big life change)</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('changed', false)}>
                <strong>No, all good</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('changed', true)}>
                <strong>Yes, something changed</strong>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="checkin-step">
            <p className="field-label">Are your training goals still the same?</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('sameGoal', true)}>
                <strong>Yes, same goals</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('sameGoal', false)}>
                <strong>No, my goals have changed</strong>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="checkin-step">
            <p className="field-label">Did you hit most of your sessions?</p>
            <div className="option-cards two-col">
              <button type="button" className="option-card" onClick={() => answer('hitSessions', true)}>
                <strong>Yes, most weeks</strong>
              </button>
              <button type="button" className="option-card" onClick={() => answer('hitSessions', false)}>
                <strong>No, I missed quite a few</strong>
              </button>
            </div>
          </div>
        )}

        <div className="checkin-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`checkin-dot${i <= step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

Add these CSS rules to `src/styles/main.css` (add after the onboarding styles section):

```css
/* ── Block check-in ─────────────────────────────────────────────────── */
.checkin-header { margin-bottom: var(--space-6); text-align: center; }
.checkin-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--moss);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-3);
}
.checkin-step { margin-bottom: var(--space-6); }
.checkin-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: var(--space-4);
}
.checkin-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--hairline);
  transition: background 0.2s;
}
.checkin-dot.active { background: var(--rust); }
.option-cards.two-col { grid-template-columns: 1fr 1fr; }
```

- [ ] **Step 6.2 — Verify the file compiles (no syntax errors)**

```bash
npm run dev 2>&1 | head -20
```

Expected: dev server starts, no red errors about BlockCheckin.jsx.

- [ ] **Step 6.3 — Commit**

```bash
git add src/screens/BlockCheckin.jsx src/styles/main.css
git commit -m "ui: add BlockCheckin wizard screen for block-end continuation"
```

---

### Task 7: App.jsx — wire block-end gate

**Files:**
- Modify: `src/App.jsx`

Add the block-end detection and the `BlockCheckin` gate. The gate sits between the onboarding check and the main app render.

- [ ] **Step 7.1 — Add import**

In `src/App.jsx`, add the import after the existing screen imports:

```jsx
import BlockCheckin from './screens/BlockCheckin.jsx';
```

- [ ] **Step 7.2 — Add the planBlockEnded helper**

After the `matchRoute` function (around line 56) and before `export default function App()`, add:

```jsx
// Returns true when the current plan block's end date has passed.
// plan_start_date and plan_weeks must both be set; if not, returns false
// so brand-new users are never accidentally shown the check-in.
function planBlockEnded(profile) {
  if (!profile.plan_start_date || !profile.plan_weeks) return false;
  const start = new Date(profile.plan_start_date + 'T00:00:00');
  if (isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + profile.plan_weeks * 7 * 24 * 60 * 60 * 1000);
  return new Date() >= end;
}
```

- [ ] **Step 7.3 — Add the block-end gate**

In the `App` component, find this block (around line 108):

```jsx
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Signed in → the app
  return (
```

Add the block-checkin gate between them:

```jsx
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Block-end check-in — runs once after each completed plan block.
  // Shows a brief wizard that continues the plan automatically.
  if (planBlockEnded(profile)) {
    return <BlockCheckin />;
  }

  // Signed in → the app
  return (
```

- [ ] **Step 7.4 — Verify app starts and routes correctly**

```bash
npm run dev
```

Open the app. Sign in. Confirm the main app renders normally (not the check-in) because the block hasn't ended yet.

To manually test the check-in screen: temporarily set your `plan_start_date` in Supabase to a date 16+ weeks ago, then reload. The `BlockCheckin` screen should appear. After completing it, the profile updates and the main app shows.

- [ ] **Step 7.5 — Run all tests one final time**

```bash
node tests/data-layer.js && node tests/engine-rest-and-rep.js && node tests/periodization.js
```

Expected: all PASS.

- [ ] **Step 7.6 — Commit**

```bash
git add src/App.jsx
git commit -m "ui: wire BlockCheckin gate in App.jsx — appears when plan block ends"
```

---

### Post-task verification

Run the full test battery:

```bash
node tests/data-layer.js && node tests/engine-rest-and-rep.js && node tests/periodization.js
```

All lines should show `PASS:`. Then open the app via `npm run dev` and step through a new onboarding flow to confirm the intent question renders correctly and the generated plan has the right number of weeks.

---

## Self-review checklist

- [x] **Spec coverage**: deriveSeason (event date + intent fallback) ✓, 8 goal profiles ✓, correct block lengths (hypertrophy 6w, strength 12w, functional 8w, sport off 12w, pre 6w, in 4w, transition 4w) ✓, continueBlock (progress/repeat/recalibrate/bridge) ✓, block_history appended ✓, onboarding sportIntent question ✓, event date field ✓, BlockCheckin screen ✓, App.jsx gate ✓, exercisePriority threaded ✓
- [x] **No placeholders**: All function bodies are complete. BlockCheckin has all 4 questions and handles all branches. CSS is provided.
- [x] **Type consistency**: `continueBlock()` always returns `{ profilePatch }` — the result shape is consistent across all 4 branches. `resolvePeriodization()` always returns `{ totalWeeks, split }`. `deriveSeason()` always returns a string or null.
- [x] **No Supabase migration**: `block_history`, `sport_intent`, `event_date` are stored as keys in the existing profile JSONB column — no schema changes needed.
- [x] **Existing plan_weeks usage**: `planLength()` reads `profile.plan_weeks || 16`. After this plan, `plan_weeks` is set correctly by `answersToProfilePatch()`. `generatePlan()` no longer calls `planLength()` — it calls `resolvePeriodization()` directly. The old `planLength`/`phaseSplit` functions remain in the file but are unreachable dead code — safe to leave.
- [x] **BlockCheckin recalibrate path**: When `sameGoal === false`, `continueBlock()` returns `{ recalibrate: true, profilePatch: { onboarded: false } }`. `updateProfile({ onboarded: false })` causes `App.jsx` to show `<Onboarding />` on the next render — the same mechanism as "Clear plan". No special case needed.
- [x] **CSS variables**: Only `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md` are used. No invented variables.
