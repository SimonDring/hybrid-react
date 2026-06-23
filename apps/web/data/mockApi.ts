/**
 * THE DATA SEAM.
 *
 * Every screen reads the squad through these async getters — never by importing
 * the mock arrays directly. That keeps one swap point: to go live, replace the
 * bodies here with Supabase queries against the row-level-secured `player_status`
 * table (and `teams`), and nothing in the components has to change.
 *
 * The privacy roll-up (raw vitals -> coach-safe signals) happens in
 * lib/derive.ts. In production that roll-up runs server-side; here it runs in
 * getPlayers() so the coach UI literally cannot receive a raw vital.
 */
import type {
  CoachVisiblePlayer,
  LoadTrendPoint,
  PlayerRecommendation,
  Team,
} from "@/types/dashboard";
import { type DeriveContext, deriveCoachPlayer, toRecommendation } from "@/lib/derive";
import { MOCK_NOW } from "./mockClock";
import { MOCK_PLAYER_SOURCES } from "./mockPlayers";
import { RECOMMENDATION_OVERRIDES } from "./mockRecommendations";
import { MOCK_LOAD_TREND, MOCK_TEAM } from "./mockTeam";

const ctx: DeriveContext = {
  now: MOCK_NOW,
  nextFixtureDate: MOCK_TEAM.nextFixture.date,
};

/** Simulates an async boundary so callers are already written for real I/O. */
async function resolve<T>(value: T): Promise<T> {
  return value;
}

export async function getTeam(): Promise<Team> {
  // API: const { data } = await supabase.from("teams").select("*").single();
  return resolve(MOCK_TEAM);
}

export async function getPlayers(): Promise<CoachVisiblePlayer[]> {
  // API: const { data } = await supabase.from("player_status").select("*");
  //      (RLS returns only this coach's team; raw vitals are never selectable.)
  const players = MOCK_PLAYER_SOURCES.map((src) =>
    deriveCoachPlayer(src, ctx, RECOMMENDATION_OVERRIDES[src.id]),
  );
  return resolve(players);
}

export async function getRecommendations(): Promise<PlayerRecommendation[]> {
  const players = await getPlayers();
  return players.map(toRecommendation);
}

export async function getLoadTrend(): Promise<LoadTrendPoint[]> {
  // API: a weekly aggregate view of team load vs plan.
  return resolve(MOCK_LOAD_TREND);
}

/** One call the dashboard page can await to hydrate everything. */
export async function getDashboardData(): Promise<{
  team: Team;
  players: CoachVisiblePlayer[];
  loadTrend: LoadTrendPoint[];
  /**
   * The reference "now" for relative time display. Pinned to the mock clock so
   * the UI is deterministic. In production this is just `new Date()` and can be
   * dropped — relative formatting falls back to the real clock.
   */
  now: string;
}> {
  const [team, players, loadTrend] = await Promise.all([
    getTeam(),
    getPlayers(),
    getLoadTrend(),
  ]);
  return { team, players, loadTrend, now: MOCK_NOW.toISOString() };
}
