-- ============================================================================
-- Migration 004: remove the invite allowlist
-- ============================================================================
-- Opens signup to anyone, on any method (email / Google / Apple). Redefines
-- handle_new_user() to drop the allowlist check while KEEPING profile creation,
-- and broadens the name source so OAuth providers (which use full_name) populate
-- the profile name too. The allowed_emails table is left in place (harmless,
-- now unused) so this migration is reversible by restoring the old function.
-- ============================================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition is unchanged; re-assert it for safety.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
