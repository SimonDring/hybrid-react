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
  TeamConstraints,
  TeamFixture,
} from "@/types/dashboard";
import { supabaseRSC } from "./supabase/rsc";
import { deriveLivePlayer, type PlayerStatusRow } from "./liveDerive";
import { SEASON_LABEL_OF, constraintsForTeam, parseTeamSchedule } from "./constraints";

export interface LiveDashboardData {
  team: Team;
  players: CoachVisiblePlayer[];
  roster: RosterSummary;
  /** The saved teams.schedule (or honest defaults) — seeds the provider. */
  initialConstraints: TeamConstraints;
  loadTrend: LoadTrendPoint[];
  now: string;
}

function seasonPhaseOf(season: string | null): string | null {
  if (!season) return null;
  return SEASON_LABEL_OF[season] ?? season;
}

/** The earliest MATCH fixture dated today or later, if any. */
function nextMatchFixture(fixtures: TeamFixture[], now: Date): TeamFixture | null {
  const today = now.toISOString().slice(0, 10);
  const upcoming = fixtures
    .filter((f) => f.type === "match" && f.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/**
 * The live read. Returns null ONLY for the states the proxy normally prevents
 * (no session / genuinely no coached team) — callers redirect to /get-started.
 * A FAILED query, by contrast, THROWS: rendering a query error as an empty
 * board would tell a coach their squad left when the read simply broke (the
 * Next error boundary is the honest surface for that).
 */
export async function getLiveDashboardData(): Promise<LiveDashboardData | null> {
  const supabase = await supabaseRSC();
  if (!supabase) return null;

  // Local cookie decode only — the proxy already validated this request's JWT
  // with the auth server, and RLS is the real enforcement on every query below.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // The coach's first team (oldest active coach membership, live teams only —
  // !inner so a soft-deleted team's membership can't win the limit(1)).
  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, created_at, teams!inner(id, name, sport, season, join_code, schedule, deleted_at)")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .eq("status", "active")
    .is("teams.deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (membershipError) {
    throw new Error(`Could not load your team: ${membershipError.message}`);
  }

  const membership = memberships?.[0];
  // many-to-one embed: PostgREST returns an object, but tolerate an array shape.
  const embedded = membership?.teams;
  const teamRow = (Array.isArray(embedded) ? embedded[0] : embedded) as
    | { id: string; name: string; sport: string | null; season: string | null; join_code: string | null; schedule: unknown }
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
      .select("user_id")
      .eq("team_id", teamRow.id)
      .eq("role", "player")
      .eq("status", "active"),
  ]);
  if (statusRes.error) {
    throw new Error(`Could not load the squad board: ${statusRes.error.message}`);
  }
  if (rosterRes.error) {
    throw new Error(`Could not load the roster: ${rosterRes.error.message}`);
  }

  // Reconcile the board against the ACTIVE roster: a status row can outlive a
  // membership (a player who left) or belong to the coach themselves — neither
  // is a current player, so neither may render as one. This also guarantees
  // joined >= reporting, keeping the awaiting-first-sync count non-negative.
  const activePlayerIds = new Set((rosterRes.data ?? []).map((r) => r.user_id as string));
  const now = new Date();
  const players = ((statusRes.data ?? []) as PlayerStatusRow[])
    .filter((row) => activePlayerIds.has(row.user_id))
    .map((row) => deriveLivePlayer(row, now))
    .sort((a, b) => a.name.localeCompare(b.name));

  const team: Team = {
    id: teamRow.id,
    name: teamRow.name,
    sport: teamRow.sport,
    seasonPhase: seasonPhaseOf(teamRow.season),
    joinCode: teamRow.join_code,
  };

  // A saved schedule seeds the constraints AND lights up the match-week
  // surfaces from real fixtures; no schedule yet = honest defaults.
  const saved = parseTeamSchedule(teamRow.schedule);
  const initialConstraints: TeamConstraints = saved
    ? { ...constraintsForTeam(team), ...saved }
    : constraintsForTeam(team);
  if (saved) team.nextFixture = nextMatchFixture(saved.fixtures, now);

  return {
    team,
    players,
    roster: { joined: activePlayerIds.size, reporting: players.length },
    initialConstraints,
    loadTrend: [],
    now: now.toISOString(),
  };
}
