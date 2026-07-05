/**
 * middleware — the REAL security boundary for the coach dashboard (S12).
 *
 * /dashboard/* is gated server-side: a valid Supabase session AND an active
 * coach membership (team_members role='coach' status='active', readable under the
 * live 'own membership' RLS). No session or not-a-coach → redirect to /login.
 * The client-side session marker (lib/session.ts) is display-only; THIS is what
 * actually protects other users' data once live reads are wired in.
 *
 * When the backend isn't configured (no Supabase env), the dashboard requires
 * auth we cannot verify, so it's denied — the secure default.
 */
import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromMiddleware } from "@/lib/supabase/server";

export async function middleware(req: NextRequest) {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const deny = (reason: string) => {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", reason);
    return NextResponse.redirect(loginUrl);
  };

  if (!configured) return deny("unavailable");

  const res = NextResponse.next({ request: req });
  const supabase = supabaseFromMiddleware(req, res);

  // getUser() validates the JWT with the auth server (getSession only decodes it).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return deny("signed_out");

  const { data: coachRows, error } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .eq("status", "active")
    .limit(1);
  if (error || !coachRows || coachRows.length === 0) return deny("not_coach");

  return res;
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
