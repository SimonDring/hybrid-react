/**
 * liveBoard — assembles the coach dashboard's data from the LIVE team spine.
 *
 * Runs in a server component behind the S12 gate (proxy.ts): every query uses
 * the coach's own cookie session, so RLS does the scoping — a coach can only
 * ever receive their own team's derived rows (proven by the staging harness).
 *
 * v1 scope decisions (spec: 2026-07-05-live-coach-board-design.md):
 *  - The coach's FIRST team (oldest membership). A team switcher is a follow-up.
 *  - loadTrend is EMPTY — there is no team-load history feed yet; the chart
 *    renders an honest empty state.
 *  - Roster vs. reporting counts are surfaced so the board can say
 *    "N joined, awaiting their first sync" instead of showing ghost rows.
 */
import type {
  CoachVisiblePlayer,
  LoadTrendPoint,
  RosterSummary,
  Team,
} from "@/types/dashboard";
import { supabaseRSC } from "./supabase/rsc";
import { deriveLivePlayer, type PlayerStatusRow } from "./liveDerive";

export interface LiveDashboardData {
  team: Team;
  players: CoachVisiblePlayer[];
  roster: RosterSummary;
  loadTrend: LoadTrendPoint[];
  now: string;
}

const SEASON_LABELS: Record<string, string> = {
  in: "In-season",
  off: "Off-season",
  pre: "Pre-season",
};

function seasonPhaseOf(season: string | null): string {
  if (!season) return "—";
  return SEASON_LABELS[season] ?? season;
}

/**
 * The live read. Returns null when there is no session or no coached team —
 * the proxy normally prevents both, so callers just redirect as a fallback.
 */
export async function getLiveDashboardData(): Promise<LiveDashboardData | null> {
  const supabase = await supabaseRSC();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The coach's first team (oldest active coach membership).
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, created_at, teams(id, name, sport, season, join_code)")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  // many-to-one embed: PostgREST returns an object, but tolerate an array shape.
  const embedded = membership?.teams;
  const teamRow = (Array.isArray(embedded) ? embedded[0] : embedded) as
    | { id: string; name: string; sport: string | null; season: string | null; join_code: string | null }
    | null
    | undefined;
  if (!membership || !teamRow) return null;

  const [statusRes, rosterRes] = await Promise.all([
    supabase
      .from("player_status")
      .select(
        "user_id, display_name, readiness, load_state, acwr, adherence_pct, injury_status, updated_at",
      )
      .eq("team_id", teamRow.id),
    supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", teamRow.id)
      .eq("role", "player")
      .eq("status", "active"),
  ]);

  const now = new Date();
  const rows = (statusRes.data ?? []) as PlayerStatusRow[];
  const players = rows
    .map((row) => deriveLivePlayer(row, now))
    .sort((a, b) => a.name.localeCompare(b.name));

  const team: Team = {
    id: teamRow.id,
    name: teamRow.name,
    sport: teamRow.sport,
    seasonPhase: seasonPhaseOf(teamRow.season),
    joinCode: teamRow.join_code,
  };

  return {
    team,
    players,
    roster: { joined: rosterRes.count ?? players.length, reporting: players.length },
    loadTrend: [],
    now: now.toISOString(),
  };
}
