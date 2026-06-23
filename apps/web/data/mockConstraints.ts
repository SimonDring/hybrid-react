/**
 * Default team constraints + the option lists the Constraints form offers.
 * Seeded from the team mock so the form is pre-filled, not empty. Replace with a
 * `teams.schedule` read later (the shape already matches that jsonb).
 */
import type { TeamConstraints, SessionType } from "@/types/dashboard";
import { NEXT_FIXTURE_DATE, WEEK_START_ISO, isoDateOffset } from "./mockClock";

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

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "match", label: "Match" },
  { value: "pitch", label: "Pitch / field" },
  { value: "gym", label: "Gym / strength" },
  { value: "pool", label: "Pool" },
  { value: "track", label: "Track / speed" },
  { value: "conditioning", label: "Conditioning" },
  { value: "rest", label: "Rest" },
];

export const DEFAULT_CONSTRAINTS: TeamConstraints = {
  sport: "Football",
  seasonPhase: "In-season",
  weeklyPattern: [
    { day: "Mon", type: "gym" },
    { day: "Tue", type: "pitch" },
    { day: "Wed", type: "gym" },
    { day: "Thu", type: "pitch" },
    { day: "Fri", type: "conditioning" },
    { day: "Sat", type: "rest" },
    { day: "Sun", type: "match" },
  ],
  fixtures: [
    { id: "fix-1", type: "match", label: "League match vs Riverside", date: NEXT_FIXTURE_DATE },
    { id: "fix-2", type: "match", label: "Away vs Carlton", date: isoDateOffset(WEEK_START_ISO, 13) },
    { id: "fix-3", type: "pitch", label: "Cup tie vs Brookfield", date: isoDateOffset(WEEK_START_ISO, 20) },
  ],
};
