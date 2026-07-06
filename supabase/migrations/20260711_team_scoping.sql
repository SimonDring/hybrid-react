-- 20260711_team_scoping.sql — WP-50: close the two team-data-scoping gaps from
-- the 2026-07-05 reassessment (docs/architecture/REASSESSMENT-2026-07-05.md).
-- Idempotent, like the rest of the chain. Applied to STAGING first (with the
-- new rls-harness cases); production apply is the batched step in
-- supabase/SECURITY-DEPLOY.md.

-- ============================================================================
-- GAP 1 — player_status coach reads were PLAYER-scoped, not TEAM-scoped.
--
-- The old SELECT policy used is_coach_of(user_id), which asks "does the caller
-- coach ANY team this player is on?" — so for a player on teams X and Y, X's
-- coach could read the player's TEAM-Y row (its team_id and Y's derived
-- values). The hard rule (CLAUDE.md / TEAM-ARCHITECTURE.md) is that coach
-- access is TEAM-SCOPED: a coach reads their own team's rows only. Fix: scope
-- the policy to the ROW'S team via the existing is_coach_of_team() helper
-- (SECURITY DEFINER, search_path pinned — 20260705).
-- ============================================================================
drop policy if exists "player or their coach" on public.player_status;
create policy "player or their coach" on public.player_status
  for select using (auth.uid() = user_id or is_coach_of_team(team_id));

-- The player-scoped helper is now unused by any policy. Drop it so the
-- over-broad path can't be reintroduced by accident (it was also a PUBLIC-
-- executable membership oracle: any signed-in user could probe whether they
-- coach a given user id).
drop function if exists public.is_coach_of(uuid);

-- ============================================================================
-- GAP 2 — any team member could read teams.join_code.
--
-- The members-read policy on teams returns whole rows, so any PLAYER could
-- select the join code and invite anyone until the coach rotates it. Same
-- fix pattern as S2 (20260706, wearable_connections tokens): RLS scopes ROWS,
-- column privileges scope COLUMNS — revoke table SELECT and re-grant it
-- column-by-column, omitting join_code. The SECURITY DEFINER RPCs are
-- unaffected (create_team / join_team_with_code still RETURN the row they
-- mint/match — a joiner already knows the code they typed), and service_role
-- bypasses this entirely.
--
-- NOTE for app code: with column-level privileges in force, a PostgREST
-- select('*') on teams fails — always list columns explicitly.
-- ============================================================================
revoke select on public.teams from anon, authenticated;
grant select (id, name, sport, season, schedule, created_by,
              created_at, updated_at, deleted_at)
  on public.teams to authenticated;
-- (no grant to anon: a signed-out client sees nothing, matching the RLS intent)

-- Coaches still need to DISPLAY the code (setup page, dashboard join-code
-- card), so give them a read RPC — same style + coach check as
-- rotate_team_code (20260710). Returns the code, or null when the team has
-- none yet; raises for anyone who is not an active coach of THAT team.
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
