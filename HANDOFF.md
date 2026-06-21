# Project Handoff — state of play

_Last updated: 2026-06-21. Keep this current at the end of each work session so the
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

- **CLAUDE.md staleness:** the "Where things live" list still says `src/data/ — Plan.js
  (52-week plan content)`, but `Plan.js` was deleted. One-line fix.
- **Stale remote branches** safe to delete: `engine-fixes`, `chore/remove-dead-code`
  (both merged), plus older merged/dormant ones (`fix/pwa-oauth-redirect`,
  `strength-refocus`, `adaptive-gym-engine`, `ui-overhaul`, etc.).
- **Midnight secondary screens** (SessionDetail, PhaseDetail, Settings, Wearables,
  Trends, Injuries, TrainingLoad, Onboarding, auth) inherit Midnight tokens but
  weren't bespoke-redesigned — optional polish + dead-CSS sweep.
- **Training-load (D) tidy-ups from earlier review:** revert actions read `profile`
  via a redundant `buildView()`; `currentAdaptation` reverted branch drops `d.reason`.

## What's next

- **Stage 5 — Claude AI plan generation/adjustment via a server-side Edge Function.**
  The deterministic engine (`generatePlan`) + the `loadDecision` / `deloadRecommendation`
  signals are clean inputs an AI layer can consume or override behind PlanService's
  existing interface (never call Claude with a key in the browser).
- **Future stage — real endurance session programming** (run/cycle/swim workouts), so
  sport goals get actual cardio sessions, not just gym support.

## How work is run here

Engine changes this session: branch → small themed commits → node tests per change →
`/dev` sweep + preview verification → PR. The deterministic engine lives in
`src/lib/PlanGenerator.js` → `resolveProgram` (`strength/program.js`) +
`resolvePeriodization` (`plan/periodization.js`) + `weeklyMuscleTargets`
(`strength/targets.js`) + the greedy `allocateGym` (`plan/allocator.js`); the
runtime reflow + adaptive deload live in `PlanService.js`. Earlier initiatives used
brainstorm (spec) → writing-plans → subagent-driven implementation; the SDD ledger is
at `.git/sdd/progress.md` (not committed).
