-- ============================================================================
-- 012_drop_allowed_emails.sql — remove the vestigial invite allowlist
-- ============================================================================
-- Signup has been open since migration 004 (handle_new_user no longer checks the
-- allowlist). The allowed_emails table was left in place but has NO Row Level
-- Security, so it is a stray, world-reachable email list. Nothing references it
-- any more, so drop it. Run in the Supabase SQL editor. Safe to re-run.
--
-- Reconciled in supabase/schema.sql so a fresh setup no longer creates it.
-- ============================================================================

drop table if exists public.allowed_emails;
