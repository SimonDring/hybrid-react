"use client";

import { useDashboard } from "../DashboardProvider";
import { TeamDirectionPanel } from "../TeamDirectionPanel";
import { PlayerRecommendationCard } from "../PlayerRecommendationCard";
import { Card } from "@/components/ui/Card";
import { EMPTY } from "@/content/dashboardCopy";
import { attentionPlayers } from "@/lib/dashboardUtils";

/** Direction first, then the players that direction affects most this week. */
export function FocusView() {
  const { team, players, now, constraints, notify } = useDashboard();
  const flagged = attentionPlayers(players);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <TeamDirectionPanel team={team} constraints={constraints} now={now} />

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-strong">
            Players this direction affects most
          </h2>
          {flagged.length > 0 && (
            <span className="text-xs text-muted">
              {flagged.length} in priority order
            </span>
          )}
        </div>

        {flagged.length === 0 ? (
          <Card>
            <p className="text-sm text-body">{EMPTY.noAttention}</p>
          </Card>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {flagged.map((p) => (
              <PlayerRecommendationCard
                key={p.id}
                player={p}
                onAction={(a, pl) => notify(`${a} · ${pl.name}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
