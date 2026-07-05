-- 20260707_oauth_state.sql — S1 (CRITICAL): sign the OAuth `state`.
-- Finding: docs/SECURITY-AUDIT.md addendum. The Fitbit/Strava callbacks are
-- necessarily public (verify_jwt=false — they're browser redirects) yet they
-- wrote the raw `state` param straight into wearable_connections.user_id with
-- the service_role key. An attacker could complete a flow with their own code
-- but a VICTIM's uuid in `state` and plant tokens under the victim's account.
--
-- Fix: `state` becomes a single-use, short-lived NONCE bound to the initiating
-- authenticated user. The client mints one via issue_oauth_state() (needs a JWT);
-- the callback resolves + consumes it via consume_oauth_state() (service_role),
-- never trusting the raw param as an identity.
--
-- Rollout-safe: the client falls back to the legacy state=userId ONLY when this
-- RPC is absent (old DB), so the app can deploy independently of the coordinated
-- function+migration deploy. The new callback is nonce-only (secure).

create table if not exists public.oauth_states (
  nonce       text primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  provider    text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
-- RLS on with NO anon/authenticated policy → no direct table access at all.
-- The DEFINER RPCs are the only writer; the service_role callbacks are the only
-- reader/consumer. A nonce is never client-readable.
alter table public.oauth_states enable row level security;
create index if not exists idx_oauth_states_expiry on public.oauth_states(expires_at);

-- Mint a nonce for the CALLER (auth.uid()); 10-minute TTL; opportunistic GC.
create or replace function public.issue_oauth_state(p_provider text)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_provider not in ('fitbit', 'strava') then raise exception 'unknown provider'; end if;
  -- 256 bits of randomness from two v4 UUIDs (no pgcrypto dependency).
  n := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.oauth_states(nonce, user_id, provider, expires_at)
    values (n, uid, p_provider, now() + interval '10 minutes');
  delete from public.oauth_states where user_id = uid and expires_at < now();  -- GC this user's stale nonces
  return n;
end; $$;
revoke all on function public.issue_oauth_state(text) from public;
grant execute on function public.issue_oauth_state(text) to authenticated;

-- Resolve + SINGLE-USE consume a nonce, returning the bound user_id (or null if
-- unknown/expired/already-used). service_role only (the callbacks).
create or replace function public.consume_oauth_state(p_nonce text, p_provider text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  found_user uuid;
begin
  select user_id into found_user from public.oauth_states
    where nonce = p_nonce and provider = p_provider and used_at is null and expires_at > now()
    for update;
  if found_user is null then return null; end if;
  update public.oauth_states set used_at = now() where nonce = p_nonce;
  return found_user;
end; $$;
revoke all on function public.consume_oauth_state(text, text) from public;
grant execute on function public.consume_oauth_state(text, text) to service_role;
revoke execute on function public.consume_oauth_state(text, text) from anon, authenticated;  -- consume is service_role-only
