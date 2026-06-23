/**
 * Optional hand-authored narrative for specific players. Where a player has an
 * entry here, the derived coach/player action is replaced with this crafted
 * copy; otherwise the status-default action is used. This is the seam where a
 * future AI layer (Stage 6) could write per-player recommendations.
 *
 * Note: injury-flagged players are NOT overridden here — lib/derive.ts forces
 * the conservative injury safe-language for them, which must always win.
 */
import type { NarrativeOverride } from "@/lib/derive";

export const RECOMMENDATION_OVERRIDES: Record<string, NarrativeOverride> = {
  // Red — multiple fatigue flags before the match
  p12: {
    coachAction:
      "Swap today's heavy lower-body work for mobility and reassess at tomorrow's check-in.",
    playerAction:
      "Skip the heavy session today — easy mobility only, and prioritise sleep tonight.",
  },
  // Amber — fatigue building
  p7: {
    coachAction:
      "Reduce lower-body volume and check soreness before training.",
    playerAction: "Flag your soreness to the coach before the session.",
  },
  // Amber — load ramping quickly
  p11: {
    coachAction: "Cap this week's load — hold the intensity but trim the volume.",
    playerAction: "Stick to the prescribed sets; don't add extra work this week.",
  },
  // Amber — sleep + soreness with a match approaching
  p23: {
    coachAction:
      "Keep it technical today and recheck sleep and soreness tomorrow.",
    playerAction: "Take it easy today and focus on getting a full night's sleep.",
  },
};
