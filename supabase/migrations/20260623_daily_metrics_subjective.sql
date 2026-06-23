-- supabase/migrations/20260623_daily_metrics_subjective.sql
-- Subjective-wellness capture (Home daily check-in) feeds the recovery module's
-- objective+subjective readiness blend — subjective self-report is at least as
-- sensitive as HRV/RHR (Saw, Main & Gastin 2016, BJSM). energy/soreness/mood already
-- exist; add the remaining inputs + the illness/travel session-override flags.
-- See docs/engine/01-PANEL-REVIEW.md §3.3 and docs/engine/02-REFACTOR-ROADMAP.md (Phase 3).
alter table public.daily_metrics
  add column if not exists stress  numeric,                        -- 1-5 (5 = calm)
  add column if not exists illness boolean not null default false,
  add column if not exists travel  boolean not null default false;
