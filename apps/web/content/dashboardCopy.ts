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

/**
 * Plain-English glossary behind every ⓘ InfoTip on the dashboard. One entry
 * per jargon term / metric card. Rules: coach-friendly, 1–3 sentences, never
 * raw vitals (no HRV / sleep / resting-HR numbers — those stay player-private),
 * and never contradicting STATUS_META / LOAD_META in lib/statusLogic.ts.
 */
export const JARGON = {
  readiness: {
    label: "Readiness",
    body: "A 0–100 score of how ready this player is to train today, built from their check-ins and recovery signals. Higher means closer to their normal — a low score is a prompt to check in, not a diagnosis.",
  },
  squadReadiness: {
    label: "Squad readiness",
    body: "The average readiness score across every player reporting today. It's a quick temperature check on the whole group — open the squad table to see who's pulling it down.",
  },
  workloadRatio: {
    label: "Workload ratio",
    body: "Recent training (last 7 days) compared with what the player's body is used to (last 28 days). Around 1.0 is balanced; well above that means load has climbed faster than they've adapted, which raises injury risk.",
  },
  loadState: {
    label: "Load",
    body: "How this week's training compares with the player's usual, in plain bands: Building up (below their usual range — room to build), Balanced (right where you want it), High (climbed quickly — worth easing), Overreaching (well above baseline — ease off so they can absorb it).",
  },
  adherence: {
    label: "Adherence",
    body: "The share of planned sessions this player has completed this week. Low adherence often means the plan doesn't fit their week — worth a conversation before pushing harder.",
  },
  confidence: {
    label: "Confidence",
    body: "How much to trust the recommendation, based on how complete the data is. High = recent check-in plus a synced wearable. Medium = some signals missing — treat as a guide. Low = limited data — confirm with the player first.",
  },
  status: {
    label: "Status",
    body: "The traffic-light call for today. Ready = tracking within their normal range, train as planned. Monitor = may be carrying fatigue — check in before training. Adjust = showing multiple fatigue or load flags — modify the session. No data = not enough information for a reliable call.",
  },
  updated: {
    label: "Updated",
    body: "When this player's summary last refreshed — their most recent check-in, logged session, or wearable sync. If it's more than a day old, today's numbers may not reflect how they actually are.",
  },
  awaitingSync: {
    label: "Awaiting first sync",
    body: "These players have joined with the team code but haven't completed a first check-in or wearable sync, so there's nothing to score yet. They appear on the board automatically once data arrives.",
  },
  matchWeek: {
    label: "Next match",
    body: "Days until the next fixture on file. Inside a match week the plan protects freshness — heavy gym work is pulled away from match day so players arrive sharp.",
  },
  recoveryTrend: {
    label: "Recovery trend",
    body: "Whether the squad's average readiness is improving, dipping, or steady compared with last week. A dip across many players at once usually points at the schedule, not any one individual.",
  },
  sessionsThisWeek: {
    label: "Sessions this week",
    body: "The percentage of planned sessions completed across the whole squad this week. It's a plan-fit signal: if it's low for everyone, the schedule may be asking too much.",
  },
  trainingLoadCard: {
    label: "Training load",
    body: "How the squad's combined training load is tracking against the plan. Steady = on plan. Building = climbing but still in range. High = above the flagged line — worth easing before it becomes a problem.",
  },
  updatedToday: {
    label: "Updated today",
    body: "How many players have fresh data today, out of everyone who has joined. The more current the data, the more the rest of this dashboard can be trusted.",
  },
  needsAttention: {
    label: "Needs attention",
    body: "Players flagged Adjust, Monitor, or No data — the ones to check before training. Zero here means the whole squad is tracking as planned.",
  },
  blockDirection: {
    label: "This block's direction",
    body: "What the squad's gym work is emphasising right now. It's derived from your constraints — sport, season phase, and upcoming fixtures — so editing those updates the direction.",
  },
} as const satisfies Record<string, { label: string; body: string }>;

export type JargonKey = keyof typeof JARGON;

/** Action buttons on the recommendation card / drawer. */
export const ACTIONS = {
  accept: "Accept recommendation",
  modify: "Modify session",
  message: "Message player",
  reviewed: "Mark reviewed",
  flag: "Flag for follow-up",
};
