-- ============================================================================
-- Migration 008: per-session physiology summary on session_logs
-- ============================================================================
-- Sub-project C attaches each completed session's heart-rate summary to its log
-- row (1:1 with the session). avg/max HR + calories come from the primary band's
-- HR window, or from a linked Strava workout for cardio. hr_zones holds minutes
-- per Heart-Rate-Reserve zone. All nullable — populated by enrichment/linking.
-- ============================================================================

alter table public.session_logs
  add column if not exists avg_hr    numeric,
  add column if not exists max_hr    numeric,
  add column if not exists calories  numeric,
  add column if not exists hr_source text,                       -- 'strava' | 'fitbit' | null
  add column if not exists hr_zones  jsonb;                      -- { z1,z2,z3,z4,z5 } minutes
