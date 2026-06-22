-- ============================================================================
-- 010_validation_constraints.sql — server-side value bounds (defence in depth)
-- ============================================================================
-- Mirrors src/lib/validation/rules.js. Run in the Supabase SQL editor.
-- Constraints are NOT VALID so they apply to new/updated rows without failing
-- on legacy data. CHECKs allow NULL, so optional fields stay optional.
-- Safe to re-run: each constraint is dropped first.
-- ============================================================================

-- session_logs: 1–5 ratings + capped notes
alter table public.session_logs drop constraint if exists chk_session_logs_quality;
alter table public.session_logs add  constraint chk_session_logs_quality  check (quality  between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_energy;
alter table public.session_logs add  constraint chk_session_logs_energy   check (energy   between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_recovery;
alter table public.session_logs add  constraint chk_session_logs_recovery check (recovery between 1 and 5) not valid;
alter table public.session_logs drop constraint if exists chk_session_logs_notes_len;
alter table public.session_logs add  constraint chk_session_logs_notes_len check (char_length(notes) <= 2000) not valid;

-- daily_metrics: physiological + subjective bounds + capped notes
alter table public.daily_metrics drop constraint if exists chk_daily_resting_hr;
alter table public.daily_metrics add  constraint chk_daily_resting_hr   check (resting_hr between 30 and 220) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_hrv;
alter table public.daily_metrics add  constraint chk_daily_hrv          check (hrv_ms between 1 and 400) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_spo2;
alter table public.daily_metrics add  constraint chk_daily_spo2         check (spo2_pct between 50 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_score;
alter table public.daily_metrics add  constraint chk_daily_sleep_score  check (sleep_score between 0 and 100) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_sleep_dur;
alter table public.daily_metrics add  constraint chk_daily_sleep_dur    check (sleep_duration_min between 0 and 1440) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_energy;
alter table public.daily_metrics add  constraint chk_daily_energy       check (energy between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_soreness;
alter table public.daily_metrics add  constraint chk_daily_soreness     check (soreness between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_mood;
alter table public.daily_metrics add  constraint chk_daily_mood         check (mood between 1 and 5) not valid;
alter table public.daily_metrics drop constraint if exists chk_daily_notes_len;
alter table public.daily_metrics add  constraint chk_daily_notes_len    check (char_length(notes) <= 2000) not valid;

-- weekly_checkins: bounds + capped notes (DB-level only; app wiring deferred)
alter table public.weekly_checkins drop constraint if exists chk_checkin_bodyweight;
alter table public.weekly_checkins add  constraint chk_checkin_bodyweight check (bodyweight_kg between 30 and 300) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_resting_hr;
alter table public.weekly_checkins add  constraint chk_checkin_resting_hr check (resting_hr between 30 and 220) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_rpe;
alter table public.weekly_checkins add  constraint chk_checkin_rpe        check (avg_rpe between 1 and 10) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_sleep_score;
alter table public.weekly_checkins add  constraint chk_checkin_sleep_score check (sleep_score between 0 and 100) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_knee;
alter table public.weekly_checkins add  constraint chk_checkin_knee       check (knee_rating between 1 and 5) not valid;
alter table public.weekly_checkins drop constraint if exists chk_checkin_notes_len;
alter table public.weekly_checkins add  constraint chk_checkin_notes_len  check (char_length(notes) <= 2000) not valid;

-- injuries: 1–5 severity, enum status, capped text
alter table public.injuries drop constraint if exists chk_injury_severity;
alter table public.injuries add  constraint chk_injury_severity check (severity between 1 and 5) not valid;
alter table public.injuries drop constraint if exists chk_injury_status;
alter table public.injuries add  constraint chk_injury_status   check (status in ('active','rehabbing','recovered','monitoring')) not valid;
alter table public.injuries drop constraint if exists chk_injury_title_len;
alter table public.injuries add  constraint chk_injury_title_len check (char_length(title) <= 120) not valid;
alter table public.injuries drop constraint if exists chk_injury_desc_len;
alter table public.injuries add  constraint chk_injury_desc_len  check (char_length(description) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_rehab_len;
alter table public.injuries add  constraint chk_injury_rehab_len check (char_length(rehab_plan) <= 2000) not valid;
alter table public.injuries drop constraint if exists chk_injury_prevention_len;
alter table public.injuries add  constraint chk_injury_prevention_len check (char_length(prevention_notes) <= 2000) not valid;
