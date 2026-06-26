/**
 * session — a LIGHTWEIGHT, client-only sign-in marker so the coach journey feels
 * complete before real auth exists: login sets it, the dashboard reads it to show
 * who's signed in + a log-out, and /login skips itself when it's present.
 *
 * ⚠️ This is UX state, NOT security. It's just localStorage — anyone can reach
 * /dashboard directly (it still runs on mock data). When Supabase auth lands
 * (lib/auth.ts), replace these reads with the real session and gate /dashboard in
 * middleware. The component API here won't need to change.
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
}
