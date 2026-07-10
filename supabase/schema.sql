-- ============================================================================
-- Hybrid Training — Supabase schema
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor (SQL Editor → New query →
-- paste → Run). It creates every table, foreign key, index, RPC, storage
-- bucket, and Row Level Security policy the app needs.
--
-- Safe to run on a fresh project. This is the FULL CURRENT schema — the state
-- a project has after applying every file in supabase/migrations/ (reconciled
-- through 013 + the dated migrations up to 20260710; see
-- supabase/migrations/README.md for the ledger). Mirrors src/lib/Database.js
-- SCHEMA and docs/SCHEMA.md.
-- Conventions:
--   - id: uuid primary key, generated server-side
--   - user_id: FK to auth.users (Supabase's built-in auth table)
--   - created_at / updated_at / deleted_at on every table (soft delete)
--   - Row Level Security ON everywhere: a user can only see their own rows
--
-- IMPORTANT: This uses Supabase Auth. The `users` table here is your PROFILE
-- table, linked 1:1 to auth.users via id. Auth itself (login) is handled by
-- Supabase Auth in Session B; this just stores profile/settings.
-- ============================================================================

-- Enable the uuid generator (usually on by default, harmless to repeat)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper: auto-update updated_at on row changes
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- TABLE: users (profile, 1:1 with auth.users)
-- ============================================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  profile     jsonb not null default '{}'::jsonb,   -- { age, bodyweight_kg, height_cm, sex, goals:[] }
  settings    jsonb not null default '{}'::jsonb,   -- { units, default_pool_length_m, theme }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ============================================================================
-- TABLE: training_plans
-- ============================================================================
create table if not exists public.training_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  name            text,
  description     text,
  start_date      date,
  target_end_date date,
  status          text not null default 'active',  -- active|paused|completed|archived
  template_ref    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_plans_user on public.training_plans(user_id);

-- ============================================================================
-- TABLE: phases
-- ============================================================================
create table if not exists public.phases (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.training_plans(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  template_phase_id int,
  "order"           int,
  week_range_start  int,
  week_range_end    int,
  status            text not null default 'upcoming',  -- upcoming|active|completed|skipped
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists idx_phases_plan on public.phases(plan_id);
create index if not exists idx_phases_user on public.phases(user_id);

-- ============================================================================
-- TABLE: weeks
-- ============================================================================
create table if not exists public.weeks (
  id            uuid primary key default gen_random_uuid(),
  phase_id      uuid not null references public.phases(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  week_number   int,
  week_in_phase int,
  deload        boolean not null default false,
  status        text not null default 'upcoming',
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_weeks_phase on public.weeks(phase_id);
create index if not exists idx_weeks_user on public.weeks(user_id);

-- ============================================================================
-- TABLE: sessions
-- ============================================================================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  week_id       uuid references public.weeks(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  "order"       int,
  day_label     text,
  template_ref  text,                              -- "p1_wk5_s0"
  status        text not null default 'pending',   -- pending|in_progress|completed|skipped
  scheduled_for date,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_sessions_week on public.sessions(week_id);
create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_sessions_template on public.sessions(template_ref);

-- ============================================================================
-- TABLE: session_logs
-- ============================================================================
create table if not exists public.session_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_sec  int,
  quality       int,   -- 1-5
  energy        int,   -- 1-5
  recovery      int,   -- 1-5
  notes         text default '',
  -- per-session physiology summary (see migration 008) — populated by
  -- enrichment/linking from the primary band or a linked workout
  avg_hr        numeric,
  max_hr        numeric,
  calories      numeric,
  hr_source     text,        -- 'strava' | 'fitbit' | null
  hr_zones      jsonb,       -- { z1,z2,z3,z4,z5 } minutes
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_session_logs_session on public.session_logs(session_id);
create index if not exists idx_session_logs_user on public.session_logs(user_id);

-- ============================================================================
-- TABLE: set_logs  (per-set training history — see migration 013)
-- ============================================================================
create table if not exists public.set_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  exercise_key  text,        -- tracked-lift key when applicable (squat/bench/deadlift/ohp/pull)
  exercise_name text,
  section       text,        -- 'primer' | 'main'
  set_index     int,         -- 1-based within the exercise
  target_weight numeric,
  target_reps   int,
  target_rpe    numeric,
  actual_weight numeric,
  actual_reps   int,
  actual_rpe    numeric,
  is_primer     boolean default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_set_logs_session on public.set_logs(session_id);
create index if not exists idx_set_logs_user on public.set_logs(user_id);

-- ============================================================================
-- TABLE: weekly_checkins
-- ============================================================================
create table if not exists public.weekly_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  week_ending   date,
  bodyweight_kg numeric,
  resting_hr    numeric,
  avg_rpe       numeric,
  sleep_score   numeric,
  knee_rating   numeric,
  notes         text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_checkins_user on public.weekly_checkins(user_id, week_ending desc);

-- ============================================================================
-- TABLE: reassessments
-- ============================================================================
create table if not exists public.reassessments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  quarter_number int,
  period_end     date,
  answers        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_reassess_user on public.reassessments(user_id);

-- ============================================================================
-- TABLE: daily_metrics (Fitbit-ready; one row per day)
-- ============================================================================
create table if not exists public.daily_metrics (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  date                  date not null,
  source                text not null default 'manual',  -- manual|fitbit
  -- recovery / cardiovascular
  resting_hr            numeric,
  hrv_ms                numeric,
  breathing_rate        numeric,
  spo2_pct              numeric,
  skin_temp_variation_c numeric,
  -- sleep
  sleep_duration_min    numeric,
  sleep_score           numeric,
  sleep_deep_min        numeric,
  sleep_rem_min         numeric,
  sleep_light_min       numeric,
  sleep_awake_min       numeric,
  -- readiness
  readiness_score       numeric,
  -- activity
  steps                 numeric,
  active_minutes        numeric,
  calories_out          numeric,
  -- subjective
  energy                numeric,  -- 1-5
  soreness              numeric,  -- 1-5 (5 = fresh)
  mood                  numeric,  -- 1-5
  stress                numeric,  -- 1-5 (5 = calm)
  illness               boolean not null default false,   -- see migration 20260623
  travel                boolean not null default false,   -- see migration 20260623
  notes                 text default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  -- one row per user per day: makes Fitbit upsert idempotent
  unique (user_id, date)
);
create index if not exists idx_daily_user_date on public.daily_metrics(user_id, date desc);

-- ============================================================================
-- TABLE: injuries
-- ============================================================================
create table if not exists public.injuries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  body_part           text,
  title               text,
  description         text,
  severity            int,    -- 1-5
  status              text not null default 'active',  -- active|rehabbing|recovered|monitoring
  date_occurred       date,
  date_recovered      date,
  rehab_plan          text,
  rehab_plan_source   text default 'self',  -- self|physio|ai
  physio_approved     boolean not null default false,
  affected_activities jsonb not null default '[]'::jsonb,  -- ['run','ski']
  recovery_log        jsonb not null default '[]'::jsonb,  -- [{date,note,response}]
  prevention_notes    text default '',
  ai_generated        boolean not null default false,
  -- structured triage fields (see migration 20260612_injury_structured_fields)
  body_region              text,
  body_part_key            text,
  side                     text,
  diagnosis_key            text,
  physio_seen              boolean not null default false,
  rehab_phase              text not null default 'protect',
  symptom_flags            jsonb not null default '{}'::jsonb,
  red_flag_triggered       boolean not null default false,
  referred_to_professional boolean not null default false,
  prevention_exercises     jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index if not exists idx_injuries_user on public.injuries(user_id, date_occurred desc);

-- ============================================================================
-- TABLE: wearable_readings (per-workout, from Strava later)
-- ============================================================================
create table if not exists public.wearable_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  source       text not null default 'manual',  -- strava|garmin|manual
  recorded_at  timestamptz,
  workout_type text,
  metric       text,
  value        numeric,
  unit         text,
  raw          jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_wearable_user on public.wearable_readings(user_id, recorded_at desc);

-- ============================================================================
-- TABLE: ai_recommendations (placeholder, Stage 8)
-- ============================================================================
create table if not exists public.ai_recommendations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  context        text,   -- session|week|phase|recovery
  ref_id         uuid,
  model          text,
  prompt_summary text,
  recommendation text,
  confidence     numeric,  -- 0-1
  accepted       boolean,
  user_response  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_ai_user on public.ai_recommendations(user_id, created_at desc);

-- ============================================================================
-- TABLE: wearable_connections (see migrations 001 + 005)
-- OAuth tokens per connected device. Tokens are written ONLY by the Edge
-- Functions (service role); the browser can merely read connection status.
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
  role             text not null default 'secondary',  -- 'primary' | 'secondary' (migration 005)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_wearable_connections_user
  on public.wearable_connections(user_id);

-- At most one primary device per user (partial unique index, migration 005).
create unique index if not exists uniq_wearable_primary_per_user
  on public.wearable_connections (user_id)
  where role = 'primary';

drop trigger if exists trg_wearable_connections_updated on public.wearable_connections;
create trigger trg_wearable_connections_updated
  before update on public.wearable_connections
  for each row execute function set_updated_at();

-- RLS: users can read their own connection status (to show "Connected" in the
-- UI). Only the Edge Functions (service role) can write tokens — deliberately
-- NO insert/update/delete policy here.
alter table public.wearable_connections enable row level security;

drop policy if exists "own connections read" on public.wearable_connections;
create policy "own connections read" on public.wearable_connections
  for select using (auth.uid() = user_id);

-- Column privileges (see migration 20260706, S2 CRITICAL): RLS scopes ROWS to
-- the owner, but the owning browser must never read the raw OAuth tokens
-- (XSS-durable credentials). Revoke table SELECT and re-grant column-by-column,
-- omitting access_token + refresh_token. service_role (the Edge Functions)
-- bypasses this and keeps full access. No grant to anon: a signed-out client
-- sees nothing, matching the RLS intent.
revoke select on public.wearable_connections from anon, authenticated;
grant select (id, user_id, provider, provider_user_id, expires_at, scope,
              connected_at, last_synced_at, role, created_at, updated_at)
  on public.wearable_connections to authenticated;

-- ============================================================================
-- TABLE: workouts (see migration 006)
-- One row per external workout/activity (run, ride, swim, strength, etc.) from
-- any connected device. session_id links a workout to an in-app session.
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

drop trigger if exists trg_workouts_updated on public.workouts;
create trigger trg_workouts_updated
  before update on public.workouts
  for each row execute function set_updated_at();

alter table public.workouts enable row level security;
drop policy if exists "own rows" on public.workouts;
create policy "own rows" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- updated_at triggers (skip wearable_readings + ai_recommendations: append-mostly;
-- wearable_connections + workouts have their own triggers above)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','training_plans','phases','weeks','sessions','session_logs','set_logs',
    'weekly_checkins','reassessments','daily_metrics','injuries','ai_recommendations'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated on public.%s;', t, t);
    execute format(
      'create trigger trg_%s_updated before update on public.%s
       for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Every table: a logged-in user can only touch rows where user_id = their id.
-- The users table keys on id (which equals auth.uid()).
-- ============================================================================

-- Enable RLS on all tables
alter table public.users               enable row level security;
alter table public.training_plans      enable row level security;
alter table public.phases              enable row level security;
alter table public.weeks               enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_logs        enable row level security;
alter table public.set_logs            enable row level security;
alter table public.weekly_checkins     enable row level security;
alter table public.reassessments       enable row level security;
alter table public.daily_metrics       enable row level security;
alter table public.injuries            enable row level security;
alter table public.wearable_readings   enable row level security;
alter table public.ai_recommendations  enable row level security;

-- users: row id IS the auth uid
drop policy if exists "own profile" on public.users;
create policy "own profile" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Every other table: filter on user_id
do $$
declare t text;
begin
  foreach t in array array[
    'training_plans','phases','weeks','sessions','session_logs','set_logs',
    'weekly_checkins','reassessments','daily_metrics','injuries',
    'wearable_readings','ai_recommendations'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%s;', t);
    execute format(
      'create policy "own rows" on public.%s
       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ============================================================================
-- AUTO-CREATE PROFILE ROW ON SIGNUP
-- When someone signs up via Supabase Auth, automatically create their
-- public.users profile row so the app always has one to read.
-- ============================================================================
-- Signup is OPEN — no invite allowlist (see migration 004). This trigger only
-- copies the new account's email + name into its public.users profile row. The
-- name falls back to the OAuth `full_name` claim so Google/Apple sign-ups are
-- named too. search_path pinned (see migration 20260706, S10).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- RPC: delete_user (see migrations 003 + 20260706 S6)
-- Lets a signed-in user permanently delete their own account + all their data.
-- SECURITY DEFINER: runs as the function owner (bypassing RLS), deletes every
-- row the caller owns, then removes their auth.users record. Tables not listed
-- (phases, weeks, wearable_readings, oauth_states, …) are removed by the
-- ON DELETE CASCADE foreign keys when their parent rows go; set_logs / workouts /
-- team surfaces are deleted explicitly (belt-and-suspenders, clear intent).
-- Teams the user FOUNDED cascade via teams.created_by. (plpgsql bodies are only
-- syntax-checked at CREATE time, so the forward references to the team tables
-- defined later in this file are fine.)
-- ============================================================================
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.set_logs          where user_id = uid;
  delete from public.session_logs      where user_id = uid;
  delete from public.sessions          where user_id = uid;
  delete from public.weekly_checkins   where user_id = uid;
  delete from public.reassessments     where user_id = uid;
  delete from public.daily_metrics     where user_id = uid;
  delete from public.injuries          where user_id = uid;
  delete from public.workouts          where user_id = uid;
  delete from public.training_plans    where user_id = uid;
  delete from public.wearable_connections where user_id = uid;
  delete from public.player_status     where user_id = uid;
  delete from public.team_members      where user_id = uid;   -- teams they FOUNDED cascade via teams.created_by
  delete from public.users             where id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

-- ============================================================================
-- RPC: set_device_primary (see migration 007)
-- Makes one device the user's sole primary in a single statement. SECURITY
-- DEFINER so it can update wearable_connections.role without a broad browser
-- UPDATE policy on that token-bearing table; it only ever writes `role`, never
-- tokens. A single UPDATE avoids the transient two-primary state that would
-- violate the uniq_wearable_primary_per_user partial unique index.
-- ============================================================================
create or replace function public.set_device_primary(p_provider text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.wearable_connections
  set role = case when provider = p_provider then 'primary' else 'secondary' end
  where user_id = auth.uid();
$$;

revoke all on function public.set_device_primary(text) from public;
grant execute on function public.set_device_primary(text) to authenticated;

-- ============================================================================
-- STORAGE: avatars bucket (see migrations 009 + 011)
-- Public-read bucket for profile photos. Each user may only write inside a
-- top-level folder named after their own auth.uid(). Server-side limits keep
-- it to small image files. The public URL is saved in users.profile JSONB.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Server-side limits (migration 011): small image files only.
update storage.buckets
set
  file_size_limit    = 2097152,  -- 2 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- ============================================================================
-- VALIDATION CHECK CONSTRAINTS (see migrations 010 + 20260706 S3)
-- Server-side value bounds, defence in depth. Mirrors
-- apps/mobile/src/lib/validation/rules.js. Constraints are NOT VALID so they
-- apply to new/updated rows without failing on legacy data; CHECKs allow NULL,
-- so optional fields stay optional. Safe to re-run: each is dropped first.
-- ============================================================================

-- session_logs: 1–5 ratings + capped notes
alter table public.session_logs drop constraint if exists chk_session_logs_quality;
alter table public.session_logs add  constraint chk_session_logs_quality  check (quality  between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_energy;
alter table public.session_logs add  constraint chk_session_logs_energy   check (energy   between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_recovery;
alter table public.session_logs add  constraint chk_session_logs_recovery check (recovery between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_notes_len;
alter table public.session_logs add  constraint chk_session_logs_notes_len check (char_length(notes) <= 2000) not valid;

-- daily_metrics: physiological + subjective bounds + capped notes
alter table public.daily_metrics drop constraint if exists chk_daily_resting_hr;
alter table public.daily_metrics add  constraint chk_daily_resting_hr   check (resting_hr between 30 and 220) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_hrv;
alter table public.daily_metrics add  constraint chk_daily_hrv          check (hrv_ms between 1 and 400) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_spo2;
alter table public.daily_metrics add  constraint chk_daily_spo2         check (spo2_pct between 50 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_score;
alter table public.daily_metrics add  constraint chk_daily_sleep_score  check (sleep_score between 0 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_dur;
alter table public.daily_metrics add  constraint chk_daily_sleep_dur    check (sleep_duration_min between 0 and 1440) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_energy;
alter table public.daily_metrics add  constraint chk_daily_energy       check (energy between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_soreness;
alter table public.daily_metrics add  constraint chk_daily_soreness     check (soreness between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_mood;
alter table public.daily_metrics add  constraint chk_daily_mood         check (mood between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_notes_len;
alter table public.daily_metrics add  constraint chk_daily_notes_len    check (char_length(notes) <= 2000) not valid;

-- weekly_checkins: bounds + capped notes (DB-level only; app wiring deferred)
alter table public.weekly_checkins drop constraint if exists chk_checkin_bodyweight;
alter table public.weekly_checkins add  constraint chk_checkin_bodyweight check (bodyweight_kg between 30 and 300) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_resting_hr;
alter table public.weekly_checkins add  constraint chk_checkin_resting_hr check (resting_hr between 30 and 220) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_rpe;
alter table public.weekly_checkins add  constraint chk_checkin_rpe        check (avg_rpe between 1 and 10) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_sleep_score;
alter table public.weekly_checkins add  constraint chk_checkin_sleep_score check (sleep_score between 0 and 100) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_knee;
alter table public.weekly_checkins add  constraint chk_checkin_knee       check (knee_rating between 1 and 5) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_notes_len;
alter table public.weekly_checkins add  constraint chk_checkin_notes_len  check (char_length(notes) <= 2000) not valid;

-- injuries: 1–5 severity, enum status, capped text
alter table public.injuries drop constraint if exists chk_injury_severity;
alter table public.injuries add  constraint chk_injury_severity check (severity between 1 and 5) not valid;
alter table public.injuries drop constraint if exists chk_injury_status;
alter table public.injuries add  constraint chk_injury_status   check (status in ('active','rehabbing','recovered','monitoring')) not valid;
alter table public.injuries drop constraint if exists chk_injury_title_len;
alter table public.injuries add  constraint chk_injury_title_len check (char_length(title) <= 120) not valid;
alter table public.injuries drop constraint if exists chk_injury_desc_len;
alter table public.injuries add  constraint chk_injury_desc_len  check (char_length(description) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_rehab_len;
alter table public.injuries add  constraint chk_injury_rehab_len check (char_length(rehab_plan) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_prevention_len;
alter table public.injuries add  constraint chk_injury_prevention_len check (char_length(prevention_notes) <= 2000) not valid;

-- injuries: coach-visible free-text bounds (migration 20260706, S3)
alter table public.injuries
  drop constraint if exists chk_injury_body_part_len,
  add  constraint chk_injury_body_part_len check (char_length(coalesce(body_part, '')) <= 120) not valid;

-- affected_activities is JSONB (array of activity strings); cap its serialized
-- size (shape-agnostic payload-abuse backstop) rather than element count.
alter table public.injuries
  drop constraint if exists chk_injury_affected_activities_len,
  add  constraint chk_injury_affected_activities_len
       check (affected_activities is null
              or char_length(affected_activities::text) <= 2000) not valid;

-- users.profile is one unconstrained JSONB (display name, markers, athlete_model
-- — all coach-visible or engine-fed). Postgres can't easily CHECK keys inside a
-- JSONB, so cap the TOTAL serialized size as a payload-abuse backstop (~256 KB,
-- far above any legitimate profile incl. the athlete model). (20260706, S3)
alter table public.users
  drop constraint if exists chk_users_profile_size,
  add  constraint chk_users_profile_size check (pg_column_size(profile) <= 262144) not valid;

-- ============================================================================
-- TEAM PACKAGE — the Team data spine (see migrations 20260705 team spine,
-- 20260706 security hardening, 20260708 player_status integrity,
-- 20260709 player_status identity, 20260710 team join codes).
-- Design: docs/product/TEAM-ARCHITECTURE.md (the binding data-isolation rules).
--
-- THE SECURITY CONTRACT (non-negotiable, tested by supabase/tests/rls-harness.mjs):
--   * Every EXISTING per-user table stays owner-only — the team spine adds NO
--     policy to daily_metrics / wearable_readings / injuries / any raw table.
--   * A coach reads ONLY the derived player_status surface, ONLY for players on
--     their own team. Players can never read each other — not even teammates.
--   * Raw HRV / sleep / resting-HR never appear in any coach-readable column.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: teams
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sport       text,
  season      text,                              -- 'in' | 'off' | 'pre' | ...
  schedule    jsonb not null default '[]'::jsonb, -- fixtures + recurring sport sessions (the plan constraints)
  join_code   text,                              -- short shareable invite code (migration 20260710)
  created_by  uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists idx_teams_join_code
  on public.teams(join_code) where join_code is not null;

-- coach-visible free-text bound (migration 20260706, S3)
alter table public.teams
  drop constraint if exists chk_team_name_len,
  add  constraint chk_team_name_len check (char_length(coalesce(name, '')) <= 120) not valid;

-- ----------------------------------------------------------------------------
-- TABLE: team_members
-- ----------------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null default 'player',    -- 'coach' | 'player'
  status      text not null default 'invited',   -- 'invited' | 'active' | 'left'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (team_id, user_id),
  constraint team_members_role_check   check (role in ('coach', 'player')),
  constraint team_members_status_check check (status in ('invited', 'active', 'left'))
);
create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);

-- ----------------------------------------------------------------------------
-- TABLE: player_status — the ONLY coach-readable per-player surface.
-- Holds derived signals exclusively; the raw vitals that feed it never leave
-- the owner-only tables. Written by the player's own client (SyncService); the
-- safety fields + display_name are OVERRIDDEN with server truth by the
-- player_status_server_truth trigger below (migrations 20260708 + 20260709).
-- ----------------------------------------------------------------------------
create table if not exists public.player_status (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete cascade,
  readiness      int,                -- derived score only (never the vitals behind it)
  load_state     text,               -- 'balanced' | 'ramping' | 'overreaching' | ... (from ACWR)
  acwr           numeric,
  adherence_pct  numeric,            -- completed vs prescribed
  injury_status  text,               -- 'available' | 'modified' | 'out' (never the private notes)
  display_name   text,               -- server-derived from the player's own profile (migration 20260709)
  updated_at     timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists idx_player_status_team on public.player_status(team_id);

-- coach-visible free-text bounds (migrations 20260706 S3 + 20260709)
alter table public.player_status
  drop constraint if exists chk_player_status_texts,
  add  constraint chk_player_status_texts
       check (char_length(coalesce(load_state, '')) <= 40
              and char_length(coalesce(injury_status, '')) <= 40) not valid;

alter table public.player_status
  drop constraint if exists chk_player_status_name_len,
  add  constraint chk_player_status_name_len
       check (display_name is null or char_length(display_name) <= 80) not valid;

-- ----------------------------------------------------------------------------
-- HELPERS — SECURITY DEFINER so policies on team_members can consult
-- memberships without recursing into their own RLS. (migration 20260705)
-- ----------------------------------------------------------------------------
create or replace function public.is_member_of_team(team uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from team_members
    where team_id = team and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_coach_of_team(team uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from team_members
    where team_id = team and user_id = auth.uid()
      and role = 'coach' and status = 'active'
  );
$$;

-- NOTE: the player-scoped helper is_coach_of(target uuid) was DROPPED by
-- migration 20260711 (WP-50): it answered "does the caller coach ANY team this
-- player is on?", which made coach reads player-scoped instead of team-scoped
-- (a cross-team leak) and doubled as a public membership oracle. Kept out of
-- this bootstrap so it cannot be reintroduced by accident.
drop function if exists public.is_coach_of(uuid);

-- Coach read helper (migration 20260712): may the CALLER, as an active coach
-- of `team`, read `member`'s derived row on that team? Requires the member's
-- membership to still be ACTIVE — a removed/'left' player's data is no longer
-- coach-readable (F3, 2026-07-09 data-architecture review). Not an oracle:
-- constantly false for non-coaches of `team`.
create or replace function public.coach_reads_member(team uuid, member uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from team_members coach
    join team_members player on player.team_id = coach.team_id
    where coach.team_id = team
      and coach.user_id = auth.uid()
      and coach.role = 'coach' and coach.status = 'active'
      and player.user_id = member and player.status = 'active'
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS for the team tables (migration 20260705)
-- ----------------------------------------------------------------------------
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.player_status  enable row level security;

-- teams: members read their team; any signed-in user may found one (as themselves);
-- only its coaches may change it.
drop policy if exists "members read their team" on public.teams;
create policy "members read their team" on public.teams
  for select using (is_member_of_team(id) or created_by = auth.uid());

drop policy if exists "authenticated may found a team" on public.teams;
create policy "authenticated may found a team" on public.teams
  for insert with check (created_by = auth.uid());

drop policy if exists "coaches manage their team" on public.teams;
create policy "coaches manage their team" on public.teams
  for update using (is_coach_of_team(id)) with check (is_coach_of_team(id));

-- teams.join_code is COLUMN-revoked (migration 20260711, WP-50): RLS scopes
-- rows, column privileges scope columns — any member could previously read the
-- invite code. Coaches read it via the get_team_join_code RPC (below, with
-- rotate_team_code). NOTE for app code: select('*') on teams now fails —
-- always list columns explicitly.
revoke select on public.teams from anon, authenticated;
grant select (id, name, sport, season, schedule, created_by,
              created_at, updated_at, deleted_at)
  on public.teams to authenticated;

-- team_members: you always see YOUR OWN membership rows; a coach sees (and
-- manages) the roster of THEIR team only. Players do not see the roster.
drop policy if exists "own membership" on public.team_members;
create policy "own membership" on public.team_members
  for select using (auth.uid() = user_id);

drop policy if exists "coach reads roster" on public.team_members;
create policy "coach reads roster" on public.team_members
  for select using (is_coach_of_team(team_id));

drop policy if exists "coach manages roster" on public.team_members;
create policy "coach manages roster" on public.team_members
  for insert with check (
    is_coach_of_team(team_id)
    -- bootstrap: the founder adds THEMSELVES as coach of a team they created
    or (user_id = auth.uid() and role = 'coach'
        and exists (select 1 from teams t where t.id = team_id and t.created_by = auth.uid()))
  );

drop policy if exists "coach updates roster" on public.team_members;
create policy "coach updates roster" on public.team_members
  for update using (is_coach_of_team(team_id)) with check (is_coach_of_team(team_id));

drop policy if exists "member accepts or leaves" on public.team_members;
create policy "member accepts or leaves" on public.team_members
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "coach removes from roster" on public.team_members;
create policy "coach removes from roster" on public.team_members
  for delete using (is_coach_of_team(team_id));

-- RLS cannot compare OLD vs NEW, so a trigger closes the self-promotion hole:
-- a member updating their own row may change STATUS only (accept / leave);
-- role / team / user are immutable unless the caller coaches the team. A
-- removed member ('left') cannot resurrect their own membership either
-- (migration 20260706, S9 — the final version of this guard).
create or replace function public.team_members_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  -- role / team / user are immutable unless a coach of the team is acting.
  if (new.role, new.team_id, new.user_id) is distinct from (old.role, old.team_id, old.user_id)
     and not is_coach_of_team(old.team_id) then
    raise exception 'only a coach may change role or move members';
  end if;
  -- a non-coach cannot resurrect their OWN membership after being removed.
  if old.status = 'left' and new.status <> 'left' and not is_coach_of_team(old.team_id) then
    raise exception 'a removed member cannot rejoin without a coach';
  end if;
  return new;
end;
$$;
drop trigger if exists team_members_guard on public.team_members;
create trigger team_members_guard
  before update on public.team_members
  for each row execute function public.team_members_guard();

-- An ended membership takes its derived player_status row with it (migration
-- 20260712, F3): covers the coach's roster DELETE and any status → 'left'.
-- SECURITY DEFINER — the acting coach has no DELETE policy on player_status;
-- this is server truth, same family as player_status_server_truth.
create or replace function public.team_members_cleanup_status()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from player_status
      where team_id = old.team_id and user_id = old.user_id;
    return old;
  end if;
  if new.status = 'left' and old.status is distinct from 'left' then
    delete from player_status
      where team_id = new.team_id and user_id = new.user_id;
  end if;
  return new;
end; $$;

drop trigger if exists team_members_cleanup_status on public.team_members;
create trigger team_members_cleanup_status
  after delete or update of status on public.team_members
  for each row execute function public.team_members_cleanup_status();

-- player_status: the player writes THEIR OWN roll-up; reads are the player
-- themselves OR an active coach of their team. Teammates see nothing.
drop policy if exists "own status write" on public.player_status;
create policy "own status write" on public.player_status
  for insert with check (auth.uid() = user_id and is_member_of_team(team_id));

drop policy if exists "own status update" on public.player_status;
create policy "own status update" on public.player_status
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_member_of_team(team_id));

-- Coach reads are TEAM-scoped (20260711) AND require the player's membership
-- to still be ACTIVE (20260712) — when a membership ends, so does the coach's
-- read. The player always reads their own row.
drop policy if exists "player or their coach" on public.player_status;
create policy "player or their coach" on public.player_status
  for select using (
    auth.uid() = user_id
    or coach_reads_member(team_id, user_id)
  );

drop policy if exists "own status delete" on public.player_status;
create policy "own status delete" on public.player_status
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- SERVER-AUTHORITATIVE player_status (migrations 20260708 S11 + 20260709).
-- The player still WRITES player_status (own-row RLS unchanged) — integrity
-- comes from a BEFORE trigger overriding the safety fields with server truth:
--   * injury_status ← derived from the player's own `injuries`
--   * readiness     ← the player's own logged daily_metrics.readiness_score
--   * display_name  ← the player's own profile name (20260709)
-- Soft trend metrics (acwr, load_state, adherence_pct) stay engine-computed
-- (client-proposed) but are CLAMPED to sane ranges. Raw vitals never appear.
-- ----------------------------------------------------------------------------

-- Injury availability from the player's own injuries (server truth).
create or replace function public.derive_injury_status(target uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when exists (select 1 from injuries where user_id = target and deleted_at is null
                   and status in ('active','rehabbing','monitoring')
                   and (red_flag_triggered or referred_to_professional)) then 'out'
    when exists (select 1 from injuries where user_id = target and deleted_at is null
                   and status in ('active','rehabbing','monitoring')) then 'modified'
    else 'available'
  end;
$$;

-- The player's most recent logged readiness_score (within 7 days), or null.
create or replace function public.latest_readiness(target uuid)
returns int language sql security definer stable set search_path = public as $$
  select round(readiness_score)::int
  from daily_metrics
  where user_id = target and deleted_at is null and readiness_score is not null
    and date >= (current_date - interval '7 days')
  order by date desc
  limit 1;
$$;

-- The player's display name from their own profile (server truth): the profile
-- jsonb 'name', falling back to the top-level users.name. (migration 20260709)
create or replace function public.player_display_name(target uuid)
returns text language sql security definer stable set search_path = public as $$
  select left(coalesce(nullif(u.profile->>'name', ''), u.name, ''), 80)
  from users u where u.id = target;
$$;

-- BEFORE INSERT/UPDATE: override the safety fields + identity with server
-- truth; clamp the soft metrics. (final version — migration 20260709)
create or replace function public.player_status_server_truth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.injury_status := derive_injury_status(new.user_id);
  new.readiness     := latest_readiness(new.user_id);
  new.display_name  := nullif(player_display_name(new.user_id), '');
  if new.adherence_pct is not null then
    new.adherence_pct := greatest(0, least(100, new.adherence_pct));
  end if;
  if new.acwr is not null and new.acwr < 0 then new.acwr := null; end if;
  if new.load_state is not null
     and new.load_state not in ('no-data','ramping','balanced','high','overreaching')
  then new.load_state := null; end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists player_status_server_truth on public.player_status;
create trigger player_status_server_truth
  before insert or update on public.player_status
  for each row execute function public.player_status_server_truth();

-- ----------------------------------------------------------------------------
-- TEAM FOUNDING + INVITES via JOIN CODES (migration 20260710).
-- A coach founds a team and gets a short shareable code; a player enters the
-- code in the mobile app to self-join. All via SECURITY DEFINER RPCs (the
-- authorized paths), so the write policies stay tight.
-- ----------------------------------------------------------------------------

-- 6 chars from a no-ambiguity alphabet (no 0/O/1/I/L). random() is fine here
-- (join codes are meant to be random; this is not the engine's determinism).
create or replace function public.gen_join_code()
returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                           1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

-- A coach founds a team: inserts the team with a unique code + bootstraps their
-- own active coach membership, atomically. Returns the team (incl. join_code).
create or replace function public.create_team(p_name text, p_sport text default null)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  code text;
  new_team public.teams;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'Team name required'; end if;
  loop
    code := gen_join_code();
    begin
      insert into teams (name, sport, created_by, join_code)
        values (left(btrim(p_name), 120), nullif(btrim(coalesce(p_sport, '')), ''), uid, code)
        returning * into new_team;
      exit;
    exception when unique_violation then
      -- code collision (rare) — regenerate and retry
    end;
  end loop;
  insert into team_members (team_id, user_id, role, status)
    values (new_team.id, uid, 'coach', 'active')
    on conflict (team_id, user_id) do nothing;
  return new_team;
end; $$;
revoke all on function public.create_team(text, text) from public;
grant execute on function public.create_team(text, text) to authenticated;

-- A player self-joins by code. Respects a coach removal (status 'left' can't
-- rejoin); activates a pending invite; idempotent for an existing active member.
create or replace function public.join_team_with_code(p_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t public.teams;
  existing public.team_members;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into t from teams
    where join_code = upper(btrim(p_code)) and deleted_at is null;
  if t.id is null then raise exception 'Invalid join code'; end if;

  select * into existing from team_members where team_id = t.id and user_id = uid;
  if existing.id is not null then
    if existing.status = 'left' then raise exception 'You were removed from this team'; end if;
    if existing.status <> 'active' then
      update team_members set status = 'active' where id = existing.id;  -- accept a pending invite
    end if;
    return t;
  end if;

  insert into team_members (team_id, user_id, role, status)
    values (t.id, uid, 'player', 'active');
  return t;
end; $$;
revoke all on function public.join_team_with_code(text) from public;
grant execute on function public.join_team_with_code(text) to authenticated;

-- A coach rotates the code (if it leaks). Coach-only.
create or replace function public.rotate_team_code(p_team uuid)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_coach_of_team(p_team) then raise exception 'Only a coach may rotate the code'; end if;
  loop
    code := gen_join_code();
    begin
      update teams set join_code = code, updated_at = now() where id = p_team;
      exit;
    exception when unique_violation then
    end;
  end loop;
  return code;
end; $$;
revoke all on function public.rotate_team_code(uuid) from public;
grant execute on function public.rotate_team_code(uuid) to authenticated;

-- A coach DISPLAYS the code (migration 20260711, WP-50 — join_code is
-- column-revoked, so the RPC is the only read path). Coach-only; returns the
-- code, or null when the team has none yet.
create or replace function public.get_team_join_code(p_team uuid)
returns text language plpgsql security definer stable
set search_path = public as $$
declare code text;
begin
  if not is_coach_of_team(p_team) then
    raise exception 'Only a coach of this team may read the join code';
  end if;
  select join_code into code from teams where id = p_team and deleted_at is null;
  return code;
end; $$;
revoke all on function public.get_team_join_code(uuid) from public;
grant execute on function public.get_team_join_code(uuid) to authenticated;

-- ============================================================================
-- TABLE: oauth_states (see migration 20260707, S1 CRITICAL)
-- Signed OAuth `state`: a single-use, short-lived NONCE bound to the initiating
-- authenticated user. The client mints one via issue_oauth_state() (needs a
-- JWT); the wearable callbacks resolve + consume it via consume_oauth_state()
-- (service_role), never trusting the raw param as an identity.
-- ============================================================================
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

-- ============================================================================
-- Done. Verify in Table Editor — you should see all 19 tables:
-- users, training_plans, phases, weeks, sessions, session_logs, set_logs,
-- weekly_checkins, reassessments, daily_metrics, injuries, wearable_readings,
-- ai_recommendations, wearable_connections, workouts, teams, team_members,
-- player_status, oauth_states.
-- ============================================================================
