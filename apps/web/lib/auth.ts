/**
 * auth — the coach sign-in seam.
 *
 * The /login page calls signInCoach(). Right now it's a STUB: it validates the
 * inputs and resolves so the flow (loading → redirect to /dashboard) is real and
 * testable, but it does NOT check credentials against a backend yet.
 *
 * ── Wiring real auth (mirrors apps/web/README.md "Adding auth") ────────────
 * The coach uses the SAME Supabase project as the mobile app, so the same email
 * + password just work once this is wired:
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(URL, ANON_KEY);   // anon key only — never service_role
 *
 *   export async function signInCoach(email, password) {
 *     const { error } = await supabase.auth.signInWithPassword({ email, password });
 *     if (error) return { ok: false, error: "Email or password is incorrect." };
 *     return { ok: true };
 *   }
 *
 * Then add middleware.ts to gate /dashboard on a valid session and read the
 * coach's team_id before loading data (see README "Adding auth", steps 1–3).
 */
import { isValidEmail } from "@/lib/leads";

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInCoach(
  email: string,
  password: string,
): Promise<SignInResult> {
  // Basic validation so the UI's error states are real even while stubbed.
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Enter your password." };
  }

  // Simulate a network round-trip so the loading state is visible.
  await new Promise((r) => setTimeout(r, 600));

  // STUB: accept any well-formed credentials for now. Replace with Supabase
  // (see header). The dashboard currently runs on mock data with no gate, so
  // this is a front-door placeholder, not a security boundary.
  return { ok: true };
}
