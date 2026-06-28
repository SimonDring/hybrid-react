# Project Handoff — state of play

_Last updated: 2026-06-28. Keep this current at the end of each work session so the
next session (or a fresh agent) can resume without re-deriving context._

## Latest work — Session UI v2 + timer reliability + engine cleanups (2026-06-28)

Continues on branch **`feat/focused-session-runner`** (local only — NOT pushed, no PR).
Six brainstormed specs, all built + preview-verified. Specs under
`docs/superpowers/specs/2026-06-28-*-design.md` (session-ui-v2, rest-timer-reliability,
primaries-straight-sets, region-pure-days-and-ordering, exercise-video-placeholder,
on-the-fly-exercise-substitution).

- **Spec A — Session UI v2.** The session preview is now mobile-first: one compact row
  per exercise (name + a single sets×reps badge; weight/RPE/cues moved into the runner).
  Primer and Main are **bordered section cards** (colour surrounds the block, no left
  rail): **Primer = teal `--accent`**, **Main = neutral**; **rust removed** from the
  session views + runner (it's legacy; the Midnight primary accent is teal). In the
  runner the primer runs as a **circuit, round-by-round** ("Round 1 of 2 → Start main"),
  no per-move rest. (Supersedes the "primer colour --moss" open item below.)
- **Spec B — Rest-timer reliability (serverless).** `RestTimer` rewritten to
  **timestamp-based** timing (tracks the end time, derives the display) so a screen
  lock no longer freezes/drifts it; a `visibilitychange`/`pageshow` handler catches up
  and fires completion once on return. New `hooks/useWakeLock.js` keeps the screen awake
  for the whole runner (re-acquires on visibility; silent no-op on unsupported iOS).
  New `lib/sound.js` beep on completion (+ existing vibrate; AudioContext unlocked on
  taps). Also fixes the prior "setState while rendering" warning. The manual "Log your
  top set" form is **removed** — progression derives solely from logged sets.
  **Deferred (needs backend/native):** locked-screen Web Push banner + native iOS Live
  Activity — a PWA can't schedule local notifications (verified: iOS Web Push is
  server-only, installed-PWA only).
- **Spec C — Primary lifts always run as straight sets.** `structureItems` no longer
  crams a light filler into a primary's rest gap (it under-rested the heavy lift).
  Primaries run straight with full rest; accessories still antagonist-superset among
  themselves. Golden-master regenerated — **exercise selection + volume byte-identical**
  across all 19 archetypes (570 session blocks); only superset structure changed.
- **Spec D — Region-pure focused days + compounds-lead ordering.** A focused Upper/Lower
  day no longer absorbs cross-region weekly-deficit spillover: in `bestExercise`, a
  candidate whose muscles are ENTIRELY off-focus is now excluded (not just suppressed).
  Hybrid lifts that hit an in-focus muscle stay (a Rack Pull on Upper trains the back);
  factor-0 prehab finisher work (tag 'mobility') is region-agnostic; **sport is exempt**
  (sport threads its priority work through every session). `structureItems` ordering
  re-tiered to compounds → isolation → core → mobility, with the anchor pulled to front
  AFTER the sort so a sport-priority iso/accessory anchor still leads. Fixes the reported
  "why is Floor Press on the Tuesday lower day, last?" — Phase1/Wk1 Tuesday now reads
  **Lower** (Box squat · Deficit Deadlift · Calf/Tibialis · Nordic curl · Ab Wheel), no
  stray press. New `tests/region-pure.js`; `session-density` volume canary + sport tests
  pass; golden-master regenerated.

- **Spec E — Exercise video placeholder.** Deleted the stick-figure demos
  (`StickFigureDemo.jsx` + `data/exerciseDemos.js`); the ⓘ guide keeps its written
  content and the demo block is now a future-ready video area — plays `entry.video` when
  one exists, else a "form video coming soon" shell with a disabled upload affordance.
- **Spec F — On-the-fly exercise substitution (runner).** New `substituteOptions`
  engine module + an "Equipment taken? Substitute" control on each working set: ranked
  same-muscle alternatives (same pattern first; squat → leg press / split squat, never
  OHP), filtered to available equipment, each with a recomputed weight target. Picking
  one swaps the exercise for THIS session only (local `sessionOverrides`, keyed by name)
  — future weeks untouched. Only true variants (same `matchLift` key) move the tracked
  e1RM; others log history only. Runner steps rebuild from a content signature so a swap
  is seamless. Substitute shows only on an exercise's FIRST set (committing the swap to
  the whole exercise); the sheet numbers options 1..n with #1 badged "best match".
- **Spec G — Science-based substitution ranking.** New allocator-safe enrichment
  (`data/exerciseSimilarity.js`: accurate primary/secondary muscles via pattern defaults
  + per-exercise overrides, and an equip→modality matrix). `substituteOptions` now gates
  to the same movement TIER + training the original's PRIMARY mover, then ranks by a
  multi-axis likeness score (primary alignment, coverage, synergist overlap, pattern,
  modality/force-vector, loadability via the exerciseLoad coefficient, same tracked lift,
  laterality, ROM). Fixes the rear-delt-for-biceps-curl and hip-thrust-for-squat
  mis-rankings; chest subs rank above triceps-biased ones. muscleContribution/allocator
  untouched. `tests/substitutions.js` extended (15 assertions).

Verified live (375px): compact bordered cards, no rust on page/runner, primer circuit,
timestamp timer counting + catch-up, wake-lock requested, completion form has no
top-set inputs, full Save & complete runs clean. `npm run build` clean; `node tests/*.js`
green except the pre-existing date-dependent `reflow-start-consistency.js`.

## Latest work — focused session runner + primer/main sections (2026-06-28)

On branch **`feat/focused-session-runner`** (local only — NOT pushed, no PR). Built
overnight from a brainstorm; awaiting Simon's review. Spec + plan committed under
`docs/superpowers/{specs,plans}/2026-06-28-*`.

Two connected features:
1. **Primer / Main sections.** Every gym session now shows a colour-coded **Primer**
   block (green `--moss`) — 1–3 movement-specific activation moves matched to the
   day's main lifts (band pull-aparts before bench, etc.) — then the **Main** block
   (rust `--rust`). New engine module `buildPrimer` (`packages/engine/src/lib/plan/primers.js`
   + `data/primers.js`, unit-tested in `apps/mobile/tests/primers.js`); applied as a
   decoration in `PlanService.injuryFilteredPhases` (strips the legacy functional
   P1–P4 primer, prepends the curated one, tags every item `section`). Engine left
   untouched so all engine snapshot tests stay green.
2. **Focused set-by-set runner.** `Start session` now freezes the session and opens
   a full-screen runner (`screens/SessionRunner.jsx`, route `.../sessions/:idx/run`)
   that walks one set at a time: primers are quick prep/Done; strength items expand
   into per-set steps with reps/weight (±2.5 kg) / RPE steppers, carry-forward, and a
   rest countdown that auto-advances (RestTimer `onComplete`). Supersets interleave by
   round. Every set persists to a new **`set_logs`** table (migration 013 + schema;
   offline-first via Storage/Database/SyncService/store `logSet`; degrades gracefully
   if 013 isn't applied). On completion the top working set per lift is derived from
   the logged sets and feeds the existing RPE progression. The old tap-each-exercise
   checklist is removed; Resume re-enters the runner and skips logged sets.

Verified in the preview: primer/main overview, full runner flow (steppers,
carry-forward, superset interleave, rest auto-advance, resume), `set_logs`
persistence, and progression (`lift_log.bench` updated from a logged 87.5 kg set).
`node tests/*.js` green except the **pre-existing** date-dependent
`reflow-start-consistency.js` (fails on clean HEAD too). `npm run build` clean.

**Open for review:** primer colour `--moss` equals `--accent` (swap to `--ochre` for
more contrast?); runner renders within the app shell (TopBar/TabBar visible) rather
than a true viewport overlay; migration 013 not yet applied to the live DB.

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
the app lives in `apps/mobile/`, with `apps/web/` (coach dashboard — **first version now
built**, on mock data) and `packages/{shared,engine}/` reserved; `supabase/` + `docs/` sit at the root. Run
`npm run dev` from the **repo root**. The product **North Star** is now set: open
**elite S&C** to teams and budget-constrained individuals, as two packages — **Individual**
(what's here today) and **Team** (player mobile + coach web; the near-term priority, not
built). Full vision: `docs/strategy/VISION.md`; team blueprint + data-isolation rules:
`docs/product/TEAM-ARCHITECTURE.md`.

## Latest work — decision-engine evidence-architecture refactor (2026-06-23)

On branch **`feat/decision-engine-evidence-architecture`** (PR open, not merged). A
multidisciplinary review of the decision engine (`docs/engine/01-PANEL-REVIEW.md` +
`02-REFACTOR-ROADMAP.md`) plus a staged, low-regression refactor toward an
**orchestrator architecture** where specialist knowledge is modular, pluggable, and
evidence-traceable. Six themed commits; `node tests/*.js` = **42 files green**; build
clean; runtime paths preview-verified.

- **Phase 0 — golden-master safety net** (`tests/golden-master.js`): snapshots
  `generatePlan` across 19 archetypes + an in-process determinism check, so the
  pure-engine refactors below are proven **byte-identical** (`UPDATE=1` regenerates).
- **Phase 1 — evidence knowledge base** (`src/lib/knowledge/`): every scientific
  constant becomes an auditable entry (`evidenceLevel`/`source`/`confidence`/
  `lastReviewed`). Volume landmarks (`muscleVolume`) + ACWR thresholds (`trainingLoad`)
  read from it; contested science tagged `confidence:low/moderate`.
- **Phase 2 — pluggable sport modules** (`src/lib/sports/`): sport emphasis/priority/
  periodisation extracted behind a `SportModule` registry; `resolveProgram` /
  `resolvePeriodization` are thin lookups. **rugby/soccer/gaa** scaffolds prove a new
  sport = one data file, zero core edits. Plans byte-identical for run/cycle/swim.
- **Phase 3 — recovery + load contracts** (`src/lib/recovery/`, `src/lib/load/`): clean
  `RecoveryOutput`/`LoadOutput` consumed by `PlanService` + the store. **ACWR demoted**
  to a soft, low-confidence input (Impellizzeri/Lolli) — no longer cuts volume below
  0.85 or forces a deload alone (now needs corroboration). **Subjective wellness**
  blended ≥ objective (Saw 2016) + illness/travel overrides, captured via a new **Home
  daily check-in card** → `daily_metrics`. *Intentionally changes runtime behaviour*
  (verified in-app: illness → forced deload). **New migration** below.
- **Phase 4 — data-driven injury profiles** (`src/lib/injury/`): per-region
  contraindications relocated from the inline regex table into structured,
  evidence-tagged `InjuryProfile` data behind a registry; `injuryRules` is a thin
  accessor with **identical output** (parity green). Each profile carries risk factors,
  return-to-performance, and a dosed prevention protocol (Copenhagen/Nordic/FIFA-11+)
  linked to KB entries. (Matching stays name-based — items carry only a name; the
  knowledge is what became data-driven.)

**Frozen throughout:** the PlanOutput shape screens consume + the full test suite.

- **Phase 5 — engine extracted to `packages/engine`** (`@performance-os/engine`): the
  self-contained pure tree (39 modules: `PlanGenerator`, `strength`/`plan`/`sports`/
  `knowledge`/`recovery`/`load`/`injury`, `liftProgression`, `Utils`, `Readiness` + 4
  data tables) moved via `git mv` (renames preserved) into `packages/engine/src`,
  mirroring structure so internal imports survive. Barrel `index.js` + `./lib/*` /
  `./data/*` subpath exports; `apps/mobile` consumes it as a workspace dep (113 import
  sites repointed). **PlanService stays** as the thin app adapter (Database/store/
  overrides). golden-master **byte-identical**, suite 42/42, build clean, app verified.

## Latest work — coach web dashboard, first version (2026-06-22)

On branch **`feat/coach-web-dashboard`** (not yet merged). Filled the reserved `apps/web/`
slot with the **first version of the coach-facing dashboard** — the Stage 5 Team package's
coach surface. **Next.js 14 (App Router) · TypeScript · Tailwind v4 · Recharts**, a new
workspace alongside `apps/mobile`. Runs on **realistic mock data** (24 players); no backend
or auth yet, but structured so both slot in without touching the UI.

- **Decision-led, not a data dump.** Every player becomes a RAG status (ready / monitor /
  adjust / no-data) with plain-English meaning + a recommended coach action + player action +
  reason + confidence (from data completeness) + next review. Reuses the mobile engine's
  verdict vocabulary (`verdicts.js`, `trainingLoad.js` ACWR bands, `Readiness.js` scoring).
- **Privacy boundary enforced in code.** `types/dashboard.ts` splits `PlayerPrivateSource`
  (raw vitals — mock-only) from `CoachVisiblePlayer` (derived, maps 1:1 to the planned
  `player_status` table). `lib/derive.ts` is the roll-up; raw vitals never reach a component
  (`grep -rE "sleepHours|hrv|soreness" components/` = nothing). Honours the CLAUDE.md hard rule.
- **The swap point for going live is one file:** `data/mockApi.ts` (async `getTeam` /
  `getPlayers` / `getLoadTrend`). Replace bodies with Supabase `player_status` queries; the
  roll-up moves server-side. See `apps/web/README.md` for the API-migration + auth + extend guide.
- Sections: header (team context + 2 CTAs), 6 overview cards, readiness split, match-week
  panel, prioritised attention list (with the spotlight recommendation card — the
  differentiator), coach actions, filter/sort/search squad table, Recharts load-trend chart,
  adherence heatmap, and a player-detail slide-over drawer.
- **Verified:** `tsc --noEmit` clean, `next build` green (`/dashboard` prerenders), and
  browser-checked on desktop + tablet (filter, sort, search, row→drawer, Escape-to-close all work).
- **Run:** `npm run dev -w @performance-os/web` → http://localhost:3000/dashboard.

**Update — tabbed restructure + Constraints (same branch).** The single long page became a
**collapsible left sidebar + four routed views**: **Home** (`/dashboard`), **Focus**
(`/dashboard/focus` — team training direction + the flagged players it affects), **Squad**
(`/dashboard/squad` — table + chart + heatmap), and **Constraints** (`/dashboard/constraints`).
A shared `DashboardProvider` (client context in `components/dashboard/`) holds cross-view state
(selected player + drawer, editable constraints, toast); `app/dashboard/layout.tsx` fetches data
once and the layout stays mounted across view switches. The new **Constraints** view is a working
form (sport, season, weekly training pattern, fixtures → `TeamConstraints`, shaped for the future
`teams.schedule` jsonb) plus a plain-English cascade explainer (team constraints → each player's
onboarding → personalised plan); editing the season updates the Focus direction live via context.
Old `DashboardShell`/`DashboardHeader` were removed. Verified: `next build` green (all 4 routes
prerender), `tsc` clean, browser-checked (each view renders; client soft-nav keeps provider state;
constraints edit→save→commit cycle works).

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

**Pending on the engine branch:** migration `20260623_daily_metrics_subjective.sql`
(adds `stress`/`illness`/`travel` to `daily_metrics` for the subjective check-in) —
apply when `feat/decision-engine-evidence-architecture` merges. No new functions/secrets.

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

- **Engine extraction — DONE (2026-06-23).** The engine now lives in
  `packages/engine` (`@performance-os/engine`); see its README. The one remaining
  refinement (optional): split `PlanService`'s current-week reflow into a pure engine
  function + a thin adapter, so a second runtime can reflow, not just generate. Not
  required — generation, periodisation, recovery/load, and injury all run from the package today.
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
