-- ============================================================================
-- 009_avatars_storage.sql — profile avatar photos
-- ============================================================================
-- Adds a Storage bucket for user avatar photos. Run this in the Supabase SQL
-- Editor (SQL Editor → New query → paste → Run). Safe to re-run.
--
-- Design:
--   - One PUBLIC bucket, 'avatars', so the app can render a photo by its URL.
--   - Each user may only write/replace/delete objects inside a top-level folder
--     named after their own auth.uid() (e.g. "<uid>/avatar_1718980000.jpg").
--     Reads are public; writes are locked to the owner by Row Level Security.
--
-- This does NOT change any Postgres table — the resulting public URL is saved in
-- the existing users.profile JSONB (profile.avatar.url) by the app.
-- ============================================================================

-- The bucket (public read).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone may read avatar objects (they're public profile photos).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- A signed-in user may upload only within their own uid folder.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- …and update only their own objects.
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- …and delete only their own objects.
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
