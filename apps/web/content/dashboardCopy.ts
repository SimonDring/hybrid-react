/**
 * Centralised UI copy. Keeping strings here (rather than scattered in JSX)
 * makes the product voice easy to tune and later localise, and it keeps the
 * SAFETY language in one auditable place.
 *
 * Voice: plain English, decision-led, conservative. No sports-science jargon
 * in the primary UI (no "ACWR", "MEV", "TRIMP"). Translate data into meaning,
 * meaning into action.
 */
import type { Confidence } from "@/types/dashboard";

export const PRODUCT = {
  name: "Performance OS",
  surface: "Coach Dashboard",
  positioning: "S&C-style oversight for teams without a full-time S&C coach.",
};

export const CTA = {
  reviewFlagged: "Review flagged players",
  exportReport: "Export weekly report",
};

export const SECTION = {
  overview: "Squad overview",
  readiness: "Readiness",
  attention: "Needs your attention",
  coachActions: "What to do next",
  table: "Squad",
  loadTrend: "Team training load",
  adherence: "This week's sessions",
  matchWeek: "Match week",
};

/**
 * SAFETY — used whenever an injury concern is flagged. The product must not
 * diagnose, prescribe rehab, or make medical claims. It stays conservative and
 * points back to a human. This copy intentionally overrides any computed
 * recommendation when `injuryFlag` is true.
 */
export const INJURY_SAFE = {
  reason: "Pain/injury concern flagged",
  coachAction:
    "Avoid high-intensity loading until reviewed by a coach or qualified professional.",
  playerAction:
    "Hold off on heavy or high-impact work and check in with your coach or a qualified professional.",
  badge: "Injury concern",
};

/** Plain-English explanation of how much to trust a recommendation. */
export const CONFIDENCE_COPY: Record<
  Confidence,
  { label: string; note: string }
> = {
  high: {
    label: "High",
    note: "Full picture — recent check-in and a synced wearable.",
  },
  medium: {
    label: "Medium",
    note: "Some signals are missing. Treat as a guide and confirm with the player.",
  },
  low: {
    label: "Low",
    note: "Limited data. Confirm directly with the player before changing the session.",
  },
};

/** Empty / no-data states. */
export const EMPTY = {
  noAttention: "Nothing flagged — the whole squad is tracking as planned.",
  noData: "Not enough data yet. A few more check-ins and this fills in.",
  buildingBaseline: "Building baseline",
};

/** Labels for the readiness split legend. */
export const READINESS_LEGEND = {
  green: "Ready",
  amber: "Monitor",
  red: "Adjust",
  grey: "No data",
};

/** Action buttons on the recommendation card / drawer. */
export const ACTIONS = {
  accept: "Accept recommendation",
  modify: "Modify session",
  message: "Message player",
  reviewed: "Mark reviewed",
  flag: "Flag for follow-up",
};
