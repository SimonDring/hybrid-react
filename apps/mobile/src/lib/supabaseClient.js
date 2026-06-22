/**
 * Supabase client — single shared instance.
 *
 * Reads connection details from environment variables (Vite exposes vars
 * prefixed with VITE_ to the browser). These live in .env.local, which is
 * gitignored so your keys never get committed.
 *
 *   VITE_SUPABASE_URL       = your project URL (https://xxxx.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  = your project's anon/public key
 *
 * The anon key is SAFE to ship in the browser — Row Level Security on the
 * database is what actually protects data. The anon key only lets a request
 * attempt access; RLS decides what it can see. NEVER put the service_role key
 * here — that bypasses RLS and must stay server-side only (Stage 5 functions).
 *
 * If the env vars are missing, this exports null rather than crashing, so the
 * app still runs in pure-localStorage mode until you wire Supabase in.
 */

import { createClient } from '@supabase/supabase-js';

// Optional chaining so importing this module outside Vite (e.g. a plain-Node
// test runner, where import.meta.env is undefined) doesn't throw — it just
// reports "not configured" and the app falls back to local-only mode.
const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,      // keep the user logged in across reloads
        autoRefreshToken: true,    // refresh expiring tokens automatically
        detectSessionInUrl: true   // handle magic-link redirects
      }
    })
  : null;

if (!isSupabaseConfigured) {
  // Helpful console note during development; harmless in production.
  console.info('[supabase] Not configured (no env vars) — running in local-only mode.');
}

export default supabase;
