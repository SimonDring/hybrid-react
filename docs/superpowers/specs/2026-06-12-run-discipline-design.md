# Run Discipline Design

**Goal:** Split the `run` sport into three science-backed sub-disciplines (sprint, middle distance, long distance) so the strength program differs in both exercise selection and block length per discipline.

---

## Problem

All runners currently receive the same strength program. A sprinter and a marathon runner need fundamentally different gym work — sprinters need explosive power and upper body; long-distance runners need heavy tendon-loading and minimal plyometrics.

---

## Data Model

**New field:** `profile.run_discipline: 'sprint' | 'middle' | 'long' | null`

- Stored in the existing `users.profile` JSONB column. No schema migration required.
- `null` when sport is not `'run'` or has not been set.
- Set during onboarding; carried forward through block continuations.

**Onboarding answers:** `a.runDiscipline: '' | 'sprint' | 'middle' | 'long'`

---

## Periodization: Block Lengths

Three new profiles added to `PROFILES` in `periodization.js`:

| Profile key | Weeks | Phase split | Evidence |
|---|---|---|---|
| `runSprintOff` | 6 | base:2, build:3, peak:1 | Short power blocks: hypertrophy → maximal strength → explosive |
| `runSprintPre` | 4 | base:2, build:2 | Quick taper to peak power output before competition |
| `runMiddleOff` | 10 | base:4, build:4, peak:2 | Medium blocks for running economy + speed endurance (8–14w optimal) |

Long distance in-season, pre-season, and transition reuse existing profiles unchanged (`sportPre` 6w, `sportIn` 4w, `sportTransition` 4w). Long distance off-season reuses `sportOff` (12w) — the research shows 10–14w blocks produce significantly better economy gains (effect size g=−0.45 vs g=−0.21).

`resolvePeriodization()` branches on `run_discipline` before the generic sport season logic, so cycle/swim athletes are unaffected.

Sprint in-season and post-transition use the existing `sportIn` (4w) and `sportTransition` (4w).

---

## Exercise Selection

### Muscle Emphasis (`SPORT_EMPHASIS`)

Three maps replace the single `run` entry:

| Muscle | Sprint | Middle | Long |
|---|---|---|---|
| Hamstrings | 1.30 | 1.30 | 1.30 |
| Glutes | 1.35 | 1.25 | 1.20 |
| Quads | 1.20 | 1.15 | 1.10 |
| Calves | 1.20 | 1.20 | 1.40 |
| Core | 1.15 | 1.20 | 1.25 |
| Back | 1.00 | 0.90 | 0.90 |
| Shoulders | 1.10 | 0.80 | 0.70 |
| Chest | 0.90 | 0.55 | 0.45 |
| Biceps | 0.70 | 0.55 | 0.50 |
| Triceps | 0.80 | 0.70 | 0.65 |

Sprint gets shoulder/upper-body bump: arm drive research (Hicks 2024 scoping review) shows moderate correlation between upper body strength and flying sprint performance. Long distance gets heaviest calf weighting (achilles tendon loading critical for running economy) and lowest chest/shoulder (avoid unnecessary mass that hurts power-to-weight).

### Priority Lists (`SPORT_PRIORITY`)

Three entries replace the single `run` entry:

```
run_sprint: ['hang_clean', 'power_clean', 'depth_jump', 'broad_jump', 'sled_push',
             'back_squat', 'hip_thrust', 'nordic_curl', 'bounding_a_skip',
             'double_leg_pogo', 'sl_pogo_jump', 'split_squat',
             'glute_bridge_single_leg', 'pallof', 'sl_calf']

run_middle: ['nordic_curl', 'split_squat', 'rdl', 'double_leg_pogo', 'sl_pogo_jump',
             'trap_bar_dl', 'step_up', 'lateral_band_walk', 'copenhagen',
             'pallof', 'sl_calf', 'sl_hinge', 'tibialis_raise']

run_long:   ['nordic_curl', 'rdl', 'trap_bar_dl', 'split_squat', 'sl_calf',
             'tibialis_raise', 'lateral_band_walk', 'copenhagen', 'pallof',
             'dead_bug', 'sl_hinge', 'glute_bridge_single_leg', 'step_up']
```

The generic `run` key is kept in both maps as a no-discipline fallback.

`resolveProgram()` resolves the discipline key: when `sport === 'run'` and `run_discipline` is set, it uses `run_sprint`/`run_middle`/`run_long` as the lookup key for both emphasis and priority. Falls back to `run` when `run_discipline` is null.

### New Exercises (sprint-specific)

Five new exercises added to `strengthExercises.js`, all with `sportTags: ['run_sprint']`:

| id | name | pattern | equip | level | role | minLevelForPrimary |
|---|---|---|---|---|---|---|
| `hang_clean` | Hang Clean | squat | barbell | 2 | primary | intermediate |
| `power_clean` | Power Clean | squat | barbell | 3 | primary | advanced |
| `depth_jump` | Depth Jump | squat | bodyweight | 2 | accessory | intermediate |
| `broad_jump` | Broad Jump | squat | bodyweight | 1 | accessory | returning |
| `sled_push` | Sled Push | lunge | other | 0 | accessory | beginner |

---

## Onboarding UI

The sport step gains a discipline row that appears only when `a.sport === 'run'`, between the sport selector and the intent question:

```
Sport:      [🏃 Running]  [🚴 Cycling]  [🏊 Swimming]

← appears when Running selected →
Distance:   [Sprints]   [Middle distance]   [Long distance]
             100–400m      800m – 5K           10K+

Why do you run?  [I compete]  [For fitness]  [Building my base]
```

- `RUN_DISCIPLINES` constant: `[{ key:'sprint', label:'Sprints', hint:'100 – 400m' }, { key:'middle', label:'Middle distance', hint:'800m – 5K' }, { key:'long', label:'Long distance', hint:'10K+' }]`
- Rendered as `<OptionGrid cols={3}>` with `center` chips (same pattern as the sport selector row)
- Step `valid()` gate: `!!a.sport && !!a.sportIntent && (a.sport !== 'run' || !!a.runDiscipline)`
- When `a.sport` changes away from `'run'`, `runDiscipline` should reset to `''` so stale discipline state doesn't carry over
- Summary screen shows discipline label when sport is `run`

---

## Files Changed

| File | Change |
|---|---|
| `tests/run-discipline.js` | New: 12 tests covering periodization, program resolution |
| `src/lib/plan/periodization.js` | Add 3 profiles; update `resolvePeriodization()` |
| `src/lib/strength/program.js` | Add discipline emphasis/priority maps; update `resolveProgram()` |
| `src/data/strengthExercises.js` | Add 5 sprint exercises |
| `src/lib/onboardingModel.js` | Add `runDiscipline` to blank answers + profile patch |
| `src/components/OnboardingWizard.jsx` | Add discipline selector, update valid gate + summary |

Cycle and swim athletes: zero changes to their code paths.
