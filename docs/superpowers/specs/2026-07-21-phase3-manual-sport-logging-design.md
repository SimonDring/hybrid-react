# Phase 3 · S6a — Manual pitch/match logging (the ACL adapter + surface) · DESIGN

**Goal.** The first *write* into the sport/match ingestion boundary: an athlete hand-logs a
pitch or match session — minutes played, session RPE, availability (+ optional GPS numbers
transcribed off a tracker) — which is normalised through the **Metric Dictionary** (Phase 3
S1, already live), validated at the boundary, and stored as owner-private observations in
the M5 substrate. "A minutes + RPE entry is a valid, honest Match Performance / External
Load Observation" (DAAS §9 S6a).

Parent: `docs/superpowers/specs/2026-07-20-phase3-sport-match-ingestion-design.md` (§Staging
S6a). Builds directly on the Metric Dictionary
(`docs/superpowers/specs/2026-07-21-phase3-metric-dictionary-v1-design.md`).

> **STATUS: buildable + shippable now — NO Supabase migration needed.** The M5 tables
> (`external_load_observations`, `match_performances`) are already on prod (migration
> `20260713`, applied 2026-07-16) **with owner RLS**: `"own rows insert" with check
> (auth.uid() = user_id)`, matching read/delete, and an append-only guard
> (`forbid_evidence_update` — no UPDATEs; corrections are new superseding rows). A signed-in
> client can insert its own observations today. This slice is additive: no schema change, no
> plan-behaviour change (the M5 substrate readers stay flag-OFF; the plan path never reads
> it — logging records data, it does not yet steer any coaching output).

## Two governance facts that shape the design

1. **Append-only, Supabase-only.** These are M5 "evidence" tables — no localStorage mirror,
   no offline outbox. Mirror the existing `appendBlockOutcome`/`readBlockOutcomes` pattern
   in `SyncService.js` (plain `.insert()` — NEVER `upsert`, which emits an UPDATE the guard
   trigger rejects; `clean(row, uid())` stamps `user_id`; abstain (return null/[]) when
   offline/signed-out). Reads collapse superseded rows via a `supersedes_id` set.
2. **Honest provenance — enforced, not worked around.** The Metric Dictionary decides which
   provenance class each metric admits:
   - `exposure.minutes.match`, `availability.status.match`, `rpe.session.pitch` admit
     **`self-report`** — the true "manual entry" story.
   - `srpe.load.session` (derived = RPE × minutes) — **`self-report`**.
   - `gps.total_distance.session`, `gps.high_speed_distance.session`, `speed.max.session`,
     `sprint.count.session` admit **`device`/`third-party`** only, NOT self-report — a human
     does not *perceive* distance covered; typing a number off a GPS watch is transcribing a
     vendor-computed value = **`third-party`**.
   So the form has two honestly-labelled groups: **"This session"** (minutes / RPE /
   availability — self-report) and an optional **"From your GPS tracker"** (distance /
   sprints / top speed — third-party). `validateObservation` REJECTS a mislabelled datum
   (e.g. a self-report distance); we honour that, we don't route around it. The full
   vendor-file import stays S6b (later).

## The row model — one row per metric (dictionary-faithful)

Each M5 row carries a single `metric_id` (NOT NULL) + its value in the metric's
`storesTo.column` (or in `raw` when the column is null, e.g. `speed.max`, `srpe.load`). The
metrics of one logged session are tied by a shared ref: `session_ref` (external-load) /
`fixture_ref` (match). So one logged match with minutes 70, RPE 6, distance 8200 becomes:
- `match_performances`: `{metric_id:'exposure.minutes.match', minutes:70, provenance:'self-report', fixture_ref}`
- `external_load_observations`: `{metric_id:'rpe.session.pitch', pitch_rpe:6, provenance:'self-report', session_ref}`
- `external_load_observations`: `{metric_id:'srpe.load.session', raw:{value:420}, provenance:'self-report', session_ref}` (derived)
- `external_load_observations`: `{metric_id:'gps.total_distance.session', distance_m:8200, provenance:'third-party', session_ref}` (if provided)

## The pure ACL adapter (engine — mirrors `adaptWearableReading`)

`packages/engine/src/lib/adapters/manualSportEntry.js`:

- `adaptManualSportEntry(input, ctx) → { ok, errors, externalRows, matchRows }`
  - `input`: `{ minutes, rpe, availability, distanceM, sprintCount, topSpeedMs, highSpeedM }`
    (all optional; canonical units — metres, m/s — the UI converts km/km·h⁻¹ at its edge,
    per the dictionary's commensurability ruling).
  - `ctx`: `{ observedAt, on, ref }` — the app supplies the ISO timestamp, the date, and a
    session ref, so the adapter stays **pure** (no clock, no randomness — Art 18).
  - For each present field: resolve `metric_id` + `provenance_class` (self-report for
    minutes/availability/RPE; third-party for GPS), run `validateObservation({metric_id,
    provenance_class, value})`. Valid → build a row (stamp `reliability_tag =
    reliabilityFor(id, prov)`, `observed_at`, ref, date, place value in `storesTo.column` or
    `raw`), routed to `externalRows`/`matchRows` by `storesTo.table`. Invalid → push a
    human-readable error (never silently dropped — Art 15).
  - Derived `srpe.load.session` = round(rpe × minutes) when both are valid (self-report).
  - `ok` = at least one valid row produced.
- `groupSportObservations(rows) → [{ ref, on, minutes, rpe, availability, srpe, distanceM,
  sprintCount, topSpeedMs, highSpeedM }]` — a pure read-back grouper (by ref) for the
  surface. Newest-first by date.

## App layers (mirror existing conventions exactly)

- **SyncService**: `appendSportSession({ externalRows, matchRows })` (insert both sets via
  `clean(row, uid())`, abstain offline, return `{ external, match }` inserted) +
  `readRecentSportSessions(limit=30)` (bounded column reads of both tables, `.eq('user_id',
  uid())`, `.order('observed_at' desc)`, collapse superseded, return raw rows).
- **trainingStore**: `logPitchSession(input)` — build `ctx` (`observedAt = now ISO`, `on =
  input.playedOn || today`, `ref = crypto.randomUUID()`), call `adaptManualSportEntry`,
  short-circuit `{ ok:false, errors }` if nothing valid, else `await
  Sync.appendSportSession(...)`, then refresh, return `{ ok:true, warnings: errors }`.
  `loadPitchSessions()` — async surfacing (mirror `refreshTeamSchedule`): read + group →
  `set({ pitchSessions })`. State `pitchSessions: []`. (These bypass `buildView()` — no
  local cache exists for evidence tables; the reads are explicit.)
- **PitchLog screen** (`apps/mobile/src/screens/PitchLog.jsx`, route `/tracking/pitch`):
  the form (played-on date default today; minutes; RPE 0–10 chip picker;
  availability chips; optional collapsible "From your GPS tracker" with km distance, sprint
  count, km/h top speed — converted to m / m·s⁻¹ on submit) + a recent-sessions list below.
  Mirror `Injuries.jsx` structure + `.form-card`/`.form-row`/`.btn-primary` +
  **REAL theme vars only** (`--bg-surface`, `--bg-surface-2`, `--txt-strong`, `--txt-muted`,
  `--txt-body`, `--hairline`, `--rust`, `--moss`, `--ochre`, `--accent`; never `--card-bg`
  / `--border` / `--accent-bg`). Register in `App.jsx` (`routeMeta` + `<Route>` + import);
  link from `Health.jsx`'s tracking list.

## Verification

- **Engine (TDD):** `packages/engine/tests/manual-sport-entry.test.mjs` — a full manual log
  produces the right rows in the right tables with the right columns + provenance +
  reliability; a self-report GPS distance is REJECTED (honesty enforced, non-vacuous); an
  empty input is `ok:false`; sRPE is derived only when both inputs valid; `ctx` supplies all
  time/ref (purity — same input+ctx ⇒ same rows); `groupSportObservations` round-trips.
- **App suite** green; **lint** 0 errors; the whole engine golden/ratchet suite unchanged
  (adapter is under `src/lib/`, outside the KSV hash → no bump, no golden churn).
- **Browser preview:** dev server renders `/tracking/pitch`, the form validates client-side
  (bad RPE rejected, minutes required), the recent list renders. NOTE: the live Supabase
  insert requires a signed-in session; `canSync()` abstains when signed-out, so end-to-end
  insertion against a real DB is Simon's 30-second logged-in smoke test — the RLS insert
  policy is confirmed present, so the path is correct by construction.

## Explicitly NOT in this slice

Vendor GPS-file/CSV import (S6b); editing/superseding a logged session (append-only supports
it via `supersedes_id`, but v1 only inserts + the existing owner-delete); wiring these
observations INTO the form model / plan (the substrate readers stay flag-OFF — a later,
reviewed flip); any coach-facing surface (owner-private only).
