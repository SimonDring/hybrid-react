-- 20260712_player_status_membership_scope.sql — close F3 from the 2026-07-09
-- data-architecture review (docs/reviews/2026-07-09-data-architecture-review.md):
-- when a coach REMOVED a player from the roster (DELETE on team_members), or a
-- member marked themselves 'left' with a client that failed to tidy up, the
-- player's derived player_status row SURVIVED and remained coach-readable —
-- is_coach_of_team(team_id) stays true for the coach, and player_status has no
-- FK to team_members. The self-initiated leaveTeam path already deleted the row
-- client-side (SyncService.leaveTeam); the coach-removal path did not. This is
-- TEAM DATA ISOLATION (CLAUDE.md hard rule): coach access is ADDITIVE and
-- team-scoped — it must end when the membership ends.
--
-- Defence in depth, two independent layers (either alone closes the leak):
--   1. POLICY — the coach read now requires the row's player to be an ACTIVE
--      member of that team (not just "the caller coaches the team").
--   2. TRIGGER — ending a membership (row deleted, or status → 'left') deletes
--      the player's derived row for that team, so orphans never accumulate.
-- Plus a one-time backfill deleting any orphans already present.
--
-- Idempotent, like the rest of the chain. Staging first + rls-harness
-- (regression case added in supabase/tests/rls-harness.mjs), then the prod
-- apply per supabase/SECURITY-DEPLOY.md.

-- ============================================================================
-- 1) POLICY — coach reads require the player's ACTIVE membership of that team.
--
-- Helper in the house style of is_member_of_team / is_coach_of_team
-- (20260705): SECURITY DEFINER so the policy can consult team_members without
-- recursing into its RLS; search_path pinned. Not a membership oracle: for any
-- caller who is not an active coach of `team` it is constantly false, and an
-- active coach of `team` can already read that roster via RLS.
-- ============================================================================
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

drop policy if exists "player or their coach" on public.player_status;
create policy "player or their coach" on public.player_status
  for select using (
    auth.uid() = user_id
    or coach_reads_member(team_id, user_id)
  );

-- ============================================================================
-- 2) TRIGGER — an ended membership takes its derived row with it.
--
-- Covers BOTH ending paths: the coach's roster DELETE and a status change to
-- 'left' (whether the member set it themselves or a coach did). SECURITY
-- DEFINER because the acting coach has no DELETE policy on player_status (only
-- the player deletes their own row) — the cleanup is server truth, same family
-- as player_status_server_truth (20260708/09). Also fires for memberships
-- cascade-deleted with a team; the row's own team_id FK cascade makes that a
-- harmless no-op race, not a conflict.
-- ============================================================================
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

-- ============================================================================
-- 3) BACKFILL — delete any orphaned derived rows already present (a row whose
-- player has no ACTIVE membership of that team). One-time hygiene; the policy
-- above already blocks reads of these, the trigger prevents new ones.
-- ============================================================================
delete from public.player_status ps
where not exists (
  select 1 from public.team_members tm
  where tm.team_id = ps.team_id
    and tm.user_id = ps.user_id
    and tm.status = 'active'
);
