/**
 * liveDerive — the pure mapping from a live `player_status` row to the
 * coach-visible view-model.
 *
 * THE PRIVACY LINE: the input here is ALREADY the coach-safe surface. The
 * roll-up from raw vitals happened on the player's device
 * (apps/mobile/src/lib/teamStatus.js) and the safety fields were re-stamped by
 * the server (S11 trigger, 20260708/20260709). Everything this module derives —
 * RAG status, reasons, confidence — is computed from those seven fields only.
 * Spec: docs/superpowers/specs/2026-07-05-live-coach-board-design.md.
 *
 * WP-53 / TAS Appendix A: the DERIVATION core (RAG severity model + confidence +
 * load/injury normalisation) is now owned by the engine as the canonical, snapshot-locked
 * `rollUp` (@performance-os/engine, packages/engine/src/lib/team/rollUp.js; parity pinned by
 * apps/mobile/tests/wp53-rollup.js). deriveLiveStatus/deriveConfidence below are kept
 * VERBATIM in lockstep with it. STAGE 2 (separate change, where the Next build is verified):
 * make this module CONSUME engine `rollUp` for the signal, keep only the English reasons/
 * actions here, and delete the duplicate.
 */
import type {
  CoachVisiblePlayer,
  Confidence,
  InjuryStatus,
  LoadState,
  PlayerStatus,
} from "@/types/dashboard";
import { INJURY_SAFE } from "@/content/dashboardCopy";
import { getStatusMeta } from "./statusLogic";
import { isLowAdherenceValue } from "./dashboardUtils";

/** The raw row as selected from `player_status` (RLS-scoped to the coach's team). */
export interface PlayerStatusRow {
  user_id: string;
  display_name: string | null;
  readiness: number | null;
  load_state: string | null;
  acwr: number | null;
  adherence_pct: number | null;
  injury_status: string | null;
  updated_at: string | null;
}

const LOAD_STATES: LoadState[] = [
  "no-data",
  "ramping",
  "balanced",
  "high",
  "overreaching",
];

function asLoadState(value: string | null): LoadState {
  return LOAD_STATES.includes(value as LoadState) ? (value as LoadState) : "no-data";
}

function asInjuryStatus(value: string | null): InjuryStatus {
  return value === "out" || value === "modified" ? value : "available";
}

const DAY = 86_400_000;
const FRESH_WINDOW = 2 * DAY; // an update in the last 48h counts as current
const STALE_WINDOW = 7 * DAY; // older than this and confidence drops to low

function ageMs(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? now.getTime() - t : null;
}

/**
 * RAG status from the safe fields (the mock severity model, re-founded):
 * 'out' is red regardless — the server-authoritative availability signal.
 * No readiness → grey (we can't judge the day without it). Otherwise a
 * transparent severity sum: easy to explain, easy to tune.
 */
export function deriveLiveStatus(
  readiness: number | null,
  loadState: LoadState,
  injuryStatus: InjuryStatus,
  lowAdherence: boolean,
): PlayerStatus {
  if (injuryStatus === "out") return "red";
  if (readiness === null) return "grey";

  let severity = 0;
  if (readiness < 50) severity += 2;
  else if (readiness < 65) severity += 1;

  if (loadState === "overreaching") severity += 2;
  else if (loadState === "high") severity += 1;

  if (injuryStatus === "modified") severity += 1;
  if (lowAdherence) severity += 1;

  if (severity >= 3) return "red";
  if (severity >= 1) return "amber";
  return "green";
}

function deriveReasons(
  row: PlayerStatusRow,
  status: PlayerStatus,
  loadState: LoadState,
  injuryStatus: InjuryStatus,
  lowAdherence: boolean,
): string[] {
  if (status === "grey") {
    // No readiness leads, but the row's OTHER signals are real — a coach must
    // still see an overreaching load or missed sessions on a grey player.
    const reasons: string[] = [];
    if (injuryStatus === "modified") reasons.push("Carrying a niggle");
    reasons.push("No readiness data yet — waiting on a check-in or sync");
    if (loadState === "overreaching") reasons.push("Load climbed faster than normal");
    else if (loadState === "high") reasons.push("Load building quickly");
    if (lowAdherence) reasons.push("Behind on sessions");
    return reasons;
  }

  if (status === "green") {
    const positives = ["Recovery and load both in range"];
    if (row.adherence_pct !== null && row.adherence_pct >= 90) {
      positives.push("Staying on top of sessions");
    }
    return positives;
  }

  // amber / red — surface the concerns, most important first
  const reasons: string[] = [];
  if (injuryStatus === "out") reasons.push("Currently unavailable");
  else if (injuryStatus === "modified") reasons.push("Carrying a niggle");

  if (row.readiness !== null) {
    if (row.readiness < 50) reasons.push("Readiness well below normal");
    else if (row.readiness < 65) reasons.push("Readiness a touch low");
  }

  if (loadState === "overreaching") reasons.push("Load climbed faster than normal");
  else if (loadState === "high") reasons.push("Load building quickly");
  else if (loadState === "ramping") reasons.push("Load below their usual range");

  if (lowAdherence) reasons.push("Behind on sessions");

  return reasons.length ? reasons : ["A couple of signals worth a look"];
}

/** Confidence from completeness + freshness of the derived signals. */
function deriveConfidence(row: PlayerStatusRow, now: Date): Confidence {
  const age = ageMs(row.updated_at, now);
  const fresh = age !== null && age <= FRESH_WINDOW;
  const stale = age === null || age > STALE_WINDOW;
  if (stale) return "low";

  const hasReadiness = row.readiness !== null;
  const hasLoad = row.acwr !== null;
  if (hasReadiness && hasLoad && fresh) return "high";
  if (hasReadiness || hasLoad) return "medium";
  return "low";
}

/** Which derived SOURCES fed this row — never the values behind them. */
function deriveDataCompleteness(row: PlayerStatusRow): {
  used: string[];
  missing: string[];
} {
  const used: string[] = [];
  const missing: string[] = [];

  if (row.readiness !== null) used.push("Daily readiness score");
  else missing.push("Readiness (check-in or wearable sync)");

  if (row.acwr !== null) used.push("Training load (ACWR)");
  else missing.push("Training-load history");

  if (row.adherence_pct !== null) used.push("Session logs");
  else missing.push("Logged sessions");

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

/** Live row → the coach view-model. Pure; `now` is passed in for testability. */
export function deriveLivePlayer(
  row: PlayerStatusRow,
  now: Date,
): CoachVisiblePlayer {
  const loadState = asLoadState(row.load_state);
  const injuryStatus = asInjuryStatus(row.injury_status);
  const adherencePercent =
    row.adherence_pct === null ? null : Math.round(Number(row.adherence_pct));
  const lowAdherence = isLowAdherenceValue(adherencePercent);

  const status = deriveLiveStatus(row.readiness, loadState, injuryStatus, lowAdherence);
  const meta = getStatusMeta(status);
  const reasons = deriveReasons(row, status, loadState, injuryStatus, lowAdherence);

  // Safety: an injury concern overrides any computed action with conservative,
  // non-medical language and leads the reasons — same rule as the player app.
  const injuryFlag = injuryStatus !== "available";
  let coachAction = meta.coachAction;
  let playerAction = meta.playerAction;
  if (injuryFlag) {
    coachAction = INJURY_SAFE.coachAction;
    playerAction = INJURY_SAFE.playerAction;
    if (!reasons.includes(INJURY_SAFE.reason)) reasons.unshift(INJURY_SAFE.reason);
  }

  const { used, missing } = deriveDataCompleteness(row);

  return {
    id: row.user_id,
    name: row.display_name?.trim() || "Player",
    status,
    readinessScore: row.readiness,
    loadState,
    acwr: row.acwr === null ? null : Number(Number(row.acwr).toFixed(2)),
    adherencePercent,
    lastUpdated: row.updated_at,
    injuryFlag,
    injuryStatus,
    reasons,
    coachAction,
    playerAction,
    confidence: deriveConfidence(row, now),
    dataUsed: used,
    dataMissing: missing,
    nextReview: deriveNextReview(status),
    // History surfaces — empty until a history feed exists (see the spec).
    weeklyAdherence: [],
    readinessTrend: [],
    loadTrend: [],
    nextSession: null,
  };
}
