# Auth overhaul, social login & per-user data isolation — Design

**Date:** 2026-06-18
**Status:** Approved for planning
**Author:** Simon + Claude

## Background

The app currently has email + password auth (plus OTP-code sign-in and password
reset), gated by a server-side invite allowlist. Sign-in and create-account
share one screen with a toggle; after sign-in, a user with no plan is routed to
the onboarding wizard.

Three problems drive this work:

1. **A real data leak.** An injury logged under one account showed as *active*
   under a different account. The cloud layer is correctly user-scoped (every
   table has `user_id` + Row Level Security `auth.uid() = user_id`), so the leak
   is in the **on-device cache**, not Supabase.
2. **No social login.** The roadmap wants Apple/Google sign-in; we want it in the
   PWA now (it carries over to the future native app).
3. **The create-account → onboarding handoff is implicit**, not a deliberate
   "make your account, now let's set you up" experience.

## Goals

1. A **Welcome screen** with two clear paths (sign in / create account) plus
   "Continue with Apple" and "Continue with Google".
2. Creating an account flows cleanly into the **existing** onboarding wizard;
   returning sign-in goes straight to the app.
3. **Apple + Google sign-in** working in the PWA via Supabase OAuth.
4. **Anyone can sign up** — the invite allowlist is removed.
5. **Every user's on-device data is physically isolated** — the injury leak, and
   any sibling leaks, made impossible by construction.

## Non-goals (deferred)

- Native Apple Sign-In via native iOS APIs (remains Stage 6).
- **Account linking** (same person via Google *and* Apple resolving to one
  account). Explicitly out of scope. Supabase can do this later.
- Rewriting the onboarding wizard itself — it stays as-is.

---

## Part A — Per-user data isolation (highest priority)

### Root cause

The on-device cache (`localStorage`, via `src/lib/Storage.js`) uses one global
set of keys (e.g. `htp_injuries_v4`) shared by everyone who uses that browser:

- `signOut()` in `authStore.js` never clears the cache.
- `pullFromSupabase()` in `SyncService.js` is meant to overwrite the cache on
  sign-in, but it runs 8 table queries in `Promise.all` and, if **any** one
  errors, returns early **before** the `replaceAll` calls — leaving the previous
  user's rows in the cache while the new user is signed in. This matches the
  observed injury leak exactly.

The injury read/write path itself is correct (writes `user_id`, pulls filtered by
`user_id`, replaces on sign-in). Injuries were simply the table that surfaced the
shared-cache bug first.

### Fix — belt-and-braces

**1. Namespace every cache key by user id.**
Cache keys become `htp_<table>_v4_<namespace>`, where `<namespace>` is the
signed-in user's `auth.uid()`, or the literal `anon` when signed out / in
local-only mode. Two accounts then use physically separate keys and cannot read
each other's data.

- `Storage.js` gains a module-level current namespace and `setNamespace(ns)`.
  Key resolution happens **at call-time** (not cached at import), because the
  namespace changes on sign-in/out without a page reload.
- The auth listener in `authStore.js` calls `setNamespace(user.id)` on sign-in
  and `setNamespace('anon')` on sign-out, **before** the cloud pull runs.
- `Database.js` is **not** rewritten — it already reads/writes through Storage,
  so namespacing is transparent to it (honours the "don't rewrite Database.js"
  rule).
- **Migration of existing keys:** on first run after this change, if old
  un-namespaced keys (`htp_*_v4`) exist and the user is signed in, move them into
  that user's namespace once; if signed out, move them into `anon`. This avoids
  wiping the current device's real history. One-time, guarded by a meta flag.

**2. Clear the cache on sign-out.**
`signOut()` clears the current namespace's cache keys (so nothing lingers
visually before the next sign-in) and resets the namespace to `anon`. Cloud data
is untouched — it re-pulls on next sign-in.

**3. Harden the cloud pull.**
`pullFromSupabase()` no longer aborts the whole replace if one table errors.
Each table's `replaceAll` runs independently for tables that returned cleanly;
errors are logged per-table. A user must never inherit stale rows because an
unrelated table hiccuped. (The signed-in user's own `users` row is still never
blanked.)

**4. Audit all tables end-to-end.**
For each of these, confirm: writes set `user_id`; sign-in pull filters by
`user_id`; sign-in replaces the local cache:

- `sessions`, `session_logs`, `weekly_checkins`, `reassessments`,
  `daily_metrics`, `injuries`, `training_plans`, `users` (profile).
- **`wearable_readings`** — flagged: it is *not* in the `pullFromSupabase` table
  list today. Confirm whether it is live (and if so, add it to the pull and the
  namespace/clear handling) or legacy (and document it as such). Daily wearable
  data currently flows through `daily_metrics`, which *is* pulled.

### Acceptance (Part A)

- On one browser: log an injury in Account A, sign out, sign into Account B →
  B shows **no** injuries (and no sessions, metrics, etc. from A).
- Force one pull query to fail → the other tables still replace correctly; no
  stale rows from the previous account survive.
- Existing single-user history on the current device is preserved through the
  key-namespacing migration.

---

## Part B — Welcome screen & account → onboarding flow

### Screens

Split the current combined `Login.jsx` into focused screens:

- **Welcome** (new): app wordmark, "Continue with Apple", "Continue with Google",
  an email **Sign in** button and a **Create account** button.
- **Sign in** (email): email + password → app. Preserves "Forgot password?" and
  "Email me a code" (OTP) paths.
- **Create account** (email): name + email + password → on success lands in the
  **existing** onboarding wizard.

### Routing

`App.jsx` already routes a signed-in user with no plan to onboarding via the
`isOnboarded` check (`profile.onboarded`, goals, or name). Keep that logic:

- Email create-account → onboarding wizard (no plan yet).
- Email/returning sign-in → app.
- **Social buttons do both jobs**: a brand-new Apple/Google user has no plan →
  lands in onboarding; a returning one → lands in the app. No special-casing
  needed — routing keys off whether a plan exists.

### Acceptance (Part B)

- Welcome screen presents both paths plus both social buttons.
- New email account → onboarding wizard. Returning email account → app.
- Forgot-password and OTP-code flows still reachable and working.

---

## Part C — Social login + open signup

### Supabase OAuth (Apple + Google)

- Enable **Google** and **Apple** providers in the Supabase dashboard, with
  redirect URLs for the GitHub Pages base path (`/hybrid-react/`) and localhost
  dev. Dashboard/click-ops steps documented in the runbook (only Simon can do
  these; spec/plan will list them explicitly).
- Add `signInWithOAuth({ provider })` to `authStore.js`; wire the two buttons on
  the Welcome screen. OAuth redirect handling reuses the existing
  `detectSessionInUrl` client config.

### Remove the invite allowlist

- Remove the server-side allowlist trigger that rejects non-invited emails, via a
  **versioned migration** (honours the "don't change the schema without a
  versioned migration" rule).
- Remove the "ask Simon to add you" messaging and the related friendly-error
  translation in `signUp`.

### Acceptance (Part C)

- A never-before-seen Google account can sign in and reach onboarding.
- A never-before-seen Apple account can sign in and reach onboarding.
- A new email account (not pre-invited) can be created successfully.

---

## Testing strategy

1. **Two-account leak test** (manual, one browser): the Part A acceptance steps —
   the primary regression guard for the reported bug.
2. **Pull-resilience test**: simulate one failing table query; confirm the others
   still replace and no stale rows survive.
3. **Social smoke test**: Google and Apple sign-in each reach onboarding (new) and
   the app (returning).
4. **Email flows**: create-account → onboarding; sign-in → app; forgot-password;
   OTP code.
5. `npm run dev` runs clean at the end of every step (hard rule).

## Risks & notes

- **Apple OAuth setup** requires an Apple Developer account and correct
  Service ID / redirect config; getting the redirect URL wrong is the most likely
  snag. Documented step-by-step.
- **Namespace migration** must run exactly once and must not wipe the current
  device's real history — guarded by a meta flag and covered by the Part A
  acceptance test.
- Theme variables, RLS (`auth.uid() = user_id`), and the store→Sync→Supabase path
  remain the usual silent-failure suspects — checked first if anything "doesn't
  save".
- All data writes continue to go through SyncService (no direct Database writes
  from screens).
