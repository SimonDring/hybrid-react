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
 * load/injury normalisation) is owned by the engine as the canonical, snapshot-locked
 * `rollUp` (@performance-os/engine, packages/engine/src/lib/team/rollUp.js; parity pinned by
 * apps/mobile/tests/wp53-rollup.js). STAGE 2 (this change): this module now CONSUMES engine
 * `rollUp` for the signal and keeps only the English reasons/actions — the duplicate
 * derivation is gone, one source.
 */
import type {
  CoachVisiblePlayer,
  Confidence,
  InjuryStatus,
  LoadState,
  PlayerStatus,
} from "@/types/dashboard";
import { rollUp } from "@performance-os/engine";
import { INJURY_SAFE } from "@/content/dashboardCopy";
import { getStatusMeta } from "./statusLogic";

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
  // WP-53 stage 2: the derived signal comes from the engine's canonical rollUp (one source).
  const signal = rollUp(row, { nowMs: now.getTime() });
  const loadState = signal.loadState as LoadState;
  const injuryStatus = signal.injuryStatus as InjuryStatus;
  const adherencePercent = signal.adherencePercent;
  const lowAdherence = signal.lowAdherence;
  const status = signal.status as PlayerStatus;
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
    readinessScore: signal.readinessScore,
    loadState,
    acwr: signal.acwr,
    adherencePercent,
    lastUpdated: signal.lastUpdated,
    injuryFlag,
    injuryStatus,
    reasons,
    coachAction,
    playerAction,
    confidence: signal.confidence as Confidence,
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
