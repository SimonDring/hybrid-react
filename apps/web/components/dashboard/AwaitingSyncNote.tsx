import type { RosterSummary } from "@/types/dashboard";
import { InfoTip } from "@/components/ui/InfoTip";
import { JARGON } from "@/content/dashboardCopy";

/**
 * "N joined, awaiting their first sync" — the one honest line about players
 * who are on the roster but have no status row yet. Rendered on Home and
 * Squad from the same source so the two views can never disagree. The clamp
 * is belt-and-braces: liveBoard reconciles rows against the active roster,
 * which already guarantees joined >= reporting.
 */
export function AwaitingSyncNote({ roster }: { roster: RosterSummary }) {
  const awaiting = Math.max(0, roster.joined - roster.reporting);
  if (awaiting === 0) return null;
  return (
    <p className="inline-flex items-center gap-1 text-xs text-muted">
      {awaiting} joined, awaiting their first sync
      <InfoTip {...JARGON.awaitingSync} />
    </p>
  );
}
