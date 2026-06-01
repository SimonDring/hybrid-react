# Stage 3 Runbook — Supabase backend + auth

Four sessions. Each ends with the app still working. Do them in order.

---

## Session A — Project + schema  (you are here)

**Goal:** a live cloud database with all tables and security. App unchanged.

1. Create Supabase account → https://supabase.com → sign in with GitHub.
2. New project:
   - Name: `hybrid-training`
   - Database password: generate one, SAVE IT
   - Region: West EU (Ireland/London) — closest to you
   - Plan: Free
3. Wait for provisioning (1–3 min).
4. Project Settings (gear) → API. Copy and SAVE:
   - Project URL  (https://xxxx.supabase.co)
   - anon public key
   - (NEVER use the service_role key in the app)
5. Run the schema:
   - Left sidebar → SQL Editor → New query
   - Open `supabase/schema.sql`, copy ALL of it, paste, click **Run**
   - Should say "Success. No rows returned"
6. Verify: Table Editor (left sidebar) → you should see all 12 tables.

**Done when:** 12 tables visible, no SQL errors. Your app still runs on localStorage — nothing wired yet.

---

## Session B — Auth

**Goal:** you can sign in. App still reads localStorage.

1. Put your keys in the app:
   - Copy `.env.local.example` to `.env.local`
   - Paste your real Project URL + anon key
   - Restart `npm run dev`
2. Install the client lib (already in package.json after this stage, else):
   - `npm install @supabase/supabase-js`
3. In Supabase: Authentication → Providers → enable Email (magic link).
   Apple sign-in can be added later (needs Apple Developer setup).
4. (Claude builds) A login screen + auth state in the app.
5. Test: sign in by email magic link, confirm you land logged in.

**Done when:** you can log in and the app knows who you are.

---

## Session C — Sync layer

**Goal:** data reads/writes Supabase when online, localStorage as cache.

1. (Claude builds) A Supabase-backed implementation behind the existing
   Database.js facade — same `tables`/`services` API, cloud underneath.
2. Offline-first: writes go to localStorage immediately + queue to Supabase;
   reads prefer cache then reconcile.
3. Test: create data on Mac, see it appear on phone after sign-in.

**Done when:** data syncs across devices.

---

## Session D — Migration + cutover

**Goal:** existing localStorage data lives in Supabase; cloud is source of truth.

1. (Claude builds) A one-time migration: push existing local rows to Supabase.
2. Verify counts match.
3. Flip the default source to Supabase; keep localStorage as offline cache.

**Done when:** your real data is in the cloud and syncing.

---

## Safety rules throughout

- The app must keep working at the end of every session.
- localStorage is not deleted until Session D verifies Supabase has the data.
- Never commit `.env.local` (it's gitignored).
- Never put the service_role key in the app.
- Tag a git milestone after each session: `git tag stage3-sessionA -m "..."`.
