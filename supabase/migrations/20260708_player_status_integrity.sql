-- 20260708_player_status_integrity.sql — S11: server-authoritative player_status.
-- Finding: docs/SECURITY-AUDIT.md addendum. The coach board (player_status) is
-- written by the PLAYER'S OWN client (teamStatus.js). RLS guarantees a player
-- writes only their OWN row, but not that the VALUES are honest — a player could
-- publish a dishonest coach-facing safety signal.
--
-- THE DESIGN DECISION (docs/superpowers/specs/2026-07-05-player-status-integrity.md):
-- the chip's two stated threats are "'available' while red-flagged" and "fake
-- readiness" — precisely the two fields that ARE cleanly derivable from the
-- owner-only source tables in SQL. A BEFORE INSERT/UPDATE trigger OVERRIDES those
-- two with server truth:
--   * injury_status  ← derived from the player's `injuries` (the safety-critical
--                       field a coach acts on; unambiguous in SQL).
--   * readiness      ← the raw `daily_metrics.readiness_score` the player logged
--                       (the engine's computeReadiness returns this when present;
--                       null when there's no logged score — never a client number).
-- The soft TREND metrics (acwr, load_state, adherence_pct) depend on the engine's
-- EWMA load model; reimplementing that in SQL would DRIFT from the player's own
-- app and confuse the board. They stay engine-computed (client-proposed) but are
-- CLAMPED to sane ranges so a client can't inject garbage. A coach never makes a
-- safety/selection call on a soft trend the way they do on 'out' — so overriding
-- the two safety fields closes the actual hole with zero engine drift.
--
-- Raw vitals (hrv/rhr/sleep) NEVER appear here — they feed the readiness_score in
-- the owner-only table and stay there. The five-column contract is preserved.
--
-- The player still WRITES player_status (own-row RLS unchanged) — integrity comes
-- from the trigger correcting it, not from revoking the write. Idempotent.

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

-- BEFORE INSERT/UPDATE: override the safety fields with server truth; clamp the
-- soft metrics; a player can no longer publish a false availability or readiness.
create or replace function public.player_status_server_truth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.injury_status := derive_injury_status(new.user_id);
  new.readiness     := latest_readiness(new.user_id);
  -- clamp soft, engine-computed trend metrics to sane ranges (garbage rejection).
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
