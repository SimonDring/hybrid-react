-- 20260710_team_join_codes.sql — Team founding + invites via JOIN CODES.
-- Decision (docs/product/TEAM-NEXT-STEPS.md, Simon 2026-07-05): a coach founds a
-- team and gets a short shareable code; a player enters the code in the mobile
-- app to self-join. No email-resolution complexity. All via SECURITY DEFINER RPCs
-- (the authorized paths), so the write policies stay tight. Idempotent.

-- A short, human-shareable code on each team (ambiguous chars omitted).
alter table public.teams add column if not exists join_code text;
create unique index if not exists idx_teams_join_code on public.teams(join_code) where join_code is not null;

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
