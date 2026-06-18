# Auth Overhaul, Social Login & Per-User Data Isolation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every user's on-device data physically isolated (fixing the injury cross-account leak), add Apple/Google sign-in via Supabase OAuth, open up signup, and front the app with a Welcome screen that leads into the existing onboarding wizard.

**Architecture:** The leak lives in the on-device cache (`localStorage`), not Supabase (which is correctly user-scoped via RLS). We namespace every cache key by the signed-in user's id (`<base>_<uid>`, or `<base>_anon` when signed out), reload the in-memory `Database` cache whenever the namespace changes, harden the sign-in cloud pull so one failed table can't leave stale rows, and clear the cache on sign-out. Auth gains `signInWithOAuth`; the invite allowlist is dropped via a versioned SQL migration; the combined Login screen is split into a Welcome screen with distinct sign-in / create-account paths.

**Tech Stack:** React 18 + Vite, React Router 6, Zustand 5, Supabase (Postgres + Auth), plain-Node test scripts in `tests/` (no test framework — a hand-rolled `assert(cond, msg)` helper, run with `node tests/<file>.js`).

## Global Constraints

Copied verbatim from the spec and CLAUDE.md — every task implicitly includes these:

- **NEVER** commit `.env.local`. **NEVER** put the Supabase `service_role` key in app code (anon key only).
- **ALL data writes go through SyncService** (via store actions). Never write to `Database.js` directly from a screen.
- **Do not rewrite `Database.js`.** Adding one *additive* method (`reloadFromStorage`) that preserves its synchronous API is permitted; changing existing methods is not.
- **Don't change the Supabase schema without a versioned migration** (a new file under `supabase/migrations/`).
- Use **real theme variables only**: `--bg-surface, --bg-surface-2, --txt-strong, --txt-muted, --txt-body, --hairline, --rust, --moss, --ochre, --shadow-sm, --shadow-md`. NEVER `--card-bg, --border, --accent-bg`.
- The app **must run** (`npm run dev`) at the end of every change.
- Base path is `/hybrid-react/`; redirects use `window.location.origin + import.meta.env.BASE_URL`.
- Account linking (one person via both Google and Apple) is **out of scope**.

## Test conventions (read before Task 1)

- Tests are plain Node ESM files in `tests/`, run individually: `node tests/<name>.js`. They import directly from `src/lib/...` and use:
  ```js
  function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
    else console.log('PASS:', msg);
  }
  ```
- Node has **no `localStorage`**. Any test that touches `Storage.js`/`Database.js` must install a shim **before** importing them. Use this exact shim at the top of such test files:
  ```js
  // Minimal localStorage shim for Node (must run before importing Storage/Database)
  const _ls = {};
  globalThis.localStorage = {
    getItem: (k) => (k in _ls ? _ls[k] : null),
    setItem: (k, v) => { _ls[k] = String(v); },
    removeItem: (k) => { delete _ls[k]; },
    clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
  };
  ```
- Because `Database.js` runs boot code on import (writes default user/plan to whatever namespace is current), Storage-only tests should import **only** `Storage.js`.

## File structure (what changes and why)

| File | Change | Responsibility |
|------|--------|----------------|
| `src/lib/Storage.js` | Modify | Add per-user namespacing: `setNamespace`, `getNamespace`, namespace-aware `load/save/remove`, `clearNamespace`, one-time `migrateUnnamespacedKeysOnce`, `adoptAnonDataOnce`. |
| `src/lib/Database.js` | Modify (additive) | Add `services.reloadFromStorage()` to re-read all in-memory tables from the current namespace. |
| `src/lib/SyncService.js` | Modify | Harden `pullFromSupabase` with a pure `pullTablesToReplace` helper so one failed table can't abort the whole replace. Export the helper for testing. |
| `src/stores/authStore.js` | Modify | Apply namespace on every auth-state resolution; clear cache + reset to `anon` on sign-out; add `signInWithOAuth(provider)`; drop the allowlist error-translation in `signUp`. |
| `src/screens/auth/AuthFlow.jsx` | Create | Container holding auth sub-screen state; replaces `<Login/>` in `App.jsx`. |
| `src/screens/auth/Welcome.jsx` | Create | Landing screen: Apple/Google buttons + Sign in / Create account choices. |
| `src/screens/auth/SignIn.jsx` | Create | Email + password sign-in; keeps Forgot-password and OTP-code paths. |
| `src/screens/auth/CreateAccount.jsx` | Create | Name + email + password account creation → onboarding. |
| `src/screens/auth/authShell.js` | Create | Shared styles/`Shell` chrome reused by the auth screens (extracted from `Login.jsx`). |
| `src/screens/Login.jsx` | Delete (after AuthFlow lands) | Superseded by `auth/` screens. |
| `src/App.jsx` | Modify | Render `<AuthFlow/>` instead of `<Login/>`. |
| `supabase/migrations/004_remove_invite_allowlist.sql` | Create | Versioned migration dropping the allowlist check (keeps profile creation; handles OAuth name fields). |
| `supabase/OAUTH-SETUP.md` | Create | Step-by-step dashboard config for Google + Apple (click-ops only Simon can do). |
| `tests/storage-namespace.js` | Create | Unit tests for namespacing, clear, migration, adopt. |
| `tests/database-reload.js` | Create | Unit test for `reloadFromStorage`. |
| `tests/pull-resilience.js` | Create | Unit test for `pullTablesToReplace`. |

**Task order rationale:** isolation core first (Tasks 1–3, fully unit-tested), then wire it into auth (Task 4, manual two-account test — the primary regression guard), then pull hardening (Task 5), then social + open-signup backend (Tasks 6–7), then the Welcome UI that consumes them (Task 8).

---

### Task 1: Namespace the on-device cache (`Storage.js`)

**Files:**
- Modify: `src/lib/Storage.js`
- Test: `tests/storage-namespace.js` (create)

**Interfaces:**
- Consumes: nothing (pure I/O module).
- Produces:
  - `setNamespace(ns: string): void` — sets the active namespace (default `'anon'`).
  - `getNamespace(): string`
  - `load(baseKey, fallback)`, `save(baseKey, value)`, `remove(baseKey)` — now resolve to `${baseKey}_${namespace}` internally. Same call signatures as today.
  - `clearNamespace(ns: string): void` — removes every table/meta key for `ns`.
  - `migrateUnnamespacedKeysOnce(target: string): void` — device-level one-time move of legacy un-namespaced keys into `target`.
  - `adoptAnonDataOnce(target: string): void` — per-target one-time: if `target` has no table data but `anon` does, copy `anon` table data into `target`.
  - `KEYS` unchanged (values stay as the **base** names, e.g. `'htp_injuries_v4'`).

- [ ] **Step 1: Write the failing test**

Create `tests/storage-namespace.js`:

```js
// Minimal localStorage shim for Node (must run before importing Storage)
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

import * as Storage from '../src/lib/Storage.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// T1: writes land under the active namespace and are isolated per namespace
Storage.setNamespace('userA');
Storage.save(Storage.KEYS.injuries, { i1: { id: 'i1' } });
assert(localStorage.getItem('htp_injuries_v4_userA') !== null, 'T1a writes to namespaced key');
assert(localStorage.getItem('htp_injuries_v4') === null, 'T1b does not write the bare key');

Storage.setNamespace('userB');
assert(Object.keys(Storage.load(Storage.KEYS.injuries, {})).length === 0, 'T2 userB sees no userA injuries');

Storage.setNamespace('userA');
assert(Storage.load(Storage.KEYS.injuries, {}).i1?.id === 'i1', 'T3 userA still has its injury');

// T4: clearNamespace wipes only that namespace
Storage.setNamespace('userB');
Storage.save(Storage.KEYS.sessions, { s1: { id: 's1' } });
Storage.clearNamespace('userB');
assert(Object.keys(Storage.load(Storage.KEYS.sessions, {})).length === 0, 'T4a userB sessions cleared');
Storage.setNamespace('userA');
assert(Storage.load(Storage.KEYS.injuries, {}).i1?.id === 'i1', 'T4b userA untouched by clearing userB');

// T5: migrateUnnamespacedKeysOnce moves bare keys into target, once
localStorage.clear();
localStorage.setItem('htp_injuries_v4', JSON.stringify({ old: { id: 'old' } }));
Storage.setNamespace('userC');
Storage.migrateUnnamespacedKeysOnce('userC');
assert(Storage.load(Storage.KEYS.injuries, {}).old?.id === 'old', 'T5a legacy data moved into userC');
assert(localStorage.getItem('htp_injuries_v4') === null, 'T5b bare key removed after migration');
// running again is a no-op (flag set) — seed a new bare key and confirm it is NOT moved
localStorage.setItem('htp_injuries_v4', JSON.stringify({ second: { id: 'second' } }));
Storage.migrateUnnamespacedKeysOnce('userC');
assert(localStorage.getItem('htp_injuries_v4') !== null, 'T5c second run is a no-op');

// T6: adoptAnonDataOnce copies anon table data into an empty target, once
localStorage.clear();
Storage.setNamespace('anon');
Storage.save(Storage.KEYS.injuries, { a1: { id: 'a1' } });
Storage.setNamespace('userD');
Storage.adoptAnonDataOnce('userD');
assert(Storage.load(Storage.KEYS.injuries, {}).a1?.id === 'a1', 'T6a anon data adopted into empty userD');
// does not overwrite a target that already has data
Storage.setNamespace('userE');
Storage.save(Storage.KEYS.injuries, { e1: { id: 'e1' } });
Storage.adoptAnonDataOnce('userE');
assert(Storage.load(Storage.KEYS.injuries, {}).e1?.id === 'e1', 'T6b non-empty target not overwritten');
assert(!Storage.load(Storage.KEYS.injuries, {}).a1, 'T6c userE keeps only its own data');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/storage-namespace.js`
Expected: FAIL — `setNamespace is not a function` (or similar), since the API doesn't exist yet.

- [ ] **Step 3: Implement namespacing in `src/lib/Storage.js`**

Replace the body of `src/lib/Storage.js` below the `KEYS` export with:

```js
// ---- Namespacing ----------------------------------------------------------
// Every cache key is stored as `${baseKey}_${namespace}` so two accounts on the
// same browser use physically separate storage and can never read each other's
// data. `anon` is the namespace used while signed out / in local-only mode.
let currentNamespace = 'anon';

const NS_MIGRATED_FLAG = 'htp_ns_migrated';          // device-level, NOT namespaced
const adoptedFlag = (ns) => `htp_adopted_${ns}`;      // per-target, NOT namespaced

// Base keys that hold table/meta data and therefore get namespaced + migrated.
const ALL_BASE_KEYS = Object.values(KEYS);
// Just the per-user table caches (used by adoptAnonDataOnce's "is target empty?").
const TABLE_BASE_KEYS = [
  KEYS.users, KEYS.plans, KEYS.phases, KEYS.weeks, KEYS.sessions, KEYS.sessionLogs,
  KEYS.weeklyCheckins, KEYS.reassessments, KEYS.wearableReadings, KEYS.dailyMetrics,
  KEYS.injuries, KEYS.aiRecommendations
];

const nsKey = (baseKey) => `${baseKey}_${currentNamespace}`;

export function setNamespace(ns) { currentNamespace = ns || 'anon'; }
export function getNamespace() { return currentNamespace; }

export function load(k, fb) {
  try {
    const r = localStorage.getItem(nsKey(k));
    return r ? JSON.parse(r) : fb;
  } catch (e) {
    return fb;
  }
}

export function save(k, v) {
  try {
    localStorage.setItem(nsKey(k), JSON.stringify(v));
    return true;
  } catch (e) {
    alert('Storage unavailable');
    return false;
  }
}

export function remove(k) {
  try {
    localStorage.removeItem(nsKey(k));
  } catch (e) { /* swallow */ }
}

// Remove every table/meta key for a namespace (used on sign-out).
export function clearNamespace(ns) {
  for (const base of ALL_BASE_KEYS) {
    try { localStorage.removeItem(`${base}_${ns}`); } catch (e) { /* swallow */ }
  }
}

// One-time per device: move any pre-namespacing bare keys (`htp_*_v4`) into the
// given target namespace, so an existing single-user device keeps its history.
export function migrateUnnamespacedKeysOnce(target) {
  try {
    if (localStorage.getItem(NS_MIGRATED_FLAG)) return;
    for (const base of ALL_BASE_KEYS) {
      const bare = localStorage.getItem(base);
      if (bare === null) continue;
      const dest = `${base}_${target}`;
      if (localStorage.getItem(dest) === null) localStorage.setItem(dest, bare);
      localStorage.removeItem(base);
    }
    localStorage.setItem(NS_MIGRATED_FLAG, '1');
  } catch (e) { /* swallow */ }
}

// One-time per target user: if the target namespace has no table data yet but the
// anon namespace does, adopt the anon data. Covers "used the app signed-out, then
// signed in" without stranding that data. Never overwrites existing target data.
export function adoptAnonDataOnce(target) {
  try {
    if (target === 'anon') return;
    if (localStorage.getItem(adoptedFlag(target))) return;
    const targetHasData = TABLE_BASE_KEYS.some((base) => {
      const raw = localStorage.getItem(`${base}_${target}`);
      if (!raw) return false;
      try { return Object.keys(JSON.parse(raw) || {}).length > 0; } catch { return false; }
    });
    if (targetHasData) { localStorage.setItem(adoptedFlag(target), '1'); return; }
    for (const base of TABLE_BASE_KEYS) {
      const anon = localStorage.getItem(`${base}_anon`);
      if (anon !== null) localStorage.setItem(`${base}_${target}`, anon);
    }
    localStorage.setItem(adoptedFlag(target), '1');
  } catch (e) { /* swallow */ }
}
```

Keep the existing `KEYS` export and the default export, but update the default export to include the new functions:

```js
export default { KEYS, load, save, remove, setNamespace, getNamespace, clearNamespace, migrateUnnamespacedKeysOnce, adoptAnonDataOnce };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/storage-namespace.js`
Expected: all `PASS:` lines, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/Storage.js tests/storage-namespace.js
git commit -m "feat(storage): namespace localStorage cache per user to prevent cross-account bleed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Reload the in-memory Database cache on namespace change (`Database.js`)

**Why:** `Database.js` reads every table into an in-memory `tables` object **once at import**. Switching namespace in `Storage` has no effect until `Database` re-reads. This task adds that re-read.

**Files:**
- Modify: `src/lib/Database.js` (additive method only)
- Test: `tests/database-reload.js` (create)

**Interfaces:**
- Consumes: `Storage.setNamespace`, `Storage.load`, `Storage.KEYS` (from Task 1).
- Produces: `Database.services.reloadFromStorage(): void` — re-reads all in-memory tables + `appMeta` from the current namespace, re-ensures the default user/plan, and notifies subscribers.

- [ ] **Step 1: Write the failing test**

Create `tests/database-reload.js`:

```js
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

import Database from '../src/lib/Database.js';
import * as Storage from '../src/lib/Storage.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Seed injuries directly into userX's namespace, then reload and read them back.
Storage.setNamespace('userX');
Storage.save(Storage.KEYS.injuries, { ix: { id: 'ix', body_part: 'knee' } });
Database.services.reloadFromStorage();
assert(Database.tables.injuries.get('ix')?.body_part === 'knee', 'T1 reload picks up userX injuries');

// Switch to a different namespace with no injuries → reload should show none.
Storage.setNamespace('userY');
Database.services.reloadFromStorage();
assert(!Database.tables.injuries.get('ix'), 'T2 reload clears injuries when switching to empty namespace');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/database-reload.js`
Expected: FAIL — `reloadFromStorage is not a function`.

- [ ] **Step 3: Add the method to `src/lib/Database.js`**

In the `services` object (near `resetAll` / `clearTrainingData`, around line 728+), add:

```js
  // Re-read all in-memory tables from the CURRENT Storage namespace. Called by
  // authStore whenever the signed-in user changes, so the cache served to the UI
  // always belongs to the active account. Additive — does not change any existing
  // method's behaviour or signature.
  reloadFromStorage() {
    Object.keys(tables).forEach((t) => {
      tables[t] = Storage.load(Storage.KEYS[t], {});
    });
    const m = Storage.load(Storage.KEYS.appMeta, { version: null, migrated_from_v3: false });
    appMeta.version = m.version;
    appMeta.migrated_from_v3 = m.migrated_from_v3;
    ensureDefaultUserAndPlan();
    notify();
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/database-reload.js`
Expected: all `PASS:`, exit code 0.

- [ ] **Step 5: Run the existing data-layer/engine tests to confirm no regression**

Run: `node tests/injury-engine.js`
Expected: all `PASS:` (unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/Database.js tests/database-reload.js
git commit -m "feat(database): add reloadFromStorage to re-read cache on namespace change

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Apply namespace on auth changes + clear on sign-out (`authStore.js`)

**Why:** This is where the namespace actually switches with the user — the fix that stops the injury leak in the running app.

**Files:**
- Modify: `src/stores/authStore.js`
- Manual verification (two-account leak test — no unit test, since this is integration with live Supabase auth).

**Interfaces:**
- Consumes: `Storage.setNamespace/getNamespace/clearNamespace/migrateUnnamespacedKeysOnce/adoptAnonDataOnce` (Task 1), `Database.services.reloadFromStorage` (Task 2).
- Produces: a local helper `applyNamespaceForSession(session)` used by both `init()` and the `onAuthStateChange` callback.

- [ ] **Step 1: Add the namespace helper and imports**

At the top of `src/stores/authStore.js`, alongside the existing `import Database from '../lib/Database.js';`, add:

```js
import * as Storage from '../lib/Storage.js';
```

Then, above `export const useAuthStore = create(...)`, add the helper:

```js
// Point the on-device cache at the right account, then reload the in-memory
// Database so the UI only ever sees the active user's data. Runs on first load
// and on every auth-state change. `session` is null when signed out.
function applyNamespaceForSession(session) {
  const target = session?.user?.id || 'anon';
  Storage.setNamespace(target);
  // One-time per device: fold any pre-namespacing bare keys into this namespace.
  Storage.migrateUnnamespacedKeysOnce(target);
  // One-time per user: adopt anon data if this account has none yet.
  if (session) Storage.adoptAnonDataOnce(target);
  Database.services.reloadFromStorage();
}
```

- [ ] **Step 2: Call the helper from `onAuthStateChange` (inside `init()`)**

In `init()`, the `onAuthStateChange` callback currently sets state then maybe calls `syncAfterSignIn()`. Update it so the namespace is applied **before** the pull. Replace the callback body with:

```js
    supabase.auth.onAuthStateChange((event, session) => {
      applyNamespaceForSession(session);
      set((prev) => ({
        status: session ? 'signed_in' : 'signed_out',
        user: session ? session.user : null,
        linkSentTo: null,
        recoveryMode: event === 'PASSWORD_RECOVERY' ? true : prev.recoveryMode
      }));
      // Pull data on a real sign-in — but not mid password-reset.
      if (session && event === 'SIGNED_IN' && !get().recoveryMode) {
        syncAfterSignIn();
      }
    });
```

- [ ] **Step 3: Call the helper for the initial `getSession()` result**

Still in `init()`, after `const { data } = await supabase.auth.getSession();`, add the namespace call **before** the `set(...)`:

```js
    const { data } = await supabase.auth.getSession();
    applyNamespaceForSession(data.session);
    set((prev) => ({
      status: data.session ? 'signed_in' : 'signed_out',
      user: data.session ? data.session.user : null,
      recoveryMode: prev.recoveryMode
    }));
    if (data.session && !get().recoveryMode) syncAfterSignIn();
```

- [ ] **Step 4: Clear the cache on sign-out**

Replace the body of `signOut()` with:

```js
  async signOut() {
    if (!isSupabaseConfigured) return;
    const ns = Storage.getNamespace();
    await supabase.auth.signOut();
    // Belt-and-braces: wipe this account's on-device cache so nothing lingers
    // before the next sign-in, then point the cache at the anonymous namespace.
    if (ns && ns !== 'anon') Storage.clearNamespace(ns);
    Storage.setNamespace('anon');
    Database.services.reloadFromStorage();
    set({ status: 'signed_out', user: null, linkSentTo: null, recoveryMode: false });
  },
```

- [ ] **Step 5: Verify the app builds and runs**

Run: `npm run dev`
Expected: dev server starts with no errors; open the app, it loads to the sign-in/welcome screen or the app (depending on session).

- [ ] **Step 6: Manual two-account leak test (the primary regression guard)**

Do this in one browser:
1. Sign in as Account A. Log an injury (Progress → Injury log → add one). Confirm it shows as active.
2. Sign out.
3. Sign in as Account B (a different account with no injuries).
4. **Expected:** Account B shows **no** active injuries, no sessions, no metrics from A.
5. Sign back in as Account A. **Expected:** A's injury is still there.

Record the result in the commit message.

- [ ] **Step 7: Commit**

```bash
git add src/stores/authStore.js
git commit -m "fix(auth): switch cache namespace per user + clear on sign-out (fixes injury cross-account leak)

Verified: injury logged in account A no longer appears in account B on the same browser.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Harden the sign-in cloud pull (`SyncService.js`)

**Why:** `pullFromSupabase` aborts before any `replaceAll` if a single one of its 8 queries errors, leaving the previous user's rows in the cache. Make the replace resilient per-table.

**Files:**
- Modify: `src/lib/SyncService.js`
- Test: `tests/pull-resilience.js` (create)

**Interfaces:**
- Produces: exported pure helper `pullTablesToReplace(results)` where `results` is `{ [tableKey]: { error } | null }` and the return is the array of `tableKey`s whose data should be replaced (those with no error). Used by `pullFromSupabase`.

- [ ] **Step 1: Write the failing test**

Create `tests/pull-resilience.js`:

```js
import { pullTablesToReplace } from '../src/lib/SyncService.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const results = {
  plans:     { error: null },
  sessions:  { error: { message: 'network blip' } }, // failed
  injuries:  { error: null },
  metrics:   null                                     // treated as fetched-empty (no error)
};

const toReplace = pullTablesToReplace(results);
assert(toReplace.includes('plans'), 'T1 clean table is replaced');
assert(toReplace.includes('injuries'), 'T2 clean injuries table is replaced');
assert(!toReplace.includes('sessions'), 'T3 errored table is NOT replaced (no stale-clear, no crash)');
assert(toReplace.includes('metrics'), 'T4 null-result table is replaced');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/pull-resilience.js`
Expected: FAIL — `pullTablesToReplace is not a function`.

- [ ] **Step 3: Add the helper and use it in `pullFromSupabase`**

In `src/lib/SyncService.js`, add the exported helper near the top (after `logError`):

```js
// Decide which tables to replace after a cloud pull. A table whose query errored
// is skipped (we keep whatever is cached rather than blanking it), so one failed
// query can never strand the previous account's rows for the others.
export function pullTablesToReplace(results) {
  return Object.keys(results).filter((key) => !(results[key] && results[key].error));
}
```

Then rework the replace section of `pullFromSupabase` (currently the all-or-nothing block around lines 204–222). Replace from the `// Check for errors` comment through the final `Database.tables.injuries.replaceAll(...)` with:

```js
    const resultsByTable = {
      users: usersRes, plans: plansRes, sessions: sessionsRes, sessionLogs: logsRes,
      weeklyCheckins: checkinsRes, reassessments: reassessRes, dailyMetrics: dailyRes,
      injuries: injuriesRes
    };

    // Log any per-table errors but do NOT abort — replace every table that came
    // back cleanly so a single failure can't leave another account's rows behind.
    Object.entries(resultsByTable).forEach(([key, res]) => {
      if (res && res.error) logError(`pullFromSupabase:${key}`, res.error);
    });

    const replaceable = pullTablesToReplace(resultsByTable);

    // users: only replace if we actually got the signed-in user's row (never blank
    // out the active profile on a transient empty/errored fetch).
    if (replaceable.includes('users') && usersRes.data?.length) {
      Database.tables.users.replaceAll(usersRes.data);
    }
    if (replaceable.includes('plans'))          Database.tables.plans.replaceAll(plansRes.data || []);
    if (replaceable.includes('sessions'))       Database.tables.sessions.replaceAll(sessionsRes.data || []);
    if (replaceable.includes('sessionLogs'))    Database.tables.sessionLogs.replaceAll(logsRes.data || []);
    if (replaceable.includes('weeklyCheckins')) Database.tables.weeklyCheckins.replaceAll(checkinsRes.data || []);
    if (replaceable.includes('reassessments')) Database.tables.reassessments.replaceAll(reassessRes.data || []);
    if (replaceable.includes('dailyMetrics'))   Database.tables.dailyMetrics.replaceAll(dailyRes.data || []);
    if (replaceable.includes('injuries'))       Database.tables.injuries.replaceAll(injuriesRes.data || []);

    const failed = Object.keys(resultsByTable).filter((k) => !replaceable.includes(k));
    return { ok: failed.length === 0, failed };
```

Remove the old early-return-on-error block and the old unconditional `replaceAll` lines so they are not duplicated.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/pull-resilience.js`
Expected: all `PASS:`, exit code 0.

- [ ] **Step 5: Verify the app still runs**

Run: `npm run dev`
Expected: starts cleanly; signing in still pulls data (check a known account shows its sessions).

- [ ] **Step 6: Commit**

```bash
git add src/lib/SyncService.js tests/pull-resilience.js
git commit -m "fix(sync): replace cloud-pull tables independently so one failed query can't strand stale rows

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Audit `wearable_readings` and confirm whole-table isolation

**Why:** The spec flags that `wearable_readings` is **not** in `pullFromSupabase`'s fetch list. Confirm whether it is live or legacy and act accordingly.

**Files:**
- Modify (only if live): `src/lib/SyncService.js`
- Modify (documentation): `docs/SCHEMA.md` or an inline code comment recording the decision.

**Interfaces:** none new.

- [ ] **Step 1: Determine if `wearable_readings` is live**

Run: `grep -rn "wearableReadings\|wearable_readings" src/`
Decide:
- If **no screen/store reads `wearableReadings`** (only `daily_metrics` is used for wearable data), it is **legacy** → document and stop.
- If something **does** read it, it is **live** → add it to the pull (Step 2).

- [ ] **Step 2a (legacy path): Document and stop**

Add a one-line comment above the `Promise.all` in `pullFromSupabase`:

```js
    // NOTE: wearable_readings is intentionally NOT pulled — wearable data flows
    // through daily_metrics. wearable_readings is legacy/unused on the client.
```

- [ ] **Step 2b (live path): Add it to the pull**

If live, add `supabase.from('wearable_readings').select('*').eq('user_id', userId).is('deleted_at', null)` to the `Promise.all`, destructure its result, add it to `resultsByTable` as `wearableReadings`, and add `if (replaceable.includes('wearableReadings')) Database.tables.wearableReadings.replaceAll(...)`. (Mirror the existing per-table pattern from Task 4.)

- [ ] **Step 3: Spot-check the other tables write `user_id`**

Run: `grep -n "clean(" src/lib/SyncService.js`
Confirm each `upsert` passes `clean(record, userId)` (which forces `user_id`). This is a read-only audit; note findings in the commit message.

- [ ] **Step 4: Verify the app runs**

Run: `npm run dev`
Expected: starts cleanly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(sync): audit wearable_readings + confirm per-user isolation across all tables

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Remove the invite allowlist (versioned migration + app cleanup)

**Files:**
- Create: `supabase/migrations/004_remove_invite_allowlist.sql`
- Modify: `src/stores/authStore.js` (`signUp` error translation)
- Modify: `src/screens/auth/CreateAccount.jsx` copy — deferred to Task 8 (screen doesn't exist yet); for now just update `Login.jsx`'s sub-text is **not** required since Login is replaced in Task 8. Skip UI copy here.

**Interfaces:** none.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/004_remove_invite_allowlist.sql`:

```sql
-- ============================================================================
-- Migration 004: remove the invite allowlist
-- ============================================================================
-- Opens signup to anyone, on any method (email / Google / Apple). Redefines
-- handle_new_user() to drop the allowlist check while KEEPING profile creation,
-- and broadens the name source so OAuth providers (which use full_name) populate
-- the profile name too. The allowed_emails table is left in place (harmless,
-- now unused) so this migration is reversible by restoring the old function.
-- ============================================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition is unchanged; re-assert it for safety.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Apply the migration in Supabase**

Manual (Simon): open Supabase dashboard → SQL Editor → paste `004_remove_invite_allowlist.sql` → Run. Confirm "Success".

- [ ] **Step 3: Drop the allowlist error translation in `signUp`**

In `src/stores/authStore.js`, in `signUp`, replace the error block:

```js
    if (error) {
      // The allowlist rejection surfaces as a 500 "Database error saving new user".
      const msg = /database error/i.test(error.message)
        ? "This email isn't on the invite list yet. Ask Simon to add you."
        : error.message;
      if (/database error/i.test(error.message)) console.warn('[authStore] signUp DB error:', error.message);
      set({ signingUp: false, errorMessage: msg });
      return;
    }
```

with:

```js
    if (error) {
      set({ signingUp: false, errorMessage: error.message });
      return;
    }
```

- [ ] **Step 4: Verify the app runs and a brand-new email can sign up**

Run: `npm run dev`
Manual: create an account with an email that is NOT in `allowed_emails`. Expected: account is created (goes to confirm-email or straight into onboarding, per Supabase email-confirmation setting) — no "ask Simon" error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/004_remove_invite_allowlist.sql src/stores/authStore.js
git commit -m "feat(auth): remove invite allowlist so anyone can sign up (any method)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Add `signInWithOAuth` + Supabase OAuth setup doc

**Files:**
- Modify: `src/stores/authStore.js`
- Create: `supabase/OAUTH-SETUP.md`

**Interfaces:**
- Produces: `authStore.signInWithOAuth(provider: 'google' | 'apple'): Promise<void>` — starts the OAuth redirect; the existing `detectSessionInUrl` client option completes it on return, and `onAuthStateChange` (Task 3) handles namespace + sync.

- [ ] **Step 1: Add the action to `authStore.js`**

After `signInWithPassword`, add:

```js
  // Start an OAuth sign-in (Google or Apple). Redirects away and returns to the
  // app; supabaseClient's detectSessionInUrl finishes the session, and the
  // onAuthStateChange listener applies the namespace + pulls data.
  async signInWithOAuth(provider) {
    if (!isSupabaseConfigured) {
      set({ errorMessage: 'Supabase is not configured. Add keys to .env.local.' });
      return;
    }
    set({ errorMessage: null });
    const redirectTo = window.location.origin + import.meta.env.BASE_URL;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) set({ errorMessage: error.message });
  },
```

- [ ] **Step 2: Write the setup doc**

Create `supabase/OAUTH-SETUP.md`:

```markdown
# OAuth setup — Google & Apple (Supabase)

These are dashboard/click-ops steps. Do them once per provider. The app code
already calls `supabase.auth.signInWithOAuth({ provider })`.

## Redirect URLs (needed by both providers)
- Supabase callback: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- App return URLs (Supabase → Authentication → URL Configuration → Redirect URLs):
  - `https://<your-gh-username>.github.io/hybrid-react/`
  - `http://localhost:5173/hybrid-react/` (local dev)

## Google
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
   → Web application.
2. Authorized redirect URI: the Supabase callback URL above.
3. Copy the Client ID + Client Secret.
4. Supabase → Authentication → Providers → Google → enable, paste ID + Secret → Save.

## Apple
1. Requires an Apple Developer account.
2. Create an App ID, then a Services ID (this is your OAuth client_id).
3. Configure the Services ID "Sign in with Apple": add the Supabase callback URL
   as a Return URL and your domain as the website.
4. Create a Sign in with Apple private key (.p8); note the Key ID and Team ID.
5. Supabase → Authentication → Providers → Apple → enable; fill Services ID,
   Team ID, Key ID, and the .p8 key contents → Save.

## Verify
- Local: `npm run dev`, click "Continue with Google" / "Continue with Apple",
  complete the provider flow, land back in the app signed in (new accounts land
  in onboarding).
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run dev`
Expected: starts cleanly. (Buttons get wired in Task 8; the action exists now.)

- [ ] **Step 4: Commit**

```bash
git add src/stores/authStore.js supabase/OAUTH-SETUP.md
git commit -m "feat(auth): add signInWithOAuth + Google/Apple Supabase setup doc

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Welcome screen + auth flow restructure (UI)

**Why:** Replace the single combined Login screen with a Welcome landing screen offering two clear paths plus social buttons, routing create-account into the existing onboarding wizard.

**Files:**
- Create: `src/screens/auth/authShell.js` (shared styles + `Shell`)
- Create: `src/screens/auth/Welcome.jsx`
- Create: `src/screens/auth/SignIn.jsx` (email sign-in; keeps forgot-password + OTP)
- Create: `src/screens/auth/CreateAccount.jsx` (name + email + password)
- Create: `src/screens/auth/AuthFlow.jsx` (container holding screen state)
- Modify: `src/App.jsx` (render `<AuthFlow/>` instead of `<Login/>`)
- Delete: `src/screens/Login.jsx`

**Interfaces:**
- `AuthFlow` consumes `authStore` actions: `signUp, signInWithPassword, sendPasswordReset, signInWithEmail, verifyOtp, resetLinkSent, signInWithOAuth` (Task 7).
- Screen-state machine: `'welcome' | 'signin' | 'create'` (forgot-password + OTP remain sub-states inside `SignIn`, preserving today's behaviour).

- [ ] **Step 1: Extract shared chrome into `authShell.js`**

Create `src/screens/auth/authShell.js` with the style constants (`INPUT`, `BTN_PRIMARY`, `BTN_GHOST`, `LINK_BTN`, `NOTICE`) and the `Shell` component currently at the top and bottom of `src/screens/Login.jsx` (copy them verbatim; export each). Add one social-button style:

```js
export const BTN_SOCIAL = {
  width: '100%', padding: 14, borderRadius: 12, marginBottom: 12,
  border: '1px solid var(--hairline)', background: 'var(--bg-surface)',
  color: 'var(--txt-strong)', fontSize: 15, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 10
};
```

- [ ] **Step 2: Build `Welcome.jsx`**

Create `src/screens/auth/Welcome.jsx`. Props: `onSignIn`, `onCreate`. Uses `authStore.signInWithOAuth`.

```jsx
import { useAuthStore } from '../../stores/authStore.js';
import { Shell, BTN_PRIMARY, BTN_GHOST, BTN_SOCIAL } from './authShell.js';

export default function Welcome({ onSignIn, onCreate }) {
  const signInWithOAuth = useAuthStore(s => s.signInWithOAuth);
  const errorMessage = useAuthStore(s => s.errorMessage);
  return (
    <Shell heading="Welcome" sub="Train smarter. Sign in or create your account to get started.">
      <button style={BTN_SOCIAL} onClick={() => signInWithOAuth('apple')}> Continue with Apple</button>
      <button style={BTN_SOCIAL} onClick={() => signInWithOAuth('google')}>Continue with Google</button>
      <div style={{ height: 8 }} />
      <button style={BTN_PRIMARY(true)} onClick={onCreate}>Create account</button>
      <button style={BTN_GHOST} onClick={onSignIn}>Sign in</button>
      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </Shell>
  );
}
```

- [ ] **Step 3: Build `CreateAccount.jsx`**

Create `src/screens/auth/CreateAccount.jsx`. Props: `onBack`. Lifts the create-account form fields (name, email, password) and validation from `Login.jsx`. On success the existing `App.jsx` routing sends the user to onboarding. Copy reflects open signup (no "invite-only" text):

```jsx
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { Shell, INPUT, BTN_PRIMARY, BTN_GHOST } from './authShell.js';

export default function CreateAccount({ onBack }) {
  const signUp = useAuthStore(s => s.signUp);
  const signingUp = useAuthStore(s => s.signingUp);
  const errorMessage = useAuthStore(s => s.errorMessage);
  const confirmEmailSent = useAuthStore(s => s.confirmEmailSent);
  const resetLinkSent = useAuthStore(s => s.resetLinkSent);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const validPassword = password.length >= 6;
  const validName = name.trim().length > 0;
  const canSignUp = validName && validEmail && validPassword && !signingUp;
  const submit = () => { if (canSignUp) signUp(email, password, name); };

  if (confirmEmailSent) {
    return (
      <Shell heading="Check your email"
             sub={`We sent a confirmation link to ${confirmEmailSent}. Click it to finish creating your account, then come back and sign in.`}>
        <button onClick={() => { resetLinkSent(); onBack(); }} style={BTN_GHOST}>Back</button>
      </Shell>
    );
  }

  return (
    <Shell heading="Create your account" sub="Set up your account to start building your plan.">
      <input type="text" autoCapitalize="words" placeholder="Your name" value={name}
        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
        placeholder="you@example.com" value={email}
        onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <input type="password" autoComplete="new-password"
        placeholder="Choose a password (min 6 characters)" value={password}
        onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={INPUT} />
      <button onClick={submit} disabled={!canSignUp} style={BTN_PRIMARY(canSignUp)}>
        {signingUp ? 'Creating…' : 'Create account'}
      </button>
      <button onClick={onBack} style={BTN_GHOST}>Back</button>
      {errorMessage && <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 14 }}>{errorMessage}</p>}
    </Shell>
  );
}
```

- [ ] **Step 4: Build `SignIn.jsx`**

Create `src/screens/auth/SignIn.jsx`. Props: `onBack`. Move the email+password sign-in form **and** the forgot-password and OTP-code sub-states out of `Login.jsx` verbatim (the `forgot` and `otpMode` blocks), keeping their behaviour. Add a `Back` button (calls `onBack`) to the main sign-in view. Import styles/`Shell` from `./authShell.js`. (Reuse the existing field/validation/handler logic from `Login.jsx` unchanged — only the import paths and the addition of `onBack` differ.)

- [ ] **Step 5: Build `AuthFlow.jsx`**

Create `src/screens/auth/AuthFlow.jsx`:

```jsx
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import Welcome from './Welcome.jsx';
import SignIn from './SignIn.jsx';
import CreateAccount from './CreateAccount.jsx';

export default function AuthFlow() {
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'signin' | 'create'
  const clearError = () => useAuthStore.setState({ errorMessage: null });
  const go = (s) => { clearError(); setScreen(s); };

  if (screen === 'signin') return <SignIn onBack={() => go('welcome')} />;
  if (screen === 'create') return <CreateAccount onBack={() => go('welcome')} />;
  return <Welcome onSignIn={() => go('signin')} onCreate={() => go('create')} />;
}
```

- [ ] **Step 6: Swap the screen in `App.jsx`**

In `src/App.jsx`, replace the import `import Login from './screens/Login.jsx';` with `import AuthFlow from './screens/auth/AuthFlow.jsx';`, and replace the `return <Login />;` line (the `signed_out`/`not_configured` branch) with `return <AuthFlow />;`.

- [ ] **Step 7: Delete the old Login screen**

```bash
git rm src/screens/Login.jsx
```

- [ ] **Step 8: Verify the full flow**

Run: `npm run dev`. Check each path:
- Welcome shows Apple + Google + Create account + Sign in.
- **Create account** (new email) → confirm-email or onboarding wizard.
- **Sign in** (existing) → app; "Forgot password?" and "Email me a code" still work.
- **Google/Apple** buttons start the provider flow (assuming Task 7 dashboard setup is done; otherwise they surface a provider-not-enabled error, which is expected until configured).
- Theme: toggle dark/auto in Settings → auth screens use real theme vars, no broken colours.

- [ ] **Step 9: Commit**

```bash
git add src/screens/auth src/App.jsx
git commit -m "feat(auth): Welcome screen with sign-in / create-account paths + social buttons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Run every test: `node tests/storage-namespace.js && node tests/database-reload.js && node tests/pull-resilience.js && node tests/injury-engine.js` — all `PASS:`.
- [ ] `npm run dev` runs clean.
- [ ] Re-run the two-account leak test (Task 3, Step 6) end-to-end — Account B sees none of Account A's data.
- [ ] New email account can sign up without an invite.
- [ ] (Once OAuth dashboard setup is done) Google + Apple sign-in each reach onboarding for a new account and the app for a returning one.
- [ ] Review every diff before the final push; do not push unless asked.

## Known limitations (intentionally out of scope)

- **Account linking** (same person via Google and Apple) is not implemented — they create separate accounts, by design.
- **Anon→cloud (Session D)** for a user who used the app signed-out then created their *first* account is partially covered by `adoptAnonDataOnce` (data is preserved locally under their namespace) but the existing Session D cloud-push remains as-is; this matches the pre-existing "Session D not done" state in CLAUDE.md and is not expanded here.
