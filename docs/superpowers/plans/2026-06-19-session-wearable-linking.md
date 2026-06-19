# Session ↔ Wearable Linking & Physiology — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link Strava workouts to logged sessions and attach a per-session HR physiology summary (avg/max HR + Karvonen/HRR zones, computed from the primary band) to `session_logs`, surfaced on `SessionDetail`.

**Architecture:** Pure, tested helpers do the HR-zone math (Heart-Rate Reserve) and the workout↔session matching. A new `enrich-sessions` Edge Function computes per-session HR summaries server-side from the primary device's HR samples. The store orchestrates on sync: a client-side cardio linker copies a matched Strava workout's numbers onto the session log, then `enrich-sessions` fills HR/zones. `SessionDetail` renders a "Your session" block. Summaries live on the existing `session_logs` row.

**Tech Stack:** React 18 + Vite, Zustand 5, Supabase (Postgres + RLS + Deno Edge Functions), plain-Node test scripts in `tests/` (`assert(cond,msg)`; modules touching `localStorage` install a shim + dynamic-import).

## Global Constraints

- All data writes go through **SyncService** (via store actions). Never write to `Database.js` directly from a screen.
- Schema changes are **versioned migrations**; Edge Functions deploy manually. `verify_jwt` is pinned per-function in `supabase/config.toml` (sync/enrich functions are JWT-invoked → `verify_jwt = true`).
- Real theme variables ONLY: `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md`. NEVER `--card-bg/--border/--accent-bg`.
- RLS own-rows everywhere (`auth.uid() = user_id`).
- **HR zones use Heart-Rate Reserve (Karvonen):** intensity = `(hr − hrRest)/(hrMax − hrRest)`. Boundaries: Z1 <60%, Z2 60–70%, Z3 70–80%, Z4 80–90%, Z5 ≥90%. `hrRest` = recent avg `daily_metrics.resting_hr`; `hrMax` = observed peak (else `208 − 0.7×age`). If `hrRest`/`hrMax` missing or `hrMax ≤ hrRest` → zones null (never faked).
- **Sourcing rule:** every windowed session gets HR + zones from the primary band; a linked cardio session takes activity `avg_hr`/`max_hr`/`calories`/distance·pace from the Strava **workout** (`hr_source='strava'`); else from the band (`hr_source='fitbit'`).
- Disciplines: `sessionDiscipline(s)` → `'swim' | 'cycle' | 'brick' | 'run' | 'gym'`. Workout types: `run | ride | swim | strength | walk | other`.
- App must build clean (`npm run build`) and run (`npm run dev`).
- **Out of scope:** Strava streams; training-load scoring (D); Progress-tab redesign (E).

## Test conventions (read before Task 1)

- Node ESM files in `tests/`, run `node tests/<name>.js`, using:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
- Pure modules created here (`src/lib/hrZones.js`, `src/lib/sessionWorkoutMatch.js`) import nothing that touches `localStorage`, so their tests import them directly — no shim.
- Edge Functions (Deno) + Supabase IO have no in-repo harness (consistent with `fitbit-sync`): verify by `npm run build` (client) and manual deploy.

## File structure

| File | Change | Responsibility |
|------|--------|----------------|
| `supabase/migrations/008_session_log_physiology.sql` | Create | Add HR/zone columns to `session_logs` |
| `src/lib/hrZones.js` | Create | Pure: `estimateHrMax`, `hrZonesHRR` (Karvonen) |
| `src/lib/sessionWorkoutMatch.js` | Create | Pure: `matchWorkoutToSession`, `sessionPhysiologyFromWorkout` |
| `supabase/functions/enrich-sessions/index.ts` | Create | Server: per-session HR-window avg/max/zones → `session_logs` |
| `supabase/config.toml` | Modify | Pin `[functions.enrich-sessions] verify_jwt = true` |
| `src/lib/PlanService.js` | Modify | Export `sessionDiscipline` |
| `src/lib/SyncService.js` | Modify | `linkWorkout`, `unlinkWorkout`, `enrichSessions` |
| `src/stores/trainingStore.js` | Modify | `enrichSessions`/`linkWorkout`/`unlinkWorkout` actions; cardio-linker in `syncFromCloud`; extend `buildView` session shape |
| `src/screens/SessionDetail.jsx` | Modify | "Your session" physiology block |
| `tests/hr-zones.js` | Create | Tests for `estimateHrMax` + `hrZonesHRR` |
| `tests/session-workout-match.js` | Create | Tests for the matcher |

**Task order:** schema (1) → pure HR/zone helpers (2) → pure matcher (3) → Edge Function (4) → Sync+store wiring (5) → SessionDetail UI (6).

---

### Task 1: Schema — physiology columns on `session_logs`

**Files:**
- Create: `supabase/migrations/008_session_log_physiology.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Migration 008: per-session physiology summary on session_logs
-- ============================================================================
-- Sub-project C attaches each completed session's heart-rate summary to its log
-- row (1:1 with the session). avg/max HR + calories come from the primary band's
-- HR window, or from a linked Strava workout for cardio. hr_zones holds minutes
-- per Heart-Rate-Reserve zone. All nullable — populated by enrichment/linking.
-- ============================================================================

alter table public.session_logs
  add column if not exists avg_hr    numeric,
  add column if not exists max_hr    numeric,
  add column if not exists calories  numeric,
  add column if not exists hr_source text,                       -- 'strava' | 'fitbit' | null
  add column if not exists hr_zones  jsonb;                      -- { z1,z2,z3,z4,z5 } minutes
```

- [ ] **Step 2: Apply in Supabase (manual — Simon)**

Supabase dashboard → SQL Editor → paste `008_session_log_physiology.sql` → Run. Verify:
```sql
select column_name from information_schema.columns
where table_name = 'session_logs' and column_name in ('avg_hr','max_hr','calories','hr_source','hr_zones');
```
Expect all five listed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_session_log_physiology.sql
git commit -m "feat(db): add per-session physiology columns to session_logs (migration 008)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Pure HR/zone helpers (`hrZones.js`)

**Files:**
- Create: `src/lib/hrZones.js`
- Test: `tests/hr-zones.js`

**Interfaces:**
- Produces:
  - `estimateHrMax({ age, observedPeak }): number | null` — `observedPeak` when it exceeds the age estimate `Math.round(208 − 0.7×age)`; else the age estimate; null if neither is usable.
  - `hrZonesHRR(samples, { hrRest, hrMax }): { z1,z2,z3,z4,z5 } | null` — `samples` is `[{ hr, t }]` (`t` = epoch ms, ascending). Time between consecutive samples is credited to the earlier sample's zone (Karvonen %HRR). Minutes per zone, rounded. Null when `hrRest`/`hrMax` missing or `hrMax ≤ hrRest`.

- [ ] **Step 1: Write the failing test**

Create `tests/hr-zones.js`:

```js
import { estimateHrMax, hrZonesHRR } from '../src/lib/hrZones.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// estimateHrMax
assert(estimateHrMax({ age: 40 }) === Math.round(208 - 0.7 * 40), 'T1 age estimate (Tanaka)');
assert(estimateHrMax({ age: 40, observedPeak: 190 }) === 190, 'T2 observed peak preferred when higher');
assert(estimateHrMax({ age: 40, observedPeak: 150 }) === Math.round(208 - 0.7 * 40), 'T3 age estimate when peak lower');
assert(estimateHrMax({}) === null, 'T4 null when no inputs');

// hrZonesHRR — build 1-minute-spaced samples (epoch ms). hrRest 50, hrMax 200 → reserve 150.
// %HRR thresholds: z1<0.6(140), z2<0.7(155), z3<0.8(170), z4<0.9(185), z5>=0.9
const base = 1_000_000_000_000;
const min = (n) => base + n * 60_000;
const samples = [
  { hr: 110, t: min(0) }, // (110-50)/150 = .40 → z1
  { hr: 150, t: min(1) }, // .667 → z2
  { hr: 165, t: min(2) }, // .767 → z3
  { hr: 180, t: min(3) }, // .867 → z4
  { hr: 195, t: min(4) }  // .967 → z5 (no following sample → 0 duration credited)
];
const z = hrZonesHRR(samples, { hrRest: 50, hrMax: 200 });
assert(z.z1 === 1 && z.z2 === 1 && z.z3 === 1 && z.z4 === 1, 'T5 one minute credited to z1..z4');
assert(z.z5 === 0, 'T6 last sample credits no time (no following sample)');

// guards
assert(hrZonesHRR(samples, { hrRest: 50 }) === null, 'T7 null when hrMax missing');
assert(hrZonesHRR(samples, { hrRest: 200, hrMax: 200 }) === null, 'T8 null when hrMax <= hrRest');
assert(hrZonesHRR([], { hrRest: 50, hrMax: 200 }).z1 === 0, 'T9 empty samples → all-zero zones');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/hr-zones.js`
Expected: FAIL — `estimateHrMax is not a function`.

- [ ] **Step 3: Create `src/lib/hrZones.js`**

```js
/**
 * Pure heart-rate-zone math (Karvonen / Heart-Rate Reserve). No IO.
 *
 * HRR intensity = (hr - hrRest) / (hrMax - hrRest). Zones by %HRR:
 *   Z1 <60%  Z2 60-70%  Z3 70-80%  Z4 80-90%  Z5 >=90%
 */

// Best max-HR estimate: a measured observed peak when it beats the age estimate,
// else the Tanaka age estimate (208 - 0.7*age). null if neither is usable.
export function estimateHrMax({ age, observedPeak } = {}) {
  const est = age ? Math.round(208 - 0.7 * age) : null;
  const peak = Number(observedPeak) || null;
  if (peak && (!est || peak > est)) return peak;
  return est;
}

// Which HRR zone a %reserve falls in (1..5).
function zoneOf(pct) {
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

// Minutes per zone for time-stamped HR samples. Credits the gap between
// consecutive samples to the earlier sample's zone. Null when inputs unusable.
export function hrZonesHRR(samples = [], { hrRest, hrMax } = {}) {
  if (hrRest == null || hrMax == null || hrMax <= hrRest) return null;
  const reserve = hrMax - hrRest;
  const z = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  for (let i = 0; i < samples.length - 1; i++) {
    const cur = samples[i];
    const dtMin = (samples[i + 1].t - cur.t) / 60000;
    if (!(dtMin > 0)) continue;
    const pct = (cur.hr - hrRest) / reserve;
    z['z' + zoneOf(Math.max(0, Math.min(1, pct)))] += dtMin;
  }
  return { z1: Math.round(z.z1), z2: Math.round(z.z2), z3: Math.round(z.z3), z4: Math.round(z.z4), z5: Math.round(z.z5) };
}

export default { estimateHrMax, hrZonesHRR };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/hr-zones.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hrZones.js tests/hr-zones.js
git commit -m "feat(hr): pure Karvonen/HRR zone math + measured-max-HR estimate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Pure workout↔session matcher (`sessionWorkoutMatch.js`)

**Files:**
- Create: `src/lib/sessionWorkoutMatch.js`
- Test: `tests/session-workout-match.js`

**Interfaces:**
- Produces:
  - `matchWorkoutToSession(session, workouts): workout | null` — `session` is `{ startedAt, completedAt, discipline }` (ISO strings + a discipline). Returns the type-compatible workout with the largest positive time-window overlap, else null. Null when the session has no window (`startedAt`/`completedAt` missing).
  - `sessionPhysiologyFromWorkout(workout): { avg_hr, max_hr, calories, hr_source }` — `hr_source: 'strava'`.

- [ ] **Step 1: Write the failing test**

Create `tests/session-workout-match.js`:

```js
import { matchWorkoutToSession, sessionPhysiologyFromWorkout } from '../src/lib/sessionWorkoutMatch.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const iso = (h, m = 0) => `2026-06-19T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`;

const runSession = { startedAt: iso(18), completedAt: iso(19), discipline: 'run' };
const workouts = [
  { id: 'w-run', type: 'run',  start_time: iso(18, 5), end_time: iso(18, 55) }, // overlaps, compatible
  { id: 'w-ride', type: 'ride', start_time: iso(18, 0), end_time: iso(19, 0) },  // overlaps but wrong type for a run
  { id: 'w-run-late', type: 'run', start_time: iso(20), end_time: iso(21) }      // compatible but no overlap
];

assert(matchWorkoutToSession(runSession, workouts)?.id === 'w-run', 'T1 picks the compatible, overlapping run');
assert(matchWorkoutToSession({ ...runSession, discipline: 'gym' }, workouts) === null, 'T2 gym session matches no cardio workout');
assert(matchWorkoutToSession({ startedAt: null, completedAt: iso(19), discipline: 'run' }, workouts) === null, 'T3 no window → null');
assert(matchWorkoutToSession({ ...runSession, discipline: 'cycle' }, workouts)?.id === 'w-ride', 'T4 cycle discipline maps to ride');

// largest overlap wins on ties
const two = [
  { id: 'small', type: 'run', start_time: iso(18, 50), end_time: iso(19, 30) }, // 10 min overlap
  { id: 'big',   type: 'run', start_time: iso(18, 0),  end_time: iso(18, 50) }  // 50 min overlap
];
assert(matchWorkoutToSession(runSession, two)?.id === 'big', 'T5 largest overlap wins');

const phys = sessionPhysiologyFromWorkout({ avg_hr: 150, max_hr: 178, calories: 600 });
assert(phys.avg_hr === 150 && phys.max_hr === 178 && phys.calories === 600 && phys.hr_source === 'strava', 'T6 physiology from workout');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/session-workout-match.js`
Expected: FAIL — `matchWorkoutToSession is not a function`.

- [ ] **Step 3: Create `src/lib/sessionWorkoutMatch.js`**

```js
/**
 * Pure matching of an in-app session to an external (Strava) workout by
 * overlapping time window + compatible activity type. No IO.
 */

// session discipline (PlanService) -> compatible workout.type values.
const COMPAT = {
  run:   ['run'],
  cycle: ['ride'],
  swim:  ['swim'],
  brick: ['run', 'ride'],
  gym:   []
};

const ms = (s) => (s ? new Date(s).getTime() : NaN);

// Overlap in milliseconds between [aS,aE] and [bS,bE], 0 if none.
function overlapMs(aS, aE, bS, bE) {
  return Math.max(0, Math.min(aE, bE) - Math.max(aS, bS));
}

// The compatible workout with the largest positive overlap with the session
// window, or null. Null when the session has no usable window.
export function matchWorkoutToSession(session, workouts = []) {
  const s = ms(session?.startedAt);
  const e = ms(session?.completedAt);
  if (isNaN(s) || isNaN(e) || e <= s) return null;
  const compatible = COMPAT[session.discipline] || [];
  if (!compatible.length) return null;

  let best = null;
  let bestOverlap = 0;
  for (const w of workouts) {
    if (!compatible.includes(w.type)) continue;
    const ws = ms(w.start_time);
    const we = ms(w.end_time);
    if (isNaN(ws) || isNaN(we)) continue;
    const o = overlapMs(s, e, ws, we);
    if (o > bestOverlap) { best = w; bestOverlap = o; }
  }
  return best;
}

// The session_log physiology fields a linked cardio workout supplies.
export function sessionPhysiologyFromWorkout(workout) {
  return {
    avg_hr: workout?.avg_hr ?? null,
    max_hr: workout?.max_hr ?? null,
    calories: workout?.calories ?? null,
    hr_source: 'strava'
  };
}

export default { matchWorkoutToSession, sessionPhysiologyFromWorkout };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/session-workout-match.js`
Expected: all `PASS:`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sessionWorkoutMatch.js tests/session-workout-match.js
git commit -m "feat(sessions): pure workout<->session matcher (window overlap + type compat)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `enrich-sessions` Edge Function

**Files:**
- Create: `supabase/functions/enrich-sessions/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:** POST (Supabase JWT); for each of the user's completed sessions in the last 30 days with a window and no `avg_hr`, computes HR window summary from the primary device and upserts onto `session_logs`. Returns `{ ok, enriched }` or `{ error, detail }`.

- [ ] **Step 1: Create `supabase/functions/enrich-sessions/index.ts`**

```ts
/**
 * enrich-sessions — Supabase Edge Function
 *
 * For each of the user's recently-completed sessions that has a started→completed
 * window and no HR summary yet, fetch the PRIMARY device's heart-rate samples for
 * that window from the Google Health API and write avg_hr / max_hr / hr_zones
 * (Karvonen/HRR) onto the session's log row. Kept separate from fitbit-sync.
 *
 * Env: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET (reuses the primary connection).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_API_BASE  = 'https://health.googleapis.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

function zoneOf(pct: number): number {
  if (pct < 0.6) return 1
  if (pct < 0.7) return 2
  if (pct < 0.8) return 3
  if (pct < 0.9) return 4
  return 5
}

// Minutes per HRR zone for samples [{hr,t(ms)}] (mirrors src/lib/hrZones.js).
function hrZonesHRR(samples: any[], hrRest: number, hrMax: number) {
  if (hrRest == null || hrMax == null || hrMax <= hrRest) return null
  const reserve = hrMax - hrRest
  const z: any = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  for (let i = 0; i < samples.length - 1; i++) {
    const dtMin = (samples[i + 1].t - samples[i].t) / 60000
    if (!(dtMin > 0)) continue
    const pct = Math.max(0, Math.min(1, (samples[i].hr - hrRest) / reserve))
    z['z' + zoneOf(pct)] += dtMin
  }
  return { z1: Math.round(z.z1), z2: Math.round(z.z2), z3: Math.round(z.z3), z4: Math.round(z.z4), z5: Math.round(z.z5) }
}

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token
  const res = await fetch(Deno.env.get('FITBIT_TOKEN_URL') ?? DEFAULT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: Deno.env.get('FITBIT_CLIENT_ID')!,
      client_secret: Deno.env.get('FITBIT_CLIENT_SECRET')!
    })
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const t = await res.json()
  await supabase.from('wearable_connections').update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? connection.refresh_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString()
  }).eq('user_id', connection.user_id).eq('provider', 'fitbit')
  return t.access_token
}

// Fetch heart-rate samples [{hr, t(ms)}] for a UTC date (YYYY-MM-DD).
async function fetchHrSamples(token: string, apiBase: string, date: string): Promise<any[]> {
  const url = `${apiBase}/v4/users/me/dataTypes/heart-rate/dataPoints?pageSize=1500`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const json = await res.json()
  const out: any[] = []
  for (const p of (json?.dataPoints ?? [])) {
    const iso = p?.heartRate?.sampleTime?.physicalTime
    const bpm = Number(p?.heartRate?.beatsPerMinute)
    if (!iso || !bpm) continue
    if (iso.split('T')[0] !== date) continue
    out.push({ hr: bpm, t: new Date(iso).getTime() })
  }
  out.sort((a, b) => a.t - b.t)
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const userClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Primary connection (Fitbit/Google Health).
  const { data: connection } = await supabase.from('wearable_connections')
    .select('*').eq('user_id', user.id).eq('provider', 'fitbit').single()
  if (!connection) return new Response(JSON.stringify({ error: 'No primary device' }), { status: 400, headers: jsonHeaders })

  let token: string
  try { token = await getAccessToken(supabase, connection) }
  catch (e: any) { return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), { status: 400, headers: jsonHeaders }) }

  // Dynamic hrRest (recent avg resting_hr) and observed-peak hrMax.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: metrics } = await supabase.from('daily_metrics')
    .select('resting_hr').eq('user_id', user.id).gte('date', since).is('deleted_at', null)
  const rhrs = (metrics ?? []).map((m: any) => Number(m.resting_hr)).filter((v: number) => v > 0)
  const hrRest = rhrs.length ? Math.round(rhrs.reduce((a: number, b: number) => a + b, 0) / rhrs.length) : null

  const { data: wkMax } = await supabase.from('workouts')
    .select('max_hr').eq('user_id', user.id).is('deleted_at', null)
  const ageRow = await supabase.from('users').select('profile').eq('id', user.id).single()
  const age = Number(ageRow?.data?.profile?.age) || null
  const ageEst = age ? Math.round(208 - 0.7 * age) : null
  const peak = Math.max(0, ...((wkMax ?? []).map((w: any) => Number(w.max_hr) || 0)))
  const hrMax = peak && (!ageEst || peak > ageEst) ? peak : ageEst

  // Sessions completed in the last 30 days, with a window, whose log lacks avg_hr.
  const sinceTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: sessions } = await supabase.from('sessions')
    .select('id, started_at, completed_at')
    .eq('user_id', user.id).eq('status', 'completed')
    .gte('completed_at', sinceTs).is('deleted_at', null)
    .not('started_at', 'is', null)

  const enriched: string[] = []
  const apiBase = Deno.env.get('FITBIT_API_BASE') ?? DEFAULT_API_BASE
  const samplesByDate: Record<string, any[]> = {}

  for (const s of (sessions ?? [])) {
    const { data: log } = await supabase.from('session_logs')
      .select('id, avg_hr, hr_source').eq('session_id', s.id).is('deleted_at', null).maybeSingle()
    if (!log || log.avg_hr != null) continue          // already summarised (or by Strava link)

    const startMs = new Date(s.started_at).getTime()
    const endMs   = new Date(s.completed_at).getTime()
    const date    = s.completed_at.split('T')[0]
    if (!samplesByDate[date]) samplesByDate[date] = await fetchHrSamples(token, apiBase, date)
    const inWindow = samplesByDate[date].filter((p) => p.t >= startMs && p.t <= endMs)
    if (!inWindow.length) continue

    const hrs = inWindow.map((p) => p.hr)
    const avg_hr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
    const max_hr = Math.max(...hrs)
    const hr_zones = hrZonesHRR(inWindow, hrRest as number, hrMax as number)

    const { error: upErr } = await supabase.from('session_logs')
      .update({ avg_hr, max_hr, hr_zones, hr_source: 'fitbit' }).eq('id', log.id)
    if (!upErr) enriched.push(s.id)
  }

  return new Response(JSON.stringify({ ok: true, enriched }), { headers: jsonHeaders })
})
```

- [ ] **Step 2: Pin verify_jwt in `supabase/config.toml`**

Add to `supabase/config.toml` (alongside the other `[functions.*]` blocks):

```toml
# enrich-sessions is invoked by the app WITH the user's JWT — keep verification on.
[functions.enrich-sessions]
verify_jwt = true
```

- [ ] **Step 3: Deploy (manual — Simon)**

```
supabase functions deploy enrich-sessions --project-ref ggldomlmycvpwtzzjzcd
```
(JWT-invoked, so no `--no-verify-jwt`.) No automated test — Deno function, verified by manual run.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/enrich-sessions/index.ts supabase/config.toml
git commit -m "feat(sessions): enrich-sessions Edge Function — per-session HR window + HRR zones

Requires manual deploy. Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Sync + store wiring (link/unlink/enrich + view)

**Files:**
- Modify: `src/lib/PlanService.js` (export `sessionDiscipline`)
- Modify: `src/lib/SyncService.js`
- Modify: `src/stores/trainingStore.js`

**Interfaces:**
- Produces:
  - SyncService: `linkWorkout(workoutId, sessionId, physiology)`, `unlinkWorkout(workoutId, sessionId)`, `enrichSessions()`.
  - Store actions: `enrichSessions()`, `linkWorkoutToSession(workoutId, sessionId)`, `unlinkWorkoutFromSession(workoutId, sessionId)`; cardio auto-linker in `syncFromCloud`; `buildView` sessions now include `avgHr, maxHr, calories, hrSource, hrZones, linkedWorkout`.
- Consumes: `matchWorkoutToSession`, `sessionPhysiologyFromWorkout` (Task 3); `enrich-sessions` function (Task 4).

- [ ] **Step 1: Export `sessionDiscipline` from `src/lib/PlanService.js`**

Change its declaration `function sessionDiscipline(s) {` to `export function sessionDiscipline(s) {`. (It stays used internally too.)

- [ ] **Step 2: Add link/unlink/enrich to `src/lib/SyncService.js`**

After the Strava functions (near `syncStrava`), add:

```js
// Link a workout to a session: set workouts.session_id and copy the workout's
// physiology onto the session's log row (cardio path). Writes Supabase + cache.
export async function linkWorkout(workoutId, sessionId, physiology) {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  const userId = uid();
  const ops = [
    supabase.from('workouts').update({ session_id: sessionId }).eq('id', workoutId).eq('user_id', userId),
    supabase.from('session_logs').update({ ...physiology }).eq('session_id', sessionId).eq('user_id', userId)
  ];
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('linkWorkout', r.error); });
  return { ok: results.every(r => !r.error) };
}

// Unlink: clear workouts.session_id and the Strava-sourced physiology on the log
// (so the next enrich re-fills it from the primary band).
export async function unlinkWorkout(workoutId, sessionId) {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  const userId = uid();
  const ops = [
    supabase.from('workouts').update({ session_id: null }).eq('id', workoutId).eq('user_id', userId),
    supabase.from('session_logs').update({ avg_hr: null, max_hr: null, calories: null, hr_source: null })
      .eq('session_id', sessionId).eq('user_id', userId)
  ];
  const results = await Promise.all(ops);
  results.forEach(r => { if (r.error) logError('unlinkWorkout', r.error); });
  return { ok: results.every(r => !r.error) };
}

// Trigger the enrich-sessions Edge Function (per-session HR window + zones).
export async function enrichSessions() {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  try {
    const { data, error } = await supabase.functions.invoke('enrich-sessions', { body: {} });
    if (error) {
      logError('enrichSessions', error);
      let reason = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          reason = pickFitbitErrorReason(await error.context.json(), reason);
        }
      } catch { /* keep generic */ }
      return { ok: false, reason };
    }
    return data;
  } catch (err) {
    logError('enrichSessions (exception)', err);
    return { ok: false, reason: err.message };
  }
}
```

Add `linkWorkout, unlinkWorkout, enrichSessions` to the `export default { ... }`.

- [ ] **Step 3: Extend `buildView` session shape in `src/stores/trainingStore.js`**

In `buildView`, the per-session object currently ends with `notes`. Add the physiology + linked workout. Replace the `sessions[s.template_ref] = { ... }` object's tail so it reads:

```js
    const linkedWorkout = Database.tables.workouts.all().find(w => w.session_id === s.id) || null;
    sessions[s.template_ref] = {
      id: s.id,                 // session DB id — needed by the UI to link/unlink
      completed: s.status === 'completed',
      skipped: s.status === 'skipped',
      started: !!s.started_at && s.status !== 'completed' && s.status !== 'skipped',
      startedAt: s.started_at || null,
      completedAt: s.completed_at || null,
      quality: log ? log.quality : null,
      energy: log ? log.energy : null,
      recovery: log ? log.recovery : null,
      notes: log ? (log.notes || '') : '',
      avgHr: log ? (log.avg_hr ?? null) : null,
      maxHr: log ? (log.max_hr ?? null) : null,
      calories: log ? (log.calories ?? null) : null,
      hrSource: log ? (log.hr_source ?? null) : null,
      hrZones: log ? (log.hr_zones ?? null) : null,
      linkedWorkout
    };
```

Also expose the workouts list on the view so the UI's "link a workout" picker can read it: in `buildView`'s `return { ... }`, add `workouts: Database.tables.workouts.all(),` alongside `logs`.

- [ ] **Step 4: Add the cardio auto-linker + actions to the store**

Update the SyncService import to include `linkWorkout, unlinkWorkout, enrichSessions`, and add `import { matchWorkoutToSession, sessionPhysiologyFromWorkout } from '../lib/sessionWorkoutMatch.js';`. The store already imports from PlanService (`setRuntime`); extend that import to also bring in `sessionDiscipline, getWeek`. The cardio linker needs each completed session's discipline; derive it from the plan template via `getWeek(phase, week).sessions[idx]`. Add a helper + wire into `syncFromCloud`:

In `syncFromCloud`, after the existing Strava trigger block, add:

```js
    // Link cardio workouts to sessions, then enrich HR for windowed sessions.
    await useTrainingStore.getState().autoLinkWorkouts();
    if (connections.some(c => c.provider === 'fitbit')) {
      useTrainingStore.getState().enrichSessions();
    }
    return result;
```

Add these actions to the store:

```js
  // Auto-link each completed cardio session to its best-matching Strava workout.
  async autoLinkWorkouts() {
    const workouts = Database.tables.workouts.all().filter(w => !w.session_id);
    if (!workouts.length) { return; }
    let linkedAny = false;
    for (const s of Database.tables.sessions.all()) {
      if (s.status !== 'completed' || !s.started_at || !s.completed_at) continue;
      if (Database.tables.workouts.all().some(w => w.session_id === s.id)) continue; // already linked
      const discipline = sessionDiscipline(planSessionFor(s.template_ref));
      const match = matchWorkoutToSession({ startedAt: s.started_at, completedAt: s.completed_at, discipline }, workouts);
      if (!match) continue;
      const log = Database.tables.sessionLogs.find(l => l.session_id === s.id);
      if (!log) continue;
      await Sync.linkWorkout(match.id, s.id, sessionPhysiologyFromWorkout(match));
      linkedAny = true;
    }
    if (linkedAny) { await pullFromSupabase(); set(buildView()); }
  },

  async enrichSessions() {
    const result = await enrichSessions();
    if (result?.ok) { await pullFromSupabase(); set(buildView()); }
    return result;
  },

  async linkWorkoutToSession(workoutId, sessionId) {
    const w = Database.tables.workouts.get(workoutId);
    if (!w) return;
    await Sync.linkWorkout(workoutId, sessionId, sessionPhysiologyFromWorkout(w));
    await pullFromSupabase(); set(buildView());
  },

  async unlinkWorkoutFromSession(workoutId, sessionId) {
    await Sync.unlinkWorkout(workoutId, sessionId);
    await pullFromSupabase();
    useTrainingStore.getState().enrichSessions(); // re-fill from the band
    set(buildView());
  },
```

Add a module-level helper near the top of the store (after imports) that resolves a session's plan-template object (with `.items`) from its `template_ref` like `p1_wk5_s0`, for `sessionDiscipline`:

```js
// Resolve the plan-template session object (with .items) for a template_ref.
// Returns {} (→ sessionDiscipline 'gym') when it can't be resolved.
function planSessionFor(templateRef) {
  const m = /^p(\d+)_wk(\d+)_s(\d+)$/.exec(templateRef || '');
  if (!m) return {};
  const week = getWeek(Number(m[1]), Number(m[2]));
  return (week && week.sessions && week.sessions[Number(m[3])]) || {};
}
```

- [ ] **Step 5: Verify build + existing tests**

Run: `npm run build 2>&1 | tail -1` (clean)
Run: `node tests/hr-zones.js && node tests/session-workout-match.js && node tests/pull-resilience.js && node tests/injury-engine.js` (all PASS)

- [ ] **Step 6: Commit**

```bash
git add src/lib/PlanService.js src/lib/SyncService.js src/stores/trainingStore.js
git commit -m "feat(sessions): link/unlink/enrich wiring + cardio auto-linker + view physiology

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `SessionDetail` "Your session" block

**Files:**
- Modify: `src/screens/SessionDetail.jsx`

**Interfaces:** Consumes the `state` object (from `sessions[key]`) now carrying `avgHr, maxHr, calories, hrSource, hrZones, linkedWorkout, startedAt, completedAt`; store actions `unlinkWorkoutFromSession`, `linkWorkoutToSession`; `Database.tables.workouts` (via store `workouts` if exposed, else through a selector).

- [ ] **Step 1: Add the block component to `SessionDetail.jsx`**

Add a `SessionPhysiology` component (above the default export) and render it in the completed-session view. Component:

```jsx
function SessionPhysiology({ state, candidates, onUnlink, onLink }) {
  if (!state || !state.completed) return null;
  const hasHr = state.avgHr != null || state.maxHr != null;
  const z = state.hrZones;
  const lw = state.linkedWorkout;
  const zoneMax = z ? Math.max(z.z1, z.z2, z.z3, z.z4, z.z5, 1) : 1;
  const ZONES = [['z1','Z1','--moss'],['z2','Z2','--moss'],['z3','Z3','--ochre'],['z4','Z4','--rust'],['z5','Z5','--rust']];

  return (
    <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--bg-surface)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)', marginBottom: 8 }}>Your session</div>

      {!hasHr && (
        <div style={{ fontSize: 12, color: 'var(--txt-muted)' }}>No HR data for this session yet.</div>
      )}

      {hasHr && (
        <div style={{ display: 'flex', gap: 18, marginBottom: z ? 12 : 0 }}>
          <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Avg HR</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{state.avgHr ?? '—'}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Max HR</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{state.maxHr ?? '—'}</div></div>
          {state.calories != null && <div><div style={{ fontSize: 11, color: 'var(--txt-muted)' }}>Calories</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt-strong)' }}>{Math.round(state.calories)}</div></div>}
        </div>
      )}

      {z && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
            {ZONES.map(([k, label, col]) => (
              <div key={k} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${(z[k] / zoneMax) * 44}px`, background: `var(${col})`, borderRadius: 4, minHeight: 2 }} />
                <div style={{ fontSize: 9, color: 'var(--txt-muted)', marginTop: 3 }}>{label}</div>
                <div style={{ fontSize: 9, color: 'var(--txt-muted)' }}>{z[k]}m</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 6 }}>Zones estimated from your resting & max HR.</div>
        </div>
      )}

      {lw ? (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--txt-body)' }}>
          Linked Strava {lw.type}{lw.distance_m ? ` · ${(lw.distance_m / 1000).toFixed(2)} km` : ''}
          {' · '}
          <button onClick={() => onUnlink(lw.id)} style={{ background: 'none', border: 'none', color: 'var(--rust)', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 11 }}>unlink</button>
        </div>
      ) : candidates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginBottom: 4 }}>Link a Strava workout from this day:</div>
          {candidates.map(w => (
            <button key={w.id} onClick={() => onLink(w.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: '1px solid var(--hairline)', borderRadius: 8, padding: '6px 10px', marginTop: 4, color: 'var(--txt-body)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {w.type}{w.distance_m ? ` · ${(w.distance_m / 1000).toFixed(2)} km` : ''}{w.start_time ? ` · ${new Date(w.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it and wire the unlink action**

Near the other store selectors, add:

```jsx
  const unlinkWorkoutFromSession = useTrainingStore(s => s.unlinkWorkoutFromSession);
  const linkWorkoutToSession     = useTrainingStore(s => s.linkWorkoutToSession);
  const allWorkouts              = useTrainingStore(s => s.workouts);
```

Compute the candidate workouts for this session's day (unlinked, same calendar day as the session window) and render the block in the completed-session view (`state` now carries `id`):

```jsx
      {isDone && (() => {
        const day = (state.completedAt || '').split('T')[0];
        const candidates = (allWorkouts || []).filter(w =>
          !w.session_id && day && (w.start_time || '').split('T')[0] === day
        );
        return (
          <SessionPhysiology
            state={state}
            candidates={candidates}
            onUnlink={(workoutId) => unlinkWorkoutFromSession(workoutId, state.id)}
            onLink={(workoutId) => linkWorkoutToSession(workoutId, state.id)}
          />
        );
      })()}
```

- [ ] **Step 3: Verify build + full suite**

Run: `npm run build 2>&1 | tail -1` (clean)
Run: `node tests/hr-zones.js && node tests/session-workout-match.js && node tests/providers.js && node tests/workouts-cache.js && node tests/fitbit-error.js && node tests/injury-engine.js` (all PASS)

- [ ] **Step 4: Manual verification (deferred to Simon — needs real data + deploy)**

After applying migration 008 + deploying `enrich-sessions`: complete a lifting session (Start→Complete) → after a sync it shows avg/max HR + a zone bar; a run logged in-app that's on Strava auto-links and shows the workout's HR + distance with an **unlink**; unlink reverts to band numbers; a session with no Start shows no HR block.

- [ ] **Step 5: Commit**

```bash
git add src/screens/SessionDetail.jsx
git commit -m "feat(sessions): 'Your session' physiology block (HR, HRR zones, Strava link) on SessionDetail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] All tests: `node tests/hr-zones.js && node tests/session-workout-match.js && node tests/providers.js && node tests/wearable-connections.js && node tests/workouts-cache.js && node tests/fitbit-reconnect-state.js && node tests/fitbit-error.js && node tests/storage-namespace.js && node tests/database-reload.js && node tests/pull-resilience.js && node tests/injury-engine.js` — all PASS.
- [ ] `npm run build` clean; `npm run dev` runs.
- [ ] Simon: migration 008 applied; `enrich-sessions` deployed (verify_jwt on).
- [ ] End-to-end: lifting session shows band HR + zones; cardio session auto-links to Strava + shows distance/HR; unlink reverts.
- [ ] Review every diff before any push; do not push/merge unless asked.

## Known limitations (intentionally out of scope)

- **Training-load scoring** and plan adjustment are **D**; **Progress-tab redesign** is **E**.
- **Strava streams** not used — cardio zones come from the primary band, consistent with lifting.
- Zone accuracy depends on `hrRest`/`hrMax`; observed-peak HRmax improves over time, labelled "estimated".
- Sessions without a Start→Complete window get no HR summary (cardio falls back to a manual link via the "link a workout" affordance; the suggestion-confirm flow for no-window cardio can be a follow-up if needed).
- The `enrich-sessions` HR math is a TS port of `src/lib/hrZones.js` (no Deno harness), kept in sync by mirroring — same pattern as B's normalisation.
