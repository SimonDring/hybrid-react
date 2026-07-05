/**
 * proxy — the REAL security boundary for the coach dashboard (S12).
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
import { supabaseFromProxy } from "@/lib/supabase/server";

export async function proxy(req: NextRequest) {
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
  const supabase = supabaseFromProxy(req, res);

  // getUser() validates the JWT with the auth server (getSession only decodes it).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return deny("signed_out");

  // /get-started (found your first team) needs only a session — a brand-new coach
  // isn't a coach of any team YET, so it must sit OUTSIDE the coach check.
  if (req.nextUrl.pathname.startsWith("/get-started")) return res;

  // /dashboard/* additionally requires an ACTIVE coach membership. A signed-in
  // non-coach is sent to found their team (not bounced to /login).
  const { data: coachRows, error } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .eq("status", "active")
    .limit(1);
  if (error || !coachRows || coachRows.length === 0) {
    return NextResponse.redirect(new URL("/get-started", req.url));
  }

  return res;
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*", "/get-started"] };
