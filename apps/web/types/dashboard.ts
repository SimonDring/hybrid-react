/**
 * Dashboard domain types.
 *
 * The most important idea here is the PRIVACY BOUNDARY:
 *
 *  - `CoachVisiblePlayer` is the ONLY per-player shape the coach UI consumes.
 *    It is derived from the live `player_status` row — the one coach-readable
 *    surface (docs/product/TEAM-ARCHITECTURE.md). The roll-up from raw vitals
 *    happened on the PLAYER'S device (apps/mobile/src/lib/teamStatus.js) and the
 *    safety fields were re-stamped server-side (S11 trigger); raw HRV / sleep /
 *    resting-HR never reach this app in any form.
 *
 * `lib/liveDerive.ts` maps the row's seven safe fields to this view-model —
 * RAG status, plain-English reasons, and confidence are computed coach-side
 * from the derived signals only.
 */

/** Red / Amber / Green / Grey player status. */
export type PlayerStatus = "green" | "amber" | "red" | "grey";

/**
 * Plain-English training-load band. This is the LIVE vocabulary — the
 * CHECK-constrained values the player app writes from the shared ACWR
 * (apps/mobile/src/lib/teamStatus.js): one number, two audiences.
 */
export type LoadState =
  | "no-data"
  | "ramping" // ACWR < 0.8 — building back up from a low base
  | "balanced" // 0.8–1.3
  | "high" // 1.3–1.5 — climbed quickly
  | "overreaching"; // > 1.5

/** Injury availability — a category only. The coach never sees injury detail. */
export type InjuryStatus = "available" | "modified" | "out";

/** How much to trust a recommendation, based on data completeness. */
export type Confidence = "high" | "medium" | "low";

/** A single day's session/check-in completion, for the weekly grid + heatmap. */
export type AdherenceState = "completed" | "partial" | "missed" | "none";

export interface AdherenceDay {
  label: string; // "Mon"
  date: string; // ISO date
  state: AdherenceState;
  sessionName?: string;
}

/* ------------------------------------------------------------------ */
/* COACH-VISIBLE — derived from the live `player_status` row           */
/* ------------------------------------------------------------------ */

export interface CoachVisiblePlayer {
  id: string; // the player's user id (the row's user_id)
  name: string; // server-derived display_name (never client-claimed)

  status: PlayerStatus;
  readinessScore: number | null; // 0–100 derived score (null = no data)
  loadState: LoadState;
  acwr: number | null; // shown only behind "advanced details"
  adherencePercent: number | null; // null = no logged sessions yet
  /** When the player's roll-up row was last written (the row's updated_at). */
  lastUpdated: string | null;

  injuryFlag: boolean;
  injuryStatus: InjuryStatus;

  /** Plain-English derived flags, e.g. "Readiness well below normal". */
  reasons: string[];
  coachAction: string;
  playerAction: string;
  confidence: Confidence;
  dataUsed: string[];
  dataMissing: string[];
  nextReview: string; // plain-English, e.g. "Before today's session"

  /**
   * History surfaces — EMPTY on the live board today (player_status is a
   * single current row). Components render honest empty states; these fill
   * in when a history feed lands.
   */
  weeklyAdherence: AdherenceDay[];
  readinessTrend: number[];
  loadTrend: number[];
  nextSession?: { name: string; date: string } | null;
}

/* ------------------------------------------------------------------ */
/* TEAM                                                                */
/* ------------------------------------------------------------------ */

export type FixtureType = "match" | "pitch" | "pool" | "track" | "gym";

export interface TeamFixture {
  id: string;
  type: FixtureType;
  label: string; // "League match vs Riverside"
  date: string; // ISO date
}

export interface Team {
  id: string;
  name: string;
  sport: string | null;
  seasonPhase: string; // "In-season" (mapped from teams.season; "—" when unset)
  /** The share code players use to join (visible to the coach only). */
  joinCode?: string | null;
  /**
   * Schedule-derived fields — ABSENT until the team schedule → constraints
   * feature lands (TEAM-NEXT-STEPS §3). Panels show honest empty states.
   */
  currentWeek?: number;
  totalWeeks?: number;
  nextFixture?: TeamFixture | null;
  matchWeekFocus?: string;
  matchWeekAdjustment?: string;
}

/** Roster shape vs. reporting shape — surfaced so the board can be honest
 * about players who joined but haven't synced a status row yet. */
export interface RosterSummary {
  /** Active player memberships on the team. */
  joined: number;
  /** player_status rows currently on the board. */
  reporting: number;
}

/** One week of the team load-trend chart. */
export interface LoadTrendPoint {
  week: string; // "W1"
  teamAvgLoad: number;
  plannedLoad: number;
  flaggedThreshold: number;
}

/** A single recommended operational action in the coach-actions panel. */
export interface CoachActionItem {
  id: string;
  label: string;
  detail: string;
  tone: "ready" | "monitor" | "adjust" | "nodata" | "accent";
  count?: number;
}

/* ------------------------------------------------------------------ */
/* TEAM CONSTRAINTS — the coach-set inputs that steer player plans      */
/* ------------------------------------------------------------------ */

/** What a given weekday is for (a recurring weekly template). */
export type SessionType =
  | "match"
  | "pitch"
  | "gym"
  | "pool"
  | "track"
  | "conditioning"
  | "rest";

export interface WeeklyTrainingDay {
  day: string; // "Mon" … "Sun"
  type: SessionType;
}

/**
 * The team's fixed constraints. In production this maps to the `teams.schedule`
 * jsonb and feeds the engine's scheduler/periodisation so each player's gym work
 * is steered clear of sport load and fixtures.
 */
export interface TeamConstraints {
  sport: string;
  seasonPhase: string;
  weeklyPattern: WeeklyTrainingDay[]; // 7 entries, Mon–Sun
  fixtures: TeamFixture[]; // upcoming matches / events
}
