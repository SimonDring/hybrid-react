# Data Architecture Review — 2026-07-09

**Status: REVIEW (dated) · governance sprint Phase 5 · schema.sql reconciled
through migration 20260711 (19 tables) · full per-table/per-policy evidence in
the underlying survey.**

## Verdict

**The security contract is the strongest part of the data layer; the
evolvability is the weakest.** The team-privacy invariant was verified in SQL:
no policy grants a coach access to any raw-vitals table — the only
coach-readable per-player surface is the derived `player_status` row, enforced
at three layers (RLS, a server-truth trigger that overrides/clamps the derived
scalars, and a client allowlist), with a harness asserting it. Cache isolation
per user, token columns revoked from clients, OAuth nonce flow via
SECURITY-DEFINER RPCs — defence-in-depth done properly.

The structural weaknesses are all about the future the platform says it wants
(learning, team trends, analytics): the learning-critical data lives in
owner-only JSON, history is latest-only in three places, and the sync model
will hit a hard wall before any of that matters.

## Findings (ranked)

**F1 — The sync model breaks first (High).** `pullFromSupabase` runs 10
parallel unbounded `select *` and `replaceAll`s localStorage; `set_logs` grows
per set ever performed; localStorage caps at ~5–10MB and on overflow the app
`alert()`s and silently fails the write. 1–2 years of active use hits this
wall. *This is the top pre-scale engineering item in the roadmap.*

**F2 — Population learning is structurally impossible today (High).** The
athlete model, staged/learned priors, block outcomes, and lift log all live in
`users.profile` JSONB behind `auth.uid() = id` with no exceptions, no
service-role ETL, no analytics store. D16 population learning and any
"did the plan work" query require an append-only outcomes layer that does not
exist. (Matches the engine review's "no closed outcome loop" forward risk and
the Athlete Model doc's own known limitation.)

**F3 — `player_status` orphan on coach removal (High, privacy).** Coach-removal
doesn't cascade; the removed player's derived row stays coach-readable.
Self-leave deletes it; roster-removal doesn't. *(Spun off as a fix task —
migration + RLS-harness case.)*

**F4 — Last-write-wins with no version check (Medium).** Upserts push whole
local tables; `users.profile` is pushed as one blob — two devices editing
concurrently silently clobber each other's athlete model / overrides. The
outbox (dirty-table granularity) is elegant and idempotent but amplifies the
clobber on reconnect.

**F5 — Coach data is snapshot-only (Medium).** One continuously-overwritten
`player_status` row per player; no readiness/ACWR/adherence time series; the
dashboard's team-load-trend view is permanently empty. The schedule→constraints
feature (next build) can push constraints down but has no data model to
reflect back up what each player's plan did with them.

**F6 — History is lossy where learning needs it (Medium).** `lift_log` keeps
only the latest e1RM per lift (re-derivable from `set_logs`, which is the
genuine substrate); `stagedPriors` keeps only the latest block's outcome — no
block history.

**F7–F9 (Low).** Missing indexes on the learning/trend hot paths
(`set_logs(user_id, exercise_key, completed_at)`, `session_logs(completed_at)`,
`player_status(user_id)`); dead schema (`wearable_readings`,
`ai_recommendations`, the never-written relational `phases`/`weeks` — plan
content is deterministically regenerated, sessions key on `template_ref` with
`week_id` null by design); provider abstraction leaky (fitbit-named code that
actually serves Google Health; providers hard-coded to fitbit/strava while DB
columns are generic).

## Structure notes (for the record)

- **Two athlete representations coexist by design** (legacy profile +
  versioned `athlete_model`), both in `users.profile` JSONB with a 256KB CHECK
  — `session_overrides` accretes toward that ceiling over years.
- **Plans are not stored** — regenerated pure from the profile; only sessions/
  logs/checkins are rows. This is the correct consequence of the pure engine,
  but it means "prescribed vs happened" joins need the outcomes layer (F2).
- **Wearables**: `daily_metrics` + `workouts` + `wearable_connections` live;
  HR zones flow onto `session_logs`; ACWR computed client-side in `buildView`.

## Prioritised recommendations

1. **Bound the sync (F1)**: date-cutoff + pagination on the pull; rolling
   local window with on-demand older history; a real eviction/back-pressure
   path instead of the silent alert. First thing that breaks in production.
2. **Build the outcomes/history layer (F2, F6)**: append-only
   `block_outcomes` (block window, priorities, verdicts, e1RM deltas) +
   optional `readiness_snapshots`, populated by a service-role ETL lifting
   signals out of the profile JSON. The precondition for D16, coach trends,
   and honest "did it work" answers. Design against TAS §11 (two learning
   systems) before building.
3. **Close the roster-removal orphan (F3)** — task filed; migration + harness.
4. **Optimistic concurrency + profile split (F4)**: `updated_at` compare on
   upsert; split `athlete_model` / `lift_log` / `session_overrides` into
   independently-mergeable writes (eventually their own rows, removing the
   256KB ceiling).
5. **Index hot paths + retire dead schema (F7–F8)**; rename the provider layer
   honestly when the next provider lands (F9).
