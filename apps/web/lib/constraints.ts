/**
 * Presentation + logic for team constraints:
 *  - SESSION_TYPE_META: colour + label per weekday session type
 *  - the Constraints-form option lists
 *  - constraintsForTeam: the honest starting state, seeded from the live team
 *  - deriveTeamDirection: turns sport + season + match proximity into the
 *    plain-English training direction shown on the Focus view.
 */
import type { SessionType, Team, TeamConstraints } from "@/types/dashboard";

export const SPORT_OPTIONS = [
  "Football",
  "Rugby",
  "Hockey",
  "Basketball",
  "Netball",
  "Cricket",
  "Rowing",
];

export const SEASON_OPTIONS = [
  "Pre-season",
  "In-season",
  "Off-season",
  "Tournament week",
];

/**
 * UI label ↔ the `teams.season` code — the ONE mapping both directions use
 * (liveBoard reads code→label; saveTeamSchedule writes label→code).
 */
export const SEASON_CODE_OF: Record<string, string> = {
  "Pre-season": "pre",
  "In-season": "in",
  "Off-season": "off",
  "Tournament week": "tournament",
};

export const SEASON_LABEL_OF: Record<string, string> = Object.fromEntries(
  Object.entries(SEASON_CODE_OF).map(([label, code]) => [code, label]),
);

/**
 * Parse a `teams.schedule` jsonb value into the pattern+fixtures halves of
 * TeamConstraints. The column DEFAULTS to '[]'::jsonb (an array), so anything
 * that isn't an object carrying both arrays means "no schedule saved yet" —
 * return null and let the caller fall back to constraintsForTeam defaults.
 */
export function parseTeamSchedule(
  schedule: unknown,
): Pick<TeamConstraints, "weeklyPattern" | "fixtures"> | null {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return null;
  const s = schedule as { weeklyPattern?: unknown; fixtures?: unknown };
  if (!Array.isArray(s.weeklyPattern) || s.weeklyPattern.length !== 7) return null;
  if (!Array.isArray(s.fixtures)) return null;
  return {
    weeklyPattern: s.weeklyPattern as TeamConstraints["weeklyPattern"],
    fixtures: s.fixtures as TeamConstraints["fixtures"],
  };
}

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "match", label: "Match" },
  { value: "pitch", label: "Pitch / field" },
  { value: "gym", label: "Gym / strength" },
  { value: "pool", label: "Pool" },
  { value: "track", label: "Track / speed" },
  { value: "conditioning", label: "Conditioning" },
  { value: "rest", label: "Rest" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The constraints state a live board starts from: sport/season from the
 * coach's own teams row, NO invented weekly pattern or fixtures. This is
 * session-local until the teams.schedule persistence lands
 * (docs/product/TEAM-NEXT-STEPS.md §3).
 */
export function constraintsForTeam(team: Team): TeamConstraints {
  return {
    sport: team.sport ?? "",
    seasonPhase: team.seasonPhase ?? "",
    weeklyPattern: WEEKDAYS.map((day) => ({ day, type: "rest" as SessionType })),
    fixtures: [],
  };
}

export const SESSION_TYPE_META: Record<
  SessionType,
  { label: string; dot: string; chip: string; text: string }
> = {
  match: { label: "Match", dot: "bg-adjust", chip: "bg-adjust-soft", text: "text-adjust" },
  pitch: { label: "Pitch", dot: "bg-accent-2", chip: "bg-accent-2/15", text: "text-accent-2" },
  gym: { label: "Gym", dot: "bg-accent", chip: "bg-accent-soft", text: "text-accent" },
  pool: { label: "Pool", dot: "bg-[#5fb6d4]", chip: "bg-[#5fb6d4]/15", text: "text-[#5fb6d4]" },
  track: { label: "Track", dot: "bg-[#c9b273]", chip: "bg-[#c9b273]/15", text: "text-[#c9b273]" },
  conditioning: { label: "Conditioning", dot: "bg-monitor", chip: "bg-monitor-soft", text: "text-monitor" },
  rest: { label: "Rest", dot: "bg-nodata", chip: "bg-nodata-soft", text: "text-nodata" },
};

export interface TeamDirection {
  emphasis: string;
  taperNote: string | null;
  scheduleNote: string;
}

const SEASON_EMPHASIS: Record<string, string> = {
  "Pre-season": "Build the engine — higher gym volume, general strength and capacity.",
  "In-season": "Maintain strength and keep players fresh — quality over volume.",
  "Off-season": "Recover first, then rebuild — address each player's weaknesses.",
  "Tournament week": "Minimal load, peak readiness — short and sharp only.",
};

export function deriveTeamDirection(
  constraints: TeamConstraints,
  daysToMatch: number | null,
): TeamDirection {
  const emphasis =
    SEASON_EMPHASIS[constraints.seasonPhase] ??
    "Maintain strength and keep players fresh.";

  let taperNote: string | null = null;
  if (daysToMatch !== null && daysToMatch >= 0 && daysToMatch <= 3) {
    const when =
      daysToMatch === 0 ? "today" : daysToMatch === 1 ? "tomorrow" : `in ${daysToMatch} days`;
    taperNote = `Match ${when}: taper now — trim gym volume, keep it sharp, protect the legs.`;
  }

  const sportWord = constraints.sport ? constraints.sport.toLowerCase() : "sport";
  const scheduleNote = `Gym work is steered around your ${sportWord} sessions and fixtures, so it never clashes with pitch load or match day.`;

  return { emphasis, taperNote, scheduleNote };
}
