# Multi-device wearable foundation + Garmin/Strava placeholders — Design

**Date:** 2026-06-18
**Status:** Approved for planning
**Scope:** Sub-project A of the multi-device wearable initiative
**Author:** Simon + Claude

## Background & vision

Today the app connects to one wearable (Fitbit via the Google Health API). The
long-term goal is to let a user connect **several** devices and sources —
typically an everyday band (Fitbit/Oura) for baseline recovery data plus a
Garmin worn for runs/swims/rides — and to pull both **baseline metrics** and
**workout data** into the app so the decision engine (and a future AI layer) can
understand training load and how the body responds to sessions.

The full initiative is too large for one spec, so it is decomposed into
sequential sub-projects:

| Sub-project | Delivers | Depends on |
|---|---|---|
| **A. Multi-device foundation** (this spec) | Garmin + Strava connection placeholders, the primary/secondary role model, and the data-model groundwork (roles + `workouts` table defined) | — |
| B. Workout ingestion | `workouts` populated via real Garmin/Strava OAuth + sync, normalized across providers | A |
| C. Session ↔ wearable linking | Match sessions to workouts (cardio) and to primary-device HR windows (lifting) → per-session physiology summary | B |
| D. Decision-engine integration | Training load + session summaries + readiness in one engine-ready format | C |
| Future | Push structured workouts **to** the Garmin watch | D |

Each sub-project gets its own spec → plan → build cycle. **This spec covers A
only.** B–D are described where they affect A's design, but are not built here.

## Current state (verified)

- `wearable_connections` is already **one row per provider** (`unique(user_id,
  provider)`), and its `provider` column comment already lists `garmin`/`oura`.
- `sessions` carry `started_at` / `completed_at` — the window hook for C.
- `Readiness.js` is a pure "wearable data → programming signal" layer
  (sleep/HRV/RHR → readiness score). It reads `daily_metrics` rows.
- There is **no** device-role concept, **no** `workouts`/activity table, and
  nothing computes training load from external workouts yet.
- Fitbit connection/sync/reconnect logic currently lives inline in
  `src/screens/Settings.jsx`, backed by a single `fitbitConnection` value in
  `trainingStore` and `checkFitbitConnection` / `syncFitbit` in `SyncService.js`.

## Goals (Sub-project A)

1. A dedicated **Integrations screen** listing all wearable providers.
2. **Garmin + Strava placeholder cards** ("coming soon", connect disabled).
3. A **primary/secondary role model**: exactly one primary device per user.
4. Data-model groundwork so B–D need no rework: roles on connections, and a
   **`workouts` table defined** (not yet populated).
5. Fitbit connect / sync / reconnect / nudge continue working, sourced from the
   new multi-connection model.

## Non-goals (deferred)

- Real Garmin/Strava OAuth or data sync (Sub-project B).
- Populating/normalizing `workouts` (B).
- Session↔workout linking and per-session physiology summaries (C).
- Training-load computation and engine wiring (D).
- Push-to-watch / structured workout export (Future).

## Data-sourcing model (the core rule)

**Single primary + any workouts.** Exactly one connected device is `primary` and
owns **all** baseline/recovery metrics (resting HR, HRV, sleep, SpO2, breathing
rate, etc.) — i.e. only the primary provider's sync writes to `daily_metrics`.
**Every** connected device (primary or secondary) may contribute **workouts**.
This removes per-metric conflicts: there is one coherent baseline stream, and
workouts are additive.

## Architecture & components

### 1. Schema (versioned migrations under `supabase/migrations/`)

**Migration: add role to connections**
- `wearable_connections.role text not null default 'secondary'` —
  values `'primary' | 'secondary'`.
- Partial unique index enforcing one primary per user:
  `create unique index ... on wearable_connections (user_id) where role = 'primary';`
- Data migration: set the existing Fitbit row(s) to `role = 'primary'`.

**Migration: create `workouts` table** (defined now, populated in B)
- Columns: `id uuid pk`, `user_id uuid not null → users`, `provider text not
  null`, `provider_activity_id text` (the provider's own id, for dedupe),
  `type text` (`run|ride|swim|strength|walk|other`), `start_time timestamptz`,
  `end_time timestamptz`, `duration_sec int`, `distance_m numeric`,
  `avg_hr numeric`, `max_hr numeric`, `calories numeric`,
  `elevation_gain_m numeric`, `session_id uuid null → sessions(id)` (the C link),
  `raw jsonb` (provider payload), `source text`, plus
  `created_at/updated_at/deleted_at`.
- Indexes: `(user_id)`, `(user_id, start_time)`, unique
  `(user_id, provider, provider_activity_id)` for idempotent upserts.
- RLS: own-rows (`auth.uid() = user_id`), matching every other table.
- `updated_at` trigger consistent with the schema's convention.

`daily_metrics` is unchanged; the single-primary write rule is enforced in the
sync layer in B (no schema change needed — `source` already exists).

### 2. Provider registry (client)

`src/data/providers.js` — a small registry (mirrors `activityTypes.js`):
each entry `{ id, label, capabilities: { baseline: boolean, workouts: boolean },
status: 'live' | 'coming_soon' }`.
- `fitbit` → label "Fitbit / Google Health", `{ baseline: true, workouts: true }`, `live`.
- `garmin` → `{ baseline: true, workouts: true }`, `coming_soon`.
- `strava` → `{ baseline: false, workouts: true }`, `coming_soon`.

### 3. Connection/role model (store + SyncService)

- Generalise the single `fitbitConnection` into **`connections`**: an array of
  `{ provider, role, status, connected_at, last_synced_at }`.
- `checkFitbitConnection` → **`checkConnections()`** in `SyncService.js`: select
  all `wearable_connections` rows for the user (RLS-scoped). A thin
  `fitbitConnection`-shaped accessor is kept (derived from the list) so existing
  Fitbit code/UI keeps working during the transition.
- Pure helper **`primaryProvider(connections)`** → returns the provider id whose
  role is `'primary'` (or null).
- Store action **`setPrimaryDevice(provider)`**: sets the chosen provider's row
  to `primary` and any other primary to `secondary`, via Supabase then local
  cache; re-reads `connections`.
- Fitbit `syncFitbit` / reconnect / `fitbitReconnectState` nudge are unchanged in
  behaviour; they just read connection data from the list.

### 4. Integrations screen (UI)

- New `src/screens/Integrations.jsx` at route `/settings/integrations`.
- Settings replaces its inline Fitbit block with a single **"Integrations"** row
  that navigates to the new screen. The reconnect nudge + sync controls move to
  the new screen.
- The screen renders a card per registry provider:
  - **Fitbit / Google Health** (`live`): connection status, last sync, **Sync
    now**, **Reconnect** (the `reconnect_now` / `reconnect_soon` banner), and a
    **Primary / Secondary** toggle (defaults primary). Toggling calls
    `setPrimaryDevice`.
  - **Garmin** (`coming_soon`): placeholder card, capability note "Baseline +
    workouts", connect button disabled / "Coming soon".
  - **Strava** (`coming_soon`): placeholder card, capability note "Workouts
    only", connect disabled / "Coming soon".
- Real theme variables only (`--bg-surface`, `--hairline`, `--rust`, `--ochre`,
  `--txt-*`, etc.).

## Data flow

Screens → `trainingStore` (`connections`, `setPrimaryDevice`) → `SyncService`
(`checkConnections`, role updates) → Supabase (`wearable_connections`), with the
localStorage cache updated per the existing offline-first path. `Readiness.js`
continues to read `daily_metrics` unchanged. `workouts` has no writers in A.

## Error handling

- No primary set (e.g. all secondary) → `primaryProvider` returns null; the
  Today/readiness path already tolerates absent baseline data (shows the
  "connect / log a check-in" prompt). The Integrations UI surfaces "No primary
  device — pick one to source your recovery data."
- Switching primary is a single role update; on failure, surface the error and
  leave roles unchanged (no partial state).
- Placeholder providers never call OAuth; their connect action is inert.

## Testing strategy

Pure Node unit tests (existing `tests/*.js` style, `assert(cond,msg)`):
- `providers.js`: registry shape — fitbit `live`, garmin/strava `coming_soon`,
  Strava `workouts`-only.
- `primaryProvider(connections)`: returns the primary; null when none; ignores
  secondaries.
- Role resolution for `setPrimaryDevice` (the pure part that computes the new
  role set given a chosen provider).

Manual verification:
- Integrations screen renders all three cards; Garmin/Strava show "coming soon".
- Fitbit still syncs, reconnects, and shows the nudge from the new screen.
- Primary/Secondary toggle persists across reload (writes to Supabase).
- `npm run dev` clean; existing tests still pass.

## Risks & notes

- **Refactor risk:** moving Fitbit logic out of Settings into the new screen and
  from `fitbitConnection` to `connections` touches working code. Mitigate by
  keeping a derived `fitbitConnection` accessor so the change is incremental and
  the Fitbit path is verified before removing the old block.
- **One-primary invariant:** enforced both by the partial unique index (DB) and
  `setPrimaryDevice` (app). Belt-and-braces, consistent with project norms.
- Theme variables, RLS (`auth.uid() = user_id`), and the store→Sync→Supabase
  path remain the usual silent-failure suspects.
- All writes go through SyncService; no direct Database writes from screens.
- Schema changes ship as versioned migrations (project rule).

## Forward design — how A enables B–D

- **B:** `workouts` is the ingestion target; the unique `(user_id, provider,
  provider_activity_id)` index makes provider syncs idempotent. The single-primary
  rule tells B's sync which provider may write `daily_metrics`.
- **C:** `workouts.session_id` + sessions' `started_at/completed_at` are the
  window-match hook; lifting sessions (no external workout) will summarise the
  primary device's intraday HR for the session window (intraday storage/fetch is
  a C concern, not A).
- **D:** `workouts` carries the raw inputs (duration, HR, distance, type) that D
  turns into training load; readiness already flows via `Readiness.js`.
