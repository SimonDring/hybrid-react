-- ============================================================================
-- Migration 001: wearable_connections
-- Run this in Supabase SQL Editor → New query → paste → Run.
-- ============================================================================

create table if not exists public.wearable_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  provider         text not null,          -- 'fitbit' | 'garmin' | 'oura' etc.
  provider_user_id text,                   -- provider's own user ID
  access_token     text not null,
  refresh_token    text not null,
  expires_at       timestamptz not null,
  scope            text,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_wearable_connections_user
  on public.wearable_connections(user_id);

-- updated_at trigger
drop trigger if exists trg_wearable_connections_updated on public.wearable_connections;
create trigger trg_wearable_connections_updated
  before update on public.wearable_connections
  for each row execute function set_updated_at();

-- RLS: users can read their own connection status (to show "Connected" in the UI)
-- Only the Edge Function (service role) can write tokens.
alter table public.wearable_connections enable row level security;

drop policy if exists "own connections read" on public.wearable_connections;
create policy "own connections read" on public.wearable_connections
  for select using (auth.uid() = user_id);
