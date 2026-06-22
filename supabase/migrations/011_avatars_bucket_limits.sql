-- ============================================================================
-- 011_avatars_bucket_limits.sql — restrict the public avatars bucket
-- ============================================================================
-- The avatars bucket (migration 009) is public-read with no server-side limits,
-- so a crafted direct Storage API call (with a valid user token, into the user's
-- own uid/ folder) could upload ANY file type / ANY size and have it served from
-- the public Supabase storage domain. The client re-encodes to a small JPEG, but
-- that is client-side only. This locks the bucket to small image files at the
-- server. Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

update storage.buckets
set
  file_size_limit    = 2097152,  -- 2 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
