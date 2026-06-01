-- ============================================================================
-- Hybrid Training — Supabase schema
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor (SQL Editor → New query →
-- paste → Run). It creates every table, foreign key, index, and Row Level
-- Security policy the app needs.
--
-- Safe to run on a fresh project. Mirrors src/lib/Database.js SCHEMA and
-- docs/SCHEMA.md. Conventions:
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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_session_logs_session on public.session_logs(session_id);
create index if not exists idx_session_logs_user on public.session_logs(user_id);

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
  soreness              numeric,  -- 1-5
  mood                  numeric,  -- 1-5
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
-- updated_at triggers (skip wearable_readings + ai_recommendations: append-mostly)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','training_plans','phases','weeks','sessions','session_logs',
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
    'training_plans','phases','weeks','sessions','session_logs',
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
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Done. Verify in Table Editor — you should see all 12 tables.
-- ============================================================================
