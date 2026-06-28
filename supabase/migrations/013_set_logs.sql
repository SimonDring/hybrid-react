-- ============================================================================
-- Migration 013: set_logs — per-set training history
-- ============================================================================
-- One row per individual set logged in the focused session runner (e.g. "Squat,
-- set 2 of 4: 100 kg × 5 @ RPE 8"). This is REAL history — distinct from the
-- ephemeral mid-session check-off state, which stays local-only. A set log belongs
-- to a session (cascade-deleted with it) and to the user (RLS-scoped).
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

-- updated_at trigger (set_updated_at() is defined in schema.sql)
drop trigger if exists trg_set_logs_updated on public.set_logs;
create trigger trg_set_logs_updated
  before update on public.set_logs
  for each row execute function set_updated_at();

-- Row Level Security: a user can only touch their own set logs.
alter table public.set_logs enable row level security;
drop policy if exists "own rows" on public.set_logs;
create policy "own rows" on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
