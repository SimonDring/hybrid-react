# Project Handoff — state of play

_Last updated: 2026-06-19. Keep this current at the end of each work session so the
next session (or a fresh agent) can resume without re-deriving context._

## Where we are

The **multi-device wearable initiative** (a 4-part decomposition) is **complete and
shipped to `main`** (deployed to GitHub Pages):

| Sub-project | What it does | Status |
|---|---|---|
| **A — Multi-device foundation** | Wearable connection roles (primary/secondary), Garmin/Strava placeholder cards, `workouts` table, `set_device_primary` RPC | ✅ merged + live |
| **B — Strava ingestion** | Connect Strava (OAuth), ingest activities into `workouts` (incl. Garmin-recorded ones via Strava) | ✅ merged + live |
| **C — Session ↔ wearable linking** | Auto-link Strava workouts to sessions; per-session HR + Karvonen/HRR zones from the primary band; "Your session" block on SessionDetail | ✅ merged + live |
| **D — Training load → adaptation** | Edwards zone-TRIMP → EWMA acute/chronic → ACWR; auto-adapts the current week (ease / deload / nudge-up) with a transparent revertible banner; Training Load view | ✅ merged + live |

Specs and plans for all four live under `docs/superpowers/specs/` and
`docs/superpowers/plans/` (dated 2026-06-18/19).

## What's live end-to-end

Connect Strava → workouts ingest → sessions auto-link and gain HR + HR zones from
the everyday band → those feed a training-load (ACWR) signal → the current gym week
auto-adjusts with a **"Plan adjusted" banner + Revert** on Today, and a **Training
Load** view under Progress.

Earlier in the same effort we also shipped: the **auth overhaul** (Welcome screen,
Apple/Google OAuth, open signup, per-user cache isolation — fixed a real injury
data-leak), and **Fitbit/Google Health** fixes (CORS preflight, standalone-PWA
OAuth redirect, empty-OAuth-base fallback, reconnect nudge).

## Manual setup — status

| Item | Status |
|---|---|
| Supabase migrations 004 (drop invite allowlist), 005 (device roles), 006 (workouts), 007 (`set_device_primary` RPC) | Applied earlier (Strava/roles flows work). If "Make primary" ever misbehaves, re-verify **007** in the SQL Editor. |
| Migration **008** (`session_logs` HR columns) | ✅ applied 2026-06-19 |
| Edge Functions deployed: `fitbit-auth-callback`, `fitbit-sync`, `strava-auth-callback`, `strava-sync`, `enrich-sessions` | ✅ deployed |
| `supabase/config.toml` pins `verify_jwt` per function (callbacks public, sync/enrich JWT) | ✅ in repo — future `functions deploy` keeps it correct |
| Secrets: `STRAVA_CLIENT_ID`/`SECRET` (Edge env), `VITE_STRAVA_CLIENT_ID` (GitHub Actions + .env.local); Google/Fitbit OAuth | ✅ set |

**No outstanding manual steps.** D added no migration/function/secret.

## Known limitations / expectations (not bugs)

- **Training-load adaptation needs ~4 weeks of history** before ACWR is meaningful;
  until then the banner stays hidden and the plan runs as designed.
- **HR enrichment is recent-sessions-only** — the Google Health intraday HR API has
  no date filter, so a session gets HR the day it's logged, not retroactively.
- **Cardio HR zones come from the everyday band**, not Strava (Strava per-second
  streams were deferred).
- **Garmin direct API** stays a placeholder (program suspended + legal-entity-only);
  Strava carries Garmin-recorded workouts.
- **Fitbit/Google OAuth in "Testing" mode** expires the refresh token ~weekly — the
  reconnect nudge handles it; publishing the consent screen would remove it (needs
  Google verification for restricted scopes).

## Non-blocking follow-ups (from final reviews — your call)

- D: revert actions read `profile` via a redundant `buildView()` (runs the load math
  ~3×/click) — use `Database.services.getProfile()` instead.
- D: add an integration test locking the key behaviour (`reflowWeek` honours a
  `deload` 0.5× multiplier; a `'plan'` override neutralises it).
- D (cosmetic): `currentAdaptation` reverted branch discards the original `d.reason`;
  Training Load "recent sessions" lists `completed_at`-only while load accounts
  `completed_at || started_at`.
- A (deferred): the dormant `fix/pwa-oauth-redirect` branch is fully superseded by
  B's per-provider redirect — safe to delete on GitHub.

## What's next

- **E — "Midnight" full UI/UX redesign.** Brainstormed + specced + largely BUILT on
  branch `feat/midnight-redesign` (NOT yet merged; awaiting Simon's review). Spec:
  `docs/superpowers/specs/2026-06-19-midnight-ui-redesign-design.md`; plans under
  `docs/superpowers/plans/2026-06-19-midnight-*`. Done: dark-only Midnight design
  system (tokens/type/shell; `data-theme` branching removed), rule-based `verdicts`
  translation layer, a strength-first **Goal Engine** (`src/lib/goals.js` +
  `src/data/strengthStandards.js`, Node-tested), and redesigns of all four tabs —
  Home (two ring tiles: readiness + load), Program (one-screen week stepper),
  Progress (goal-momentum), Profile (goals surfaced). Dev preview: `?preview=1`
  seeds a mock athlete so the real screens render without sign-in (src/lib/previewSeed.js;
  strip before merge if undesired). Secondary/detail screens (SessionDetail,
  PhaseDetail, WeekDetail, Settings, Wearables, Trends, Injuries, TrainingLoad,
  Onboarding, auth) inherit Midnight tokens but were NOT bespoke-redesigned — light
  follow-up pass + dead-CSS sweep (old `.today-hero`/`.th-*`) outstanding.
- Beyond the initiative: **Stage 5** (Claude AI plan generation via a server-side Edge
  Function) — D's `loadDecision` is a clean signal an AI layer could consume/override.

## How work is run here

Each sub-project goes through **brainstorm (spec) → writing-plans → subagent-driven
implementation** (fresh implementer + reviewer per task, then a whole-branch opus
review) → merge via PR or local merge. The SDD progress ledger lives at
`.git/sdd/progress.md` (per-task commit map; not committed to the repo).
