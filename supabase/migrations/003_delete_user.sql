-- 003_delete_user.sql
-- Lets a signed-in user permanently delete their own account + all their data.
--
-- The browser only holds the anon key, which can't touch auth.users, so account
-- deletion has to run server-side. This SECURITY DEFINER function runs as the
-- function owner (bypassing RLS), deletes every row the caller owns across the
-- app tables, then removes their auth.users record. The client calls it with
-- supabase.rpc('delete_user') and then signs out + clears local data.
--
-- Apply in the Supabase SQL editor (or via the CLI). Mirrored intent in schema.sql.

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

  -- App data (all keyed by user_id; users keyed by id).
  delete from public.session_logs     where user_id = uid;
  delete from public.sessions         where user_id = uid;
  delete from public.weekly_checkins  where user_id = uid;
  delete from public.reassessments    where user_id = uid;
  delete from public.daily_metrics    where user_id = uid;
  delete from public.injuries         where user_id = uid;
  delete from public.training_plans   where user_id = uid;
  delete from public.wearable_connections where user_id = uid;
  delete from public.users            where id = uid;

  -- Finally the auth account itself.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
