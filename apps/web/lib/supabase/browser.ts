/**
 * Supabase browser client for the coach web app (@supabase/ssr) — cookie-based
 * sessions so the server middleware can read them. Anon key only (never
 * service_role). Returns null when the backend isn't configured, so callers
 * degrade gracefully instead of throwing at build/preview time.
 */
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (!isSupabaseConfigured) return null;
  if (!_client) _client = createBrowserClient(url!, anonKey!);
  return _client;
}
