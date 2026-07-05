-- 20260705_team_spine.sql — WP-33: the Team package's data spine.
-- Design: docs/product/TEAM-ARCHITECTURE.md (the binding data-isolation rules).
--
-- THE SECURITY CONTRACT (non-negotiable, tested by supabase/tests/rls-harness.mjs):
--   * Every EXISTING per-user table stays owner-only — this migration adds NO
--     policy to daily_metrics / wearable_readings / injuries / any raw table.
--   * A coach reads ONLY the derived player_status surface, ONLY for players on
--     their own team. Players can never read each other — not even teammates.
--   * Raw HRV / sleep / resting-HR never appear in any coach-readable column.
--
-- Idempotent (create if not exists / drop policy if exists) like the rest of
-- the chain. Applied to STAGING first; production only after review.

-- ============================================================================
-- TABLE: teams
-- ============================================================================
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sport       text,
  season      text,                              -- 'in' | 'off' | 'pre' | ...
  schedule    jsonb not null default '[]'::jsonb, -- fixtures + recurring sport sessions (the plan constraints)
  created_by  uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ============================================================================
-- TABLE: team_members
-- ============================================================================
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

-- ============================================================================
-- TABLE: player_status — the ONLY coach-readable per-player surface.
-- Holds derived signals exclusively; the raw vitals that feed it never leave
-- the owner-only tables. Written by the player's own client (SyncService).
-- ============================================================================
create table if not exists public.player_status (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete cascade,
  readiness      int,                -- derived score only (never the vitals behind it)
  load_state     text,               -- 'balanced' | 'ramping' | 'overreaching' | ... (from ACWR)
  acwr           numeric,
  adherence_pct  numeric,            -- completed vs prescribed
  injury_status  text,               -- 'available' | 'modified' | 'out' (never the private notes)
  updated_at     timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists idx_player_status_team on public.player_status(team_id);

-- ============================================================================
-- HELPERS — SECURITY DEFINER so policies on team_members can consult
-- memberships without recursing into their own RLS.
-- ============================================================================
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

-- Is the CALLER an active coach of any team the target player is an active member of?
create or replace function public.is_coach_of(target uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from team_members coach
    join team_members member on member.team_id = coach.team_id
    where coach.user_id = auth.uid() and coach.role = 'coach' and coach.status = 'active'
      and member.user_id = target and member.status = 'active'
  );
$$;

-- ============================================================================
-- RLS
-- ============================================================================
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
-- role / team / user are immutable unless the caller coaches the team.
create or replace function public.team_members_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if (new.role, new.team_id, new.user_id) is distinct from (old.role, old.team_id, old.user_id)
     and not is_coach_of_team(old.team_id) then
    raise exception 'only a coach may change role or move members';
  end if;
  return new;
end;
$$;
drop trigger if exists team_members_guard on public.team_members;
create trigger team_members_guard
  before update on public.team_members
  for each row execute function public.team_members_guard();

-- player_status: the player writes THEIR OWN roll-up; reads are the player
-- themselves OR an active coach of their team. Teammates see nothing.
drop policy if exists "own status write" on public.player_status;
create policy "own status write" on public.player_status
  for insert with check (auth.uid() = user_id and is_member_of_team(team_id));

drop policy if exists "own status update" on public.player_status;
create policy "own status update" on public.player_status
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_member_of_team(team_id));

drop policy if exists "player or their coach" on public.player_status;
create policy "player or their coach" on public.player_status
  for select using (auth.uid() = user_id or is_coach_of(user_id));

drop policy if exists "own status delete" on public.player_status;
create policy "own status delete" on public.player_status
  for delete using (auth.uid() = user_id);
