-- 20260706_security_hardening.sql — multi-user security hardening.
-- Findings: docs/SECURITY-AUDIT.md addendum (2026-07-05). Closes S2 (CRITICAL),
-- S3, S6, S9, S10. Idempotent; applied to STAGING first, prod on review.
--
-- The anon key is public, so client-side validation is bypassable — these are
-- the DB-level backstops that actually hold for a multi-user attacker.

-- ============================================================================
-- S2 (CRITICAL) — hide raw OAuth tokens from the browser.
-- RLS scopes ROWS to the owner, but column privileges are separate: the owning
-- browser could `select access_token, refresh_token` and exfiltrate long-lived
-- provider credentials (XSS-durable). The app only ever reads non-token columns
-- (provider/role/connected_at/last_synced_at). Revoke table SELECT and re-grant
-- it column-by-column, omitting the two token columns. service_role (the Edge
-- Functions) bypasses this and keeps full access.
-- ============================================================================
revoke select on public.wearable_connections from anon, authenticated;
grant select (id, user_id, provider, provider_user_id, expires_at, scope,
              connected_at, last_synced_at, role, created_at, updated_at)
  on public.wearable_connections to authenticated;
-- (no grant to anon: a signed-out client sees nothing, matching the RLS intent)

-- ============================================================================
-- S3 — DB-level bounds on coach-visible free-text (client caps are bypassable).
-- NOT VALID so they enforce on every new/updated row without a full-table scan
-- of legacy data (VALIDATE later once legacy rows are confirmed clean).
-- ============================================================================
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
-- far above any legitimate profile incl. the athlete model).
alter table public.users
  drop constraint if exists chk_users_profile_size,
  add  constraint chk_users_profile_size check (pg_column_size(profile) <= 262144) not valid;

-- Team surfaces are coach/teammate-visible — bound their free-text too.
alter table public.teams
  drop constraint if exists chk_team_name_len,
  add  constraint chk_team_name_len check (char_length(coalesce(name, '')) <= 120) not valid;

alter table public.player_status
  drop constraint if exists chk_player_status_texts,
  add  constraint chk_player_status_texts
       check (char_length(coalesce(load_state, '')) <= 40
              and char_length(coalesce(injury_status, '')) <= 40) not valid;

-- ============================================================================
-- S10 — pin search_path on handle_new_user (every other DEFINER fn does).
-- ============================================================================
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

-- ============================================================================
-- S6 — complete the hard-delete path. set_logs/workouts DO cascade from
-- public.users (FK on delete cascade), so the existing delete_user() is already
-- complete for a hard delete — but make it EXPLICIT (belt-and-suspenders, and
-- clear intent) and add the team surfaces the user owns.
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
-- S9 — a member removed by a coach (status 'left') must not silently re-join by
-- flipping their own status back to 'active'. Extend the existing guard.
-- ============================================================================
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
