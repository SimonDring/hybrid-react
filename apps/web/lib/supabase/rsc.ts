/**
 * Supabase client for SERVER COMPONENTS (the RSC sibling of the proxy client).
 * Reads the coach's session from the request cookies via next/headers, so every
 * query runs under their own RLS — the anon key only, never service_role.
 *
 * Server components cannot WRITE cookies; token refresh is the proxy's job
 * (it runs on every /dashboard request before we do), so setAll is a no-op.
 * Returns null when the backend isn't configured — callers degrade instead of
 * throwing at build time (the proxy already denies /dashboard in that state).
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseRSC() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: a server component can't set cookies; the proxy refreshes.
      },
    },
  });
}
