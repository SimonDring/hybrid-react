# Design: Volume-driven session length (remove per-session time as an input)

**Date:** 2026-06-25
**Status:** Draft for review
**Scope:** packages/engine (volume model, frequency suggestion, allocator ceiling)
+ apps/mobile (onboarding: remove minutes, add frequency slider)

## Problem

The engine is **volume-anchored, but treats time as a ceiling, not a target.**
`targets.js` computes a weekly per-muscle set target; the allocator fills each
session until that volume is met *or* the user's chosen `session_minutes` runs
out — whichever comes first. Two failures result:

1. **Experienced athletes get tiny sessions.** Every block starts at MEV
   regardless of training age (`LEVEL_BIAS` gives advanced only +5% over
   intermediate). An advanced hypertrophy athlete who selects 5 × 90 min gets
   **15–20 min** week-1 sessions, because the near-MEV starting volume fills in
   one or two exercises. Starting an adapted athlete at MEV is literally a
   detraining dose. (Observed: profile-review Profile 5, Sam.)
2. **High frequency thins each session.** The same weekly volume ÷ more days =
   shorter sessions. A beginner who picks 6 days gets six ~15-min sessions
   (Profile 2) — more days made each session *worse*, the opposite of the user's
   expectation.

Underneath both: **time as a per-session input creates a promise the
volume-first engine can't keep.** "I said 60 min, I got 20" is a broken
expectation, not a broken calculation.

## Decisions (from brainstorming, 2026-06-25)

1. **Remove per-session time as an input entirely.** No training-length *target*
   anywhere in onboarding. Volume dictates session length; duration is shown only
   as a derived estimate ("~55 min"). An elite coach prescribes the dose; it takes
   as long as it takes.
2. **Experience scales the whole volume band — start *and* top (Aggressive).**
   Ramp start fraction up the MEV→top band: beginner **0%**, returning **20%**,
   intermediate **40%**, advanced **60%**. Advanced also ramps **+0.30** deeper
   toward MRV. An adapted athlete never sees a near-MEV week. This is now the
   *entire* dictate of session length.
3. **Frequency becomes a slider, defaulted to the engine's computed optimum.**
   Range **2–7 days**. The engine computes the optimal day count from goal +
   experience (hence volume); the slider defaults there. Dragging up → "no added
   benefit / recovery cost"; dragging down → "below the dose for your goal."
   (Exact copy TBD — the user's phrasing was illustrative.)
4. **Per-session ceiling is internal, not a menu.** The per-muscle-per-session
   stimulus cap (~6–10 hard sets/muscle) → **~75 min** of productive work. The
   allocator stops a session there. This replaces both the old time-budget
   truncation and the 60/75/90 dropdown. 90 min of *working* time is past the
   productive ceiling (West & Phillips 2010: acute hormones don't drive growth;
   the real limiter is diminishing per-set returns), so it goes.
5. **Drop the density floor.** With no time budget to fill to, the session *is*
   the volume. The experience-scaled band makes sessions dense on its own.
6. **Train Now keeps its acute minutes input.** Time still lives where it's real —
   "I've only got 30 min today" — just not as a baseline planning target.

### Why the slider default fixes the broken profiles at the source

| Profile | Today | Optimal day count → default |
|---------|-------|-----------------------------|
| 2 — beginner strength | picked 6 → six ~15-min sessions | low volume → **~3 days**, full sessions; dragging to 6 warns |
| 5 — advanced hypertrophy | picked 5×90 → 15-min week 1 | raised band → **~5–6 days** of real ~55-min sessions |
| 3 — in-season sprinter | 2 days, very short | maintenance volume → **~2 days** (already right) |

The user's most common mistake (too many days for the volume) becomes *visible
guidance* instead of silently-produced junk.

## Requirements

- `weeklyMuscleTargets` (`packages/engine/src/lib/strength/targets.js`) scales
  ramp **start** and **top** by experience level per the Aggressive numbers;
  the flat `LEVEL_BIAS` multiplier is removed (folded into start/top to avoid
  double-counting).
- New pure helper `suggestOptimalFrequency(profile)`
  (`packages/engine/src/lib/plan/frequency.js`) → `{ optimalDays, minDays: 2,
  maxDays: 7 }`, computed from the representative weekly volume and a 2×/week
  per-muscle frequency floor, fitted around sport days.
- The allocator (`packages/engine/src/lib/plan/allocator.js`) stops a session at
  its per-slot volume share **or** the internal ~75-min ceiling, whichever comes
  first — no user `session_minutes`.
- Onboarding (`apps/mobile/src/lib/onboardingModel.js` + `Onboarding.jsx`):
  - **remove** the session-minutes question and `availability.session_minutes`
    as a captured value;
  - **replace** the day count with a slider (2–7) defaulting to
    `suggestOptimalFrequency`, with a live readout (≈ N days · ~M min/session)
    and over/under feedback;
  - keep the **which-weekdays** picker (pre-filled via `suggestGymDays` around
    sport days — see the sport-days spec); the slider sets *how many*, the picker
    sets *which*.
- Duration continues to render as the realised estimate the allocator already
  computes (`allocator.js` ~L517).
- Legacy profiles with `session_minutes` ignore the field and regenerate.
- The app still runs (`npm run dev`) at the end.

## Architecture

### 1. Volume band by experience — `targets.js`

Replace the flat `LEVEL_BIAS` multiplier with a start-and-top model:

```js
// Fraction up the MEV→top band where week 1 begins (Aggressive).
const LEVEL_START = { beginner: 0.00, returning: 0.20, intermediate: 0.40, advanced: 0.60 };
// Added to STYLE_TOP — only advanced ramps deeper toward MRV.
const LEVEL_TOP_BONUS = { beginner: 0, returning: 0, intermediate: 0, advanced: 0.30 };
```

Ramp becomes:

```js
const styleTopEff = STYLE_TOP[style] + (LEVEL_TOP_BONUS[level] ?? 0);
const top   = lm.mev + styleTopEff * (lm.mav - lm.mev);
const start = LEVEL_START[level] ?? 0;
const effFrac = start + frac * (1 - start);          // frac = blockFrac (0→1)
const onRamp  = lm.mev + effFrac * (top - lm.mev);
const base    = clamp(onRamp, floor, lm.mrv);        // no level multiplier
const adjusted = base * (emphasis[m] ?? 1) * scalar;
```

Deload branch (`lm.mev * scalar`) is unchanged.

Worked check — advanced bodybuilding chest (MEV 8 / MAV 16 / MRV 22):
`styleTopEff = 1.4 + 0.3 = 1.7` → `top = 8 + 1.7×8 = 21.6`.
Week 1 (`frac 0`, `start 0.6`): `8 + 0.6×13.6 ≈ 16` sets. Peak (`frac 1`):
`≈ 21.6 → 22` (MRV-capped). Matches the Aggressive target (~16 → ~22).

### 2. Optimal frequency — `frequency.js` (new, pure)

```
representativeWeeklyVolume = Σ weeklyMuscleTargets(mid-block, non-deload)
optimalDays = clamp(
  round(representativeWeeklyVolume / SWEET_SPOT_SETS_PER_SESSION),
  max(2, perMuscleFrequencyFloor),     // ≥2×/week for emphasized muscles
  7
)
```

- `SWEET_SPOT_SETS_PER_SESSION` = the muscle-set volume deliverable in a
  comfortable ~50–60 min session (the sweet spot, *below* the 75-min ceiling).
  A single calibration constant, **tuned so the heuristic reproduces sensible
  day counts on the five profile-review archetypes** (≈3 for beginner strength,
  ≈5–6 for advanced hypertrophy, ≈2 for in-season sport).
- Sport goals: reduce toward the lower end (sport load counts toward fatigue;
  the season scalar already trims gym volume) and fit around
  `deriveConstraints(profile).busyDays`.

### 3. Allocator ceiling — `allocator.js`

- Introduce `const SESSION_CEILING_MIN = 75` (internal). `slotBudget` derives
  from it instead of user minutes.
- Each session's per-slot target share = the week's target distributed across the
  chosen day count (the existing split-focus weighting in `PlanService` /
  `resolveSplit` is unchanged). The allocator fills to that share, stopping at the
  ceiling.
- **When days ≠ optimal:**
  - **days < optimal** — per-slot shares exceed the ceiling; the allocator caps at
    the ceiling and the week's delivered volume falls below target. This is the
    honest under-dose the slider's "below optimal" feedback names. (Same mechanism
    as today's truncation, but now *visible* and *intended*.)
  - **days > optimal** — the weekly target is **held at the productive level (never
    inflated to junk volume)**; the extra day simply thins each session. Feedback
    communicates diminishing returns + recovery cost, not "more load." *(This
    reinterprets the user's "unnecessary load" wording — flagged for review below.)*

### 4. Onboarding — `apps/mobile`

- `onboardingModel.js`: drop `sessionMinutes` from `BLANK_ANSWERS` and the
  profile patch; `availability` keeps `days_per_week` (from the slider) + `days`
  (from the picker). `profileSignature` in `PlanService.js` drops `session_minutes`.
- `Onboarding.jsx`: remove the minutes step; add a frequency slider (2–7)
  initialised from `suggestOptimalFrequency`, with the live readout + over/under
  message. The weekday picker remains, pre-filled around sport days.

## Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `weeklyMuscleTargets` (`targets.js`) | experience-scaled per-muscle volume | landmarks |
| `suggestOptimalFrequency` (`frequency.js`, pure) | profile → optimal day count | targets, constraints |
| `allocateGym` (`allocator.js`) | fill to share, stop at ~75-min ceiling | targets |
| `Onboarding` + `onboardingModel` | frequency slider, no minutes | frequency helper |
| Train Now (`PlanService.generateTrainNow`) | acute on-demand minutes (unchanged) | allocator |

`suggestOptimalFrequency` and `weeklyMuscleTargets` stay pure and unit-checkable.

## Testing

- `targets.js`: experienced week-1 volume is substantially above MEV; advanced
  peak approaches but never exceeds MRV; beginner still starts at MEV; deload
  unchanged. Golden-master snapshot regenerated deliberately (`UPDATE=1`).
- `suggestOptimalFrequency`: returns ≈3 (beginner strength), ≈5–6 (advanced
  hypertrophy), ≈2 (in-season sport) on the profile-review archetypes; clamps to
  2–7; lowers for sport / in-season.
- Allocator: at optimal days, no session exceeds the 75-min ceiling and sessions
  land in the sweet spot; below optimal, sessions cap at the ceiling and weekly
  volume is honestly short; above optimal, weekly volume stays at target (no junk
  inflation) and sessions shorten.
- `apps/mobile/tests/profile-review.js` re-run: experienced profiles no longer
  produce sub-30-min sessions at their optimal frequency; volume grades sit in the
  productive band.
- Regression: a build (non-sport) goal with no sport days is scheduled as before.

## Migration

- Saved profiles with `availability.session_minutes` ignore the field; the plan
  regenerates from the experience-scaled band + day count. No data migration.
- The day count for existing users seeds the slider at their stored
  `days_per_week`; first re-onboard or block roll re-defaults to the optimum.

## Open items for review

- **"Above optimal" behaviour** (§3.3): hold volume at the productive target
  (never program junk) vs. let volume rise toward MRV as days increase. This spec
  chooses *hold* — the scientifically honest option — which reinterprets the
  user's "unnecessary load" phrasing as "no added benefit + recovery cost."
  Confirm.
- **`SWEET_SPOT_SETS_PER_SESSION`** and the exact 75-min ceiling are calibration
  constants; final values set against the profile-review archetypes during
  implementation.
- **Slider copy** for the over/under states — behaviour defined, wording TBD.

## Out of scope (YAGNI)

- The exercise-appropriateness problem (hang cleans in hypertrophy, prone Y/T/W
  raises as main work, compound/isolation balance, CNS-load sequencing) — a
  separate follow-up brainstorm, as agreed.
- The calf-volume and core-undercounting bugs from the profile review — tracked
  separately.
- Generating endurance sessions; team/coach-supplied schedules.
