# Volume-Driven Session Length Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make experience-scaled training volume (not a user-picked time) dictate gym session length, and turn frequency into a slider defaulted to the engine's computed optimum.

**Architecture:** Three pure-engine changes plus one onboarding-UI change. (1) `targets.js` scales the MEV→MAV ramp's start and top by experience level. (2) A new pure `frequency.js` computes the optimal training-day count from that volume. (3) The allocator's per-session time budget becomes a fixed internal ~75-min ceiling instead of a user value. (4) Onboarding drops the session-length question and replaces the day-count chips with a slider defaulted to the optimum.

**Tech Stack:** JavaScript ES modules (`@performance-os/engine` workspace package), React 18 (apps/mobile onboarding wizard), node-based test scripts (`node tests/*.js`).

## Global Constraints

- Engine modules stay **pure** — same profile in, same plan out; no `Date.now()`/RNG in `targets.js` or `frequency.js`.
- Real theme variables only in any UI (`--bg-surface`, `--bg-surface-2`, `--txt-strong`, `--txt-muted`, `--txt-body`, `--hairline`, `--accent`, `--on-action`); never `--card-bg`/`--border`/`--accent-bg`.
- Band numbers (Aggressive, verbatim): ramp **start** fractions `{ beginner: 0.00, returning: 0.20, intermediate: 0.40, advanced: 0.60 }`; advanced **top bonus** `+0.30` added to `STYLE_TOP`; the old `LEVEL_BIAS` multiplier is removed.
- Slider range **2–7 days**; defaults to the engine-computed optimum.
- Internal per-session ceiling **75 minutes** (`SESSION_CEILING_MIN`).
- Per-session time is **not** an onboarding input anywhere; duration is shown only as the allocator's realised estimate. Train Now keeps its own acute `minutes` argument.
- The app must still run (`npm run dev`) at the end.
- Run tests from `apps/mobile/`: `node tests/<file>.js`. Golden-master regen: `UPDATE=1 node tests/golden-master.js`.

---

### Task 1: Experience-scaled volume band

**Files:**
- Modify: `packages/engine/src/lib/strength/targets.js`
- Test: `apps/mobile/tests/volume-band.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `weeklyMuscleTargets(ctx)` existing signature (unchanged) — `ctx` has `style, level, blockFrac, intent, phaseWeeks, weekInPhase, deload, emphasis, volumeScalar`.
- Produces: same function, new numeric behaviour — experienced levels start higher up the band and advanced ramps deeper toward MRV.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/volume-band.js`:

```js
// tests/volume-band.js — experience now scales BOTH the ramp start and the top.
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const chest = (over) => weeklyMuscleTargets({
  style: 'bodybuilding', intent: 'build', phaseWeeks: 1, weekInPhase: 1,
  deload: false, emphasis: {}, volumeScalar: 1, ...over
}).chest;

// Advanced bodybuilding chest (MEV 8 / MAV 16 / MRV 22):
const advWk1  = chest({ level: 'advanced', blockFrac: 0 });
const advPeak = chest({ level: 'advanced', blockFrac: 1 });
assert(advWk1 >= 14 && advWk1 <= 18, `advanced BB chest week 1 ~16 (got ${advWk1})`);
assert(advPeak >= 21 && advPeak <= 22, `advanced BB chest peak near MRV 22 (got ${advPeak})`);

// Beginner still starts at MEV in week 1 (no near-MEV penalty for experienced only):
const begWk1 = chest({ level: 'beginner', blockFrac: 0 });
assert(begWk1 >= 7 && begWk1 <= 9, `beginner BB chest week 1 ~MEV 8 (got ${begWk1})`);

// Intermediate week 1 sits clearly above beginner (started higher up the band):
const intWk1 = chest({ level: 'intermediate', blockFrac: 0 });
assert(intWk1 > begWk1 + 1, `intermediate week 1 above beginner (int ${intWk1} > beg ${begWk1})`);

// Deload still drops to ~MEV regardless of level:
const advDeload = chest({ level: 'advanced', blockFrac: 1, deload: true });
assert(advDeload >= 7 && advDeload <= 9, `advanced deload ~MEV 8 (got ${advDeload})`);

console.log('volume-band done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/volume-band.js`
Expected: FAIL on `advanced BB chest week 1` (current model starts everyone at MEV, so advWk1 ≈ 8).

- [ ] **Step 3: Implement the band change**

In `packages/engine/src/lib/strength/targets.js`, replace the `STYLE_TOP` / `LEVEL_BIAS` block (the two `const` definitions around lines 31–35) with:

```js
// 0 = MEV, 1 = MAV, >1 = into the MAV→MRV zone — where the ramp ENDS for a style.
const STYLE_TOP = { strength: 0.6, functional: 1.0, bodybuilding: 1.4, sport: 0.6 };

// Experience scales the BAND, not a flat multiplier. LEVEL_START = how far up the
// MEV→top ramp week 1 begins (an adapted athlete never starts at a novice's MEV).
// LEVEL_TOP_BONUS = extra band height for advanced (ramps deeper toward MRV).
const LEVEL_START     = { beginner: 0.00, returning: 0.20, intermediate: 0.40, advanced: 0.60 };
const LEVEL_TOP_BONUS = { beginner: 0,    returning: 0,    intermediate: 0,    advanced: 0.30 };
```

Then inside `weeklyMuscleTargets`, delete the `const levelMult = LEVEL_BIAS[ctx.level] ?? 1.0;` line. In the per-muscle loop, replace the ramp block (the lines computing `top`, `onRamp`, `floor`, `base`) with:

```js
    // Ramp from a level-scaled START up to a level-scaled TOP of band.
    const styleTopEff = STYLE_TOP[style] + (LEVEL_TOP_BONUS[ctx.level] ?? 0);
    const top = lm.mev + styleTopEff * (lm.mav - lm.mev);
    const start = LEVEL_START[ctx.level] ?? 0;
    const effFrac = start + frac * (1 - start);
    const onRamp = lm.mev + effFrac * (top - lm.mev);
    // Base ramp keeps its MEV floor (a worked muscle shouldn't fall below ~MEV)…
    const floor = lm.mev > 0 ? Math.max(lm.mev * 0.9, lm.mev - 2) : 0;
    const base = clamp(onRamp, floor, lm.mrv);   // no level multiplier — level is in start/top now
```

Leave the `adjusted = base * (emphasis[m] ?? 1) * scalar;` line and the deload branch unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && node tests/volume-band.js`
Expected: all PASS, `volume-band done`.

- [ ] **Step 5: Regenerate the golden master (intentional behaviour change)**

Run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js`
Expected: `UPDATED golden-master snapshot: … archetypes`. Then confirm clean: `node tests/golden-master.js` → all PASS.

- [ ] **Step 6: Sanity-check the profile review**

Run: `cd apps/mobile && node tests/profile-review.js 2>&1 | grep -A2 "Hypertrophy"` and eyeball that the advanced hypertrophy peak volumes sit high in the productive band (chest/back ~20+). No assertion — a smoke check.

- [ ] **Step 7: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/strength/targets.js apps/mobile/tests/volume-band.js apps/mobile/tests/__snapshots__/engine-golden-master.json
git commit -m "feat(engine): scale volume band start+top by experience level

Replace the flat LEVEL_BIAS multiplier with LEVEL_START (where week 1 begins
up the MEV->top band) and LEVEL_TOP_BONUS (advanced ramps deeper toward MRV).
An adapted athlete no longer starts every block at a novice's MEV. Golden
master regenerated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Optimal training frequency

**Files:**
- Create: `packages/engine/src/lib/plan/frequency.js`
- Test: `apps/mobile/tests/optimal-frequency.js` (create)

**Interfaces:**
- Consumes: `resolveProgram(profile)` (`../strength/program.js`), `weeklyMuscleTargets(ctx)` (`../strength/targets.js`, post-Task-1), `getGymLevel(profile, default)` (`../Utils.js`), `MUSCLE_GROUPS` (`../../data/muscleVolume.js`).
- Produces: `suggestOptimalFrequency(profile) → { optimalDays:number, minDays:2, maxDays:7 }`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/optimal-frequency.js`:

```js
// tests/optimal-frequency.js — the slider's default day count, by goal+experience.
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const P = (o) => answersToProfile({ ...BLANK_ANSWERS, ...o });

const begStrength = suggestOptimalFrequency(P({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner' }));
const advHyper    = suggestOptimalFrequency(P({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced' }));
const inSeason    = suggestOptimalFrequency(P({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate' }));

assert(begStrength.optimalDays >= 3 && begStrength.optimalDays <= 4, `beginner strength optimal ~3 (got ${begStrength.optimalDays})`);
assert(advHyper.optimalDays >= 5 && advHyper.optimalDays <= 6, `advanced hypertrophy optimal ~5-6 (got ${advHyper.optimalDays})`);
assert(inSeason.optimalDays === 2, `in-season sprinter optimal 2 (got ${inSeason.optimalDays})`);

// Clamp invariants.
assert(begStrength.minDays === 2 && begStrength.maxDays === 7, 'min/max days are 2..7');
const everyone = [begStrength, advHyper, inSeason];
assert(everyone.every(r => r.optimalDays >= 2 && r.optimalDays <= 7), 'optimal always within 2..7');

console.log('optimal-frequency done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/optimal-frequency.js`
Expected: FAIL with "does not provide an export named 'suggestOptimalFrequency'".

- [ ] **Step 3: Implement `frequency.js`**

Create `packages/engine/src/lib/plan/frequency.js`:

```js
/**
 * frequency — the optimal number of gym days for an athlete, derived from the
 * weekly volume their goal + experience prescribes. This is the DEFAULT the
 * onboarding frequency slider lands on; the user can drag 2–7 with over/under
 * feedback. Pure function of the profile.
 *
 * optimalDays ≈ representative weekly set-volume ÷ a comfortable session's worth,
 * clamped to [2,7]. Higher-volume goals (advanced hypertrophy) need more days to
 * stay in the per-session sweet spot; maintenance/in-season sport needs fewer.
 */
import { resolveProgram } from '../strength/program.js';
import { weeklyMuscleTargets } from '../strength/targets.js';
import { getGymLevel } from '../Utils.js';
import { MUSCLE_GROUPS } from '../../data/muscleVolume.js';

// Muscle-sets a comfortable ~50–60 min session delivers (BELOW the 75-min ceiling).
// Calibrated so optimalDays ≈ 3 (beginner strength), ≈ 5–6 (advanced hypertrophy),
// ≈ 2 (in-season sport). See tests/optimal-frequency.js.
const SWEET_SPOT_SETS_PER_SESSION = 32;
export const MIN_DAYS = 2;
export const MAX_DAYS = 7;

export function suggestOptimalFrequency(profile = {}) {
  const program = resolveProgram(profile);
  const level = getGymLevel(profile, 'intermediate');
  // Representative mid-block, non-deload week (blockFrac 0.6) — the volume the plan
  // spends most of its weeks near.
  const targets = weeklyMuscleTargets({
    style: program.style, intent: 'build', level,
    weekInPhase: 1, phaseWeeks: 1, deload: false, blockFrac: 0.6,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar
  });
  const total = MUSCLE_GROUPS.reduce((s, m) => s + (targets[m] || 0), 0);
  const raw = Math.round(total / SWEET_SPOT_SETS_PER_SESSION);
  const optimalDays = Math.max(MIN_DAYS, Math.min(MAX_DAYS, raw));
  return { optimalDays, minDays: MIN_DAYS, maxDays: MAX_DAYS };
}

export default { suggestOptimalFrequency, MIN_DAYS, MAX_DAYS };
```

- [ ] **Step 4: Run test; calibrate `SWEET_SPOT_SETS_PER_SESSION` if needed**

Run: `cd apps/mobile && node tests/optimal-frequency.js`
Expected: all PASS. If an assertion fails, adjust `SWEET_SPOT_SETS_PER_SESSION` (raise it to lower day counts, lower it to raise them) by ±2 and re-run until all three archetypes land in their asserted ranges. Do not change the asserted ranges — they encode the design targets.

- [ ] **Step 5: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/frequency.js apps/mobile/tests/optimal-frequency.js
git commit -m "feat(engine): suggestOptimalFrequency — optimal gym days from volume

Pure helper: representative weekly volume / a comfortable session's worth,
clamped 2-7. Drives the onboarding frequency slider's default. Beginner
strength ~3, advanced hypertrophy ~5-6, in-season sport ~2.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Internal per-session ceiling (remove user time from the engine)

**Files:**
- Modify: `packages/engine/src/lib/plan/allocator.js` (export the ceiling constant)
- Modify: `packages/engine/src/lib/PlanGenerator.js` (use ceiling, not `session_minutes`)
- Modify: `apps/mobile/src/lib/PlanService.js` (`gymCtx` uses ceiling, not `session_minutes`)
- Test: `apps/mobile/tests/session-density.js` (create)
- Regenerate: `apps/mobile/tests/__snapshots__/engine-golden-master.json`

**Interfaces:**
- Consumes: `allocateGym`, `functionalSlotMinutes`, `suggestOptimalFrequency` (Task 2), `weeklyMuscleTargets` (Task 1).
- Produces: `SESSION_CEILING_MIN = 75` exported from `allocator.js`; baseline plan session length now driven by volume ÷ day count, capped at the ceiling. `generateTrainNow` is unchanged (keeps its own `minutes`).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/session-density.js`:

```js
// tests/session-density.js — at the optimal day count, an experienced athlete's
// sessions are substantial (no 15-min sessions) and none exceeds the ~75-min ceiling.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const mins = (s) => { const m = /~(\d+)/.exec(s.duration || ''); return m ? Number(m[1]) : 0; };

// Advanced hypertrophy at its OPTIMAL day count.
const ans = { ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', equipment: FULL };
const profile = answersToProfile(ans);
const opt = suggestOptimalFrequency(profile).optimalDays;
const plan = generatePlan({ ...profile, availability: { ...profile.availability, days_per_week: opt } });

// Use a representative non-deload build week.
const week = plan.phases.flatMap(p => p.weeks).find(w => !w.deload && !w.taper && w.sessions.length);
const durations = week.sessions.map(mins);
assert(durations.every(d => d >= 35), `advanced hypertrophy sessions are substantial, all >=35 min (got ${durations.join(', ')})`);
assert(durations.every(d => d <= 80), `no session blows past the ~75-min ceiling (got ${durations.join(', ')})`);

console.log('session-density done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/session-density.js`
Expected: FAIL — today `generatePlan` defaults `session_minutes` to 60 and divides volume across days, so an advanced bodybuilder at ~5–6 days yields short early/!-optimal sessions; the duration floor assertion fails. (If it happens to pass, proceed — the change below still removes the user-time coupling.)

- [ ] **Step 3: Export the ceiling from the allocator**

In `packages/engine/src/lib/plan/allocator.js`, add near the top (after the imports, before `const LETTERS`):

```js
// The internal per-session ceiling — replaces any user-picked session length.
// ~6–10 hard sets/muscle (the within-session stimulus cap) ≈ 75 min of productive
// work. The allocator stops a slot here; volume ÷ day count sizes the rest.
export const SESSION_CEILING_MIN = 75;
```

- [ ] **Step 4: Use the ceiling in PlanGenerator**

In `packages/engine/src/lib/PlanGenerator.js`, add to the imports near the top:

```js
import { SESSION_CEILING_MIN } from './plan/allocator.js';
```

Then in `generatePlan`, replace:

```js
  const minutes = availability.session_minutes || 60;
```

with:

```js
  const minutes = SESSION_CEILING_MIN;   // session length is volume-driven; this is only the ceiling
```

- [ ] **Step 5: Use the ceiling in the PlanService reflow**

In `apps/mobile/src/lib/PlanService.js`, add to the engine imports near the top:

```js
import { allocateGym, SESSION_CEILING_MIN } from '@performance-os/engine/lib/plan/allocator.js';
```

(Replace the existing `import { allocateGym } from '@performance-os/engine/lib/plan/allocator.js';` line.) Then in `gymCtx`, replace:

```js
  const minutes = (profile.availability && profile.availability.session_minutes) || 60;
```

with:

```js
  const minutes = SESSION_CEILING_MIN;   // volume-driven; user no longer picks a session length
```

Leave `generateTrainNow` untouched — its `minutes` argument is the acute on-demand path and must stay.

- [ ] **Step 6: Run the density test**

Run: `cd apps/mobile && node tests/session-density.js`
Expected: all PASS, `session-density done`.

- [ ] **Step 7: Regenerate the golden master**

Session slot length moves from 60 to the 75-min ceiling, so durations/fills shift. Add a clarifying comment in `apps/mobile/tests/golden-master.js` — directly above the `MATRIX` definition, add:

```js
// NOTE: session length is no longer a user input — the engine ignores any
// `sessionMinutes` here and sizes sessions by volume ÷ day count, capped at the
// internal 75-min ceiling. The minutes in the archetype keys are historical labels.
```

Then run: `cd apps/mobile && UPDATE=1 node tests/golden-master.js`, then confirm: `node tests/golden-master.js` → all PASS.

- [ ] **Step 8: Full engine test sweep**

Run: `cd apps/mobile && for t in volume-band optimal-frequency session-density golden-master duration taper volume-tracking; do echo "== $t =="; node tests/$t.js 2>&1 | tail -2; done`
Expected: each ends with its `done` line and no `FAIL`. If `duration.js` or `volume-tracking.js` asserts on specific minute values that shifted, update those expected values to the new realised durations (they are behaviour-tracking, not contracts) and note it in the commit.

- [ ] **Step 9: Commit**

```bash
cd /Users/simondring/Code/hybrid-react
git add packages/engine/src/lib/plan/allocator.js packages/engine/src/lib/PlanGenerator.js apps/mobile/src/lib/PlanService.js apps/mobile/tests/session-density.js apps/mobile/tests/golden-master.js apps/mobile/tests/__snapshots__/engine-golden-master.json
git commit -m "feat(engine): replace user session_minutes with internal 75-min ceiling

Session length is now volume / day-count, capped at SESSION_CEILING_MIN (75).
PlanGenerator and the PlanService reflow stop reading availability.session_minutes;
Train Now keeps its acute minutes input. Golden master regenerated.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Onboarding — drop session length, frequency slider defaulted to optimum

**Files:**
- Modify: `apps/mobile/src/lib/onboardingModel.js` (drop `sessionMinutes`)
- Modify: `apps/mobile/src/lib/PlanService.js` (`profileSignature` drops `session_minutes`)
- Modify: `apps/mobile/src/components/OnboardingWizard.jsx` (slider + remove length question + summary)
- Test: `apps/mobile/tests/onboarding-no-minutes.js` (create)

**Interfaces:**
- Consumes: `suggestOptimalFrequency` (Task 2), `answersToProfile` / `BLANK_ANSWERS`.
- Produces: `availability` with `days_per_week` (from slider) + `days`, and **no** `session_minutes`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/tests/onboarding-no-minutes.js`:

```js
// tests/onboarding-no-minutes.js — onboarding no longer captures session length.
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(!('sessionMinutes' in BLANK_ANSWERS), 'BLANK_ANSWERS has no sessionMinutes');

const patch = answersToProfilePatch({ ...BLANK_ANSWERS, goalType: 'build', strengthStyle: 'strength', daysPerWeek: 4 });
assert(!('session_minutes' in patch.availability), 'profile.availability has no session_minutes');
assert(patch.availability.days_per_week === 4, 'days_per_week still captured (got ' + patch.availability.days_per_week + ')');

console.log('onboarding-no-minutes done');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && node tests/onboarding-no-minutes.js`
Expected: FAIL — `BLANK_ANSWERS has no sessionMinutes` (it currently does).

- [ ] **Step 3: Drop `sessionMinutes` from the model**

In `apps/mobile/src/lib/onboardingModel.js`:

Replace `daysPerWeek: null, sessionMinutes: 60, days: [],` with:

```js
  daysPerWeek: null, days: [],
```

In `answersToProfilePatch`, delete the line `session_minutes: a.sessionMinutes,` from the `availability` object (keep `days_per_week`, `days`, and `allocation`).

- [ ] **Step 4: Drop it from the plan signature**

In `apps/mobile/src/lib/PlanService.js`, in `profileSignature`, no `session_minutes` field exists there directly — it's covered by `a: profile.availability`. Confirm the signature still serialises `availability` (it does via `a: profile.availability`). No change needed; this step is a verification only. (If a future edit added `session_minutes` explicitly, remove it.)

- [ ] **Step 5: Run the model test**

Run: `cd apps/mobile && node tests/onboarding-no-minutes.js`
Expected: all PASS, `onboarding-no-minutes done`.

- [ ] **Step 6: Wire the frequency slider into the wizard**

In `apps/mobile/src/components/OnboardingWizard.jsx`:

(a) Add to the engine import block near the top (next to the existing `suggestGymDays` import):

```js
import { suggestOptimalFrequency } from '@performance-os/engine/lib/plan/frequency.js';
import { answersToProfile } from '../lib/onboardingModel.js';
```

(If `answersToProfile` is already imported from `onboardingModel`, add only `suggestOptimalFrequency` and reuse the existing import.)

(b) Inside the component, after the `const isSport = ...` lines (around line 196), add the optimum + a one-time default:

```js
  // Engine's recommended day count from goal + experience; the slider defaults here.
  const optimalDays = useMemo(() => {
    try { return suggestOptimalFrequency(answersToProfile(a)).optimalDays; }
    catch { return 3; }
  }, [a.goalType, a.strengthStyle, a.sport, a.runDiscipline, a.sportIntent, a.experienceLevel]);

  // Default the slider to the optimum once, when the user first lands without a pick.
  useEffect(() => {
    if (a.daysPerWeek == null) set({ daysPerWeek: optimalDays });
  }, [optimalDays]);
```

Ensure `useMemo`/`useEffect` are imported from `react` at the top (the file already imports `useState`/`useRef`/`useEffect`; add `useMemo` if absent).

(c) In the "How much can you train?" step (around line 314), replace the **Days per week** div and the **Typical session length** div (the two `<div>` blocks at lines 317–318) with a single slider block:

```jsx
          <div>
            <label style={FIELD_LABEL}>Days per week</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="range" min={2} max={7} step={1}
                value={a.daysPerWeek ?? optimalDays}
                onChange={e => set({ daysPerWeek: Number(e.target.value) })}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <div style={{ minWidth: 64, textAlign: 'right', fontSize: 22, fontWeight: 700, color: 'var(--txt-strong)' }}>
                {a.daysPerWeek ?? optimalDays}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-muted)' }}> days</span>
              </div>
            </div>
            <div style={{ ...HINT, marginTop: 8 }}>
              {(a.daysPerWeek ?? optimalDays) === optimalDays
                ? `We recommend ${optimalDays} days for your goal and experience.`
                : (a.daysPerWeek ?? optimalDays) > optimalDays
                  ? `More than the ${optimalDays} days we'd recommend — extra days add fatigue without more progress for this goal.`
                  : `Fewer than the ${optimalDays} days we'd recommend — you'll likely fall short of the ideal dose for your goal.`}
            </div>
          </div>
```

(d) Update the `valid:` for that step — `a.daysPerWeek != null` is still satisfied (the effect sets it), so leave it. The **Equipment** and **Which days suit you?** blocks stay as-is.

(e) Update the summary row (around line 444). Replace:

```jsx
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days · ${a.sessionMinutes === 90 ? '90+' : a.sessionMinutes} min` : '—'} />
```

with:

```jsx
            <SummaryRow label="Week" value={a.daysPerWeek ? `${a.daysPerWeek} days / week` : '—'} />
```

(f) Find and remove the now-unused `SESSION_LENGTHS` constant definition (grep it: `grep -n SESSION_LENGTHS apps/mobile/src/components/OnboardingWizard.jsx`). Delete its declaration line; the only other use was the length question removed in (c).

- [ ] **Step 7: Verify the build and the wizard in the browser**

Run: `npm run dev` (from repo root). Then verify with the preview tools:
- onboarding "How much can you train?" shows a **slider** (no session-length chips), defaulted to the recommended number, with the recommendation hint;
- dragging below the recommendation shows the "fall short" copy; above shows the "extra days add fatigue" copy;
- completing onboarding produces a plan (no console errors).

Capture a screenshot of the step for the record.

- [ ] **Step 8: Full sweep + commit**

Run: `cd apps/mobile && node tests/onboarding-no-minutes.js && node tests/golden-master.js 2>&1 | tail -1 && node tests/sport-onboarding.js 2>&1 | tail -1`
Expected: each PASS / `done`. Fix any onboarding test that referenced `sessionMinutes`.

```bash
cd /Users/simondring/Code/hybrid-react
git add apps/mobile/src/lib/onboardingModel.js apps/mobile/src/components/OnboardingWizard.jsx apps/mobile/tests/onboarding-no-minutes.js
git commit -m "feat(onboarding): frequency slider defaulted to optimum, drop session length

Remove the session-length question entirely; replace the day-count chips with a
2-7 slider that defaults to suggestOptimalFrequency and shows over/under guidance.
session_minutes is no longer captured.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Experience-scaled band (start+top, Aggressive) → Task 1. ✓
- `suggestOptimalFrequency` → Task 2. ✓
- Internal 75-min ceiling replacing `session_minutes` → Task 3. ✓
- Onboarding: remove minutes, frequency slider defaulted to optimum, 2–7 range, over/under feedback → Task 4. ✓
- Duration shown as realised estimate → unchanged (allocator already does this); verified in Task 3 density test. ✓
- Train Now keeps acute minutes → preserved explicitly in Task 3 Step 5. ✓
- Density floor dropped → nothing to build (absence); the band+ceiling cover it. ✓
- Legacy `session_minutes` ignored → Task 3 stops reading it; Task 4 stops writing it. ✓

**Open spec items deferred to implementation (as the spec directed):**
- `SWEET_SPOT_SETS_PER_SESSION` calibration → Task 2 Step 4.
- "Above optimal holds volume (no junk inflation)" → satisfied for free: weekly target is fixed by the band, so adding days only thins sessions; the engine never inflates volume. The slider copy in Task 4 Step 6(c) reflects this ("no more progress"), not "more load".
- Slider copy → concrete strings in Task 4 Step 6(c) (still tunable).

**Placeholder scan:** none — every code step has full code.

**Type consistency:** `suggestOptimalFrequency(profile) → { optimalDays, minDays, maxDays }` used identically in Tasks 2, 3, 4. `SESSION_CEILING_MIN` exported once (Task 3 Step 3), imported in PlanGenerator + PlanService. `availability.days_per_week` is the single frequency field throughout.

## Out of scope (YAGNI)

- Exercise-appropriateness (hang cleans in hypertrophy, prone Y/T/W as main work, compound/isolation sequencing) — separate follow-up brainstorm.
- Core-volume undercounting — separate.
- Restructuring the golden-master archetype matrix to drop the (now-cosmetic) minutes labels — left as historical labels with a clarifying comment (Task 3 Step 7).
