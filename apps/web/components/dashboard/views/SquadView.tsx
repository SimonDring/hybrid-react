"use client";

import { useDashboard } from "../DashboardProvider";
import { PlayerStatusTable } from "../PlayerStatusTable";
import { LoadTrendChart } from "../LoadTrendChart";
import { AdherenceHeatmap } from "../AdherenceHeatmap";

/** The analytical view: the whole squad, plus team load + adherence. */
export function SquadView() {
  const { players, roster, loadTrend, now, openPlayer } = useDashboard();
  const awaitingFirstSync = roster.joined - roster.reporting;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Joined members without a status row yet — name them honestly rather
          than render ghost rows (the coach can't see them until they sync). */}
      {awaitingFirstSync > 0 && (
        <p className="text-xs text-muted">
          {awaitingFirstSync} joined, awaiting their first sync
        </p>
      )}
      <PlayerStatusTable players={players} now={now} onSelectPlayer={openPlayer} />
      <div className="grid gap-5 lg:grid-cols-2">
        <LoadTrendChart data={loadTrend} />
        <AdherenceHeatmap players={players} onSelectPlayer={openPlayer} />
      </div>
    </div>
  );
}
