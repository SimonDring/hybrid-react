# Multi-device Wearable Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Integrations screen with Garmin/Strava placeholders and a single-primary device-role model, plus the data-model groundwork (`role` on connections + a `workouts` table defined) — without breaking the working Fitbit connection/sync/reconnect.

**Architecture:** A client-side provider **registry** describes each wearable (capabilities + live/coming-soon). Pure helpers resolve the **primary device** from the list of connections. `SyncService` gains `checkConnections()` (read all `wearable_connections` rows) and `setDevicePrimary()` (role updates); the store generalises the single `fitbitConnection` into a `connections` array while keeping a derived `fitbitConnection` so existing Fitbit code is untouched. A new Integrations screen renders one card per provider and hosts the Fitbit controls + reconnect nudge that move out of Settings.

**Tech Stack:** React 18 + Vite, React Router 6 (`useNavigate`, `<Route>` in `App.jsx`), Zustand 5, Supabase (Postgres + Auth + RLS), plain-Node test scripts in `tests/` (`assert(cond, msg)` helper, run with `node tests/<file>.js`).

## Global Constraints

- All data writes go through **SyncService** (via store actions). Never write to `Database.js` directly from a screen.
- Schema changes ship as **versioned migrations** under `supabase/migrations/`. Do not edit `supabase/schema.sql` in place for new objects.
- Use **real theme variables only**: `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md`. NEVER `--card-bg, --border, --accent-bg`.
- RLS everywhere: a user sees only their own rows (`auth.uid() = user_id`).
- The app must run (`npm run dev`) at the end of every change.
- **Sourcing rule (core):** exactly one connected device is `primary` and owns ALL baseline/recovery metrics; every connected device may contribute workouts. Only the primary's sync writes `daily_metrics` (enforced in Sub-project B; not in this plan).
- **Out of scope (this plan):** real Garmin/Strava OAuth + sync, populating `workouts`, session↔workout linking, training-load computation, push-to-watch.

## Test conventions (read before Task 1)

- Plain Node ESM files in `tests/`, run individually: `node tests/<name>.js`. Use:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
- New pure modules in this plan (`src/data/providers.js`, `src/lib/wearableConnections.js`) import **nothing** that touches `localStorage`, so their tests import them directly — no shim needed.
- Tasks that touch Supabase IO or React UI are verified by `npm run build` + explicit manual steps (the project has no browser/Supabase test harness), consistent with the rest of the codebase.

## File structure

| File | Change | Responsibility |
|------|--------|----------------|
| `supabase/migrations/005_wearable_roles.sql` | Create | Add `role` to `wearable_connections`, one-primary index, migrate Fitbit → primary |
| `supabase/migrations/006_workouts.sql` | Create | Define the `workouts` table (defined, not populated), indexes, RLS, trigger |
| `src/data/providers.js` | Create | Provider registry: id, label, capabilities, status |
| `src/lib/wearableConnections.js` | Create | Pure helpers: `primaryProvider`, `computeRoleUpdates` |
| `src/lib/SyncService.js` | Modify | `checkConnections()`, `setDevicePrimary()` (Supabase IO) |
| `src/stores/trainingStore.js` | Modify | `connections` state, derived `fitbitConnection`, `setPrimaryDevice` action, `syncFromCloud` wiring |
| `src/screens/Integrations.jsx` | Create | The Integrations screen: a card per provider, Fitbit controls + nudge, role toggle |
| `src/screens/Settings.jsx` | Modify | Replace inline Fitbit block with one row linking to `/settings/integrations` |
| `src/App.jsx` | Modify | Register `/settings/integrations` route + routeMeta |
| `tests/providers.js` | Create | Registry shape tests |
| `tests/wearable-connections.js` | Create | `primaryProvider` + `computeRoleUpdates` tests |

**Task order:** registry (1) and pure helpers (2) first (no deps, fully tested) → migrations (3, DB ready) → SyncService IO (4) → store wiring (5) → Integrations screen + routing (6).

---

### Task 1: Provider registry

**Files:**
- Create: `src/data/providers.js`
- Test: `tests/providers.js`

**Interfaces:**
- Produces:
  - `PROVIDERS`: object keyed by provider id, each `{ id, label, capabilities: { baseline: boolean, workouts: boolean }, status: 'live' | 'coming_soon' }`.
  - `listProviders(): Array<provider>` — the registry as an array, registry order.

- [ ] **Step 1: Write the failing test**

Create `tests/providers.js`:

```js
import { PROVIDERS, listProviders } from '../src/data/providers.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(PROVIDERS.fitbit.status === 'live', 'T1 fitbit is live');
assert(PROVIDERS.garmin.status === 'coming_soon', 'T2 garmin is coming_soon');
assert(PROVIDERS.strava.status === 'coming_soon', 'T3 strava is coming_soon');

assert(PROVIDERS.fitbit.capabilities.baseline === true, 'T4 fitbit supplies baseline');
assert(PROVIDERS.garmin.capabilities.workouts === true, 'T5 garmin supplies workouts');
assert(PROVIDERS.strava.capabilities.baseline === false, 'T6 strava has no baseline');
assert(PROVIDERS.strava.capabilities.workouts === true, 'T7 strava supplies workouts');

const list = listProviders();
assert(Array.isArray(list) && list.length === 3, 'T8 listProviders returns all three');
assert(list[0].id === 'fitbit', 'T9 fitbit is first');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/providers.js`
Expected: FAIL — cannot import `PROVIDERS` (module doesn't exist).

- [ ] **Step 3: Create `src/data/providers.js`**

```js
/**
 * Wearable provider registry.
 *
 * Declares each integration the app knows about: its display label, what kinds
 * of data it can supply (baseline recovery metrics and/or workouts), and whether
 * it's live or a coming-soon placeholder. Mirrors the activityTypes.js registry
 * pattern so the Integrations screen renders a card per provider with no
 * hard-coded special cases, and so later sub-projects (and the AI engine) have a
 * machine-readable contract for each source's capabilities.
 *
 * capabilities.baseline → can supply resting HR, HRV, sleep, etc. (only the
 *                         user's PRIMARY device's baseline is used).
 * capabilities.workouts → can supply individual workouts (any device may).
 * status: 'live' (connectable now) | 'coming_soon' (placeholder).
 */

export const PROVIDERS = {
  fitbit: {
    id: 'fitbit',
    label: 'Fitbit / Google Health',
    capabilities: { baseline: true, workouts: true },
    status: 'live'
  },
  garmin: {
    id: 'garmin',
    label: 'Garmin',
    capabilities: { baseline: true, workouts: true },
    status: 'coming_soon'
  },
  strava: {
    id: 'strava',
    label: 'Strava',
    capabilities: { baseline: false, workouts: true },
    status: 'coming_soon'
  }
};

// Registry as an array, in declaration order (fitbit first).
export function listProviders() {
  return Object.values(PROVIDERS);
}

export default { PROVIDERS, listProviders };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/providers.js`
Expected: all `PASS:`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/data/providers.js tests/providers.js
git commit -m "feat(wearables): add provider registry (fitbit live; garmin/strava placeholders)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Pure connection/role helpers

**Files:**
- Create: `src/lib/wearableConnections.js`
- Test: `tests/wearable-connections.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `primaryProvider(connections): string | null` — the `provider` whose `role === 'primary'` (first match), else null. `connections` is an array of `{ provider, role, ... }`. A missing/unknown `role` is treated as `'secondary'`.
  - `computeRoleUpdates(connections, chosenProvider): Array<{ provider, role }>` — the minimal set of role changes to make `chosenProvider` the sole primary: the chosen one → `'primary'` (if not already), and any *other* current primary → `'secondary'`. Returns `[]` if already correct. Does not mutate input.

- [ ] **Step 1: Write the failing test**

Create `tests/wearable-connections.js`:

```js
import { primaryProvider, computeRoleUpdates } from '../src/lib/wearableConnections.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// primaryProvider
assert(
  primaryProvider([{ provider: 'fitbit', role: 'primary' }, { provider: 'garmin', role: 'secondary' }]) === 'fitbit',
  'T1 returns the primary provider'
);
assert(primaryProvider([{ provider: 'garmin', role: 'secondary' }]) === null, 'T2 null when no primary');
assert(primaryProvider([]) === null, 'T3 null for empty list');
assert(primaryProvider([{ provider: 'fitbit' }]) === null, 'T4 missing role treated as not-primary');

// computeRoleUpdates — promote garmin, demote the old fitbit primary
const conns = [{ provider: 'fitbit', role: 'primary' }, { provider: 'garmin', role: 'secondary' }];
const updates = computeRoleUpdates(conns, 'garmin');
assert(updates.length === 2, 'T5 two updates (promote + demote)');
assert(updates.find(u => u.provider === 'garmin').role === 'primary', 'T6 garmin → primary');
assert(updates.find(u => u.provider === 'fitbit').role === 'secondary', 'T7 fitbit → secondary');

// already primary → no-op
assert(computeRoleUpdates(conns, 'fitbit').length === 0, 'T8 choosing the existing primary is a no-op');

// promote when there is no current primary → single update
const conns2 = [{ provider: 'fitbit', role: 'secondary' }];
const updates2 = computeRoleUpdates(conns2, 'fitbit');
assert(updates2.length === 1 && updates2[0].role === 'primary', 'T9 promote with no prior primary');

// input is not mutated
computeRoleUpdates(conns, 'garmin');
assert(conns[0].role === 'primary', 'T10 does not mutate input');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/wearable-connections.js`
Expected: FAIL — cannot import `primaryProvider`.

- [ ] **Step 3: Create `src/lib/wearableConnections.js`**

```js
/**
 * Pure helpers for the multi-device wearable model. No IO — easy to test.
 *
 * Role model: exactly one connected device is 'primary' (owns baseline/recovery
 * metrics); all others are 'secondary'. Workouts may come from any device.
 */

// The provider id of the primary device, or null if none is set.
export function primaryProvider(connections = []) {
  const hit = connections.find(c => c && c.role === 'primary');
  return hit ? hit.provider : null;
}

// Minimal role changes to make `chosenProvider` the sole primary:
//   - chosen → 'primary' (unless already)
//   - any OTHER current primary → 'secondary'
// Returns [] when nothing needs to change. Pure (no mutation).
export function computeRoleUpdates(connections = [], chosenProvider) {
  const updates = [];
  for (const c of connections) {
    if (!c) continue;
    if (c.provider === chosenProvider) {
      if (c.role !== 'primary') updates.push({ provider: c.provider, role: 'primary' });
    } else if (c.role === 'primary') {
      updates.push({ provider: c.provider, role: 'secondary' });
    }
  }
  return updates;
}

export default { primaryProvider, computeRoleUpdates };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/wearable-connections.js`
Expected: all `PASS:`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wearableConnections.js tests/wearable-connections.js
git commit -m "feat(wearables): pure primaryProvider + computeRoleUpdates helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Schema migrations (roles + workouts)

**Files:**
- Create: `supabase/migrations/005_wearable_roles.sql`
- Create: `supabase/migrations/006_workouts.sql`

**Interfaces:** none (database objects). Later tasks rely on `wearable_connections.role` existing and on the `workouts` table existing.

- [ ] **Step 1: Write the roles migration**

Create `supabase/migrations/005_wearable_roles.sql`:

```sql
-- ============================================================================
-- Migration 005: device roles on wearable_connections
-- ============================================================================
-- Adds a primary/secondary role per connection. Exactly one device per user may
-- be 'primary' (it owns baseline/recovery metrics). Existing Fitbit connections
-- become the primary, since today it's the only baseline source.
-- ============================================================================

alter table public.wearable_connections
  add column if not exists role text not null default 'secondary';

-- At most one primary device per user (partial unique index).
create unique index if not exists uniq_wearable_primary_per_user
  on public.wearable_connections (user_id)
  where role = 'primary';

-- Promote existing Fitbit connections to primary (one per user via the existing
-- unique(user_id, provider), so this satisfies the index above).
update public.wearable_connections set role = 'primary' where provider = 'fitbit';
```

- [ ] **Step 2: Write the workouts migration**

Create `supabase/migrations/006_workouts.sql`:

```sql
-- ============================================================================
-- Migration 006: workouts table (defined now, populated in Sub-project B)
-- ============================================================================
-- One row per external workout/activity (run, ride, swim, strength, etc.) from
-- any connected device. session_id links a workout to an in-app session (set in
-- Sub-project C). No app code writes to this table yet.
-- ============================================================================

create table if not exists public.workouts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  provider            text not null,                 -- 'garmin' | 'strava' | 'fitbit' | ...
  provider_activity_id text,                          -- provider's own id (dedupe)
  type                text,                            -- run|ride|swim|strength|walk|other
  start_time          timestamptz,
  end_time            timestamptz,
  duration_sec        integer,
  distance_m          numeric,
  avg_hr              numeric,
  max_hr              numeric,
  calories            numeric,
  elevation_gain_m    numeric,
  session_id          uuid references public.sessions(id) on delete set null,
  raw                 jsonb not null default '{}'::jsonb,
  source              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index if not exists idx_workouts_user on public.workouts(user_id);
create index if not exists idx_workouts_user_start on public.workouts(user_id, start_time);
create unique index if not exists uniq_workouts_provider_activity
  on public.workouts(user_id, provider, provider_activity_id);

-- updated_at trigger (set_updated_at() is defined in schema.sql)
drop trigger if exists trg_workouts_updated on public.workouts;
create trigger trg_workouts_updated
  before update on public.workouts
  for each row execute function set_updated_at();

-- Row Level Security: a user can only see their own workouts.
alter table public.workouts enable row level security;
drop policy if exists "own rows" on public.workouts;
create policy "own rows" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 3: Apply both migrations in Supabase**

Manual (Simon): Supabase dashboard → SQL Editor → run `005_wearable_roles.sql`, then `006_workouts.sql`. Confirm "Success" for each. Verify in Table Editor: `wearable_connections` has a `role` column (your Fitbit row = `primary`), and a `workouts` table exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_wearable_roles.sql supabase/migrations/006_workouts.sql
git commit -m "feat(db): add device roles + workouts table (migrations 005, 006)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: SyncService — read connections + set primary (Supabase IO)

**Files:**
- Modify: `src/lib/SyncService.js`

**Interfaces:**
- Consumes: `computeRoleUpdates` (Task 2); existing `supabase`, `uid`, `canSync`, `logError`.
- Produces:
  - `checkConnections(): Promise<Array<{ provider, role, connected_at, last_synced_at }>>` — all of the user's `wearable_connections` rows (RLS-scoped), `[]` when not signed in or on error.
  - `setDevicePrimary(provider): Promise<{ ok, error? }>` — reads connections, applies `computeRoleUpdates`, writes each role change to Supabase. `ok:false` with `error` on failure.

- [ ] **Step 1: Add the import**

In `src/lib/SyncService.js`, near the top imports, add:

```js
import { computeRoleUpdates } from './wearableConnections.js';
```

- [ ] **Step 2: Add `checkConnections` and `setDevicePrimary`**

In `src/lib/SyncService.js`, in the Fitbit section (right after `checkFitbitConnection`), add:

```js
// Read ALL of the user's wearable connections (RLS-scoped). Returns [] when not
// signed in or on error. Each row: { provider, role, connected_at, last_synced_at }.
export async function checkConnections() {
  if (!canSync()) return [];
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('provider, role, connected_at, last_synced_at');
  if (error) { logError('checkConnections', error); return []; }
  return data || [];
}

// Make `provider` the user's sole primary device. Demotes any other primary.
export async function setDevicePrimary(provider) {
  if (!canSync()) return { ok: false, error: 'not signed in' };
  const userId = uid();
  const connections = await checkConnections();
  const updates = computeRoleUpdates(connections, provider);
  for (const u of updates) {
    const { error } = await supabase
      .from('wearable_connections')
      .update({ role: u.role })
      .eq('user_id', userId)
      .eq('provider', u.provider);
    if (error) { logError('setDevicePrimary', error); return { ok: false, error: error.message }; }
  }
  return { ok: true };
}
```

- [ ] **Step 3: Export the new functions**

In the `export default { ... }` block at the bottom of `src/lib/SyncService.js`, add `checkConnections` and `setDevicePrimary` alongside the existing Fitbit exports (`getFitbitAuthUrl, checkFitbitConnection, syncFitbit, ...`):

```js
  getFitbitAuthUrl, checkFitbitConnection, syncFitbit, checkConnections, setDevicePrimary,
```

(Keep all existing entries; just add the two new names.)

- [ ] **Step 4: Verify the app builds**

Run: `npm run build`
Expected: builds with no errors (the new functions are wired but not yet called).

- [ ] **Step 5: Commit**

```bash
git add src/lib/SyncService.js
git commit -m "feat(sync): checkConnections + setDevicePrimary for multi-device roles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Store — connections state, setPrimaryDevice, syncFromCloud wiring

**Files:**
- Modify: `src/stores/trainingStore.js`

**Interfaces:**
- Consumes: `checkConnections`, `setDevicePrimary` (Task 4); `primaryProvider` (Task 2).
- Produces (store state/actions):
  - `connections: Array` — all wearable connections.
  - `fitbitConnection` — derived from `connections` (the `fitbit` row or null), preserving the existing shape so current Fitbit code/UI keeps working.
  - `setPrimaryDevice(provider): Promise<void>` — calls `setDevicePrimary`, then refreshes `connections` + derived `fitbitConnection`.

- [ ] **Step 1: Update the imports**

In `src/stores/trainingStore.js`, update the SyncService import (currently `import Sync, { pullFromSupabase, runSessionDMigration, checkFitbitConnection, syncFitbit } from '../lib/SyncService.js';`) to add the new functions, and import the pure helper:

```js
import Sync, { pullFromSupabase, runSessionDMigration, checkFitbitConnection, syncFitbit, checkConnections, setDevicePrimary } from '../lib/SyncService.js';
import { primaryProvider } from '../lib/wearableConnections.js';
```

- [ ] **Step 2: Add `connections` to initial state**

In the store's initial state (next to `fitbitConnection: null,`), add:

```js
  connections: [],          // all wearable_connections rows: { provider, role, connected_at, last_synced_at }
```

- [ ] **Step 3: Add a connections-refresh helper and wire `syncFromCloud`**

Replace the Fitbit-connection block inside `syncFromCloud` (currently):

```js
    // Check Fitbit connection and sync today's data if connected
    const fitbitConnection = await checkFitbitConnection();
    set({ ...buildView(), syncing: false, fitbitConnection });
    if (fitbitConnection) {
      useTrainingStore.getState().syncFitbitToday();
    }
    return result;
```

with:

```js
    // Load all wearable connections; derive the Fitbit one for existing UI/logic.
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ ...buildView(), syncing: false, connections, fitbitConnection });
    if (fitbitConnection) {
      useTrainingStore.getState().syncFitbitToday();
    }
    return result;
```

- [ ] **Step 4: Update `refreshFitbitConnection` to refresh the whole list, and add `setPrimaryDevice`**

Replace `refreshFitbitConnection` (currently):

```js
  async refreshFitbitConnection() {
    const fitbitConnection = await checkFitbitConnection();
    set({ fitbitConnection });
    return fitbitConnection;
  },
```

with:

```js
  // Refresh all wearable connections (and the derived Fitbit one).
  async refreshFitbitConnection() {
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ connections, fitbitConnection });
    return fitbitConnection;
  },

  // Make `provider` the sole primary device, then refresh connections.
  async setPrimaryDevice(provider) {
    const res = await setDevicePrimary(provider);
    if (!res.ok) return;
    const connections = await checkConnections();
    const fitbitConnection = connections.find(c => c.provider === 'fitbit') || null;
    set({ connections, fitbitConnection });
  },
```

- [ ] **Step 5: Verify the app builds and existing Fitbit path still works**

Run: `npm run build`
Expected: clean build.
Run: `npm run dev`, sign in, open Settings → confirm the Fitbit row still shows connection status and "Sync now" still works (the derived `fitbitConnection` keeps it functioning).

- [ ] **Step 6: Commit**

```bash
git add src/stores/trainingStore.js
git commit -m "feat(store): connections list + setPrimaryDevice (derive fitbitConnection)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Integrations screen + routing + Settings link

**Files:**
- Create: `src/screens/Integrations.jsx`
- Modify: `src/App.jsx`
- Modify: `src/screens/Settings.jsx`

**Interfaces:**
- Consumes: `listProviders`/`PROVIDERS` (Task 1); `primaryProvider` (Task 2); store `connections`, `fitbitConnection`, `fitbitSyncing`, `fitbitError`, `syncFitbitToday`, `refreshFitbitConnection`, `setPrimaryDevice` (Task 5); `getFitbitAuthUrl`, `fitbitReconnectState` (existing); `useAuthStore` user.

- [ ] **Step 1: Create the Integrations screen**

Create `src/screens/Integrations.jsx`:

```jsx
/**
 * Integrations — manage connected wearables. One card per provider from the
 * registry. Fitbit is live (connect / sync / reconnect / primary toggle); Garmin
 * and Strava are coming-soon placeholders. The "single primary owns baseline"
 * model is surfaced via the Primary/Secondary control on each connected device.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { listProviders } from '../data/providers.js';
import { primaryProvider } from '../lib/wearableConnections.js';
import { getFitbitAuthUrl, fitbitReconnectState } from '../lib/SyncService.js';

export default function Integrations() {
  const user            = useAuthStore(s => s.user);
  const connections     = useTrainingStore(s => s.connections);
  const fitbitConnection = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing   = useTrainingStore(s => s.fitbitSyncing);
  const fitbitError     = useTrainingStore(s => s.fitbitError);
  const syncFitbitToday = useTrainingStore(s => s.syncFitbitToday);
  const setPrimaryDevice = useTrainingStore(s => s.setPrimaryDevice);

  const currentPrimary = primaryProvider(connections);
  const connect = () => { if (user) window.open(getFitbitAuthUrl(user.id), '_blank'); };

  return (
    <div style={{ padding: '8px 4px 32px' }}>
      <h2 className="h3" style={{ marginBottom: 4 }}>Integrations</h2>
      <p className="sub" style={{ fontSize: 12, marginBottom: 16 }}>
        Connect your wearables. Your <strong>primary</strong> device supplies your
        recovery data (resting HR, sleep, HRV); any device can add workouts.
      </p>

      {listProviders().map(p => {
        const conn = connections.find(c => c.provider === p.id) || null;
        const isPrimary = currentPrimary === p.id;
        return (
          <ProviderCard
            key={p.id}
            provider={p}
            connection={conn}
            isPrimary={isPrimary}
            isLiveFitbit={p.id === 'fitbit'}
            fitbitConnection={fitbitConnection}
            fitbitSyncing={fitbitSyncing}
            fitbitError={fitbitError}
            onConnect={connect}
            onSync={syncFitbitToday}
            onMakePrimary={() => setPrimaryDevice(p.id)}
          />
        );
      })}
    </div>
  );
}

function ProviderCard({
  provider, connection, isPrimary, isLiveFitbit, fitbitConnection,
  fitbitSyncing, fitbitError, onConnect, onSync, onMakePrimary
}) {
  const comingSoon = provider.status === 'coming_soon';
  const connected = !!connection;
  const caps = [
    provider.capabilities.baseline ? 'Baseline' : null,
    provider.capabilities.workouts ? 'Workouts' : null
  ].filter(Boolean).join(' + ');

  const reconnect = (isLiveFitbit && fitbitConnection)
    ? fitbitReconnectState({ connectedAt: fitbitConnection.connected_at, errorReason: fitbitError })
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
            {comingSoon ? `Coming soon · ${caps}` : (connected ? `Connected · ${caps}` : caps)}
          </div>
        </div>
        {comingSoon ? (
          <span style={{ fontSize: 12, color: 'var(--txt-muted)', fontWeight: 600 }}>Coming soon</span>
        ) : !connected ? (
          <button onClick={onConnect} style={btnPrimary}>Connect</button>
        ) : (
          <button onClick={onSync} disabled={fitbitSyncing} style={btnGhost(fitbitSyncing)}>
            {fitbitSyncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      {/* Primary / Secondary control (live + connected only) */}
      {!comingSoon && connected && (
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

      {/* Reconnect nudge (live Fitbit only) */}
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

      {/* Non-reconnect sync errors stay visible */}
      {isLiveFitbit && fitbitError && reconnect !== 'reconnect_now' && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--txt-muted)', wordBreak: 'break-word' }}>
          Last sync error: {fitbitError}
        </div>
      )}
    </div>
  );
}

const btnPrimary = {
  padding: '8px 14px', borderRadius: 9, border: 'none', background: 'var(--rust)',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
};
const btnGhost = (busy) => ({
  padding: '8px 14px', borderRadius: 9, border: '1px solid var(--hairline)',
  background: 'transparent', color: busy ? 'var(--txt-muted)' : 'var(--txt-strong)',
  fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit'
});
```

- [ ] **Step 2: Register the route in `App.jsx`**

In `src/App.jsx`: add the import near the other screen imports:

```js
import Integrations from './screens/Integrations.jsx';
```

Add a `routeMeta` entry next to the `'/settings'` entry:

```js
  '/settings': { title: 'Settings', topLevel: false, tab: 'profile' },
  '/settings/integrations': { title: 'Integrations', topLevel: false, tab: 'profile' }
```

Add the route inside `<Routes>` next to the Settings route:

```jsx
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/integrations" element={<Integrations />} />
```

(If the existing `'/settings'` line ends without a trailing comma, add one before inserting the new entry.)

- [ ] **Step 3: Replace the inline Fitbit block in Settings with a link row**

In `src/screens/Settings.jsx`:

1. Add `useNavigate`: change the React Router import / add `import { useNavigate } from 'react-router-dom';` and inside the component add `const navigate = useNavigate();`.
2. Remove the now-moved Fitbit selectors that are no longer used in Settings (`fitbitSyncing`, `fitbitError`, `syncFitbitToday`, the `reconnectState` block, `connectFitbit`, `lastSynced`) — they live in Integrations now. Keep `fitbitConnection` only if used for the summary line below; otherwise remove it too.
3. Replace the entire Integrations `<div>` block (the card containing the Fitbit row, reconnect banner, and "Last sync error") plus its `<p className="sub">` helper line with a single navigation row:

```jsx
      <h2 className="h3">Integrations</h2>
      <button
        className="settings-row"
        onClick={() => navigate('/settings/integrations')}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Wearables &amp; apps
        <span style={{ marginLeft: 'auto', color: 'var(--txt-muted)' }}>›</span>
      </button>
      <p className="sub" style={{ fontSize: 11, marginBottom: 20 }}>
        Connect Fitbit, Garmin, Strava and choose your primary device.
      </p>
```

(Match the existing `settings-row` styling used elsewhere in Settings; if `settings-row` doesn't lay out an arrow well, fall back to the same inline card style used by other Settings rows.)

- [ ] **Step 4: Run all tests and build**

Run: `node tests/providers.js && node tests/wearable-connections.js && node tests/fitbit-reconnect-state.js && node tests/fitbit-error.js && node tests/injury-engine.js`
Expected: all `PASS:`.
Run: `npm run build`
Expected: clean build.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, sign in. Then:
- Settings shows an **Integrations** section with a "Wearables & apps" row → tapping it opens `/settings/integrations`.
- The Integrations screen lists **Fitbit / Google Health** (connected, with Sync now + the reconnect nudge if due + a Primary/Secondary control showing "● Primary device"), **Garmin** ("Coming soon · Baseline + Workouts"), and **Strava** ("Coming soon · Workouts").
- "Sync now" still triggers a Fitbit sync; the reconnect banner still appears when due.
- Toggling primary (once a second real device exists) persists across reload. With only Fitbit, it correctly shows as the primary.
- Theme: switch to dark/auto → no broken colours.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Integrations.jsx src/App.jsx src/screens/Settings.jsx
git commit -m "feat(wearables): dedicated Integrations screen with role toggle + Garmin/Strava placeholders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Run every test: `node tests/providers.js && node tests/wearable-connections.js && node tests/fitbit-reconnect-state.js && node tests/fitbit-error.js && node tests/storage-namespace.js && node tests/database-reload.js && node tests/pull-resilience.js && node tests/injury-engine.js` — all `PASS:`.
- [ ] `npm run build` clean; `npm run dev` runs.
- [ ] Migrations 005 + 006 applied in Supabase (Fitbit row = `primary`, `workouts` table exists).
- [ ] Fitbit still syncs + reconnects from the new Integrations screen.
- [ ] Garmin + Strava show as "Coming soon" placeholders.
- [ ] Review every diff before any push; do not push unless asked.

## Known limitations (intentionally out of scope)

- Garmin/Strava are **placeholders** — no OAuth or data sync (Sub-project B).
- `workouts` is defined but has **no writers** yet (B).
- No session↔workout linking or per-session physiology (C); no training-load computation (D).
- The single-primary **write rule** for `daily_metrics` (only the primary's sync writes baseline) is enforced when provider sync is built in B; this plan only records the role.
