-- ============================================================================
-- Migration 002: invite allowlist
-- Run this in Supabase SQL Editor → New query → paste → Run.
--
-- Lets a controlled set of testers sign in on the current project. Only emails
-- listed in allowed_emails can create an account; everyone else is rejected at
-- signup (server-enforced, can't be bypassed from the browser). Row Level
-- Security already keeps each user's training data private to them.
-- ============================================================================

create table if not exists public.allowed_emails (
  email      text primary key,          -- store lowercase; we match case-insensitively
  note       text,                       -- e.g. "tester — Jane"
  created_at timestamptz not null default now()
);

-- Seed the first allowed accounts. Add testers here (or via the Table Editor)
-- as you invite them. Emails are matched case-insensitively, so lowercase is fine.
insert into public.allowed_emails (email, note) values
  ('simon.dring7@gmail.com', 'owner')
on conflict (email) do nothing;

-- ----------------------------------------------------------------------------
-- Augment the signup trigger to enforce the allowlist.
-- handle_new_user() runs in the same transaction as the auth.users insert, so a
-- raised exception rolls the whole signup back. It still copies name + email
-- into the public.users profile row (unchanged behaviour) once allowed.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'email % is not on the invite list', new.email
      using errcode = 'check_violation';
  end if;

  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger itself is unchanged; recreating the function above is enough.
