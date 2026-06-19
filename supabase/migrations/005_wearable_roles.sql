-- ============================================================================
-- Migration 005: device roles on wearable_connections
-- ============================================================================
-- Adds a primary/secondary role per connection. Exactly one device per user may
-- be 'primary' (it owns baseline/recovery metrics). Existing Fitbit connections
-- become the primary, since today it's the only baseline source.
-- ============================================================================

alter table public.wearable_connections
  add column if not exists role text not null default 'secondary';

-- At most one primary device per user (partial unique index).
create unique index if not exists uniq_wearable_primary_per_user
  on public.wearable_connections (user_id)
  where role = 'primary';

-- Promote existing Fitbit connections to primary (one per user via the existing
-- unique(user_id, provider), so this satisfies the index above).
update public.wearable_connections set role = 'primary' where provider = 'fitbit';
