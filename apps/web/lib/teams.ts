/**
 * teams — coach-side team ops for the web app (join codes; Simon's decision).
 * All via the RPCs proven on staging; anon key only. Returns tagged results so
 * the UI can show real error/success states.
 */
import { supabaseBrowser } from "@/lib/supabase/browser";
import { SEASON_CODE_OF } from "@/lib/constraints";
import type { TeamConstraints } from "@/types/dashboard";

export interface CoachTeam {
  team_id: string;
  name: string;
  sport: string | null;
  join_code: string | null;
  role: string;
}

export async function createTeam(
  name: string,
  sport?: string,
): Promise<{ ok: true; team: CoachTeam } | { ok: false; error: string }> {
  const supabase = supabaseBrowser();
  if (!supabase) return { ok: false, error: "Sign-in is not available right now." };
  const { data, error } = await supabase.rpc("create_team", {
    p_name: name,
    p_sport: sport || null,
  });
  if (error) return { ok: false, error: error.message || "Could not create the team." };
  const t = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    team: { team_id: t.id, name: t.name, sport: t.sport, join_code: t.join_code, role: "coach" },
  };
}

/**
 * The signed-in coach's teams (name + share code) for the setup page.
 * join_code is COLUMN-REVOKED on teams (WP-50, 20260711) — never select it;
 * coaches read it via the get_team_join_code RPC (coach-of-that-team only).
 */
export async function listCoachTeams(): Promise<CoachTeam[]> {
  const supabase = supabaseBrowser();
  if (!supabase) return [];
  const { data: user } = await supabase.auth.getUser();
  const uid = user?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, teams(name, sport)")
    .eq("user_id", uid)
    .eq("role", "coach")
    .eq("status", "active");
  if (error || !data) return [];
  return Promise.all(
    data.map(async (r: Record<string, unknown>) => {
      const team = r.teams as { name?: string; sport?: string | null } | null;
      const teamId = r.team_id as string;
      const { data: code } = await supabase.rpc("get_team_join_code", { p_team: teamId });
      return {
        team_id: teamId,
        role: r.role as string,
        name: team?.name || "Team",
        sport: team?.sport ?? null,
        join_code: (code as string | null) ?? null,
      };
    }),
  );
}

/**
 * Persist the coach's constraints: sport/season to their own columns (season
 * as the code via SEASON_CODE_OF), weeklyPattern+fixtures to teams.schedule
 * (the cross-app contract players read — spec 2026-07-05-team-schedule-
 * constraints-design.md). Coach-update RLS enforces who may write.
 */
export async function saveTeamSchedule(
  teamId: string,
  constraints: TeamConstraints,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = supabaseBrowser();
  if (!supabase) return { ok: false, error: "Saving is not available right now." };
  const { error } = await supabase
    .from("teams")
    .update({
      sport: constraints.sport || null,
      season: SEASON_CODE_OF[constraints.seasonPhase] ?? constraints.seasonPhase ?? null,
      schedule: {
        weeklyPattern: constraints.weeklyPattern,
        fixtures: constraints.fixtures,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId);
  if (error) return { ok: false, error: error.message || "Could not save the schedule." };
  return { ok: true };
}

export async function rotateCode(
  teamId: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const supabase = supabaseBrowser();
  if (!supabase) return { ok: false, error: "unavailable" };
  const { data, error } = await supabase.rpc("rotate_team_code", { p_team: teamId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, code: data as string };
}
