/**
 * Mock team context + the team load-trend series for the chart.
 * Replace with a `teams` row + an aggregate query later.
 */
import type { LoadTrendPoint, Team } from "@/types/dashboard";
import { NEXT_FIXTURE_DATE, hoursAgoIso } from "./mockClock";

export const MOCK_TEAM: Team = {
  id: "team-ashford",
  name: "Ashford United",
  sport: "Football",
  seasonPhase: "In-season",
  currentWeek: 6,
  totalWeeks: 14,
  nextFixture: {
    id: "fix-1",
    type: "match",
    label: "League match vs Riverside",
    date: NEXT_FIXTURE_DATE,
  },
  lastSyncAt: hoursAgoIso(0.13), // ~8 minutes ago
  matchWeekFocus: "Sharpness and readiness over volume.",
  matchWeekAdjustment:
    "Avoid extra lower-body volume after today. Keep sessions short — activation and speed work only.",
};

/**
 * 8 weeks of team-average load vs the planned load and a "flagged" line the
 * squad shouldn't sit above for long. Reads as: load building steadily toward
 * the flagged line, currently in range.
 */
export const MOCK_LOAD_TREND: LoadTrendPoint[] = [
  { week: "W1", teamAvgLoad: 360, plannedLoad: 380, flaggedThreshold: 480 },
  { week: "W2", teamAvgLoad: 385, plannedLoad: 400, flaggedThreshold: 480 },
  { week: "W3", teamAvgLoad: 412, plannedLoad: 420, flaggedThreshold: 480 },
  { week: "W4", teamAvgLoad: 398, plannedLoad: 410, flaggedThreshold: 480 }, // deload dip
  { week: "W5", teamAvgLoad: 432, plannedLoad: 440, flaggedThreshold: 480 },
  { week: "W6", teamAvgLoad: 455, plannedLoad: 445, flaggedThreshold: 480 }, // current
];
