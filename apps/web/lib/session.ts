/**
 * session — a LIGHTWEIGHT, client-only sign-in marker so the coach journey feels
 * complete before real auth exists: login sets it, the dashboard reads it to show
 * who's signed in + a log-out, and /login skips itself when it's present.
 *
 * This is a DISPLAY marker only (whose email to show in the account menu). The
 * REAL security boundary is proxy.ts (server-side session + active-coach
 * check); lib/auth.ts signInCoach mints the Supabase session, signOutSession ends
 * it. This marker no longer protects anything — it's just UX.
 */

const KEY = "po_coach";

export interface CoachSession {
  email: string;
  signedInAt: number;
}

export function signInSession(email: string): void {
  if (typeof window === "undefined") return;
  const session: CoachSession = { email, signedInAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode) — non-fatal */
  }
}

export function getCoachSession(): CoachSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CoachSession) : null;
  } catch {
    return null;
  }
}

export function signOutSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
  // End the REAL Supabase session too (fire-and-forget); the middleware gate then
  // bounces any further /dashboard access to /login.
  import("@/lib/supabase/browser")
    .then(({ supabaseBrowser }) => supabaseBrowser()?.auth.signOut())
    .catch(() => {});
}
