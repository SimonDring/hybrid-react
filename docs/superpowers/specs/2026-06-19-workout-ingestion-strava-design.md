# Workout ingestion (Strava-first) — Design [DRAFT — pending Simon's review]

**Date:** 2026-06-19
**Status:** DRAFT — researched while Simon was away; needs review/approval before planning
**Scope:** Sub-project B of the multi-device wearable initiative
**Author:** Simon (review pending) + Claude

> This spec was drafted autonomously from real provider-API research. The
> brainstorming approval gate is **not yet satisfied** — the "Open questions"
> section lists the decisions that normally would have been one-at-a-time
> questions. Review those, adjust, and approve before we write the plan.

## Background

Sub-project A shipped the multi-device foundation: a `wearable_connections.role`
model, a defined-but-empty `workouts` table, and Garmin/Strava placeholder cards.
B makes **workout ingestion real** — pulling each external workout (run, swim,
ride, etc.) into the `workouts` table so C (session linking) and D (training
load) can use it.

## The key research finding (reshapes B)

**Garmin's direct API is not viable right now**, and **Strava captures
Garmin-recorded workouts anyway**:

- The **Garmin Connect Developer Program is currently suspended** (no new
  developer accounts) **and** requires applying as a **legal entity** (company,
  university, hospital) — explicitly **not** personal use. Simon, as an
  individual, cannot get Garmin API access today.
- **Strava exposes workouts only — no baseline biometrics** (no sleep, resting
  HR, HRV, recovery). This confirms A's registry (`strava: workouts only`);
  baseline continues to come from the Fitbit/Google Health **primary** device.
- Crucially, **most Garmin users auto-sync their activities to Strava.** So a
  Strava connection ingests Garmin runs/swims/rides **without** Garmin's API —
  satisfying the original goal ("read any workout logged on the Garmin → understand
  training load") via a viable, self-serve path.

**Therefore B = Strava workout ingestion.** Garmin stays a placeholder, marked
blocked-on-external-access; the architecture is provider-generic so Garmin (or
Wahoo, COROS, etc.) slots in later if/when its program reopens.

## Goals (Sub-project B)

1. Connect a **Strava** account via OAuth (self-serve Strava API app).
2. **Sync activities** from Strava into the `workouts` table, normalized to our
   schema, incrementally and idempotently.
3. Surface a minimal **"connected · last synced N workouts"** state on the Strava
   Integrations card (full workout display is C/D).
4. Add `workouts` to the **local cache + cloud pull** so C/D and the UI can read
   it offline-first, per-user isolated.
5. Keep the architecture **provider-generic** so Garmin can be added later.

## Non-goals (deferred)

- Garmin direct API (blocked externally; revisit if the program reopens).
- Session↔workout linking and per-session physiology summaries (Sub-project C).
- Training-load computation / decision-engine wiring (Sub-project D).
- Strava **webhooks** (push subscriptions) — B uses polling; webhooks are a later
  optimization.
- Importing Strava activity **streams** (per-second HR/GPS). B ingests activity
  **summaries** (incl. average/max HR). Streams are a C concern (lifting-session
  enrichment uses the primary device's intraday HR; cardio uses the summary).

## Architecture & components

Mirrors the existing Fitbit pattern (two Edge Functions + a client connect URL +
a sync action), so it's familiar and proven.

### 1. Strava API app (Simon, one-time, self-serve)
Register an app at `https://www.strava.com/settings/api` → get **Client ID** +
**Client Secret** + set the **Authorization Callback Domain**. Unlike Garmin this
is instant and personal-use-friendly. Secrets go in Supabase Edge Function env
(`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) — never in browser code.

### 2. OAuth — `strava-auth-callback` Edge Function
Mirrors `fitbit-auth-callback`:
- Client builds the authorize URL (`getStravaAuthUrl`, mirroring
  `getFitbitAuthUrl`): `https://www.strava.com/oauth/authorize?client_id=…&response_type=code&redirect_uri=<callback>&approval_prompt=force&scope=activity:read_all&state=<user_id>`.
- Connect uses a **top-level redirect** (not `window.open('_blank')` — see the
  standalone-PWA OAuth fix), returning to the app after consent.
- The callback exchanges `code` → tokens (`POST https://www.strava.com/oauth/token`,
  `grant_type=authorization_code`), and upserts a `wearable_connections` row with
  `provider='strava'`, `access_token`, `refresh_token`, `expires_at` (Strava
  access tokens last 6h; refresh tokens are long-lived), `role='secondary'`
  (Strava can never be primary — no baseline), `connected_at=now()`.

### 3. Sync — `strava-sync` Edge Function
Mirrors `fitbit-sync` (incl. CORS preflight handling and reading the real error
into the response body):
- Refresh the access token if expired (`grant_type=refresh_token`), persisting the
  rotated tokens.
- Fetch `GET /athlete/activities?after=<last_synced_epoch>&per_page=100`, paging
  until exhausted (Strava paginates with `page`/`per_page`; `after`/`before` are
  epoch-second filters). First connect imports a bounded window (see Open
  questions — recommend **last 90 days**).
- Normalize each activity → a `workouts` row (pure helper, below) and **upsert**
  on the unique `(user_id, provider, provider_activity_id)` index (idempotent).
- Update `wearable_connections.last_synced_at`.
- Rate limits: Strava allows 100 req/15min and 1000/day per athlete — paging 100
  activities/request keeps a personal account well within limits.

### 4. Normalization — pure helper (TDD)
`src/lib/stravaActivity.js` → `normalizeStravaActivity(activity, userId)` returns a
`workouts` row:
- `provider: 'strava'`, `provider_activity_id: String(activity.id)`,
- `type`: map `activity.sport_type`/`type` → our enum (`run|ride|swim|strength|walk|other`) via a small lookup (Strava has 80+ types; everything unmapped → `other`),
- `start_time: activity.start_date` (UTC ISO), `end_time`: start + `elapsed_time` seconds,
- `duration_sec: activity.moving_time ?? activity.elapsed_time`,
- `distance_m: activity.distance`, `avg_hr: activity.average_heartrate ?? null`,
  `max_hr: activity.max_heartrate ?? null`, `calories: activity.calories ?? null`,
  `elevation_gain_m: activity.total_elevation_gain ?? null`,
- `raw: activity`, `source: 'strava'`.
Pure and fully unit-testable with sample payloads — no network.

### 5. Local cache + cloud pull (data layer)
A added the `workouts` **table** in Supabase but no client cache for it. B adds:
- A `workouts` key in `Storage.js` (namespaced per user like every other table)
  and a `workouts` table in `Database.js` (`tablesApi`), following the existing
  pattern.
- `workouts` to `pullFromSupabase` (filtered by `user_id`, replaced per-table per
  the hardened pull) so the local cache stays in sync and isolated per user.

### 6. Store + UI
- Provider registry: keep `strava` (workouts-only). Generalize the connect action:
  `getStravaAuthUrl(userId)` + a `syncStrava()` store action mirroring
  `syncFitbitToday`/`syncFitbit`. `strava-sync` invoked on connect, on "Sync now",
  and on app foreground (alongside the Fitbit sync in `syncFromCloud`).
- Integrations card for Strava becomes **live**: Connect → (after OAuth) shows
  "Connected · Workouts" + "Sync now" + last-synced. **No Primary toggle** for
  workouts-only providers (small refinement to A's card: only offer "Make primary"
  when `provider.capabilities.baseline` is true).
- Garmin card stays `coming_soon`, with copy hinting "Garmin activities sync
  automatically if you connect Strava."

## Data flow

Connect → `strava-auth-callback` stores tokens (role=secondary). Sync (store
action) → `strava-sync` Edge Function refreshes token, pulls activities,
normalizes, upserts into `workouts` → `pullFromSupabase` brings `workouts` into
the per-user local cache → (C/D consume it later). Baseline metrics path
(`daily_metrics` ← Fitbit primary) is unchanged.

## Error handling

- Reuse the Fitbit lessons: `strava-sync` handles the CORS preflight `OPTIONS`,
  and surfaces the real error in the JSON body so the client shows a useful
  message (and a reconnect path when the token is dead). A `stravaError` state
  mirrors `fitbitError`.
- Token refresh failure → "reconnect Strava" (the same nudge pattern as Fitbit;
  Strava refresh tokens are long-lived, so this should be rare).
- Idempotent upserts mean a re-sync never duplicates workouts.

## Testing strategy

- **Pure unit tests (TDD):** `normalizeStravaActivity` (type mapping incl.
  unmapped→other; end_time math; null HR/calories; distance/elevation), and the
  Strava sport_type→enum map. Node `assert` style, sample payloads inline.
- **Manual (needs Simon's Strava app + a real account):** connect flow reaches
  Strava and returns; "Sync now" ingests recent activities; re-sync doesn't
  duplicate; a Garmin-recorded activity that's on Strava appears in `workouts`.
- `npm run build` clean; existing suites green.

## Risks & notes

- **Strava brand/API terms:** Strava requires "Powered by Strava" attribution and
  forbids certain data uses (e.g. no using Strava data to train ML models in some
  terms). For a personal app this is fine, but the spec flags it so the future AI
  layer (D/Stage 5) doesn't feed Strava-sourced data into model training without
  re-checking terms.
- **Per-activity `calories`** is on the activity **detail** endpoint, not always
  on the summary list — B may leave `calories` null from the list and let a later
  detail fetch fill it (C), to stay within rate limits. Recommend: null is fine
  for B.
- **Time zones:** store `start_time` in UTC (`start_date`); C does any local-day
  matching using sessions' timestamps.
- Standalone-PWA OAuth: connect MUST use top-level redirect (the open fix).

## Open questions for Simon (these gate the plan)

1. **Confirm Strava-first, Garmin-deferred.** Garmin direct is blocked (suspended
   program + legal-entity requirement); Strava carries Garmin workouts. Agree?
   (Strong recommendation: yes.)
2. **First-connect import window:** last **90 days** (recommended), last 30, or all
   history? Affects first-sync time + rate-limit budget.
3. **Sync trigger:** polling on connect / "Sync now" / app-foreground for B,
   webhooks later (recommended)? Or invest in webhooks now?
4. **B's UI surface:** minimal "connected · last synced N" on the card now, full
   workout list/display deferred to C (recommended)? Or show a basic workout list
   in B too?
5. **Strava app ownership:** you'll register the Strava API app and provide
   `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` for the Edge Function env — confirm
   you're set up to do that (it's self-serve, ~5 min, unlike Garmin).

## What A leaves ready for B

- `workouts` table (schema + RLS + the idempotency index) already exists.
- `wearable_connections.role` + the `set_device_primary` RPC exist; Strava simply
  stays `role='secondary'`.
- The Integrations screen + provider registry already render a Strava card; B
  flips it from placeholder to live and adds the workouts-only UI refinement.
