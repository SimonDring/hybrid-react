/**
 * THE PRIVACY ROLL-UP.
 *
 * `deriveCoachPlayer` turns a `PlayerPrivateSource` (raw vitals — sleep, HRV,
 * resting HR, soreness, RPE) into a `CoachVisiblePlayer` (derived score + bands
 * + plain-English flags). The coach UI only ever sees the output. Raw numbers
 * never cross this boundary — the reasons are qualitative ("Sleep below normal")
 * not quantitative ("5.1h of sleep").
 *
 * In production this logic runs SERVER-SIDE (a Supabase Edge Function or a DB
 * view that feeds the row-level-secured `player_status` table). It lives here in
 * the mock layer so the boundary is explicit, reviewable, and testable. The
 * scoring mirrors apps/mobile/src/lib/Readiness.js and the ACWR bands in
 * apps/mobile/src/lib/trainingLoad.js so coach and player stay in sync.
 */
import type {
  CoachVisiblePlayer,
  Confidence,
  InjuryStatus,
  LoadState,
  PlayerPrivateSource,
  PlayerRecommendation,
  PlayerStatus,
} from "@/types/dashboard";
import { INJURY_SAFE } from "@/content/dashboardCopy";
import { getStatusMeta } from "./statusLogic";
import { LOW_ADHERENCE_THRESHOLD } from "./dashboardUtils";

/** Optional hand-authored narrative for specific players (see mockRecommendations). */
export interface NarrativeOverride {
  coachAction?: string;
  playerAction?: string;
  extraReasons?: string[];
}

export interface DeriveContext {
  now: Date;
  nextFixtureDate: string; // ISO — used for "Match in N days" flags
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** 0–100 readiness from recovery vitals, or null when there's no data at all. */
export function computeReadiness(src: PlayerPrivateSource): number | null {
  const hasData = src.wearableSynced || src.lastCheckIn !== null;
  if (!hasData) return null;

  const sleepScore = clamp((src.sleepHours / 8) * 100);
  const hrvScore = clamp(50 + (src.hrv - 65) * 1.2);
  const rhrScore = clamp(50 + (55 - src.restingHr) * 2);
  const sorenessScore = clamp(100 - (src.soreness - 1) * 20);

  const composite =
    sleepScore * 0.35 + hrvScore * 0.25 + rhrScore * 0.2 + sorenessScore * 0.2;
  return Math.round(composite);
}

/** ACWR bands mirror apps/mobile/src/lib/trainingLoad.js (0.8 / 1.3 / 1.5). */
function deriveLoadState(acwr: number): LoadState {
  if (acwr < 0.8) return "light";
  if (acwr <= 1.3) return "balanced";
  if (acwr <= 1.5) return "ramping";
  return "high";
}

/** A transparent severity score → RAG status. Easy to explain, easy to tune. */
function deriveStatus(
  readiness: number | null,
  loadState: LoadState,
  injuryStatus: InjuryStatus,
  lowAdherence: boolean,
): PlayerStatus {
  if (readiness === null) return "grey";

  let severity = 0;
  if (readiness < 50) severity += 2;
  else if (readiness < 65) severity += 1;

  if (loadState === "high") severity += 2;
  else if (loadState === "ramping") severity += 1;

  if (injuryStatus === "out") severity += 3;
  else if (injuryStatus === "modified") severity += 1;

  if (lowAdherence) severity += 1;

  if (severity >= 3) return "red";
  if (severity >= 1) return "amber";
  return "green";
}

function matchProximityReason(
  ctx: DeriveContext,
): string | null {
  const target = new Date(ctx.nextFixtureDate);
  const start = new Date(ctx.now);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (days < 0 || days > 4) return null;
  if (days === 0) return "Match today";
  if (days === 1) return "Match tomorrow";
  return `Match in ${days} days`;
}

function deriveReasons(
  src: PlayerPrivateSource,
  status: PlayerStatus,
  loadState: LoadState,
  lowAdherence: boolean,
  ctx: DeriveContext,
): string[] {
  if (status === "grey") {
    const missing: string[] = [];
    if (!src.wearableSynced) missing.push("Wearable not synced");
    if (src.lastCheckIn === null) missing.push("No recent check-in");
    return missing.length ? missing : ["Not enough recent data"];
  }

  if (status === "green") {
    const positives = ["Recovery and load both in range"];
    if (src.adherencePercent >= 90) positives.push("Staying on top of sessions");
    return positives;
  }

  // amber / red — surface the concerns, most important first
  const reasons: string[] = [];
  if (src.injuryStatus === "out") reasons.push("Currently unavailable");
  else if (src.injuryStatus === "modified") reasons.push("Carrying a niggle");

  if (src.sleepHours < src.sleepBaselineHours - 1) reasons.push("Sleep below normal");
  if (src.soreness >= 4) reasons.push("Soreness high");

  if (loadState === "high") reasons.push("Load increased faster than normal");
  else if (loadState === "ramping") reasons.push("Load building quickly");
  else if (loadState === "light") reasons.push("Load below usual");

  if (lowAdherence) reasons.push("Behind on sessions");

  const match = matchProximityReason(ctx);
  if (match) reasons.push(match);

  return reasons.length ? reasons : ["A couple of signals worth a look"];
}

function isRecentCheckIn(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  return now.getTime() - new Date(iso).getTime() <= 2 * 86_400_000;
}

function deriveConfidence(
  src: PlayerPrivateSource,
  now: Date,
): Confidence {
  const hasWearable = src.wearableSynced;
  const hasRecentCheckIn = isRecentCheckIn(src.lastCheckIn, now);
  if (hasWearable && hasRecentCheckIn) return "high";
  if (hasWearable || hasRecentCheckIn) return "medium";
  return "low";
}

/** Describes the SOURCES we used / are missing — never the values. */
function deriveDataCompleteness(
  src: PlayerPrivateSource,
  now: Date,
): { used: string[]; missing: string[] } {
  const used: string[] = [];
  const missing: string[] = [];

  if (src.wearableSynced) used.push("Wearable recovery data");
  else missing.push("Wearable sync");

  if (isRecentCheckIn(src.lastCheckIn, now)) used.push("Recent check-in");
  else missing.push("Recent check-in");

  used.push("Completed session logs");
  return { used, missing };
}

function deriveNextReview(status: PlayerStatus): string {
  switch (status) {
    case "red":
      return "Before today's session";
    case "amber":
      return "At the next check-in, before training";
    case "grey":
      return "Once they check in or sync";
    case "green":
    default:
      return "At the weekly review";
  }
}

export function deriveCoachPlayer(
  src: PlayerPrivateSource,
  ctx: DeriveContext,
  override: NarrativeOverride = {},
): CoachVisiblePlayer {
  const readinessScore = computeReadiness(src);
  const loadState = deriveLoadState(src.acwr);
  const lowAdherence = src.adherencePercent < LOW_ADHERENCE_THRESHOLD;
  const status = deriveStatus(readinessScore, loadState, src.injuryStatus, lowAdherence);
  const meta = getStatusMeta(status);

  const reasons = [
    ...deriveReasons(src, status, loadState, lowAdherence, ctx),
    ...(override.extraReasons ?? []),
  ];

  // Safety: an injury concern overrides any computed action with conservative,
  // non-medical language and is surfaced as the leading reason.
  const injuryFlag = src.injuryFlag;
  let coachAction = override.coachAction ?? meta.coachAction;
  let playerAction = override.playerAction ?? meta.playerAction;
  if (injuryFlag) {
    coachAction = INJURY_SAFE.coachAction;
    playerAction = INJURY_SAFE.playerAction;
    if (!reasons.includes(INJURY_SAFE.reason)) reasons.unshift(INJURY_SAFE.reason);
  }

  const { used, missing } = deriveDataCompleteness(src, ctx.now);

  return {
    id: src.id,
    name: src.name,
    position: src.position,
    status,
    readinessScore,
    loadState,
    acwr: readinessScore === null ? null : Number(src.acwr.toFixed(2)),
    weeklyLoad: src.weeklyLoad,
    plannedLoad: src.plannedLoad,
    adherencePercent: src.adherencePercent,
    lastCheckIn: src.lastCheckIn,
    injuryFlag,
    injuryStatus: src.injuryStatus,
    reasons,
    coachAction,
    playerAction,
    confidence: deriveConfidence(src, ctx.now),
    dataUsed: used,
    dataMissing: missing,
    nextReview: deriveNextReview(status),
    weeklyAdherence: src.weeklyAdherence,
    readinessTrend: src.readinessTrend,
    loadTrend: src.loadTrend,
    nextSession: { name: src.nextSessionName, date: src.nextSessionDate },
  };
}

/** Compose the recommendation-card view-model from a coach-visible player. */
export function toRecommendation(
  player: CoachVisiblePlayer,
): PlayerRecommendation {
  const meta = getStatusMeta(player.status);
  return {
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    status: player.status,
    statusLabel: meta.label,
    meaning: meta.meaning,
    reasons: player.reasons,
    playerAction: player.playerAction,
    coachAction: player.coachAction,
    dataUsed: player.dataUsed,
    dataMissing: player.dataMissing,
    confidence: player.confidence,
    nextReview: player.nextReview,
    injuryFlag: player.injuryFlag,
  };
}
