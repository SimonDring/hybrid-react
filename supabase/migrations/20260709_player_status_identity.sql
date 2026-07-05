-- 20260709_player_status_identity.sql — coach-board identity.
-- The coach board (player_status) had no way to name its rows: `users` is
-- own-row-only RLS, so a coach cannot read a teammate's `name`. Without a name
-- the derived board is unusable. This adds a coach-visible `display_name` to
-- player_status, DERIVED SERVER-SIDE from the player's own profile (same override
-- pattern as S11's injury_status/readiness — so it cannot be spoofed and never
-- needs a client change). A name is not health data; a coach seeing the name of a
-- player they rostered is inherent to the Team package (TEAM-ARCHITECTURE.md).
-- Raw vitals remain owner-only. Idempotent.

alter table public.player_status
  add column if not exists display_name text;

alter table public.player_status
  drop constraint if exists chk_player_status_name_len,
  add  constraint chk_player_status_name_len
       check (display_name is null or char_length(display_name) <= 80) not valid;

-- The player's display name from their own profile (server truth): the profile
-- jsonb 'name', falling back to the top-level users.name.
create or replace function public.player_display_name(target uuid)
returns text language sql security definer stable set search_path = public as $$
  select left(coalesce(nullif(u.profile->>'name', ''), u.name, ''), 80)
  from users u where u.id = target;
$$;

-- Extend the S11 server-truth trigger to also stamp display_name (server-derived,
-- so a client can never publish a misleading identity). Same body + one line.
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
-- (trigger definition unchanged — already BEFORE INSERT OR UPDATE from 20260708)
