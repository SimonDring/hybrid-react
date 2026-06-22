# Project Handoff — state of play

_Last updated: 2026-06-22. Keep this current at the end of each work session so the
next session (or a fresh agent) can resume without re-deriving context._

## What this app is now

A **dynamic, personalised gym-plan generator** for busy people who want to trust
they're getting the best possible training for their goal and the time they have.
The **decision engine** is the core: a short onboarding questionnaire → a multi-week,
periodised strength programme tuned to the user's **own** goal (get stronger, build
muscle, functional fitness, or strength support for a sport they train).

**Scope (important):** the engine is **gym-only today**. Picking a sport (run / cycle /
swim) biases the gym programming (emphasis, priority lifts, periodisation season) to
**support** that sport — it does **not** yet generate endurance sessions (real
run/cycle/swim workouts); that's a planned future stage. No goals are hard-coded —
the user's onboarding goal drives everything. (CLAUDE.md reflects this; the old
personal half-marathon/2.5km-swim goals were removed.)

**Structure + direction (2026-06-22):** the repo is now a **monorepo** (npm workspaces) —
the app lives in `apps/mobile/`, with `apps/web/` (coach dashboard, not built) and
`packages/{shared,engine}/` reserved; `supabase/` + `docs/` sit at the root. Run
`npm run dev` from the **repo root**. The product **North Star** is now set: open
**elite S&C** to teams and budget-constrained individuals, as two packages — **Individual**
(what's here today) and **Team** (player mobile + coach web; the near-term priority, not
built). Full vision: `docs/strategy/VISION.md`; team blueprint + data-isolation rules:
`docs/product/TEAM-ARCHITECTURE.md`.

## Latest work — monorepo restructure (2026-06-22)

Merged to **`main`** (commit `1125f5d`), GitHub Pages deploy green. The app moved **as one
unit** into `apps/mobile/` and the repo became an **npm-workspaces monorepo**:

- `apps/mobile/` — the app (src, public, tests, index.html, vite.config.js, .env.local).
- `apps/web/` — reserved for the coach dashboard + marketing site (Next.js; not built).
- `packages/{shared,engine}/` — reserved (the engine stays in `apps/mobile/src/lib/` for now).
- `supabase/` + `docs/` at the repo root (shared backend; docs gained `strategy/`, `product/`,
  `prompts/`).
- Root `package.json` defines the workspaces + delegating scripts — **run `npm run dev` /
  `npm run build` from the repo root.** CI (`.github/workflows/deploy.yml`) now publishes
  `apps/mobile/dist`. Repo name + Vite base `/hybrid-react/` are unchanged, so the live URL is
  unaffected.

All 226 relative imports survived (the app moved as a unit); `npm install` (4 workspaces,
hoisted), build, engine tests, and the dev server were all verified, and the Pages deploy
succeeded. Docs (CLAUDE.md, the new vision/team docs) were refreshed in the same session.

## Latest work — five tracked lifts + a target weight on every exercise (2026-06-22)

On **`main`** (committed only when asked). Two linked changes so the athlete logs just
their **five** main lifts and every other exercise gets a realistic, auto-progressing
target weight. TDD throughout; `node tests/*.js` = **35 files green** (added
`tests/onboarding-lifts.js`, `tests/exercise-load.js`; extended `tests/validation.js`).

- **Onboarding now captures 5 lifts** (was squat/bench/deadlift): adds **OHP** + a
  **pull** movement entered as either pull-up max-reps **or** lat-pulldown 1RM (a toggle;
  reps → kg e1RM via Epley using bodyweight). New "Your main lifts" step
  (`OnboardingWizard.jsx`) shows whenever barbell **or** cable **or** bodyweight is
  available (not just barbell), with a **"Help me test"** mode — enter weight + reps-to-
  failure → live e1RM (blanks only). Per-lift provenance stored in `profile.lifts_source`
  (`entered`/`tested`/`estimated`). Model + normalisation in `onboardingModel.js`
  (`normalizePullToKg`); Epley helpers `epley1RM`/`pullupE1RM` exported from
  `liftProgression.js`. `strengthStandards.js` gained ohp/pull ÷BW bands. `validation`
  extended to the five lifts (+ `pullupReps` limit).
- **Atlas + Progress translate the new lifts per sport** (`atlas/signals.js`, `goals.js`):
  `LIFT_MUSCLES` now maps `ohp→[shoulders,triceps]` and `pull→[back,biceps]`, so a
  swimmer's `upper_pull` + `shoulder_health` pillars become **real** (driven by actual
  pull-up/OHP strength) instead of level estimates. The overall `strength` score is now
  **sport-weighted** via `resolveProgram().emphasis` (`SPORT_EMPHASIS`) — swimmers' pull/OHP
  count more, sprinters' squat/deadlift count more; `build` stays a neutral average. The
  Atlas stays a sport-relevant **pillar** radar (not a generic 5-lift chart). `goals.js`
  `LIFTS` adds Overhead press + Pull → 5 milestone cards on Progress / Atlas "Your lifts".
  Tests extended in `tests/atlas-and-coachnote.js` (T15–T19) + `tests/goals.js` (T13–T17).
- **Every loadable exercise gets a suggested weight** — new pure
  `src/lib/strength/exerciseLoad.js`: `anchorFor(exercise)` maps each exercise to one of
  the 5 e1RMs + a research-calibrated coefficient (StrengthLevel accessory↔main ratios,
  e.g. lateral raise ≈0.20×OHP, leg ext ≈0.74×squat, leg curl ≈0.42×deadlift; isolation
  coefficients scale with level, dumbbells are per-hand). `applyWeights` (in
  `liftProgression.js`) now weights **all** items via this, not just the matched main;
  `matchLift` is now only for the top-set **log** form (the 5 mains). Bodyweight/band/core
  keep their natural cues (no kg). Weights climb automatically as the mains' e1RMs climb.
  Audited: 120/120 loadable items in a full plan get a sane weight, 0 absurd isolations.
- Design + research notes: `docs/superpowers/specs/`-style plan lives at
  `~/.claude/plans/polished-sprouting-zephyr.md` (sources: StrengthLevel comparison pages).

## Latest work — sport-companion repositioning: home + Atlas (2026-06-21)

On branch **`feat/sport-companion-home-atlas`** (not yet merged). Repositions the app
from a generic gym-plan generator toward a **sport-specific training companion**.
Built in three phases, each verified at an iPhone viewport via the preview MCP; the
pure helpers are covered by `tests/atlas-and-coachnote.js` (40 assertions, all pass).

- **Home redesign** (`src/screens/Home.jsx`): identity header (avatar + name →
  `/profile`, day + date) → auto-generated **coach note** (`src/lib/coachNote.js` —
  what/why/how-it-helps-your-sport, read from `resolveProgram` + plan position) →
  **week schedule** as the hero (`src/components/WeekSchedule.jsx`) → catch-up →
  readiness + load tiles. **Train Now button removed.**
- **Nav**: 5 tabs → **4 — Home · Plan · Health · Atlas** (`TabBar.jsx`). Profile is no
  longer a tab (reached from the home avatar). The old **Progress** screen folds into
  Atlas; `/progress` now redirects to `/atlas` (`Progress.jsx` orphaned, safe to delete).
- **Avatar**: `src/components/ui/Avatar.jsx` (photo or initials). Upload =
  `src/lib/avatarUpload.js` (canvas square-crop/downscale → Supabase Storage when
  signed in, else a local data-URL fallback). **Needs migration applied:**
  `supabase/migrations/009_avatars_storage.sql` (public `avatars` bucket + own-folder
  RLS). URL saved to `profile.avatar.url` (existing JSONB — no schema change).
- **Profile** (`src/screens/Profile.jsx`) is now the account/setup hub: editable photo
  + name, YOU/TRAINING/PLAN cards, **Connections & Settings** rows → integrations +
  settings. Strength-goal card moved out (now in Atlas).
- **Atlas** (`src/screens/Atlas.jsx`) — the new feature. Radar (`RadarChart.jsx`, SVG,
  no chart lib) of sport-specific pillars vs **estimated** top-5%/elite, ranked
  worst-gap-first bars, a "biggest gap" note tied to `resolveProgram.emphasis`, and the
  folded strength-progress rings. Powered by an **extensible** stack: signal providers
  (`src/lib/atlas/signals.js`) → pillar library (`src/data/athletePillars.js`) →
  per-sport registry (`src/data/sports/` — run sprint/middle/long, cycle, swim, + build
  default; "how to add a sport" header). Adding a sport (hurling, GAA, soccer, rugby,
  field hockey…) is a config drop-in — `computePillars`, the radar and the screen don't change.

Follow-ups: real top-5%/elite benchmark data (current values are estimates);
per-pillar trend once history accrues; delete orphaned `Progress.jsx`; team-sport
onboarding + engine emphasis maps.

## Latest work — decision-engine evaluation + hardening (2026-06-21)

The engine was put through an **exhaustive evaluation** (~60k generated plans swept
via the `/dev` playground + a cited literature review) → **`docs/decision-engine-evaluation.md`**.
It found the engine robust and evidence-based, with a ranked list of fixes (F1–F10).
**All fixes + two follow-ups are implemented, tested, and merged to `main`** (PRs #10
and #11):

| Area | Change | Result |
|---|---|---|
| **Volume (F1)** | Hard **weekly MRV ceiling** on actual allocated volume | Build-grid plans over MRV **869 → 0** (back was hitting ~57 vs MRV 25) |
| **Volume tracking** | Overshoot penalty in the allocator | Base-week actual/target **110–123% → ~100%** |
| **Durations (F5)** | Estimate from realised work; filler pass respects the time budget | 1-day plans no longer cram 13 exercises into "~60 min" |
| **Primer (F2/F6)** | Equipment-filter the warm-up; trim it on ≤30-min sessions | No "Band Pull-Apart" for band-less users |
| **Taper (F4)** | Event taper now **keeps intensity, cuts volume** (was a deload) | Peaks instead of detraining (Bosquet/Travis-Mujika) |
| **Sport (F8)** | Sessions **lead with sport-specific work**; sprint chest trimmed | Swimmer opens on a pull, sprinter on Power Clean/plyos |
| **Adaptive deloads (F9)** | Fatigue/ACWR/readiness can **force** a deload or **defer** a planned one | Runtime layer only; pure generator untouched |
| **Titles (F3) / copy (F7)** | Honest session labels; vestigial "aerobic" copy removed | — |
| **Cleanup** | Deleted legacy `Plan.js` fallback (personal-goal plan) + ~930 LOC of dead code (orphaned screens/builders/utilities) | Plan is always per-user generated |

**Engine test suite:** `node tests/*.js` — 260+ assertions pass (new suites:
volume-ceiling, volume-tracking, duration, taper, sport-anchor, primer-equip,
session-titles, adaptive-deload). Determinism + full build/sport sweeps clean.

## Earlier shipped initiatives (still live on `main`)

- **Wearable + training-load (sub-projects A–D).** Connect Strava → workouts ingest →
  sessions auto-link and gain HR + Karvonen/HRR zones from the everyday band → an
  Edwards-TRIMP → EWMA acute/chronic → **ACWR** signal → the current gym week
  auto-adjusts (ease / deload / nudge-up) with a revertible "Plan adjusted" banner +
  a **Training Load** view. (This `loadDecision` signal is exactly what F9's adaptive
  deload now consumes.) Specs/plans under `docs/superpowers/`.
- **"Midnight" UI redesign** — dark-only design system (tokens/type/shell), rule-based
  `verdicts` layer, redesigned tabs (Home readiness+load rings, Program week stepper,
  Progress, Profile). **Merged.** `?preview=1` seeds a mock athlete so screens render
  without sign-in (`src/lib/previewSeed.js`).
- **Auth overhaul** (Welcome screen, Apple/Google OAuth, open signup, per-user cache
  isolation) and **Fitbit/Google Health** fixes.

## Manual setup — status

| Item | Status |
|---|---|
| Supabase migrations 004–007 (allowlist drop, device roles, `workouts`, `set_device_primary` RPC) | Applied. If "Make primary" misbehaves, re-verify **007** in the SQL Editor. |
| Migration **008** (`session_logs` HR columns) | ✅ applied |
| Edge Functions: `fitbit-auth-callback`, `fitbit-sync`, `strava-auth-callback`, `strava-sync`, `enrich-sessions` | ✅ deployed (`config.toml` pins `verify_jwt` per fn) |
| Secrets: `STRAVA_CLIENT_ID`/`SECRET`, `VITE_STRAVA_CLIENT_ID`, Google/Fitbit OAuth | ✅ set |

**No outstanding manual steps.** The engine work added no migration/function/secret.

## Known limitations / expectations (not bugs)

- **Engine is gym-only** — sport selection biases the gym plan; it does not program
  run/cycle/swim sessions (future stage).
- **Adaptive deloads / training-load need ~4 weeks of history** before ACWR is
  meaningful; until then the plan runs as designed.
- **HR enrichment is recent-sessions-only** (Google Health intraday API has no date
  filter); **cardio HR zones come from the everyday band**, not Strava streams.
- **Garmin direct API** stays a placeholder; Strava carries Garmin-recorded workouts.
- **Fitbit/Google OAuth in "Testing" mode** expires the refresh token ~weekly — the
  reconnect nudge handles it.

## Non-blocking follow-ups (your call)

- **Stale remote branches** safe to delete: `engine-fixes`, `chore/remove-dead-code`
  (both merged), plus older merged/dormant ones (`fix/pwa-oauth-redirect`,
  `strength-refocus`, `adaptive-gym-engine`, `ui-overhaul`, etc.).
- **Midnight secondary screens** (SessionDetail, PhaseDetail, Settings, Wearables,
  Trends, Injuries, TrainingLoad, Onboarding, auth) inherit Midnight tokens but
  weren't bespoke-redesigned — optional polish + dead-CSS sweep.
- **Training-load (D) tidy-ups from earlier review:** revert actions read `profile`
  via a redundant `buildView()`; `currentAdaptation` reverted branch drops `d.reason`.

## What's next

- **Stage 5 (current priority) — the TEAM PACKAGE.** Coach-facing web (`apps/web`) alongside
  the existing player mobile (`apps/mobile`). Full blueprint + the binding data-isolation
  rules: `docs/product/TEAM-ARCHITECTURE.md`. First sub-steps, in order:
  1. **Data + RLS spine** — `teams` + `team_members` + a derived `player_status` surface + an
     `is_coach_of()` helper, in a versioned migration, with RLS tests proving a coach sees
     their team's *derived* status only (never raw vitals) and players can't see each other.
  2. **`apps/web` scaffold** — coach dashboard shell (auth + team list).
  3. **Team schedule entry** → persisted on `teams.schedule`.
  4. **Constraints into the engine** — feed the schedule into `scheduler.js` / `PlanService.js`
     so player plans avoid sport-load clashes (the pure `generatePlan` stays untouched).
  5. **Coach loading overview** — aggregate `player_status` into a plain-English team view
     built on the existing `verdicts` + ACWR layer.
- **Following — Claude AI plan generation/adjustment** via a server-side Edge Function. The
  deterministic engine (`generatePlan`) + `loadDecision` / `deloadRecommendation` are clean
  inputs an AI layer can consume or override behind PlanService (never a key in the browser).
- **Later — real endurance session programming** (run/cycle/swim workouts), so sport goals
  get actual cardio sessions, not just gym support.

## How work is run here

Engine changes this session: branch → small themed commits → node tests per change →
`/dev` sweep + preview verification → PR. The deterministic engine lives in
`src/lib/PlanGenerator.js` → `resolveProgram` (`strength/program.js`) +
`resolvePeriodization` (`plan/periodization.js`) + `weeklyMuscleTargets`
(`strength/targets.js`) + the greedy `allocateGym` (`plan/allocator.js`); the
runtime reflow + adaptive deload live in `PlanService.js`. Earlier initiatives used
brainstorm (spec) → writing-plans → subagent-driven implementation; the SDD ledger is
at `.git/sdd/progress.md` (not committed).
