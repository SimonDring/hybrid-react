# Run Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `run` sport into sprint / middle / long-distance sub-disciplines, giving each a distinct block length and science-backed exercise priority list.

**Architecture:** A new `run_discipline` profile field (`'sprint' | 'middle' | 'long'`) is threaded through three layers — periodization (block lengths), program resolution (emphasis + priority), and onboarding (UI + model). Cycle and swim code paths are untouched. All existing `run` lookups fall back gracefully when `run_discipline` is null.

**Tech Stack:** Plain Node.js ES-module tests (`node tests/filename.js`, custom `assert()`). React 18 + inline styles in OnboardingWizard. No new dependencies.

---

### Task 1: Write failing tests

**Files:**
- Create: `tests/run-discipline.js`

- [ ] **Step 1: Create the test file**

```js
// tests/run-discipline.js
import { resolvePeriodization, deriveSeason } from '../src/lib/plan/periodization.js';
import { resolveProgram } from '../src/lib/strength/program.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Relative date helpers (unambiguous regardless of when tests run)
const FAR_OUT  = new Date(); FAR_OUT.setMonth(FAR_OUT.getMonth() + 8);
const PRE_RACE = new Date(); PRE_RACE.setDate(PRE_RACE.getDate() + 60);
function dateStr(d) { return d.toISOString().slice(0, 10); }

// ── T1: deriveSeason unaffected by run_discipline ──────────────────────────
assert(
  deriveSeason({ sport: 'run', run_discipline: 'sprint', event_date: dateStr(FAR_OUT) }) === 'off',
  'T1 deriveSeason ignores run_discipline — still returns off'
);

// ── T2–T4: resolvePeriodization — sprint ──────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'build_base' }).totalWeeks === 6,
  'T2 sprint off-season → 6 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', event_date: dateStr(PRE_RACE) }).totalWeeks === 4,
  'T3 sprint pre-season (60d out) → 4 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', sport_intent: 'compete' }).totalWeeks === 4,
  'T4 sprint in-season (intent=compete) → 4 weeks (sportIn)'
);

// ── T5–T6: resolvePeriodization — middle ──────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', sport_intent: 'build_base' }).totalWeeks === 10,
  'T5 middle off-season → 10 weeks'
);
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'middle', event_date: dateStr(PRE_RACE) }).totalWeeks === 6,
  'T6 middle pre-season → 6 weeks (reuses sportPre)'
);

// ── T7: resolvePeriodization — long ───────────────────────────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'build_base' }).totalWeeks === 12,
  'T7 long off-season → 12 weeks (falls through to sportOff)'
);

// ── T8: resolvePeriodization — no discipline falls back ───────────────────
assert(
  resolvePeriodization({ goal_type: 'sport', sport: 'run', sport_intent: 'build_base' }).totalWeeks === 12,
  'T8 no run_discipline → 12 weeks (existing sportOff fallback)'
);

// ── T9–T10: resolveProgram — priority list ────────────────────────────────
const sprintProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'sprint', experience: { gym: 'intermediate' } });
assert(
  sprintProg.exercisePriority.includes('hang_clean'),
  'T9 sprint program includes hang_clean in priority list'
);
assert(
  !sprintProg.exercisePriority.includes('tibialis_raise'),
  'T10 sprint program does NOT include tibialis_raise'
);

// ── T11–T12: resolveProgram — emphasis ────────────────────────────────────
const longProg = resolveProgram({ goal_type: 'sport', sport: 'run', run_discipline: 'long', experience: { gym: 'intermediate' } });
assert(
  longProg.emphasis.calves === 1.4,
  'T11 long distance calves emphasis = 1.4'
);
assert(
  longProg.emphasis.chest === 0.45,
  'T12 long distance chest emphasis = 0.45'
);
```

- [ ] **Step 2: Run tests — expect all FAIL**

```bash
node tests/run-discipline.js
```

Expected: 12 FAILs (functions not yet updated).

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/run-discipline.js
git commit -m "test: add failing run-discipline tests (12 failing)"
```

---

### Task 2: Add periodization profiles and update resolvePeriodization

**Files:**
- Modify: `src/lib/plan/periodization.js:51-111`

- [ ] **Step 1: Add three new profiles to PROFILES**

In `src/lib/plan/periodization.js`, after the `sportTransition` entry (line ~87), add:

```js
  // ── Run discipline overrides ───────────────────────────────────────────
  // Sprint (100–400m): short power blocks per NSCA sprint periodization model.
  // 4-6w blocks: hypertrophy → maximal strength → explosive/reactive.
  runSprintOff: {
    totalWeeks: 6,
    split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 3 }, { intent: 'peak', weeks: 1 }]
  },
  // Pre-season sprint: quick taper to peak power output.
  runSprintPre: {
    totalWeeks: 4,
    split: [{ intent: 'base', weeks: 2 }, { intent: 'build', weeks: 2 }]
  },
  // Middle distance (800m–5K): 10w blocks for running economy + speed endurance blend.
  // 8–14w optimal per 2024 meta-analysis (PMID 38652127).
  runMiddleOff: {
    totalWeeks: 10,
    split: [{ intent: 'base', weeks: 4 }, { intent: 'build', weeks: 4 }, { intent: 'peak', weeks: 2 }]
  }
  // Long distance (10K+): reuses sportOff (12w) — longer blocks give g=−0.45 vs g=−0.21.
  // Sprint in/transition: reuses sportIn (4w) / sportTransition (4w).
  // Middle pre/in/transition: reuses sportPre (6w) / sportIn (4w) / sportTransition (4w).
```

- [ ] **Step 2: Update resolvePeriodization to branch on run_discipline**

Replace the existing sport block in `resolvePeriodization()` (lines ~99–105):

```js
export function resolvePeriodization(profile = {}) {
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const season = deriveSeason(profile);

    // Run discipline overrides block length
    if (profile.sport === 'run' && profile.run_discipline) {
      const disc = profile.run_discipline;
      if (disc === 'sprint') {
        if (season === 'pre') return PROFILES.runSprintPre;
        if (season === 'in' || season === 'transition') return season === 'in' ? PROFILES.sportIn : PROFILES.sportTransition;
        return PROFILES.runSprintOff; // 'off' or null
      }
      if (disc === 'middle') {
        if (season === 'pre' || season === 'in' || season === 'transition') {
          return season === 'pre' ? PROFILES.sportPre : season === 'in' ? PROFILES.sportIn : PROFILES.sportTransition;
        }
        return PROFILES.runMiddleOff; // 'off' or null
      }
      // 'long' falls through to generic sport logic below
    }

    if (season === 'pre')        return PROFILES.sportPre;
    if (season === 'in')         return PROFILES.sportIn;
    if (season === 'transition') return PROFILES.sportTransition;
    return PROFILES.sportOff;
  }

  const style = profile.strength_style;
  if (style === 'bodybuilding') return PROFILES.hypertrophy;
  if (style === 'strength')     return PROFILES.strength;
  return PROFILES.functional;
}
```

- [ ] **Step 3: Run tests — expect T1–T8 to pass**

```bash
node tests/run-discipline.js
```

Expected: T1–T8 PASS, T9–T12 still FAIL.

- [ ] **Step 4: Commit**

```bash
git add src/lib/plan/periodization.js
git commit -m "feat: run discipline periodization — sprint 6w, middle 10w, long 12w"
```

---

### Task 3: Add discipline emphasis and priority maps to program.js

**Files:**
- Modify: `src/lib/strength/program.js:12-45, 80-89`

- [ ] **Step 1: Replace the single `run` entry in SPORT_EMPHASIS with three discipline maps**

Replace lines 13 (`run: { ... }`) in `SPORT_EMPHASIS`:

```js
const SPORT_EMPHASIS = {
  // Run disciplines — separate maps per science (see design spec 2026-06-12-run-discipline)
  // Sprint: glutes/hamstrings for power + shoulders for arm drive (Hicks 2024)
  run_sprint: { quads: 1.20, hamstrings: 1.30, glutes: 1.35, calves: 1.20, core: 1.15, back: 1.00, shoulders: 1.10, chest: 0.90, biceps: 0.70, triceps: 0.80 },
  // Middle: balanced economy focus, moderate plyometric support
  run_middle: { quads: 1.15, hamstrings: 1.30, glutes: 1.25, calves: 1.20, core: 1.20, back: 0.90, shoulders: 0.80, chest: 0.55, biceps: 0.55, triceps: 0.70 },
  // Long: heaviest calf (achilles tendon loading), minimal chest/shoulders (avoid mass)
  run_long:   { quads: 1.10, hamstrings: 1.30, glutes: 1.20, calves: 1.40, core: 1.25, back: 0.90, shoulders: 0.70, chest: 0.45, biceps: 0.50, triceps: 0.65 },
  // Fallback when run_discipline is not set
  run:        { quads: 1.15, hamstrings: 1.25, glutes: 1.20, calves: 1.30, core: 1.20, back: 0.90, shoulders: 0.80, chest: 0.55, biceps: 0.55, triceps: 0.70 },
  cycle: { quads: 1.3, glutes: 1.25, hamstrings: 1.15, calves: 1.0, core: 1.15, back: 0.9, shoulders: 0.7, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  swim:  { back: 1.3, shoulders: 1.25, triceps: 1.15, biceps: 1.1, core: 1.2, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5 }
};
```

- [ ] **Step 2: Replace the single `run` entry in SPORT_PRIORITY with three discipline lists**

Replace lines 26–31 (`run: [...]`) in `SPORT_PRIORITY`:

```js
const SPORT_PRIORITY = {
  // Sprint (100–400m): power/explosive first. Olympic lifts, plyos, glute power.
  run_sprint: [
    'hang_clean', 'power_clean', 'depth_jump', 'broad_jump', 'sled_push',
    'back_squat', 'hip_thrust', 'nordic_curl', 'bounding_a_skip',
    'double_leg_pogo', 'sl_pogo_jump', 'split_squat',
    'glute_bridge_single_leg', 'pallof', 'sl_calf'
  ],
  // Middle distance (800m–5K): mixed economy + speed endurance.
  run_middle: [
    'nordic_curl', 'split_squat', 'rdl', 'double_leg_pogo', 'sl_pogo_jump',
    'trap_bar_dl', 'step_up', 'lateral_band_walk', 'copenhagen',
    'pallof', 'sl_calf', 'sl_hinge', 'tibialis_raise'
  ],
  // Long distance (10K+): heavy tendon-loading + injury prevention. No plyos.
  run_long: [
    'nordic_curl', 'rdl', 'trap_bar_dl', 'split_squat', 'sl_calf',
    'tibialis_raise', 'lateral_band_walk', 'copenhagen', 'pallof',
    'dead_bug', 'sl_hinge', 'glute_bridge_single_leg', 'step_up'
  ],
  // Fallback when run_discipline is not set
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
```

- [ ] **Step 3: Update resolveProgram to pick the discipline key when sport is 'run'**

Replace the sport branch in `resolveProgram()` (lines ~80–90):

```js
  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const season = profile.sport_season || 'off';
    // For run athletes, resolve to the discipline-specific key; fallback to 'run'
    const emphasisKey = (sport === 'run' && profile.run_discipline)
      ? `run_${profile.run_discipline}`
      : sport;
    return {
      goalType: 'sport', style: 'sport',
      emphasis: SPORT_EMPHASIS[emphasisKey] || {},
      volumeScalar: season === 'in' ? 0.6 : 1.0,
      power: true, sport, season, level,
      exercisePriority: SPORT_PRIORITY[emphasisKey] || SPORT_PRIORITY[sport] || []
    };
  }
```

- [ ] **Step 4: Run all tests — expect all 12 to pass**

```bash
node tests/run-discipline.js
```

Expected: all 12 PASS.

- [ ] **Step 5: Run existing periodization tests to confirm no regression**

```bash
node tests/periodization.js
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/strength/program.js
git commit -m "feat: run discipline emphasis and priority maps in program.js"
```

---

### Task 4: Add five sprint exercises to strengthExercises.js

**Files:**
- Modify: `src/data/strengthExercises.js` (append to the run-support section)

The run-support section currently ends around line 161. Find the last exercise in that section and append after it.

- [ ] **Step 1: Append the five new sprint exercises**

At the end of the run-support section (after `glute_bridge_single_leg`), add:

```js
  // ── Sprint-specific exercises ────────────────────────────────────────────
  { id: 'hang_clean',    name: 'Hang Clean',    pattern: 'squat', equip: 'barbell',    level: 2, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'power_clean',   name: 'Power Clean',   pattern: 'squat', equip: 'barbell',    level: 3, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'advanced' },
  { id: 'depth_jump',    name: 'Depth Jump',    pattern: 'squat', equip: 'bodyweight', level: 2, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'broad_jump',    name: 'Broad Jump',    pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'returning' },
  { id: 'sled_push',     name: 'Sled Push',     pattern: 'lunge', equip: 'other',      level: 0, role: 'accessory', sportTags: ['run_sprint'] },
```

- [ ] **Step 2: Run all tests to confirm no breakage**

```bash
node tests/run-discipline.js && node tests/periodization.js
```

Expected: all PASS (adding exercises to the data file doesn't affect the logic tests).

- [ ] **Step 3: Commit**

```bash
git add src/data/strengthExercises.js
git commit -m "feat: add 5 sprint-specific exercises (hang clean, power clean, depth jump, broad jump, sled push)"
```

---

### Task 5: Update onboardingModel.js

**Files:**
- Modify: `src/lib/onboardingModel.js:23-88`

- [ ] **Step 1: Add `runDiscipline` to BLANK_ANSWERS**

In `BLANK_ANSWERS` (around line 27), add after `sportIntent`:

```js
  sport: '',                    // sport: 'run' | 'cycle' | 'swim'
  sportIntent: '',              // 'compete' | 'recreational' | 'build_base'
  runDiscipline: '',            // run only: 'sprint' | 'middle' | 'long'
  eventDate: '',                // optional ISO date YYYY-MM-DD
```

- [ ] **Step 2: Thread `run_discipline` through the pseudo object and the return value**

In `answersToProfilePatch()`, update the `pseudo` object (around line 47):

```js
      const pseudo = {
        goal_type: a.goalType || null,
        strength_style: isBuild ? (a.strengthStyle || 'strength') : null,
        sport: isSport ? (a.sport || null) : null,
        sport_intent: isSport ? (a.sportIntent || 'recreational') : null,
        event_date: isSport && a.eventDate ? a.eventDate : null,
        run_discipline: isSport && a.sport === 'run' ? (a.runDiscipline || null) : null
      };
```

And add `run_discipline` to the returned patch (after `sport_season: null`):

```js
    sport_season: null,
    run_discipline: isSport && a.sport === 'run' ? (a.runDiscipline || null) : null,
```

- [ ] **Step 3: Run existing tests to confirm no regression**

```bash
node tests/periodization.js
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/onboardingModel.js
git commit -m "feat: add run_discipline to onboarding model"
```

---

### Task 6: Add discipline selector to OnboardingWizard.jsx

**Files:**
- Modify: `src/components/OnboardingWizard.jsx`

- [ ] **Step 1: Add `RUN_DISCIPLINES` constant**

After the `SPORT_INTENT_QUESTION` constant (around line 38), add:

```js
const RUN_DISCIPLINES = [
  { key: 'sprint', label: 'Sprints',          hint: '100 – 400m' },
  { key: 'middle', label: 'Middle distance',   hint: '800m – 5K' },
  { key: 'long',   label: 'Long distance',     hint: '10K+' }
];
```

- [ ] **Step 2: Add `runDiscipline` to the `a` destructuring (or use `a.runDiscipline` directly)**

`a` is already the full answers object — `a.runDiscipline` is available immediately after adding it to `BLANK_ANSWERS`. No extra destructuring needed.

- [ ] **Step 3: Insert the discipline row into the sport step render**

Find the sport step render (currently around line 168). The grid currently has: sport selector → intent question → event date. Add the discipline row between sport selector and intent question, conditionally shown only when `a.sport === 'run'`:

Replace:
```jsx
          <div>
            <label style={FIELD_LABEL}>{SPORT_INTENT_QUESTION[a.sport] || 'How do you train?'}</label>
```

With:
```jsx
          {a.sport === 'run' && (
            <div>
              <label style={FIELD_LABEL}>What distance do you run?</label>
              <OptionGrid cols={3}>
                {RUN_DISCIPLINES.map(d => (
                  <Chip key={d.key} center selected={a.runDiscipline === d.key}
                    onClick={() => set({ runDiscipline: d.key })}
                    label={d.label} hint={d.hint} />
                ))}
              </OptionGrid>
            </div>
          )}
          <div>
            <label style={FIELD_LABEL}>{SPORT_INTENT_QUESTION[a.sport] || 'How do you train?'}</label>
```

- [ ] **Step 4: Update the step's `valid()` gate**

Find the sport step definition (around line 167):

```jsx
isSport && { title: 'Which sport — and where are you?', ..., valid: () => !!a.sport && !!a.sportIntent,
```

Change to:

```jsx
isSport && { title: 'Which sport — and where are you?', ..., valid: () => !!a.sport && !!a.sportIntent && (a.sport !== 'run' || !!a.runDiscipline),
```

- [ ] **Step 5: Reset `runDiscipline` when sport changes away from run**

Find the `set` call on the sport Chip (around line 172):

```jsx
onClick={() => set({ sport: s.key })}
```

Change to:

```jsx
onClick={() => set({ sport: s.key, runDiscipline: s.key === 'run' ? a.runDiscipline : '' })}
```

- [ ] **Step 6: Add discipline to the summary screen**

Find the `SummaryRow` for sport (search for `SummaryRow label="Sport"`). Add a discipline row immediately after it:

```jsx
<SummaryRow label="Sport" value={SPORTS.find(s => s.key === a.sport)?.label || '—'} />
{a.sport === 'run' && a.runDiscipline && (
  <SummaryRow label="Distance" value={RUN_DISCIPLINES.find(d => d.key === a.runDiscipline)?.label || '—'} />
)}
```

- [ ] **Step 7: Build and check for errors**

```bash
npm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors. (Warnings about bundle size are fine.)

- [ ] **Step 8: Commit**

```bash
git add src/components/OnboardingWizard.jsx
git commit -m "feat: run discipline selector in onboarding wizard"
```

---

### Task 7: Final check and push

- [ ] **Step 1: Run all tests**

```bash
node tests/run-discipline.js && node tests/periodization.js
```

Expected: all PASS across both files.

- [ ] **Step 2: Full build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`

- [ ] **Step 3: Push**

```bash
git push
```
