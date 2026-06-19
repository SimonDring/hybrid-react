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
