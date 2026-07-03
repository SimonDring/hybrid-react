-- ============================================================================
-- Hybrid Training — Supabase schema
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor (SQL Editor → New query →
-- paste → Run). It creates every table, foreign key, index, RPC, storage
-- bucket, and Row Level Security policy the app needs.
--
-- Safe to run on a fresh project. This is the FULL CURRENT schema — the state
-- a project has after applying every file in supabase/migrations/ (reconciled
-- through 013 + the dated migrations; see supabase/migrations/README.md for
-- the ledger). Mirrors src/lib/Database.js SCHEMA and docs/SCHEMA.md.
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
-- named too.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- RPC: delete_user (see migration 003)
-- Lets a signed-in user permanently delete their own account + all their data.
-- SECURITY DEFINER: runs as the function owner (bypassing RLS), deletes every
-- row the caller owns, then removes their auth.users record. Tables not listed
-- (set_logs, workouts, phases, weeks, wearable_readings, …) are removed by the
-- ON DELETE CASCADE foreign keys when their parent rows go.
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

  -- App data (all keyed by user_id; users keyed by id).
  delete from public.session_logs     where user_id = uid;
  delete from public.sessions         where user_id = uid;
  delete from public.weekly_checkins  where user_id = uid;
  delete from public.reassessments    where user_id = uid;
  delete from public.daily_metrics    where user_id = uid;
  delete from public.injuries         where user_id = uid;
  delete from public.training_plans   where user_id = uid;
  delete from public.wearable_connections where user_id = uid;
  delete from public.users            where id = uid;

  -- Finally the auth account itself.
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
-- VALIDATION CHECK CONSTRAINTS (see migration 010)
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

-- ============================================================================
-- Done. Verify in Table Editor — you should see all 15 tables:
-- users, training_plans, phases, weeks, sessions, session_logs, set_logs,
-- weekly_checkins, reassessments, daily_metrics, injuries, wearable_readings,
-- ai_recommendations, wearable_connections, workouts.
-- ============================================================================
