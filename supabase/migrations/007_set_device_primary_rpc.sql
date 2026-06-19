-- ============================================================================
-- Migration 007: set_device_primary RPC (atomic role flip)
-- ============================================================================
-- Makes one device the user's sole primary in a single statement. SECURITY
-- DEFINER so it can update wearable_connections.role without a broad browser
-- UPDATE policy on that token-bearing table; it only ever writes `role`, never
-- tokens. A single UPDATE avoids the transient two-primary state that would
-- violate the uniq_wearable_primary_per_user partial unique index.
-- ============================================================================

create or replace function public.set_device_primary(p_provider text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.wearable_connections
  set role = case when provider = p_provider then 'primary' else 'secondary' end
  where user_id = auth.uid();
$$;

revoke all on function public.set_device_primary(text) from public;
grant execute on function public.set_device_primary(text) to authenticated;
