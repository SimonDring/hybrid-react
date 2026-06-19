# Session ↔ wearable linking & physiology summary — Design

**Date:** 2026-06-19
**Status:** Approved for planning (decisions locked 2026-06-19)
**Scope:** Sub-project C of the multi-device wearable initiative
**Author:** Simon + Claude

## Background

A shipped the multi-device foundation; B ingests Strava workouts into the
`workouts` table. C makes that data *mean something per session*: it links an
in-app training session to what the body actually did during it — by attaching
the matching Strava **workout** (cardio) and by summarising the **primary
device's heart rate** for the session's time window (lifting and everything
else). This is the raw material the decision engine (D) turns into training load.

The full initiative: **A** ✅ foundation, **B** ✅ Strava ingestion, **C** (this)
session linking + physiology, **D** training load → decision engine, **E**
Progress-tab & data-presentation redesign (done after C+D so it's designed once
against the complete data).

## Goals

1. **Auto-link** Strava workouts to logged sessions by overlapping time window +
   compatible type; allow **unlink / relink**.
2. For every completed session with a real time window, compute a **per-session
   physiology summary** — `avg_hr`, `max_hr`, `calories`, **HR zones** — from the
   primary device's HR for that window.
3. Store the summary on the existing `session_logs` row (1:1 with the session).
4. Compute HR zones with the **Heart-Rate-Reserve (Karvonen)** method using a
   **dynamic resting HR** and a **measured max HR**.
5. Surface a clear **"Your session"** block on the `SessionDetail` screen.

## Non-goals (deferred)

- Strava per-second **streams** — cardio HR zones therefore come from the primary
  band's continuous HR, not Strava (streams were deferred in B).
- **Training-load scoring** and any plan adjustment — that's **D**.
- **Progress-tab / data-presentation redesign** — that's **E** (after C+D).
- Running any calculation *on* the wearable — the Fitbit/Google Health API is
  read-only; "from the wearable" means computed from its measured samples.

## The sourcing rule (one coherent model)

Every completed session with a `started_at`→`completed_at` window gets an HR
summary from the **primary** device (continuous HR), which is what produces the
**zones** for all sessions. A **cardio** session that also links to a Strava
workout takes its **activity-specific** `avg_hr` / `max_hr` / `calories` /
distance · pace from the **workout** (`hr_source='strava'`); its zones still come
from the primary-band window. A non-linked session (lifting/other) takes all
numbers from the primary-band window (`hr_source='fitbit'`).

## Architecture & components

### 1. Schema (one versioned migration)
Add nullable columns to `session_logs`:
`avg_hr numeric`, `max_hr numeric`, `calories numeric`, `hr_source text`
(`'strava' | 'fitbit' | null`), `hr_zones jsonb` (`{ z1, z2, z3, z4, z5 }` minutes).
No new table — `session_logs` is already 1:1 with a session and fully wired into
cache/sync/pull.

### 2. HR zones — Karvonen / Heart-Rate Reserve (pure, tested)
`hrZonesHRR(samples, { hrRest, hrMax })` bins time-stamped HR samples into 5
zones by **% of Heart-Rate Reserve**: a sample's intensity is
`(hr − hrRest) / (hrMax − hrRest)`. Boundaries: Z1 <60%, Z2 60–70%, Z3 70–80%,
Z4 80–90%, Z5 ≥90% HRR. Returns minutes per zone (from sample spacing).
- **`hrRest`**: dynamic — the recent (e.g. 7-day) average of `daily_metrics.resting_hr`.
- **`hrMax`**: best **measured** value — `estimateHrMax({ age, observedPeak })`
  returns `observedPeak` when it exceeds the age estimate, else the age estimate
  `208 − 0.7 × age` (Tanaka). `observedPeak` = the highest HR seen across the
  user's recent data — the max of `workouts.max_hr` and the primary device's HR
  samples (the enrichment function sees both); so zones get more accurate as
  higher efforts are recorded, without a lab test.
- If `hrRest`/`hrMax` are missing or `hrMax ≤ hrRest`, zones are skipped (null) and
  the UI says so — never emit garbage zones.

### 3. Cardio ↔ workout matcher (pure, tested)
`matchWorkoutToSession(session, workouts)` → the best workout (or null) whose
`[start_time, end_time]` overlaps the session's `[started_at, completed_at]` and
whose `type` is compatible with the session's activity type (run↔run, swim↔swim,
ride↔ride; strength/other never match a cardio workout). Picks the largest
overlap on ties. `sessionPhysiologyFromWorkout(workout)` → the session_log fields
a linked cardio workout supplies (`avg_hr`, `max_hr`, `calories`, plus
distance/pace surfaced in the UI; `hr_source='strava'`).

### 4. Primary-HR-window enrichment — `enrich-sessions` Edge Function
A **new** Deno Edge Function (kept separate from the recently-stabilised
`fitbit-sync` to avoid destabilising it; cost is a second HR fetch, negligible for
a personal account). Given the signed-in user:
- Reads the user's completed sessions that have a window and **no HR summary yet**,
  completed in the **last 30 days**.
- Fetches the **primary** device's HR samples (Google Health `heart-rate`) for
  those dates, plus the dynamic `hrRest` and `hrMax` inputs.
- For each session: filters samples to its window, computes `avg_hr`, `max_hr`,
  and `hr_zones` (via the same Karvonen logic, ported to TS like B's
  normalisation), and upserts them onto `session_logs`.
- Standard lessons applied: CORS preflight, real-error-in-body, `verify_jwt`
  pinned in `config.toml` (it is JWT-invoked, so stays true).

### 5. Client orchestration
On `syncFromCloud` (after the Fitbit/Strava syncs, when HR has propagated):
1. **Cardio linker** (client, pure-driven): for each completed cardio session,
   run `matchWorkoutToSession`; on a match, set `workouts.session_id` (via Sync →
   Supabase) and copy `sessionPhysiologyFromWorkout` onto the session_log.
2. Call **`enrich-sessions`** for recent windowed sessions missing an HR summary.
   A store action `enrichSessions()` mirrors `syncStrava`/`syncFitbitToday`.
**Unlink** clears `workouts.session_id` and reverts that session_log to the
primary-window numbers (re-enrich).

### 6. UI — `SessionDetail` "Your session" block
A block showing: duration, `avg_hr` / `max_hr`, a compact **HR-zone bar** (minutes
per zone, labelled "zones are estimated from your resting & max HR"), and — for a
linked cardio session — the workout's **distance / pace** with an **unlink**
control. A **"link a workout"** affordance lists candidate workouts for the
session's day when auto-match missed. Real theme variables only.

## Data flow

`workouts` + `sessions` + `session_logs` + `daily_metrics` are already in the
per-user cache (A/B). C adds: the client linker writes `workouts.session_id` +
session_log physiology through Sync → Supabase; `enrich-sessions` (server) writes
session_log HR fields; `pullFromSupabase` already carries `session_logs` and
`workouts`, so the enriched data flows back into the cache for `SessionDetail`
(and later D). No baseline (`daily_metrics`) behaviour changes.

## Error handling / graceful degradation

- **No `started_at`** (session marked done after the fact, no window): no HR
  summary; cardio falls back to a **same-day + type suggestion** the user confirms
  (not auto-linked), since there's no window to trust.
- **Window but no HR samples** (band not worn / not yet propagated): summary stays
  null; `SessionDetail` shows "No HR data for this session." Re-runs on the next
  sync once data propagates.
- **Missing `hrRest`/`hrMax`**: zones skipped (null), avg/max still shown if
  samples exist.
- Idempotent: re-running enrichment/linking on an already-summarised session is a
  no-op unless inputs changed.

## Testing strategy

- **Pure unit tests (TDD), Node `assert` style:**
  - `matchWorkoutToSession` — overlap detection, type compatibility, no-window
    fallback signalling, largest-overlap tie-break.
  - `estimateHrMax` — observed peak preferred; age fallback; bad inputs.
  - `hrZonesHRR` — HRR binning, minutes from sample spacing, boundary samples,
    `hrMax ≤ hrRest` → null.
  - `sessionPhysiologyFromWorkout` — field mapping incl. nulls.
- **Manual (needs real data):** a logged lifting session shows HR + zones from the
  band; a Strava-linked run shows the workout's HR/distance + zones; unlink
  reverts; a session with no window shows the suggestion path.
- `npm run build` clean; existing suites green. The Edge Function HR fetch is
  verified manually (no Deno harness, consistent with `fitbit-sync`).

## Risks & notes

- **Zone accuracy** depends on a good `hrMax`/`hrRest`. Observed-peak HRmax is the
  best non-lab proxy; it improves as more data syncs. Labelled "estimated" in UI.
- **Session timestamp quality** is the main real-world limiter (windows require
  Start→Complete). The degradation paths above keep it honest rather than guessing.
- Two functions fetching HR (`fitbit-sync` + `enrich-sessions`) is mild
  duplication, chosen for isolation; revisit if rate limits ever bite (they won't
  at personal scale).
- All writes go through SyncService; schema change is a versioned migration;
  `enrich-sessions` `verify_jwt=true` pinned in `config.toml`.

## What C leaves ready for D and E

- **D**: `session_logs` now carries `avg_hr`, `max_hr`, `hr_zones`, `calories`,
  duration, and `hr_source` per session, plus `workouts.session_id` links — the
  inputs a training-load model needs.
- **E**: a clean per-session physiology surface to design the Progress tab around,
  once D's load score also exists.
