/**
 * Ambient types for the parts of @performance-os/engine the web consumes. The engine is
 * untyped JS; this declaration lets TS type the `rollUp` seam (WP-53 stage 2) without pulling
 * the whole engine graph into tsc. Keep in sync with packages/engine/src/lib/team/rollUp.js.
 */
declare module "@performance-os/engine" {
  export interface RollUpSignal {
    userId: string | null;
    status: "red" | "amber" | "green" | "grey";
    confidence: "low" | "medium" | "high";
    loadState: string;
    injuryStatus: string;
    injuryFlag: boolean;
    readinessScore: number | null;
    acwr: number | null;
    adherencePercent: number | null;
    lowAdherence: boolean;
    lastUpdated: string | null;
  }
  export function rollUp(row: unknown, opts?: { nowMs?: number }): RollUpSignal;
  export const LOW_ADHERENCE_THRESHOLD: number;
}
