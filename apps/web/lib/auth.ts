/**
 * auth — coach sign-in against Supabase (the SAME project as the mobile app, so
 * the coach's existing email + password work). Anon key only.
 *
 * The middleware (middleware.ts) is the authoritative gate; signInCoach ALSO
 * verifies active-coach membership here purely for a clean error message (so a
 * non-coach sees "not a team coach" instead of a silent redirect bounce).
 */
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";
import { isValidEmail } from "@/lib/leads";

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInCoach(
  email: string,
  password: string,
): Promise<SignInResult> {
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Enter your password." };

  const supabase = supabaseBrowser();
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, error: "Sign-in is not available right now." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, error: "Email or password is incorrect." };
  }

  // Must be an active coach of at least one team (own-membership RLS).
  const { data: coachRows } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", data.user.id)
    .eq("role", "coach")
    .eq("status", "active")
    .limit(1);
  if (!coachRows || coachRows.length === 0) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account isn't a team coach." };
  }

  return { ok: true };
}

/** True when a real Supabase session exists (used to skip the login form). */
export async function hasCoachSession(): Promise<boolean> {
  const supabase = supabaseBrowser();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}
