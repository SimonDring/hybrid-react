import type { CoachVisiblePlayer, Team } from "@/types/dashboard";
import { Card, CardEmptyState, SectionHeader } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { formatDate, formatDaysUntil } from "@/lib/formatting";
import { compareAttention } from "@/lib/dashboardUtils";

/** Match-week focus + the players to keep an eye on before kick-off. */
export function MatchWeekPanel({
  team,
  players,
  now,
  onSelectPlayer,
}: {
  team: Team;
  players: CoachVisiblePlayer[];
  now: Date;
  onSelectPlayer: (id: string) => void;
}) {
  const monitor = players
    .filter((p) => p.status === "red" || p.status === "amber")
    .sort(compareAttention)
    .slice(0, 6);

  // Fixtures arrive with the team schedule → constraints feature. Until then
  // the panel says so plainly rather than inventing a match date.
  const fixture = team.nextFixture;
  if (!fixture) {
    return (
      <CardEmptyState
        title="Match week"
        message="No fixtures yet — the match-week view opens up once your team schedule is added."
      />
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <SectionHeader title="Match week" hint={fixture.label} />

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-strong">
          Match {formatDaysUntil(fixture.date, now)}
        </span>
        <span className="text-xs text-soft">
          {formatDate(fixture.date)}
        </span>
      </div>

      {team.matchWeekFocus && (
        <p className="mt-3 text-sm text-body">
          <span className="font-medium text-strong">Focus: </span>
          {team.matchWeekFocus}
        </p>
      )}

      {team.matchWeekAdjustment && (
        <div className="mt-3 rounded-card bg-surface-2 p-3 text-sm leading-relaxed text-body">
          {team.matchWeekAdjustment}
        </div>
      )}

      <div className="mt-4 border-t border-hairline pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Monitor before the match
        </p>
        {monitor.length === 0 ? (
          <p className="text-sm text-soft">No one flagged — squad is on track.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {monitor.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-2 px-2.5 py-1 text-xs text-body transition-colors hover:bg-surface-3 hover:text-strong"
              >
                <StatusDot status={p.status} size="sm" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
