/**
 * Presentation + logic for team constraints:
 *  - SESSION_TYPE_META: colour + label per weekday session type
 *  - deriveTeamDirection: turns sport + season + match proximity into the
 *    plain-English training direction shown on the Focus view.
 */
import type { SessionType, TeamConstraints } from "@/types/dashboard";

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

  const scheduleNote = `Gym work is steered around your ${constraints.sport.toLowerCase()} sessions and fixtures, so it never clashes with pitch load or match day.`;

  return { emphasis, taperNote, scheduleNote };
}
