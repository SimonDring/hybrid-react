# Training Load → Plan Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute a training-load signal (zone-TRIMP → acute/chronic → ACWR) and use it to auto-adapt the current week (ease / bring-deload-forward / nudge-up) with a transparent, revertible banner, plus a Training Load view.

**Architecture:** Pure functions in `src/lib/plan/trainingLoad.js` do all the math (per-session load, EWMA acute/chronic, ACWR, the load decision, and the combined readiness×load multiplier). The decision is fed through the existing runtime (`setRuntime`) into `reflowWeek`, which already trims the current week by a readiness multiplier — D combines it with the load multiplier. A per-week `profile` override powers revert. UI: a Training Load screen + an adaptation banner on Today.

**Tech Stack:** React 18 + Vite, Zustand 5, the existing rule-based plan engine (`PlanService.js` + `src/lib/plan/*`), plain-Node test scripts in `tests/`.

## Global Constraints

- All writes go through SyncService (the revert override via `updateProfile`). No new tables, sync, or Edge Functions — load derives from already-synced `session_logs` (C) + `workouts` (B).
- Real theme variables ONLY: `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md`. NEVER `--card-bg/--border/--accent-bg`.
- **Load metric:** Edwards zone-weighted TRIMP = `z1·1 + z2·2 + z3·3 + z4·4 + z5·5` (minutes/zone) from `session_logs.hr_zones`; fallback `duration_min × 3` (estimated) when no zones.
- **ACWR:** EWMA acute (7d) / chronic (28d), `λ=2/(N+1)`; `acwr=acute/chronic`, null when chronic < 1 (insufficient history). Bands `<0.8` / `0.8–1.3` / `>1.5`.
- **Three actions (week-level, gym volume only — the reflow only modulates gym):** ease (`>1.3`), deload (`>1.5` sustained), nudge_up (`<0.8` sustained). Realised as a multiplier on the current week; combined with readiness conservatively; clamped ≥0.5.
- **Control:** auto-apply, banner shows the reason, one-tap revert (a persisted per-week `profile.load_overrides` entry; readiness still applies on a reverted week).
- **Load accounting:** sum `session_logs` loads + **unlinked** `workouts` (no `session_id`) loads — linked workouts are already in their session's log (no double-count).
- App builds clean (`npm run build`); existing engine tests pass.
- **Out of scope:** per-session swaps; the AI layer (Stage 5); the Progress redesign (E).

## Test conventions

- Node ESM files in `tests/`, run `node tests/<name>.js`, using `assert(cond,msg)`:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
- `src/lib/plan/trainingLoad.js` is pure (no `localStorage`) — its test imports it directly, no shim.
- Engine integration (PlanService) + store + UI have no targeted unit harness; verify by `npm run build` + the existing engine tests (`tests/periodization.js`, `tests/run-discipline.js`, `tests/exercise-selection.js`, `tests/engine-rest-and-rep.js`).

## File structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/lib/plan/trainingLoad.js` | Create | Pure: sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries, loadDecision, combinedMultiplier |
| `src/lib/PlanService.js` | Modify | `setRuntime` takes a load decision; `reflowWeek` combines it with readiness; `adaptedPhases` memo + per-week override; export `currentAdaptation()` |
| `src/stores/trainingStore.js` | Modify | Compute dailyLoads→ACWR→decision in `buildView`, pass to `setRuntime`; expose `load` + `adaptation` in the view; `revertWeekAdaptation`/`unrevertWeekAdaptation` actions |
| `src/screens/TrainingLoad.jsx` | Create | Training Load view (acute/chronic, ACWR band, recent session loads) |
| `src/screens/Progress.jsx` | Modify | Add a link row to the Training Load view |
| `src/App.jsx` | Modify | Route `/tracking/load` |
| `src/screens/Home.jsx` | Modify | Adaptation banner + revert |
| `tests/training-load.js` | Create | Tests for the pure module |

**Task order:** pure module (1) → PlanService integration (2) → store wiring (3) → Training Load view + route (4) → banner + revert (5).

---

### Task 1: Pure training-load module

**Files:**
- Create: `src/lib/plan/trainingLoad.js`
- Test: `tests/training-load.js`

**Interfaces (Produces):**
- `sessionLoad(log) → { load, estimated }`
- `workoutLoad(workout) → number`
- `dailyLoads(sessionLogs, workouts) → [{ date, load }]` (ascending; unlinked workouts only)
- `acuteChronic(dailyLoads, asOf) → { acute, chronic }` (`asOf` = `'YYYY-MM-DD'`)
- `acwr({acute,chronic}) → number | null`
- `acwrSeries(dailyLoads, asOf, n=4) → (number|null)[]`
- `loadDecision(acwrVal, recentAcwr) → { action, multiplier, reason }` (`action`: `'none'|'ease'|'deload'|'nudge_up'`)
- `combinedMultiplier(readinessMultValue, decision) → number`

- [ ] **Step 1: Write the failing test**

Create `tests/training-load.js`:

```js
import {
  sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries,
  loadDecision, combinedMultiplier
} from '../src/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// sessionLoad — Edwards TRIMP from zones
const z = { hr_zones: { z1: 10, z2: 10, z3: 5, z4: 5, z5: 2 }, duration_sec: 1920 };
assert(sessionLoad(z).load === 10*1 + 10*2 + 5*3 + 5*4 + 2*5 && !sessionLoad(z).estimated, 'T1 zone TRIMP');
assert(sessionLoad({ duration_sec: 3600 }).load === 180 && sessionLoad({ duration_sec: 3600 }).estimated, 'T2 fallback duration*3 estimated');
assert(sessionLoad(null).load === 0, 'T3 null → 0');

// workoutLoad
assert(workoutLoad({ duration_sec: 1800 }) === 90, 'T4 workout load duration*3');

// dailyLoads — unlinked workout counts, linked one does not
const logs = [{ completed_at: '2026-06-10T18:00:00Z', hr_zones: { z3: 20 }, duration_sec: 1200 }];
const wks = [
  { start_time: '2026-06-10T07:00:00Z', duration_sec: 1800, session_id: null },     // unlinked → counts
  { start_time: '2026-06-10T19:00:00Z', duration_sec: 1800, session_id: 'sess-1' }   // linked → ignored
];
const dl = dailyLoads(logs, wks);
assert(dl.length === 1 && dl[0].date === '2026-06-10', 'T5 one day');
assert(dl[0].load === (20*3) + 90, 'T6 session TRIMP + unlinked workout, linked excluded');

// acuteChronic / acwr — 28 days of steady 100/day → acwr ~1; <1 chronic → null
const steady = [];
for (let i = 0; i < 28; i++) steady.push({ date: new Date(Date.UTC(2026,5,1) + i*86400000).toISOString().split('T')[0], load: 100 });
const ac = acuteChronic(steady, '2026-06-28');
assert(Math.abs(acwr(ac) - 1) < 0.1, 'T7 steady load → acwr ~1');
assert(acwr(acuteChronic([], '2026-06-28')) === null, 'T8 no history → null');

// loadDecision — bands
assert(loadDecision(null, []).action === 'none', 'T9 null acwr → none');
assert(loadDecision(1.4, []).action === 'ease' && loadDecision(1.4, []).multiplier < 1, 'T10 1.4 → ease <1');
assert(loadDecision(1.6, [1.6,1.6,1.6,1.6]).action === 'deload' && loadDecision(1.6, [1.6,1.6,1.6,1.6]).multiplier === 0.5, 'T11 sustained >1.5 → deload 0.5');
assert(loadDecision(1.6, [1.0,1.0,1.6,null]).action === 'ease', 'T12 high but not sustained → ease, not deload');
assert(loadDecision(0.7, [0.7,0.7,0.7,0.7]).action === 'nudge_up', 'T13 sustained <0.8 → nudge_up');
assert(loadDecision(1.0, []).action === 'none', 'T14 sweet spot → none');

// combinedMultiplier — conservative for ease/deload, gated for nudge, floor 0.5
assert(combinedMultiplier(1.0, { action: 'ease', multiplier: 0.7 }) === 0.7, 'T15 ease = min(rm, loadMult)');
assert(combinedMultiplier(0.8, { action: 'ease', multiplier: 0.9 }) === 0.8, 'T16 readiness more conservative wins');
assert(combinedMultiplier(0.2, { action: 'deload', multiplier: 0.5 }) === 0.5, 'T17 floor clamp 0.5');
assert(combinedMultiplier(1.0, { action: 'nudge_up', multiplier: 1.0 }) === 1.0, 'T18 nudge + recovered → full plan');
assert(combinedMultiplier(0.7, { action: 'nudge_up', multiplier: 1.0 }) === 0.7, 'T19 nudge but low readiness → respect readiness');
assert(combinedMultiplier(0.9, { action: 'none', multiplier: 1 }) === 0.9, 'T20 none → readiness only');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/training-load.js`
Expected: FAIL — `sessionLoad is not a function`.

- [ ] **Step 3: Create `src/lib/plan/trainingLoad.js`**

```js
/**
 * Training load (pure, no IO). Per-session Edwards zone-TRIMP → EWMA acute/chronic
 * → ACWR → a week-level load decision, plus the combined readiness×load multiplier.
 * Thresholds are the only tunables; they live here as constants.
 */

const DAY_MS = 86400000;
export const EASE_FROM = 1.3, HIGH = 1.5, SWEET_LOW = 0.8;

// Edwards TRIMP from HR-zone minutes; fallback to a moderate duration proxy.
export function sessionLoad(log) {
  if (!log) return { load: 0, estimated: false };
  const z = log.hr_zones;
  if (z && (z.z1 || z.z2 || z.z3 || z.z4 || z.z5)) {
    const load = (z.z1 || 0) * 1 + (z.z2 || 0) * 2 + (z.z3 || 0) * 3 + (z.z4 || 0) * 4 + (z.z5 || 0) * 5;
    return { load: Math.round(load), estimated: false };
  }
  const min = log.duration_sec ? log.duration_sec / 60 : 0;
  return { load: Math.round(min * 3), estimated: true };
}

// Unlinked workout load — duration proxy (Strava summaries have no zones).
export function workoutLoad(workout) {
  const min = workout && workout.duration_sec ? workout.duration_sec / 60 : 0;
  return Math.round(min * 3);
}

// Per-day total load: every session log + every UNLINKED workout (linked workouts
// are already represented by their session's log, so they aren't counted again).
export function dailyLoads(sessionLogs = [], workouts = []) {
  const byDate = {};
  const add = (iso, load) => {
    if (!iso || !load) return;
    const d = String(iso).split('T')[0];
    byDate[d] = (byDate[d] || 0) + load;
  };
  for (const log of sessionLogs) add(log.completed_at || log.started_at, sessionLoad(log).load);
  for (const w of workouts) if (!w.session_id) add(w.start_time, workoutLoad(w));
  return Object.entries(byDate).map(([date, load]) => ({ date, load })).sort((a, b) => a.date.localeCompare(b.date));
}

// A continuous daily load array of length `days`, ending on `asOf`, missing days = 0.
function seriesEndingAt(dl, asOf, days) {
  const end = new Date(asOf + 'T00:00:00Z').getTime();
  const map = {};
  dl.forEach(d => { map[d.date] = d.load; });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(map[new Date(end - i * DAY_MS).toISOString().split('T')[0]] || 0);
  }
  return out;
}

function ewma(values, N) {
  const lambda = 2 / (N + 1);
  let e = 0, init = false;
  for (const v of values) { e = init ? v * lambda + e * (1 - lambda) : v; init = true; }
  return init ? e : 0;
}

export function acuteChronic(dl, asOf) {
  return { acute: ewma(seriesEndingAt(dl, asOf, 7), 7), chronic: ewma(seriesEndingAt(dl, asOf, 28), 28) };
}

export function acwr({ acute, chronic } = {}) {
  if (!chronic || chronic < 1) return null;   // not enough load history
  return acute / chronic;
}

// The last `n` days' ACWR (chronological; entries may be null).
export function acwrSeries(dl, asOf, n = 4) {
  const end = new Date(asOf + 'T00:00:00Z').getTime();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(acwr(acuteChronic(dl, new Date(end - i * DAY_MS).toISOString().split('T')[0])));
  }
  return out;
}

// Decide the week-level adaptation from today's ACWR + a short recent series.
export function loadDecision(acwrVal, recentAcwr = []) {
  if (acwrVal == null) return { action: 'none', multiplier: 1, reason: null };
  const sustainedHigh = recentAcwr.filter(v => v != null && v > HIGH).length >= 3;
  const sustainedLow  = recentAcwr.filter(v => v != null && v < SWEET_LOW).length >= 3;
  if (acwrVal > HIGH && sustainedHigh) return { action: 'deload', multiplier: 0.5, reason: 'Sustained high load — deload this week' };
  if (acwrVal > EASE_FROM) {
    const t = Math.min(1, (acwrVal - EASE_FROM) / (HIGH - EASE_FROM));
    return { action: 'ease', multiplier: Math.round((1.0 - 0.3 * t) * 100) / 100, reason: 'Load high — eased this week' };
  }
  if (acwrVal < SWEET_LOW && sustainedLow) return { action: 'nudge_up', multiplier: 1.0, reason: 'Load low — building back toward plan' };
  return { action: 'none', multiplier: 1, reason: null };
}

// Combine the readiness multiplier (≤1) with the load decision. ease/deload/none
// take the more conservative value (and never below a 0.5 floor). nudge_up raises
// to the full plan only when readiness is adequate; otherwise readiness wins.
export function combinedMultiplier(rm, decision = { action: 'none', multiplier: 1 }) {
  if (decision.action === 'nudge_up') return rm >= 0.9 ? 1.0 : rm;
  return Math.max(0.5, Math.min(rm, decision.multiplier));
}

export default {
  sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries,
  loadDecision, combinedMultiplier, EASE_FROM, HIGH, SWEET_LOW
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/training-load.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan/trainingLoad.js tests/training-load.js
git commit -m "feat(load): pure training-load module (zone TRIMP, EWMA ACWR, load decision)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: PlanService — feed the load decision into the reflow

**Files:**
- Modify: `src/lib/PlanService.js`

**Interfaces:**
- Consumes: `combinedMultiplier`, and the `loadDecision` shape (Task 1).
- Produces: `setRuntime({ sessions, readiness, loadDecision })`; `reflowWeek` combines load with readiness; `currentAdaptation() → { action, reason, reverted } | null`.

- [ ] **Step 1: Import `combinedMultiplier` and extend `setRuntime`**

Near the top of `src/lib/PlanService.js`, add to the existing `src/lib/plan/*` imports:

```js
import { combinedMultiplier } from './plan/trainingLoad.js';
```

Replace `setRuntime` and the `_runtime` initialiser:

```js
let _runtime = { sessions: {}, readiness: null, loadDecision: null };
```
```js
export function setRuntime(rt = {}) {
  _runtime = {
    sessions: rt.sessions || {},
    readiness: rt.readiness ?? null,
    loadDecision: rt.loadDecision ?? null
  };
}
```

- [ ] **Step 2: Combine the load multiplier in `reflowWeek`**

`reflowWeek` takes a new `loadDecision` parameter and combines it with readiness. Change the signature and the `mult` line. Signature:

```js
function reflowWeek(phase, week, sessionsState, readiness, profile, overrides = {}, loadDecision = null) {
```

Replace `const mult = readinessMult(readiness);` with:

```js
  // Readiness trims remaining sessions; training load (acute:chronic) trims them
  // further (ease/deload) or restores them (nudge_up). Combined conservatively.
  const mult = combinedMultiplier(readinessMult(readiness), loadDecision || { action: 'none', multiplier: 1 });
```

- [ ] **Step 3: Honour the per-week revert override + pass the decision in `adaptedPhases`**

In `adaptedPhases`, after `const cw = currentWeekNumber();` and before building the memo key, resolve the effective decision (cleared when the week is reverted) and add it to the memo signature:

```js
  const profile = Database.services.getProfile() || {};
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const decision = reverted ? null : _runtime.loadDecision;
  const loadBand = decision && decision.action ? decision.action : 'none';
```

Add `loadBand`/`reverted` to the cache key (so a load change recomputes the reflow):

```js
  const key = `${_cache.sig}|${cw}|${stateSig}|${band}|${ovSig}|${loadBand}|${reverted ? 'r' : ''}`;
```

Remove the later duplicate `const profile = Database.services.getProfile() || {};` (it's now resolved above), and pass `decision` to `reflowWeek`:

```js
      weeks: phase.weeks.map(w =>
        w.num === cw ? reflowWeek(phase, w, _runtime.sessions, _runtime.readiness, profile, overrides, decision) : w)
```

- [ ] **Step 4: Export `currentAdaptation()`**

Add near `setRuntime` (exported):

```js
// The active load adaptation for the current week, for the UI banner. Returns
// null when there's no live adaptation. `reverted` = the user pinned this week to
// the plan (load ignored; readiness still applies).
export function currentAdaptation() {
  const cw = currentWeekNumber();
  if (cw == null) return null;
  const profile = Database.services.getProfile() || {};
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const d = _runtime.loadDecision;
  if (reverted) {
    return (d && d.action && d.action !== 'none')
      ? { action: 'reverted', reason: 'Following the plan (you reverted this week)', reverted: true, week: cw }
      : null;
  }
  if (!d || !d.action || d.action === 'none') return null;
  return { action: d.action, reason: d.reason, reverted: false, week: cw };
}
```

- [ ] **Step 5: Verify build + existing engine tests**

Run: `npm run build 2>&1 | tail -1` (clean)
Run: `node tests/periodization.js && node tests/run-discipline.js && node tests/exercise-selection.js && node tests/engine-rest-and-rep.js` (all PASS — load defaults to a no-op multiplier, so the reflow is unchanged when no decision is set)

- [ ] **Step 6: Commit**

```bash
git add src/lib/PlanService.js
git commit -m "feat(engine): combine training-load decision with readiness in the week reflow + currentAdaptation()

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Store — compute the decision, expose load + adaptation, revert action

**Files:**
- Modify: `src/stores/trainingStore.js`

**Interfaces:**
- Consumes: Task 1 (`dailyLoads`, `acuteChronic`, `acwr`, `acwrSeries`, `loadDecision`, `sessionLoad`); Task 2 (`setRuntime`, `currentAdaptation`).
- Produces: view fields `load` (`{ acute, chronic, acwr, band, sessions: [...] }`) and `adaptation` (from `currentAdaptation()`); store actions `revertWeekAdaptation()` / `unrevertWeekAdaptation()`.

- [ ] **Step 1: Imports**

In `src/stores/trainingStore.js` add:

```js
import { dailyLoads, acuteChronic, acwr, acwrSeries, loadDecision, sessionLoad } from '../lib/plan/trainingLoad.js';
import { setRuntime, currentAdaptation } from '../lib/PlanService.js';
```
(If `setRuntime` is already imported from PlanService, just add `currentAdaptation` to that import and drop the duplicate.)

- [ ] **Step 2: Compute the load decision in `buildView` and pass it to `setRuntime`**

In `buildView`, where it currently calls `setRuntime({ sessions, readiness: computeReadiness(dailyMetrics, logs).score })`, replace with the load computation + extended runtime:

```js
  const today = new Date().toISOString().split('T')[0];
  const sessionLogsAll = Database.tables.sessionLogs.all();
  const workoutsAll = Database.tables.workouts.all();
  const dl = dailyLoads(sessionLogsAll, workoutsAll);
  const ac = acuteChronic(dl, today);
  const acwrVal = acwr(ac);
  const decision = loadDecision(acwrVal, acwrSeries(dl, today, 4));

  setRuntime({ sessions, readiness: computeReadiness(dailyMetrics, logs).score, loadDecision: decision });

  // Load view-model: acute/chronic/acwr + recent session loads (newest first).
  const band = acwrVal == null ? null : acwrVal < 0.8 ? 'under' : acwrVal > 1.5 ? 'over' : acwrVal > 1.3 ? 'high' : 'sweet';
  const loadSessions = sessionLogsAll
    .filter(l => l.completed_at)
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .slice(0, 14)
    .map(l => ({ date: (l.completed_at || '').split('T')[0], ...sessionLoad(l) }));
  const loadView = { acute: Math.round(ac.acute), chronic: Math.round(ac.chronic), acwr: acwrVal, band, sessions: loadSessions };
```

In `buildView`'s `return { ... }`, add:

```js
    load: loadView,
    adaptation: currentAdaptation(),
```

- [ ] **Step 3: Add the revert actions**

Next to the other plan/profile actions (e.g. near `updateProfile`/`clearPlan`), add:

```js
  // Pin the current week to the plan (ignore the load adaptation). `weekNum` is
  // the plan week number (state.adaptation.week).
  async revertWeekAdaptation(weekNum) {
    if (weekNum == null) return;
    const profile = buildView().profile || {};
    const overrides = { ...(profile.load_overrides || {}), [weekNum]: 'plan' };
    await Sync.updateProfile({ load_overrides: overrides });
    set(buildView());
  },

  // Undo a revert — let load adapt this week again.
  async unrevertWeekAdaptation(weekNum) {
    if (weekNum == null) return;
    const profile = buildView().profile || {};
    const overrides = { ...(profile.load_overrides || {}) };
    delete overrides[weekNum];
    await Sync.updateProfile({ load_overrides: overrides });
    set(buildView());
  },
```

- [ ] **Step 4: Verify build + engine tests**

Run: `npm run build 2>&1 | tail -1` (clean)
Run: `node tests/training-load.js && node tests/periodization.js && node tests/injury-engine.js` (all PASS)

- [ ] **Step 5: Commit**

```bash
git add src/stores/trainingStore.js
git commit -m "feat(store): compute ACWR + load decision in buildView; expose load + adaptation; revert actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Training Load view + route

**Files:**
- Create: `src/screens/TrainingLoad.jsx`
- Modify: `src/App.jsx` (route + routeMeta), `src/screens/Progress.jsx` (link row)

- [ ] **Step 1: Create `src/screens/TrainingLoad.jsx`**

```jsx
/**
 * Training Load — acute vs chronic load, the acute:chronic ratio (ACWR) band,
 * and recent per-session loads. Read-only insight; the full Progress redesign is
 * a later sub-project (E).
 */

import { useTrainingStore } from '../stores/trainingStore.js';

const BAND = {
  under: { label: 'Under-loaded', color: 'var(--ochre)' },
  sweet: { label: 'Sweet spot',   color: 'var(--moss)' },
  high:  { label: 'High',         color: 'var(--ochre)' },
  over:  { label: 'Overreaching', color: 'var(--rust)' }
};

export default function TrainingLoad() {
  const load = useTrainingStore(s => s.load) || { acute: 0, chronic: 0, acwr: null, band: null, sessions: [] };
  const b = load.band ? BAND[load.band] : null;

  return (
    <>
      <h1 className="h1">Training load</h1>
      <p className="sub">How hard you've been training lately vs your recent baseline.</p>

      {load.acwr == null ? (
        <div className="callout amber">Not enough history yet — a few weeks of sessions and your load trend appears here.</div>
      ) : (
        <>
          <div className="stat-grid cols-3" style={{ marginBottom: 18 }}>
            <div className="stat-card"><div className="l">Acute (7d)</div><div className="v">{load.acute}</div><div className="d">recent</div></div>
            <div className="stat-card"><div className="l">Chronic (28d)</div><div className="v">{load.chronic}</div><div className="d">baseline</div></div>
            <div className="stat-card"><div className="l">Ratio</div><div className="v" style={{ color: b ? b.color : 'var(--txt-strong)' }}>{load.acwr.toFixed(2)}</div><div className="d">{b ? b.label : ''}</div></div>
          </div>
          <p className="sub" style={{ fontSize: 12, marginBottom: 22 }}>
            The sweet spot is roughly 0.8–1.3. Above ~1.5 means you're ramping faster than your body has adapted to — the plan eases off automatically.
          </p>
        </>
      )}

      <h2 className="h3">Recent sessions</h2>
      {load.sessions.length === 0 ? (
        <p className="sub">No logged sessions yet.</p>
      ) : (
        <div className="link-list">
          {load.sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ color: 'var(--txt-body)', fontSize: 13 }}>{s.date}{s.estimated ? ' · est.' : ''}</span>
              <span style={{ color: 'var(--txt-strong)', fontSize: 13, fontWeight: 700 }}>{s.load}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Register the route in `src/App.jsx`**

Add the import near the other screen imports:

```js
import TrainingLoad from './screens/TrainingLoad.jsx';
```

Add a `routeMeta` entry next to the other `/tracking/*` entries:

```js
  '/tracking/load': { title: 'Training load', topLevel: false, tab: 'progress' },
```

Add the route inside `<Routes>` next to the other `/tracking/*` routes:

```jsx
          <Route path="/tracking/load" element={<TrainingLoad />} />
```

- [ ] **Step 3: Add a link row in `src/screens/Progress.jsx`**

In the `link-list` (next to the existing `Trends` / `Injuries` rows), add:

```jsx
        <LinkRow title="Training load" sub="Acute vs chronic load & how the plan adapts" onClick={() => navigate('/tracking/load')} badge={load && load.acwr != null ? load.acwr.toFixed(2) : null} />
```

Add the selector near the top of `Progress` if not present: `const load = useTrainingStore(s => s.load);`

- [ ] **Step 4: Verify build + tests**

Run: `node tests/training-load.js && node tests/injury-engine.js` (PASS)
Run: `npm run build 2>&1 | tail -1` (clean)

- [ ] **Step 5: Commit**

```bash
git add src/screens/TrainingLoad.jsx src/App.jsx src/screens/Progress.jsx
git commit -m "feat(load): Training Load view (acute/chronic, ACWR band, recent loads) + route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Adaptation banner + revert on Today

**Files:**
- Modify: `src/screens/Home.jsx`

**Interfaces:** Consumes view `adaptation` (`{ action, reason, reverted, week }`) + actions `revertWeekAdaptation`/`unrevertWeekAdaptation`.

- [ ] **Step 1: Add the banner to `src/screens/Home.jsx`**

Add the selectors near the top of the component:

```jsx
  const adaptation = useTrainingStore(s => s.adaptation);
  const revertWeekAdaptation = useTrainingStore(s => s.revertWeekAdaptation);
  const unrevertWeekAdaptation = useTrainingStore(s => s.unrevertWeekAdaptation);
```

Render the banner near the top of the returned screen content (above the session cards). It shows the active adaptation with a Revert button, or the reverted state with an Undo:

```jsx
      {adaptation && (
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 14,
          background: adaptation.reverted ? 'var(--bg-surface-2)' : 'rgba(200,154,58,0.10)',
          border: `1px solid ${adaptation.reverted ? 'var(--hairline)' : 'rgba(200,154,58,0.30)'}`
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)', marginBottom: 2 }}>
            {adaptation.reverted ? 'Following the plan' : 'Plan adjusted'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt-body)' }}>{adaptation.reason}</div>
          <button
            onClick={() => adaptation.reverted ? unrevertWeekAdaptation(adaptation.week) : revertWeekAdaptation(adaptation.week)}
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--rust)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {adaptation.reverted ? 'Let load adapt this week' : 'Revert to plan'}
          </button>
        </div>
      )}
```

(Use the real theme variables shown; do not introduce `--card-bg`/`--border`/`--accent-bg`.)

- [ ] **Step 2: Verify build + full suite**

Run: `node tests/training-load.js && node tests/periodization.js && node tests/run-discipline.js && node tests/exercise-selection.js && node tests/engine-rest-and-rep.js && node tests/injury-engine.js` (all PASS)
Run: `npm run build 2>&1 | tail -1` (clean)

- [ ] **Step 3: Manual verification (deferred — needs ~4 weeks of real load history)**

With enough session history: when ACWR climbs past 1.3 the Today banner reads "Plan adjusted — Load high — eased this week" and the current gym week's sessions are trimmed; tapping **Revert to plan** pins the week (banner flips to "Following the plan") and the sessions return to plan volume; the Training Load view shows acute/chronic/ratio.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Home.jsx
git commit -m "feat(load): adaptation banner + revert on Today

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] All tests: `node tests/training-load.js && node tests/periodization.js && node tests/run-discipline.js && node tests/exercise-selection.js && node tests/engine-rest-and-rep.js && node tests/injury-engine.js && node tests/hr-zones.js` — all PASS.
- [ ] `npm run build` clean; `npm run dev` runs.
- [ ] No new tables/migrations/Edge Functions (load derives from synced data).
- [ ] Banner appears only when an adaptation is active; revert pins the week and is reversible.
- [ ] Review every diff before any push; do not push/merge unless asked.

## Known limitations / notes

- **Deload-forward is realised as a deep volume multiplier (0.5×) on the current week**, labelled "deload this week" — not a structural periodization change. Safer (no PlanGenerator conflict), reversible, and never deletes future scheduled deloads; worst case is an extra easy week. This refines the spec's "mark week.deload" wording.
- Load adaptation modulates **gym volume** only — the reflow doesn't touch run/swim sessions (neither does readiness today). Consistent with the existing engine.
- **ACWR needs ~4 weeks of history** before any adaptation fires (`chronic < 1` → null). The first month runs the plan as-is. This is correct, not a bug.
- Depends on **C being merged** (it reads `session_logs.hr_zones` + the `workouts` cache). Build this on top of C.
- The adaptation banner is placed on **Today** (the daily surface). The spec also mentioned the current-week **Plan** view; rendering the same `adaptation` field there is a trivial follow-up (same view-model, one more screen) intentionally deferred to keep this plan bounded.
- Stays rule-based; `loadDecision` is a clean contract the future AI layer (Stage 5) can consume or override.
