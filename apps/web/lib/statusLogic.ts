/**
 * The RAG (red / amber / green / grey) status logic — the decision-led core of
 * the dashboard. It maps a status to its label, meaning, default coach action,
 * attention priority, and the theme colour tokens to render it.
 *
 * The vocabulary deliberately mirrors the player app's verdict language
 * (apps/mobile/src/lib/verdicts.js: "Train as planned", "Monitor", "Ease in")
 * so coach and player read the same story.
 */
import type { LoadState, PlayerStatus } from "@/types/dashboard";

/** Maps to the colour tokens defined in app/globals.css (@theme). */
export type Tone = "ready" | "monitor" | "adjust" | "nodata";

export interface StatusMeta {
  status: PlayerStatus;
  /** Short label, e.g. "Ready". */
  label: string;
  /** One-line headline action, e.g. "Train as planned". */
  headline: string;
  /** Plain-English meaning of the status. */
  meaning: string;
  /** Default coach action (overridden by injury safe-language when flagged). */
  coachAction: string;
  /** Default player action. */
  playerAction: string;
  /** Lower = more urgent in the attention list. */
  priority: number;
  tone: Tone;
}

export const STATUS_META: Record<PlayerStatus, StatusMeta> = {
  red: {
    status: "red",
    label: "Adjust",
    headline: "Adjust today's session",
    meaning: "Showing multiple fatigue or load flags.",
    coachAction: "Modify the session or switch the focus to recovery.",
    playerAction: "Ease back today — keep it light and prioritise recovery.",
    priority: 0,
    tone: "adjust",
  },
  amber: {
    status: "amber",
    label: "Monitor",
    headline: "Monitor before training",
    meaning: "May be carrying fatigue or has incomplete recovery.",
    coachAction: "Check in before training and consider reducing volume.",
    playerAction: "Let your coach know how you feel before the session.",
    priority: 1,
    tone: "monitor",
  },
  grey: {
    status: "grey",
    label: "No data",
    headline: "Missing check-in",
    meaning: "Not enough data for a reliable recommendation.",
    coachAction: "Ask the player to complete a check-in or sync their wearable.",
    playerAction: "Complete your check-in or sync your wearable.",
    priority: 2,
    tone: "nodata",
  },
  green: {
    status: "green",
    label: "Ready",
    headline: "Train as planned",
    meaning: "Tracking within their normal range.",
    coachAction: "Train as planned.",
    playerAction: "You're good to go — train as planned.",
    priority: 3,
    tone: "ready",
  },
};

export function getStatusMeta(status: PlayerStatus): StatusMeta {
  return STATUS_META[status];
}

/**
 * Tailwind utility classes per tone. The tokens (ready/monitor/adjust/nodata)
 * are defined in globals.css so these stay in sync with the theme.
 */
export const TONE_CLASSES: Record<
  Tone,
  { dot: string; text: string; softBg: string; border: string; bar: string }
> = {
  ready: {
    dot: "bg-ready",
    text: "text-ready",
    softBg: "bg-ready-soft",
    border: "border-ready/40",
    bar: "bg-ready",
  },
  monitor: {
    dot: "bg-monitor",
    text: "text-monitor",
    softBg: "bg-monitor-soft",
    border: "border-monitor/40",
    bar: "bg-monitor",
  },
  adjust: {
    dot: "bg-adjust",
    text: "text-adjust",
    softBg: "bg-adjust-soft",
    border: "border-adjust/40",
    bar: "bg-adjust",
  },
  nodata: {
    dot: "bg-nodata",
    text: "text-nodata",
    softBg: "bg-nodata-soft",
    border: "border-nodata/40",
    bar: "bg-nodata",
  },
};

export function toneClasses(tone: Tone) {
  return TONE_CLASSES[tone];
}

/* ------------------------------------------------------------------ */
/* Training-load band (plain-English, ACWR kept behind "advanced")     */
/* ------------------------------------------------------------------ */

export interface LoadMeta {
  label: string;
  note: string;
  tone: Tone;
}

export const LOAD_META: Record<LoadState, LoadMeta> = {
  light: {
    label: "Light",
    note: "Below their usual range — there's room to build back up.",
    tone: "monitor",
  },
  balanced: {
    label: "Balanced",
    note: "Right where you want it — the plan stays as written.",
    tone: "ready",
  },
  ramping: {
    label: "Building fast",
    note: "Load has climbed quickly — easing slightly this week.",
    tone: "monitor",
  },
  high: {
    label: "High",
    note: "Well above baseline — ease off so they can absorb it.",
    tone: "adjust",
  },
};

export function getLoadMeta(state: LoadState): LoadMeta {
  return LOAD_META[state];
}
