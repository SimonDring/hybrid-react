# Production Security Deploy — the batched step (needs Simon)

The multi-user hardening (audit addendum in `docs/SECURITY-AUDIT.md`, PRs #109–#113)
is **applied to staging and merged to `main`**, but — per the staging-first discipline —
**production DB migrations and Edge Function deploys are a deliberate step you run and
review**. This is the exact, ordered checklist.

Everything below was proven on staging: `node supabase/tests/rls-harness.mjs` → **57/57**.

> **STATUS (2026-07-06).** Simon applied `20260711_team_scoping.sql` (WP-50) directly to
> **production**, ahead of staging — safe because there are no active users yet, so the
> staging-first / harness gate is waived for this one migration. Since 20260711 depends on
> the team spine (20260705) + join-codes (20260710), the whole DB migration chain beneath it
> is necessarily live on prod too. **What migrations alone do NOT cover:** the **Edge Functions
> deploy separately** from `supabase db push` (step 3) — the OAuth-nonce callbacks (S1) and the
> `fitbit-sync` raw-vitals fix (S4/S8) are only active once *deployed*, so **confirm those**.
> Definitive prod check: relink to prod and `supabase migration list` (as of this date, staging
> shows 001–20260710 applied, 20260711 pending-on-staging; prod has 20260711 per the above).

## What's pending for production

| Artifact | What it does | Type |
|---|---|---|
| `migrations/20260706_security_hardening.sql` | S2 token-column lockdown, S3 constraints, S6 delete completeness, S9 status guard, S10 search_path | DB migration |
| `migrations/20260707_oauth_state.sql` | S1 OAuth `state` nonce table + `issue`/`consume` RPCs | DB migration |
| `migrations/20260708_player_status_integrity.sql` | S11 server-authoritative injury_status/readiness on the coach board | DB migration |
| `migrations/20260709_player_status_identity.sql` | coach-board display_name (server-derived from the player profile) | DB migration |
| `migrations/20260710_team_join_codes.sql` | Team founding + join-code invites (create_team/join_team_with_code/rotate RPCs) | DB migration |
| `migrations/20260711_team_scoping.sql` | WP-50: `player_status` coach reads become TEAM-scoped (`is_coach_of_team`, drops `is_coach_of`); `teams.join_code` column-revoked + coach-only `get_team_join_code` RPC. **Apply to STAGING first and re-run the harness (new WP-50 cases) — not yet staging-proven.** | DB migration |
| `migrations/20260712_player_status_membership_scope.sql` | F3 (2026-07-09 data review — TEAM DATA ISOLATION): an ENDED membership ends the coach's read of `player_status`. Coach SELECT now requires the player's ACTIVE membership (`coach_reads_member`); a roster DELETE or status→'left' triggers cleanup of the derived row; one-time orphan backfill. **Apply to STAGING first and run the harness (new F3 cases) — depends on 20260711 being applied.** | DB migration |
| `functions/fitbit-auth-callback` | resolves `state` via `consume_oauth_state` (S1) | Edge Function |
| `functions/strava-auth-callback` | resolves `state` via `consume_oauth_state` (S1) | Edge Function |
| `functions/fitbit-sync` | stops logging raw vitals (S4) + 92-day clamp (S8) | Edge Function |
| `functions/ai-render` | WP-60 AIGAS C2 capability (OPTIONAL — deploy only when you decide to evaluate/go-live). Needs secrets: `ANTHROPIC_API_KEY` + `AI_ENABLED=true` (the kill switch; unset/false = every request 503s). Client-side it stays inert until a profile sets `ai_features: true`. | Edge Function |

The app (GitHub Pages) is already deployed with the client half of S1 — and it **falls
back to the legacy `state=userId`** whenever `issue_oauth_state` is absent, so wearable
connect keeps working on prod until you run the steps below. Once the migration + the two
callbacks are live together, every new connect flow uses the signed nonce.

## The steps (~5 min)

```bash
cd ~/Code/hybrid-react

# 1. Point the CLI at PRODUCTION (prompts for the June-1st DB password)
supabase link --project-ref ggldomlmycvpwtzzjzcd

# 2. Apply every migration prod is missing — db push is CUMULATIVE and ordered:
#    it lists what's absent (the pending table above, through 20260711) and asks you
#    to confirm. (2026-07-06: 20260711 already applied to prod — expect it to be a no-op
#    or absent from the list; the harness/staging-first gate on it is waived, no users.)
supabase db push

# 3. Deploy the Edge Functions (these do NOT go via db push — a separate step, and the
#    piece still to confirm on prod). S1 callbacks must be live WITH the OAuth migration;
#    the two sync functions carry S4/S8.
supabase functions deploy fitbit-auth-callback
supabase functions deploy strava-auth-callback
supabase functions deploy fitbit-sync
#    (strava-sync unchanged this round — no redeploy needed)
#    OPTIONAL — only at AI go-live: supabase functions deploy ai-render
#      (needs secrets ANTHROPIC_API_KEY + AI_ENABLED=true; see the pending table above)

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
