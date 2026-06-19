# Training load → plan adaptation — Design

**Date:** 2026-06-19
**Status:** Approved for planning (decisions locked 2026-06-19)
**Scope:** Sub-project D of the multi-device wearable initiative
**Author:** Simon + Claude

## Background

A/B/C built the wearable data pipeline: connections + roles (A), Strava workout
ingestion (B), and per-session physiology incl. HR zones (C). D turns that into a
**training-load signal** and uses it to **adapt the plan** — the "react to daily
life and adjust the regime" goal.

The existing engine already adapts: the current week **reflows** around completed
sessions and a single **readiness score** (0–100 from sleep/HRV/resting HR);
`readinessMult(score)` scales the week's volume/intensity; periodization handles
structural deloads/ramps. D adds **training load** as a second live signal and
lets it drive bounded, transparent, reversible week-level adjustments.

Initiative status: **A ✅, B ✅, C ✅ (PR #9), D** (this), **E** (Progress &
data-presentation redesign, after D).

## Decisions (locked 2026-06-19)

1. **Role:** full plan adaptation — load actively adjusts programming (not just
   display).
2. **Control:** **auto-apply, always show why, one-tap revert.** Adjustments
   happen automatically with a clear banner explaining them; the user can pin a
   week back to the plan.
3. **Actions (week-level only):** **ease the current week**, **bring a deload
   forward**, **nudge up when under-loaded.** (Per-session hard→easy swaps are
   explicitly out.)
4. **Load metric:** Edwards **zone-weighted TRIMP** from C's `hr_zones`.
5. **Signal:** acute (7-day) / chronic (28-day) load → **ACWR**, bands
   **<0.8 under-loaded / 0.8–1.3 sweet spot / >1.5 overreaching**.

## Goals

1. Compute a per-session **load** score and rolling **acute/chronic load + ACWR**.
2. Let ACWR drive three **week-level** adaptations, layered on the existing reflow.
3. **Auto-apply with a transparent banner + revert**.
4. Surface a **Training Load** view.
5. Keep it **rule-based and pure** — produce exactly the signals an AI layer
   (Stage 5) could later consume, without depending on it.

## Non-goals (deferred)

- Per-session hard→easy swaps / rest-day insertion (excluded by the action choice).
- The **AI layer** (Stage 5) — D is deterministic.
- The **Progress-tab / data-presentation redesign** (E).
- New data sync / Edge Functions — load is derived from already-synced data
  (C's `session_logs` + `workouts`).

## Architecture & components

### 1. Per-session load (pure, tested) — `src/lib/plan/trainingLoad.js`
`sessionLoad(log)` → a number:
- **Primary (HR zones):** Edwards TRIMP = `z1·1 + z2·2 + z3·3 + z4·4 + z5·5`
  (minutes per zone × zone weight), read from `log.hr_zones`.
- **Fallback (no zones):** `duration_min × 3` — a fixed moderate-intensity proxy
  (≈ the average zone weight), flagged `estimated: true`. Used for sessions with
  no HR window/samples (band not worn, or outside C's recent-HR window).
- Returns `{ load, estimated }`. Zero/null inputs → `load: 0`.

### 2. Acute/chronic load + ACWR (pure, tested)
`acuteChronic(dailyLoads)` and `acwr(...)`:
- Inputs: per-day total load (sum of that day's session loads) over ≥28 days.
- **Exponentially-weighted** acute (7-day) and chronic (28-day) load (Williams
  2017 EWMA-ACWR, preferred over rolling averages): decay
  `λ = 2/(N+1)` for N=7 and N=28.
- `acwr = acute / chronic` (null when chronic is ~0 — not enough history).
- Returns `{ acute, chronic, acwr }`.

### 3. The load decision (pure, tested)
`loadDecision(acwr, recentAcwr) → { action, multiplier, reason }` where
`recentAcwr` is the last few days' ACWR (to distinguish **sustained** from a
one-day blip):
- `acwr > 1.5` sustained (≥3 of the last ~4 days >1.5) → `action: 'deload'`,
  `reason: 'Sustained high load — deload this week'`.
- `acwr > 1.3` (not yet sustained-overreaching) → `action: 'ease'`, `multiplier`
  scaling **1.0 at 1.3 → 0.7 at 1.5** (linear), `reason: 'Load high — eased this week'`.
- `acwr < 0.8` sustained → `action: 'nudge_up'`, `multiplier` ~1.1 (toward plan
  target), `reason: 'Load low — building back toward plan'`.
- otherwise → `action: 'none'`, `multiplier: 1.0`, `reason: null`.
- `acwr == null` (insufficient history) → `none`.

### 4. Engine integration (extend, don't replace)
- The store's `buildView` already calls `setRuntime({ sessions, readiness })`.
  Extend it to also pass a **load decision**. Build `dailyLoads` (total load per
  day) from two non-overlapping sources so total training stress is captured
  without double-counting:
  - every **`session_logs`** row → `sessionLoad` (zone TRIMP, or the fallback);
  - every **`workouts`** row with **no `session_id`** (an ad-hoc activity not tied
    to a logged session) → a duration-based fallback load (Strava summaries have no
    zones). A workout *linked* to a session is already represented by that
    session's log, so it is **not** counted again.
  Then derive ACWR and call `loadDecision`. Pass
  `{ sessions, readiness, loadDecision }` to `setRuntime`.
- `reflowWeek` already applies `readinessMult(readiness)`. Combine signals:
  - **ease/none:** effective week multiplier = **min(readinessMult, loadMult)**
    (the more conservative of recovery and load protects the athlete).
  - **nudge_up:** raise toward the plan **only when readiness isn't low**
    (don't push volume on a poorly-recovered day).
  - **deload:** mark the current week `deload: true` through the existing deload
    path, so the reflow produces a deload week.
- An adaptation is **computed live** (like the current reflow) — no persisted plan
  mutation, so it self-corrects as load changes.

### 5. Transparency & revert
- The reflow exposes the active **adaptation** (`{ action, reason }`) for the
  current week, which the UI renders as a banner.
- **Revert** writes a small persisted **per-week override** into `profile`
  (e.g. `profile.load_overrides = { [weekKey]: 'plan' }`), via `updateProfile`
  (SyncService, like other plan inputs). When a week is overridden, the reflow
  **ignores the load decision** for that week (readiness still applies). Reverting
  is reversible (clear the override).

### 6. UI
- **Training Load view** (new screen reached from Progress): acute vs chronic load,
  the **ACWR band** (under-loaded / sweet spot / overreaching) with the value, and
  a list of recent sessions with their load. Real theme variables only. (The full
  Progress redesign remains **E**.)
- **Adaptation banner** on Today and the current week (Plan): shows the `reason`
  and a **Revert to plan** button when an adaptation is active.

### 7. Data flow
`session_logs` (C: hr_zones, duration) + `workouts` → pure `trainingLoad`
functions → ACWR → `loadDecision` → `setRuntime` → `reflowWeek` (combined with
readiness) → adapted current week + adaptation banner. Revert ↔ `profile`
override via SyncService. No new tables, sync, or Edge Functions.

## Error handling / graceful degradation

- **<28 days of load history** → `acwr: null` → `action: 'none'`: no adaptation
  until there's enough data (banner absent). The plan runs as today.
- **Sessions with no HR** contribute via the estimated fallback so load isn't
  silently zero; the Training Load view marks estimated sessions.
- **Overridden week** → load ignored, readiness still applies; banner shows
  "Following the plan (you reverted)".
- Combined multiplier is **clamped** to a sane floor (e.g. ≥0.5) so adaptation can
  never zero out a week.

## Testing strategy

- **Pure unit tests (TDD), Node `assert` style:**
  - `sessionLoad` — Edwards TRIMP from zones; estimated fallback; null/zero inputs.
  - `acuteChronic` / `acwr` — EWMA values, insufficient-history → null, boundary.
  - `loadDecision` — each band → correct action/multiplier/reason; sustained vs
    one-day blip for deload and nudge_up; `acwr null` → none.
  - The combine rule (min for ease; nudge gated on readiness; clamp floor) — as a
    small pure helper so it's testable without the full reflow.
- **Manual:** with real synced data, verify the banner appears on high load, the
  Training Load view reads correctly, and revert pins the week.
- `npm run build` clean; existing plan/engine tests still pass.

## Risks & notes

- **Deload-forward is the highest-risk action** — it shifts periodization. Bounded
  by: only on *sustained* overreaching, only marks the *current* week, reversible,
  and the originally-scheduled deload logic is unchanged (D doesn't delete future
  deloads — at worst the athlete gets an extra easy week, which is safe).
- **ACWR needs history** — the first ~4 weeks produce no adaptation; that's correct,
  not a bug.
- Thresholds (TRIMP weights, ACWR 0.8/1.3/1.5, ease curve) are centralised
  constants in `trainingLoad.js` so they're easy to tune.
- All writes (the revert override) go through SyncService; engine changes are
  additive to `reflowWeek`/`setRuntime`.

## What D leaves ready for E and the AI layer

- **E:** a computed load/ACWR surface + per-session loads to design the Progress
  tab around (alongside C's physiology).
- **AI (Stage 5):** `loadDecision` and the load/readiness signals are a clean,
  explicit contract an Edge-Function AI coach could later read or override.
