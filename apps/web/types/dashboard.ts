/**
 * Dashboard domain types.
 *
 * The most important distinction here is the PRIVACY BOUNDARY:
 *
 *  - `PlayerPrivateSource` holds raw wearable/check-in vitals (sleep, HRV,
 *    resting HR, soreness, RPE). This is PLAYER-PRIVATE and is NEVER rendered
 *    in the coach dashboard. In production it lives in row-level-secured tables
 *    that a coach cannot read (daily_metrics, wearable_readings).
 *
 *  - `CoachVisiblePlayer` is the ONLY shape the coach UI consumes. It maps 1:1
 *    to the planned `player_status` table (see docs/product/TEAM-ARCHITECTURE.md)
 *    and contains only derived, roll-up signals + plain-English flags.
 *
 * `lib/derive.ts` performs the roll-up from private -> coach-visible. In a real
 * deployment that roll-up runs server-side (Edge Function / DB view); here it
 * runs in the mock layer so the boundary is explicit and testable.
 */

/** Red / Amber / Green / Grey player status. */
export type PlayerStatus = "green" | "amber" | "red" | "grey";

/** Plain-English training-load band (derived from ACWR; jargon kept out of UI). */
export type LoadState = "light" | "balanced" | "ramping" | "high";

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
/* PLAYER-PRIVATE — mock source only, never rendered to a coach        */
/* ------------------------------------------------------------------ */

export interface PlayerPrivateSource {
  id: string;
  name: string;
  position: string;

  /** RAW vitals — PRIVATE. Used only to derive the coach-visible signals. */
  sleepHours: number; // last night
  sleepBaselineHours: number; // personal norm
  soreness: number; // self-reported 1–5 (5 = very sore)
  rpeAverage: number; // recent session RPE, 1–10
  hrv: number; // ms
  restingHr: number; // bpm
  wearableSynced: boolean;
  lastCheckIn: string | null; // ISO datetime, or null if never

  /** Availability + load inputs (these roll up to coach-safe fields). */
  injuryFlag: boolean;
  injuryStatus: InjuryStatus;
  weeklyLoad: number; // arbitrary load units this week
  plannedLoad: number; // what the plan prescribed
  acwr: number; // acute:chronic workload ratio
  adherencePercent: number; // % of prescribed sessions completed

  weeklyAdherence: AdherenceDay[];
  readinessTrend: number[]; // last ~10 days of derived readiness (0–100)
  loadTrend: number[]; // last ~10 days of load units

  nextSessionName: string;
  nextSessionDate: string; // ISO date
}

/* ------------------------------------------------------------------ */
/* COACH-VISIBLE — maps 1:1 to the `player_status` table               */
/* ------------------------------------------------------------------ */

export interface CoachVisiblePlayer {
  id: string;
  name: string;
  position: string;

  status: PlayerStatus;
  readinessScore: number | null; // 0–100 derived score (null = no data)
  loadState: LoadState;
  acwr: number | null; // shown only behind "advanced details"
  weeklyLoad: number;
  plannedLoad: number;
  adherencePercent: number;
  lastCheckIn: string | null;

  injuryFlag: boolean;
  injuryStatus: InjuryStatus;

  /** Plain-English derived flags, e.g. "Sleep below normal". Never raw numbers. */
  reasons: string[];
  coachAction: string;
  playerAction: string;
  confidence: Confidence;
  dataUsed: string[];
  dataMissing: string[];
  nextReview: string; // plain-English, e.g. "Before Wednesday's session"

  weeklyAdherence: AdherenceDay[];
  readinessTrend: number[];
  loadTrend: number[];
  nextSession: { name: string; date: string };
}

/** The view-model the reusable recommendation card renders. */
export interface PlayerRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  status: PlayerStatus;
  statusLabel: string;
  meaning: string; // plain-English status meaning
  reasons: string[]; // "why this recommendation"
  playerAction: string;
  coachAction: string;
  dataUsed: string[];
  dataMissing: string[];
  confidence: Confidence;
  nextReview: string;
  injuryFlag: boolean;
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
  sport: string;
  seasonPhase: string; // "In-season"
  currentWeek: number;
  totalWeeks: number;
  nextFixture: TeamFixture;
  lastSyncAt: string; // ISO datetime
  /** Plain-English focus + adjustment for the match-week panel. */
  matchWeekFocus: string;
  matchWeekAdjustment: string;
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
