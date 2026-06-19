# Strava Workout Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect a Strava account and ingest its activities (incl. Garmin-recorded ones that auto-sync to Strava) into the `workouts` table, with a local cache and a live Integrations card — the data foundation for session-linking (C) and training load (D).

**Architecture:** Mirrors the proven Fitbit pattern: two Edge Functions (`strava-auth-callback` for OAuth, `strava-sync` for token-refresh → fetch `/athlete/activities` → normalize → idempotent upsert into `workouts`), a client `getStravaAuthUrl` + `syncStrava` store action, and the Integrations card flipped from placeholder to live. The `workouts` table (created in Sub-project A) gains a per-user local cache + cloud pull. Normalization lives in the Edge Function (TS) like `fitbit-sync`'s `buildRow`, since Deno can't import `src/lib`.

**Tech Stack:** React 18 + Vite, React Router 6, Zustand 5, Supabase (Postgres + Auth + RLS + Deno Edge Functions), plain-Node test scripts in `tests/` (`assert(cond, msg)` helper; modules touching `localStorage` install a shim + dynamic-import — see Test conventions).

## Global Constraints

- All data writes go through **SyncService** (via store actions). Never write to `Database.js` directly from a screen.
- Schema/DB changes ship as **versioned migrations**; Edge Functions live under `supabase/functions/` and are **deployed manually by Simon** (no DB/secret access in-session).
- Secrets: **`STRAVA_CLIENT_SECRET` only in the Edge Function env**, never in browser code. The browser may use `VITE_STRAVA_CLIENT_ID` (public, like `VITE_FITBIT_CLIENT_ID`).
- Real theme variables ONLY: `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md`. NEVER `--card-bg/--border/--accent-bg`.
- RLS own-rows (`auth.uid() = user_id`) — already on `workouts` (migration 006).
- **Strava = workouts only**, role always `'secondary'` (no baseline). The Integrations card must NOT offer "Make primary" for a workouts-only provider.
- OAuth connect MUST use a **top-level redirect** (`window.location.href`), never `window.open('_blank')` — the app is a standalone PWA where popups fail.
- First-connect import window: **last 90 days**; subsequent syncs use `after=last_synced`. Polling only (no webhooks). Activity **summaries** only (no streams).
- Idempotent upserts on `workouts (user_id, provider, provider_activity_id)` (unique index from migration 006).
- App must run (`npm run dev`) and `npm run build` must be clean at the end of every change.
- "Powered by Strava" attribution + Strava API terms apply (note for D: do not feed Strava data into model training without re-checking terms).

## Test conventions (read before Task 1)

- Plain Node ESM files in `tests/`, run individually: `node tests/<name>.js`. Use:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
- Modules that touch `localStorage` (Storage/Database) must install a shim **before** import. Because `import` is hoisted, install the shim then **dynamic-import** the modules (see existing `tests/database-reload.js`):
  ```js
  const _ls = {};
  globalThis.localStorage = {
    getItem: (k) => (k in _ls ? _ls[k] : null),
    setItem: (k, v) => { _ls[k] = String(v); },
    removeItem: (k) => { delete _ls[k]; },
    clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
  };
  ```
- Edge Functions (Deno/TS) and Supabase IO have **no** in-repo test harness (consistent with `fitbit-sync`): verify by `npm run build` (client) and manual deploy + a real Strava account.

## File structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/lib/Storage.js` | Modify | Add `workouts` key; include it in the per-user namespaced base-key list |
| `src/lib/Database.js` | Modify | Add `workouts` to the in-memory `tables` + `tablesApi` |
| `src/lib/SyncService.js` | Modify | Add `workouts` to `pullFromSupabase`; add `getStravaAuthUrl`, `syncStrava` |
| `src/stores/trainingStore.js` | Modify | `stravaError` state, `syncStrava` action, wire Strava into `syncFromCloud` |
| `src/data/providers.js` | Modify | Flip `strava` to `status: 'live'` |
| `src/screens/Integrations.jsx` | Modify | Per-provider connect/sync; Strava live; "Make primary" only for baseline providers; top-level redirect; last-synced |
| `supabase/functions/strava-auth-callback/index.ts` | Create | Strava OAuth callback → store connection (role secondary) |
| `supabase/functions/strava-sync/index.ts` | Create | Refresh token → fetch activities → normalize → upsert `workouts` |
| `tests/workouts-cache.js` | Create | `workouts` cache reload + namespacing |

**Task order:** workouts cache (1) → Edge Functions (2, files/deploy) → client connect+sync (3) → Integrations UI (4).

---

### Task 1: `workouts` local cache + cloud pull

**Files:**
- Modify: `src/lib/Storage.js`, `src/lib/Database.js`, `src/lib/SyncService.js`
- Test: `tests/workouts-cache.js` (create)

**Interfaces:**
- Produces: `Database.tables.workouts` (a table API with `.all()`, `.get(id)`, `.replaceAll(rows)`), backed by the namespaced `htp_workouts_v4_<ns>` cache key; `pullFromSupabase` populates it.

- [ ] **Step 1: Write the failing test**

Create `tests/workouts-cache.js`:

```js
// localStorage shim must exist before Database/Storage boot (import is hoisted).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Database = (await import('../src/lib/Database.js')).default;
const Storage = await import('../src/lib/Storage.js');

// T1: workouts has a namespaced Storage key and a Database table
Storage.setNamespace('userW');
Storage.save(Storage.KEYS.workouts, { w1: { id: 'w1', type: 'run', provider: 'strava' } });
assert(localStorage.getItem('htp_workouts_v4_userW') !== null, 'T1 writes to namespaced workouts key');

Database.services.reloadFromStorage();
assert(Database.tables.workouts.get('w1')?.type === 'run', 'T2 reload picks up workouts for userW');

// T3: switching namespace isolates workouts
Storage.setNamespace('userZ');
Database.services.reloadFromStorage();
assert(!Database.tables.workouts.get('w1'), 'T3 workouts isolated per namespace');

// T4: clearNamespace removes workouts for that namespace only
Storage.setNamespace('userW');
Storage.clearNamespace('userW');
assert(localStorage.getItem('htp_workouts_v4_userW') === null, 'T4 clearNamespace clears workouts');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/workouts-cache.js`
Expected: FAIL — `Storage.KEYS.workouts` is undefined (so the key is `htp_undefined...`), and `Database.tables.workouts` doesn't exist.

- [ ] **Step 3: Add the `workouts` key to `src/lib/Storage.js`**

In the `KEYS` object, add a `workouts` entry next to `injuries`:

```js
  injuries:          'htp_injuries_v4',
  workouts:          'htp_workouts_v4',
```

And add `KEYS.workouts` to the `TABLE_BASE_KEYS` array (so per-user adopt/clear cover it):

```js
const TABLE_BASE_KEYS = [
  KEYS.users, KEYS.plans, KEYS.phases, KEYS.weeks, KEYS.sessions, KEYS.sessionLogs,
  KEYS.weeklyCheckins, KEYS.reassessments, KEYS.wearableReadings, KEYS.dailyMetrics,
  KEYS.injuries, KEYS.workouts, KEYS.aiRecommendations
];
```

(`ALL_BASE_KEYS = Object.values(KEYS)` already picks up the new key automatically.)

- [ ] **Step 4: Add the `workouts` table to `src/lib/Database.js`**

In the in-memory `tables` object (next to `injuries`), add:

```js
  injuries:          Storage.load(Storage.KEYS.injuries, {}),
  workouts:          Storage.load(Storage.KEYS.workouts, {}),
```

And in `tablesApi` (next to `injuries`):

```js
  injuries:          table('injuries'),
  workouts:          table('workouts'),
```

(`reloadFromStorage` and `resetAll` iterate `Object.keys(tables)`, so they pick up `workouts` automatically.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/workouts-cache.js`
Expected: all `PASS:`, exit 0.

- [ ] **Step 6: Add `workouts` to `pullFromSupabase` in `src/lib/SyncService.js`**

In the `Promise.all([...])` fetch list, add a workouts fetch (after the injuries line):

```js
      supabase.from('injuries').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('workouts').select('*').eq('user_id', userId).is('deleted_at', null)
```

Update the destructuring to capture it:

```js
    const [
      usersRes, plansRes, sessionsRes, logsRes,
      checkinsRes, reassessRes, dailyRes, injuriesRes, workoutsRes
    ] = await Promise.all([
```

Add it to `resultsByTable`:

```js
      injuries: injuriesRes, workouts: workoutsRes
```

And add the per-table replace (after the injuries replace line):

```js
    if (replaceable.includes('injuries'))       Database.tables.injuries.replaceAll(injuriesRes.data || []);
    if (replaceable.includes('workouts'))       Database.tables.workouts.replaceAll(workoutsRes.data || []);
```

- [ ] **Step 7: Verify build + pull-resilience still pass**

Run: `node tests/pull-resilience.js && node tests/workouts-cache.js && npm run build 2>&1 | tail -1`
Expected: tests PASS; build clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/Storage.js src/lib/Database.js src/lib/SyncService.js tests/workouts-cache.js
git commit -m "feat(workouts): per-user local cache + cloud pull for the workouts table

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Strava Edge Functions (OAuth callback + sync)

**Files:**
- Create: `supabase/functions/strava-auth-callback/index.ts`
- Create: `supabase/functions/strava-sync/index.ts`

**Interfaces:**
- `strava-auth-callback`: GET with `?code&state(=user_id)`; exchanges code, upserts a `wearable_connections` row (`provider='strava'`, `role='secondary'`), redirects to the app.
- `strava-sync`: POST (Supabase JWT); refreshes token, fetches activities since `last_synced_at` (or 90 days on first sync), upserts `workouts`; returns `{ ok, synced }` or `{ error, detail }`. Handles CORS preflight.

- [ ] **Step 1: Create `supabase/functions/strava-auth-callback/index.ts`**

```ts
/**
 * strava-auth-callback — Supabase Edge Function
 *
 * Handles the Strava OAuth 2.0 callback: exchanges the auth code for tokens and
 * stores them in wearable_connections (provider='strava', role='secondary' —
 * Strava supplies workouts only, never baseline). Mirrors fitbit-auth-callback.
 *
 * Env (Supabase Dashboard → Edge Functions): STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL   = 'https://simondring.github.io/hybrid-react/'
const TOKEN_URL = 'https://www.strava.com/oauth/token'

Deno.serve(async (req: Request) => {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // Supabase user id
  const error = url.searchParams.get('error')

  if (error || !code || !state) {
    const reason = error || 'missing_params'
    console.error('[strava-auth-callback] Bad request:', reason)
    return Response.redirect(`${APP_URL}?strava=error&reason=${reason}`)
  }

  const clientId     = Deno.env.get('STRAVA_CLIENT_ID')!
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')!

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     clientId,
      client_secret: clientSecret
    })
  })

  if (!tokenRes.ok) {
    console.error('[strava-auth-callback] Token exchange failed:', await tokenRes.text())
    return Response.redirect(`${APP_URL}?strava=error&reason=token_exchange`)
  }

  const tokens = await tokenRes.json()
  // Strava returns expires_at as an absolute epoch-seconds value.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { error: dbError } = await supabase
    .from('wearable_connections')
    .upsert({
      user_id:          state,
      provider:         'strava',
      provider_user_id: tokens.athlete?.id ? String(tokens.athlete.id) : null,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      expires_at:       new Date(tokens.expires_at * 1000).toISOString(),
      scope:            url.searchParams.get('scope') ?? null,
      role:             'secondary',
      connected_at:     new Date().toISOString()
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('[strava-auth-callback] DB upsert failed:', dbError)
    return Response.redirect(`${APP_URL}?strava=error&reason=db_error`)
  }

  return Response.redirect(`${APP_URL}?strava=connected`)
})
```

- [ ] **Step 2: Create `supabase/functions/strava-sync/index.ts`**

```ts
/**
 * strava-sync — Supabase Edge Function
 *
 * Fetches the athlete's activities from Strava (summaries) and upserts them into
 * the workouts table. Incremental: first sync imports the last 90 days; later
 * syncs fetch activities after wearable_connections.last_synced_at. Idempotent
 * via the unique (user_id, provider, provider_activity_id) index. Mirrors
 * fitbit-sync (incl. CORS preflight + real-error-in-body).
 *
 * Env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN_URL = 'https://www.strava.com/oauth/token'
const API_BASE  = 'https://www.strava.com/api/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

// Map Strava's many sport_type/type values to our enum via substring rules.
function mapType(sport: string): string {
  const s = (sport || '').toLowerCase()
  if (s.includes('run')) return 'run'
  if (s.includes('ride') || s.includes('bike') || s.includes('cycl')) return 'ride'
  if (s.includes('swim')) return 'swim'
  if (s.includes('weight') || s.includes('strength') || s.includes('workout')) return 'strength'
  if (s.includes('walk') || s.includes('hike')) return 'walk'
  return 'other'
}

function normalize(act: any, userId: string): Record<string, any> {
  const start = act.start_date ? new Date(act.start_date) : null
  const elapsed = Number(act.elapsed_time) || 0
  return {
    user_id: userId,
    provider: 'strava',
    provider_activity_id: String(act.id),
    type: mapType(act.sport_type ?? act.type),
    start_time: start ? start.toISOString() : null,
    end_time: start ? new Date(start.getTime() + elapsed * 1000).toISOString() : null,
    duration_sec: Number(act.moving_time ?? act.elapsed_time) || null,
    distance_m: act.distance != null ? Number(act.distance) : null,
    avg_hr: act.average_heartrate != null ? Number(act.average_heartrate) : null,
    max_hr: act.max_heartrate != null ? Number(act.max_heartrate) : null,
    calories: act.calories != null ? Number(act.calories) : null,
    elevation_gain_m: act.total_elevation_gain != null ? Number(act.total_elevation_gain) : null,
    raw: act,
    source: 'strava'
  }
}

async function getAccessToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) return connection.access_token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: connection.refresh_token,
      client_id:     Deno.env.get('STRAVA_CLIENT_ID')!,
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET')!
    })
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const t = await res.json()
  await supabase.from('wearable_connections').update({
    access_token:  t.access_token,
    refresh_token: t.refresh_token ?? connection.refresh_token,
    expires_at:    new Date(t.expires_at * 1000).toISOString()
  }).eq('user_id', connection.user_id).eq('provider', 'strava')

  return t.access_token
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

  const { data: connection, error: connErr } = await supabase
    .from('wearable_connections').select('*')
    .eq('user_id', user.id).eq('provider', 'strava').single()
  if (connErr || !connection) {
    return new Response(JSON.stringify({ error: 'Strava not connected' }), { status: 400, headers: jsonHeaders })
  }

  let token: string
  try { token = await getAccessToken(supabase, connection) }
  catch (e: any) {
    return new Response(JSON.stringify({ error: 'Token refresh failed', detail: e.message }), { status: 400, headers: jsonHeaders })
  }

  // Incremental window: since last sync, else last 90 days on first connect.
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
  const after = connection.last_synced_at
    ? Math.floor(new Date(connection.last_synced_at).getTime() / 1000)
    : ninetyDaysAgo

  const synced: string[] = []
  let page = 1
  try {
    // Page through activities (100/page) until a short page signals the end.
    while (true) {
      const res = await fetch(`${API_BASE}/athlete/activities?after=${after}&per_page=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Activity fetch failed', detail: await res.text() }), { status: 400, headers: jsonHeaders })
      }
      const activities = await res.json()
      if (!Array.isArray(activities) || activities.length === 0) break

      const rows = activities.map((a: any) => normalize(a, user.id))
      const { error: upErr } = await supabase
        .from('workouts').upsert(rows, { onConflict: 'user_id,provider,provider_activity_id' })
      if (upErr) console.error('[strava-sync] upsert failed:', upErr)
      else rows.forEach(r => synced.push(r.provider_activity_id))

      if (activities.length < 100) break
      page += 1
      if (page > 20) break  // safety cap (2000 activities/sync)
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Sync exception', detail: e.message }), { status: 400, headers: jsonHeaders })
  }

  await supabase.from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('provider', 'strava')

  return new Response(JSON.stringify({ ok: true, synced }), { headers: jsonHeaders })
})
```

- [ ] **Step 3: Manual deploy (Simon)**

Document in the commit message + tell Simon:
1. Register a Strava API app at `https://www.strava.com/settings/api` → note **Client ID** + **Client Secret**; set **Authorization Callback Domain** to `ggldomlmycvpwtzzjzcd.supabase.co`.
2. Supabase → Edge Functions env: set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`. Set `VITE_STRAVA_CLIENT_ID` in `.env.local` (+ GitHub Actions build env) for the browser authorize URL.
3. Deploy: `supabase functions deploy strava-auth-callback && supabase functions deploy strava-sync`.

(No automated test — there is no Deno/Supabase harness in this project, consistent with `fitbit-sync`.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/strava-auth-callback/index.ts supabase/functions/strava-sync/index.ts
git commit -m "feat(strava): OAuth callback + sync Edge Functions (workouts ingestion)

Requires manual deploy + STRAVA_CLIENT_ID/SECRET (see commit body).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Client connect + sync (SyncService + store)

**Files:**
- Modify: `src/lib/SyncService.js`, `src/stores/trainingStore.js`

**Interfaces:**
- Consumes: existing `supabase`, `canSync`, `logError`, `pickFitbitErrorReason`, `checkConnections` (Task A); `syncFromCloud` (store).
- Produces:
  - `getStravaAuthUrl(userId): string` — the Strava authorize URL.
  - `syncStrava(): Promise<{ ok, reason? }>` — invokes the `strava-sync` Edge Function (reads the real error from the response body).
  - Store: `stravaError` state, `syncStrava()` action (mirrors `syncFitbitToday`), wired into `syncFromCloud`.

- [ ] **Step 1: Add `getStravaAuthUrl` + `syncStrava` to `src/lib/SyncService.js`**

After `syncFitbit` (and before `checkConnections`), add:

```js
// Build the Strava OAuth authorize URL. client_id is public (browser-safe);
// the secret stays in the Edge Function. scope=activity:read_all reads all
// activities incl. ones marked private. state carries the Supabase user id.
export function getStravaAuthUrl(userId) {
  const clientId    = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-auth-callback`
  );
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&response_type=code&redirect_uri=${redirectUri}` +
    `&approval_prompt=force&scope=activity:read_all&state=${userId}`;
}

// Trigger the strava-sync Edge Function. Reads the real failure reason from the
// function's response body (same approach as syncFitbit).
export async function syncStrava() {
  if (!canSync()) return { ok: false, reason: 'not signed in' };
  try {
    const { data, error } = await supabase.functions.invoke('strava-sync', { body: {} });
    if (error) {
      logError('syncStrava', error);
      let reason = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          reason = pickFitbitErrorReason(errBody, reason);
        }
      } catch { /* keep generic reason */ }
      return { ok: false, reason };
    }
    return data;
  } catch (err) {
    logError('syncStrava (exception)', err);
    return { ok: false, reason: err.message };
  }
}
```

Add `getStravaAuthUrl, syncStrava` to the `export default { ... }` block (next to `checkConnections, setDevicePrimary`).

- [ ] **Step 2: Add `stravaError` + `syncStrava` to the store and wire `syncFromCloud`**

In `src/stores/trainingStore.js`: update the SyncService import to include `syncStrava` (and keep the rest); add `stravaError: null` to initial state (next to `fitbitError`); add the action (next to `syncFitbitToday`):

```js
  async syncStrava() {
    set({ stravaError: null });
    const result = await syncStrava();
    if (result?.ok) {
      await pullFromSupabase();
      set({ ...buildView(), stravaError: null });
    } else {
      set({ stravaError: result?.reason || 'Sync failed' });
    }
    return result;
  },
```

In `syncFromCloud`, after the Fitbit block, trigger a Strava sync when connected:

```js
    if (fitbitConnection) {
      useTrainingStore.getState().syncFitbitToday();
    }
    if (connections.some(c => c.provider === 'strava')) {
      useTrainingStore.getState().syncStrava();
    }
    return result;
```

(`connections` is already in scope from the Task-A `checkConnections` wiring.)

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -1`
Expected: clean (functions wired, invoked only at runtime).

- [ ] **Step 4: Commit**

```bash
git add src/lib/SyncService.js src/stores/trainingStore.js
git commit -m "feat(strava): getStravaAuthUrl + syncStrava action wired into syncFromCloud

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Integrations UI — Strava live + per-provider connect/sync

**Files:**
- Modify: `src/data/providers.js`, `src/screens/Integrations.jsx`

**Interfaces:**
- Consumes: `getFitbitAuthUrl`, `getStravaAuthUrl`, `fitbitReconnectState` (SyncService); store `connections`, `fitbitConnection`, `fitbitSyncing`, `fitbitError`, `stravaError`, `syncFitbitToday`, `syncStrava`, `setPrimaryDevice`.

- [ ] **Step 1: Flip Strava to live in `src/data/providers.js`**

Change the `strava` entry's status:

```js
  strava: {
    id: 'strava',
    label: 'Strava',
    capabilities: { baseline: false, workouts: true },
    status: 'live'
  }
```

- [ ] **Step 2: Generalize `src/screens/Integrations.jsx` for multiple live providers**

Replace the top of the `Integrations` component (the selectors + `connect`) so connect/sync are chosen per provider and the connect uses a top-level redirect:

```jsx
import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { listProviders } from '../data/providers.js';
import { primaryProvider } from '../lib/wearableConnections.js';
import { getFitbitAuthUrl, getStravaAuthUrl, fitbitReconnectState } from '../lib/SyncService.js';

export default function Integrations() {
  const user             = useAuthStore(s => s.user);
  const connections      = useTrainingStore(s => s.connections);
  const fitbitConnection = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing    = useTrainingStore(s => s.fitbitSyncing);
  const fitbitError      = useTrainingStore(s => s.fitbitError);
  const stravaError      = useTrainingStore(s => s.stravaError);
  const syncFitbitToday  = useTrainingStore(s => s.syncFitbitToday);
  const syncStrava       = useTrainingStore(s => s.syncStrava);
  const setPrimaryDevice = useTrainingStore(s => s.setPrimaryDevice);

  const currentPrimary = primaryProvider(connections);

  // Per-provider OAuth authorize URL. Top-level redirect (NOT window.open) — the
  // app is a standalone PWA where popups flash blank and bounce back.
  const authUrlFor = (id) => id === 'strava' ? getStravaAuthUrl(user.id) : getFitbitAuthUrl(user.id);
  const connectTo  = (id) => { if (user) window.location.href = authUrlFor(id); };

  return (
    <div style={{ padding: '8px 4px 32px' }}>
      <h2 className="h3" style={{ marginBottom: 4 }}>Integrations</h2>
      <p className="sub" style={{ fontSize: 12, marginBottom: 16 }}>
        Connect your wearables. Your <strong>primary</strong> device supplies your
        recovery data (resting HR, sleep, HRV); any device can add workouts.
      </p>

      {listProviders().map(p => {
        const conn = connections.find(c => c.provider === p.id) || null;
        const isStrava = p.id === 'strava';
        return (
          <ProviderCard
            key={p.id}
            provider={p}
            connection={conn}
            isPrimary={currentPrimary === p.id}
            isFitbit={p.id === 'fitbit'}
            canBePrimary={p.capabilities.baseline}
            fitbitConnection={fitbitConnection}
            syncing={isStrava ? false : fitbitSyncing}
            error={isStrava ? stravaError : fitbitError}
            onConnect={() => connectTo(p.id)}
            onSync={() => isStrava ? syncStrava() : syncFitbitToday()}
            onMakePrimary={() => setPrimaryDevice(p.id)}
          />
        );
      })}
    </div>
  );
}
```

Then update `ProviderCard` to the new props (replace its signature and the parts that referenced the old names). Full updated `ProviderCard`:

```jsx
function ProviderCard({
  provider, connection, isPrimary, isFitbit, canBePrimary, fitbitConnection,
  syncing, error, onConnect, onSync, onMakePrimary
}) {
  const comingSoon = provider.status === 'coming_soon';
  const connected = !!connection;
  const caps = [
    provider.capabilities.baseline ? 'Baseline' : null,
    provider.capabilities.workouts ? 'Workouts' : null
  ].filter(Boolean).join(' + ');

  const lastSynced = connection?.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleDateString()
    : null;

  // Reconnect nudge only applies to Fitbit (Strava refresh tokens are long-lived).
  const reconnect = (isFitbit && fitbitConnection)
    ? fitbitReconnectState({ connectedAt: fitbitConnection.connected_at, errorReason: error })
    : 'ok';

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, marginBottom: 8,
      border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>
            {provider.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
            {comingSoon
              ? `Coming soon · ${caps}`
              : connected
                ? `Connected · ${caps}${lastSynced ? ` · synced ${lastSynced}` : ''}`
                : caps}
          </div>
        </div>
        {comingSoon ? (
          <span style={{ fontSize: 12, color: 'var(--txt-muted)', fontWeight: 600 }}>Coming soon</span>
        ) : !connected ? (
          <button onClick={onConnect} style={btnPrimary}>Connect</button>
        ) : (
          <button onClick={onSync} disabled={syncing} style={btnGhost(syncing)}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      {/* Primary / Secondary control — only for providers that supply baseline. */}
      {!comingSoon && connected && canBePrimary && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPrimary ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--moss)' }}>● Primary device</span>
          ) : (
            <button onClick={onMakePrimary} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--rust)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit'
            }}>
              Make primary
            </button>
          )}
        </div>
      )}

      {/* Reconnect nudge (Fitbit only) */}
      {reconnect !== 'ok' && (() => {
        const now = reconnect === 'reconnect_now';
        const accent = now ? 'var(--rust)' : 'var(--ochre)';
        const bg     = now ? 'rgba(176,74,46,0.08)' : 'rgba(200,154,58,0.10)';
        const border = now ? 'rgba(176,74,46,0.25)' : 'rgba(200,154,58,0.30)';
        return (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 9, background: bg, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: accent }}>
              {now ? 'Fitbit needs reconnecting' : 'Fitbit access expires soon'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-body)', marginTop: 2 }}>
              {now
                ? 'Your Google sign-in has expired, so syncing has stopped. Reconnect to resume.'
                : 'Reconnect now to keep your data syncing without a gap.'}
            </div>
            <button onClick={onConnect} style={{
              marginTop: 8, padding: '7px 12px', borderRadius: 8, border: 'none',
              background: accent, color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Reconnect Fitbit
            </button>
          </div>
        );
      })()}

      {/* Non-reconnect sync errors stay visible. Non-Fitbit providers get a
          reconnect link here (Fitbit uses its dedicated nudge above). */}
      {connected && error && reconnect !== 'reconnect_now' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--txt-muted)', wordBreak: 'break-word' }}>
            Last sync error: {error}
          </div>
          {!isFitbit && (
            <button onClick={onConnect} style={{
              marginTop: 6, fontSize: 11, fontWeight: 600, color: 'var(--rust)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit'
            }}>
              Reconnect {provider.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

(Keep the existing `btnPrimary` / `btnGhost` style consts at the bottom of the file unchanged.)

- [ ] **Step 3: Run tests + build**

Run: `node tests/providers.js && node tests/wearable-connections.js && node tests/workouts-cache.js && node tests/fitbit-reconnect-state.js && node tests/fitbit-error.js && node tests/injury-engine.js`
Expected: all PASS.
Run: `npm run build 2>&1 | tail -1`
Expected: clean.

- [ ] **Step 4: Manual verification (deferred to Simon — needs the Strava app + a real account)**

After Task 2's deploy + secrets: open Integrations → **Strava** shows "Connect"; connecting redirects to Strava and returns; the card shows "Connected · Workouts · synced <date>"; "Sync now" ingests recent activities; **no "Make primary"** appears on Strava (workouts-only); a Garmin-recorded activity that's on Strava lands in `workouts`. Fitbit card is unchanged (still has Make primary + reconnect nudge).

- [ ] **Step 5: Commit**

```bash
git add src/data/providers.js src/screens/Integrations.jsx
git commit -m "feat(strava): live Strava Integrations card; per-provider connect/sync; primary toggle only for baseline providers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] All tests: `node tests/providers.js && node tests/wearable-connections.js && node tests/workouts-cache.js && node tests/fitbit-reconnect-state.js && node tests/fitbit-error.js && node tests/storage-namespace.js && node tests/database-reload.js && node tests/pull-resilience.js && node tests/injury-engine.js` — all PASS.
- [ ] `npm run build` clean; `npm run dev` runs.
- [ ] Simon: Strava API app registered; `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` in Edge Function env; `VITE_STRAVA_CLIENT_ID` in build env; both Edge Functions deployed.
- [ ] End-to-end: connect Strava → activities (incl. Garmin-sourced) appear in `workouts`; re-sync doesn't duplicate.
- [ ] Review every diff before any push; do not push/merge unless asked.

## Known limitations (intentionally out of scope)

- **Garmin** remains a placeholder — its API is blocked (suspended program + legal-entity requirement). Strava carries Garmin-recorded workouts.
- Workouts are **ingested but not displayed in detail, linked to sessions, or turned into training load** — that's C and D.
- **Polling only** (no webhooks); activity **summaries** only (no per-second HR/GPS streams — a C concern).
- The Strava normalization (TS, in `strava-sync`) has **no in-repo unit test** (no Deno harness), consistent with `fitbit-sync`'s `buildRow`; it is verified manually.
- The standalone-PWA OAuth redirect fix is applied to the connect handler here; the separate `fix/pwa-oauth-redirect` branch (Fitbit-only) can be landed independently for the immediate fix or closed once this merges.
