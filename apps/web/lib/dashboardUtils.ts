/**
 * Pure helpers that turn the squad of coach-visible players into the aggregates
 * the dashboard renders: the readiness split, the prioritised attention list,
 * filtering/sorting for the table, and the operational coach-actions list.
 *
 * Everything here is a pure function of its inputs — easy to unit test and safe
 * to run on the server (the dashboard page) or the client (interactive table).
 */
import type {
  CoachActionItem,
  CoachVisiblePlayer,
  PlayerStatus,
} from "@/types/dashboard";
import { CTA } from "@/content/dashboardCopy";
import { getStatusMeta } from "./statusLogic";

/** A player is "behind" if they've completed less than this share of sessions. */
export const LOW_ADHERENCE_THRESHOLD = 60;

export interface SquadSplit {
  green: number;
  amber: number;
  red: number;
  grey: number;
  total: number;
}

export function squadSplit(players: CoachVisiblePlayer[]): SquadSplit {
  const split: SquadSplit = { green: 0, amber: 0, red: 0, grey: 0, total: players.length };
  for (const p of players) {
    if (p.status === "green") split.green += 1;
    else if (p.status === "amber") split.amber += 1;
    else if (p.status === "red") split.red += 1;
    else split.grey += 1;
  }
  return split;
}

/** Plain-English read of the squad state — the "5-minute" headline. */
export function squadReadinessInterpretation(split: SquadSplit): string {
  const needAttention = split.red + split.amber + split.grey;
  if (split.total === 0) return "No players in this squad yet.";
  if (needAttention === 0) {
    return "The whole squad is tracking as planned — no one needs adjusting before the next session.";
  }
  const readyShare = split.green / split.total;
  const lead =
    readyShare >= 0.6
      ? "Most of the squad is ready"
      : readyShare >= 0.4
        ? "About half the squad is ready"
        : "A lot of the squad needs attention";
  const tail =
    needAttention === 1
      ? "1 player needs a look before the next session."
      : `${needAttention} players need a look before the next session.`;
  return `${lead}, but ${tail}`;
}

/* ------------------------------------------------------------------ */
/* Attention list                                                      */
/* ------------------------------------------------------------------ */

/** Unknown adherence (no logged sessions yet) is NOT "behind" — it's no data. */
export function isLowAdherenceValue(pct: number | null): boolean {
  return pct !== null && pct < LOW_ADHERENCE_THRESHOLD;
}

export function isLowAdherence(p: CoachVisiblePlayer): boolean {
  return isLowAdherenceValue(p.adherencePercent);
}

/** Should this player surface in "Needs your attention"? */
export function needsAttention(p: CoachVisiblePlayer): boolean {
  return p.status !== "green" || isLowAdherence(p);
}

/** Red → amber → missing data → low-adherence. Lower number sorts first. */
function attentionRank(p: CoachVisiblePlayer): number {
  if (p.status === "red") return 0;
  if (p.status === "amber") return 1;
  if (p.status === "grey") return 2;
  return 3; // green but flagged for low adherence
}

export function compareAttention(
  a: CoachVisiblePlayer,
  b: CoachVisiblePlayer,
): number {
  const ra = attentionRank(a);
  const rb = attentionRank(b);
  if (ra !== rb) return ra - rb;
  // within a tier: lower adherence first (unknown last), then lower readiness
  if (a.adherencePercent !== b.adherencePercent) {
    return (a.adherencePercent ?? 101) - (b.adherencePercent ?? 101);
  }
  return (a.readinessScore ?? 101) - (b.readinessScore ?? 101);
}

export function attentionPlayers(
  players: CoachVisiblePlayer[],
): CoachVisiblePlayer[] {
  return players.filter(needsAttention).sort(compareAttention);
}

/* ------------------------------------------------------------------ */
/* Table filter + sort                                                 */
/* ------------------------------------------------------------------ */

export type StatusFilter = "all" | PlayerStatus;
export type SortKey =
  | "status"
  | "name"
  | "readiness"
  | "adherence"
  | "load";
export type SortDir = "asc" | "desc";

export function filterPlayers(
  players: CoachVisiblePlayer[],
  opts: { status: StatusFilter; search: string },
): CoachVisiblePlayer[] {
  const search = opts.search.trim().toLowerCase();
  return players.filter((p) => {
    if (opts.status !== "all" && p.status !== opts.status) return false;
    if (search && !p.name.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });
}

export function sortPlayers(
  players: CoachVisiblePlayer[],
  key: SortKey,
  dir: SortDir,
): CoachVisiblePlayer[] {
  const factor = dir === "asc" ? 1 : -1;
  const sorted = [...players].sort((a, b) => {
    switch (key) {
      case "name":
        return factor * a.name.localeCompare(b.name);
      case "readiness":
        return factor * ((a.readinessScore ?? -1) - (b.readinessScore ?? -1));
      case "adherence":
        return factor * ((a.adherencePercent ?? -1) - (b.adherencePercent ?? -1));
      case "load":
        return factor * ((a.acwr ?? -1) - (b.acwr ?? -1));
      case "status":
      default:
        return (
          factor *
          (getStatusMeta(a.status).priority - getStatusMeta(b.status).priority)
        );
    }
  });
  return sorted;
}

/* ------------------------------------------------------------------ */
/* Team aggregates                                                     */
/* ------------------------------------------------------------------ */

/** Squad-average adherence over players who have logged sessions; null when none have. */
export function teamAdherence(players: CoachVisiblePlayer[]): number | null {
  const logged = players.filter((p) => p.adherencePercent !== null);
  if (logged.length === 0) return null;
  const sum = logged.reduce((acc, p) => acc + (p.adherencePercent ?? 0), 0);
  return Math.round(sum / logged.length);
}

/** How many players' status rows were updated within the last 24h of `now`. */
export function updatedToday(
  players: CoachVisiblePlayer[],
  now: Date,
): number {
  const DAY = 86_400_000;
  return players.filter(
    (p) =>
      p.lastUpdated !== null &&
      now.getTime() - new Date(p.lastUpdated).getTime() <= DAY,
  ).length;
}

export function averageReadiness(
  players: CoachVisiblePlayer[],
): number | null {
  const scored = players.filter((p) => p.readinessScore !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, p) => acc + (p.readinessScore ?? 0), 0);
  return Math.round(sum / scored.length);
}

export type TrendDirection = "up" | "down" | "flat";

/**
 * Direction of the squad's average readiness over the trend window, or null
 * when no player has trend history yet (the live board's state today).
 */
export function readinessTrendDirection(
  players: CoachVisiblePlayer[],
): TrendDirection | null {
  const withTrend = players.filter((p) => p.readinessTrend.length >= 2);
  if (withTrend.length === 0) return null;
  let startSum = 0;
  let endSum = 0;
  for (const p of withTrend) {
    startSum += p.readinessTrend[0];
    endSum += p.readinessTrend[p.readinessTrend.length - 1];
  }
  const delta = endSum / withTrend.length - startSum / withTrend.length;
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "flat";
}

/* ------------------------------------------------------------------ */
/* Operational coach actions                                           */
/* ------------------------------------------------------------------ */

/** Turn the squad state into a short, ordered to-do list for the coach. */
export function buildCoachActions(
  players: CoachVisiblePlayer[],
): CoachActionItem[] {
  const split = squadSplit(players);
  const missingCheckIns = players.filter((p) => p.readinessScore === null).length;
  const behind = players.filter(isLowAdherence).length;
  const items: CoachActionItem[] = [];

  if (split.red > 0) {
    items.push({
      id: "review-red",
      label: `Review ${split.red} ${split.red === 1 ? "player" : "players"} flagged to adjust`,
      detail: "Modify the session or switch to recovery focus.",
      tone: "adjust",
      count: split.red,
    });
  }
  if (split.amber > 0) {
    items.push({
      id: "check-amber",
      label: `Check ${split.amber} ${split.amber === 1 ? "player" : "players"} before training`,
      detail: "A quick word to confirm how they feel, then decide on volume.",
      tone: "monitor",
      count: split.amber,
    });
  }
  if (missingCheckIns > 0) {
    items.push({
      id: "follow-up-checkins",
      label: `Follow up with ${missingCheckIns} ${missingCheckIns === 1 ? "player" : "players"} missing check-ins`,
      detail: "Ask them to complete a check-in or sync their wearable.",
      tone: "nodata",
      count: missingCheckIns,
    });
  }
  if (behind > 0) {
    items.push({
      id: "behind-sessions",
      label: `${behind} ${behind === 1 ? "player is" : "players are"} behind on sessions`,
      detail: "Check whether the plan or the schedule needs adjusting.",
      tone: "monitor",
      count: behind,
    });
  }

  // Standing operational actions — always useful, keep the dashboard active.
  items.push(
    {
      id: "export",
      label: CTA.exportReport,
      detail: "Share this week's squad summary with staff.",
      tone: "accent",
    },
    {
      id: "schedule",
      label: "Update match schedule",
      detail: "Keep fixtures current so plans stay clear of sport load.",
      tone: "accent",
    },
    {
      id: "confirm-phase",
      label: "Confirm next week's training phase",
      detail: "Lock the focus before plans regenerate for the squad.",
      tone: "accent",
    },
  );

  return items;
}
