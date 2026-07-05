# Production Security Deploy — the batched step (needs Simon)

The multi-user hardening (audit addendum in `docs/SECURITY-AUDIT.md`, PRs #109–#113)
is **applied to staging and merged to `main`**, but — per the staging-first discipline —
**production DB migrations and Edge Function deploys are a deliberate step you run and
review**. Nothing here has touched production yet. This is the exact, ordered checklist.

Everything below was proven on staging: `node supabase/tests/rls-harness.mjs` → **57/57**.

## What's pending for production

| Artifact | What it does | Type |
|---|---|---|
| `migrations/20260706_security_hardening.sql` | S2 token-column lockdown, S3 constraints, S6 delete completeness, S9 status guard, S10 search_path | DB migration |
| `migrations/20260707_oauth_state.sql` | S1 OAuth `state` nonce table + `issue`/`consume` RPCs | DB migration |
| `migrations/20260708_player_status_integrity.sql` | S11 server-authoritative injury_status/readiness on the coach board | DB migration |
| `functions/fitbit-auth-callback` | resolves `state` via `consume_oauth_state` (S1) | Edge Function |
| `functions/strava-auth-callback` | resolves `state` via `consume_oauth_state` (S1) | Edge Function |
| `functions/fitbit-sync` | stops logging raw vitals (S4) + 92-day clamp (S8) | Edge Function |

The app (GitHub Pages) is already deployed with the client half of S1 — and it **falls
back to the legacy `state=userId`** whenever `issue_oauth_state` is absent, so wearable
connect keeps working on prod until you run the steps below. Once the migration + the two
callbacks are live together, every new connect flow uses the signed nonce.

## The steps (~5 min)

```bash
cd ~/Code/hybrid-react

# 1. Point the CLI at PRODUCTION (prompts for the June-1st DB password)
supabase link --project-ref ggldomlmycvpwtzzjzcd

# 2. Apply the two new migrations (lists 20260706 + 20260707; confirm)
supabase db push

# 3. Deploy the four Edge Functions (S1 callbacks must go WITH the migration;
#    the two sync functions carry S4/S8)
supabase functions deploy fitbit-auth-callback
supabase functions deploy strava-auth-callback
supabase functions deploy fitbit-sync
#    (strava-sync unchanged this round — no redeploy needed)

# 4. Re-point the CLI back at STAGING (the safe default)
supabase link --project-ref nqlzashaqyqbwdlnaadw
```

## Verify (optional, ~1 min)
Temporarily point `apps/mobile/.env.local` at **production**, then
`node supabase/tests/rls-harness.mjs` — it has a hard guard that refuses to run against
prod's ref, so to verify prod you'd flip the `PROD_REF` guard off for one run **or** just
trust the staging proof (identical SQL). Simplest: trust staging (57/57 on identical
migrations) and spot-check in the app that wearable connect still works.

## Dashboard settings (not in the repo — your call)
- **Auth → Confirm email: ON** (S14) — closes the open-signup abuse surface.
- **Auth → Rate limits** — cap signups/OTP if the dashboard offers it.

## Coach dashboard (apps/web) — when you deploy it
- Set **`NEXT_PUBLIC_SUPABASE_URL`** + **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** in the Vercel
  project env (same prod values; anon key only). Without them, `/dashboard` redirects to
  `/login` — the secure default. The gate (S12, PR #115) requires a valid session AND an
  active `team_members` coach row; the dashboard still renders MOCK data until live reads
  land behind it (S11).

## Still open (tracked, not blocking today)
- **S12** — DONE (PR #115): `/dashboard/*` gated in Next middleware (session + active
  coach). Live player data still NOT wired — keep it behind the gate + team-scoping.
- **S11** — `player_status` is self-attested by the player's client. Server-side
  derivation (Edge Function/trigger) is the fix; deferred because there's no live
  player_status data yet. Follow-up.
- **S12** — the `apps/web` coach dashboard has no auth gate (a stub). It is NOT deployed;
  the gate (Next middleware on a real session + team scope) must land **before** any live
  data source is wired in.
- **S13** — DONE: next bumped to 16 (advisories cleared).
- **S15 (LOW)** — CORS `*` on the JWT sync functions; `010` constraints are `NOT VALID`
  (enforce forward; `VALIDATE` over legacy rows when convenient); avatars are world-read
  by design.
