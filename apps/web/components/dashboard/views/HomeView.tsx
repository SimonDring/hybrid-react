"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "../DashboardProvider";
import { TeamOverviewCards } from "../TeamOverviewCards";
import { ReadinessSummary } from "../ReadinessSummary";
import { MatchWeekPanel } from "../MatchWeekPanel";
import { AttentionList } from "../AttentionList";
import { CoachActionsPanel } from "../CoachActionsPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { attentionPlayers } from "@/lib/dashboardUtils";
import { formatDaysUntil } from "@/lib/formatting";

/** The 5-minute landing: situation + the single most useful next action. */
export function HomeView() {
  const { team, players, loadTrend, now, constraints, openPlayer, notify } =
    useDashboard();
  const router = useRouter();
  const flaggedCount = attentionPlayers(players).length;
  const goFocus = () => router.push("/dashboard/focus");

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Fact label="Sport" value={constraints.sport} />
          <Fact label="Season" value={constraints.seasonPhase} />
          <Fact label="Week" value={`${team.currentWeek} of ${team.totalWeeks}`} />
          <Fact
            label="Next match"
            value={formatDaysUntil(team.nextFixture.date, now)}
          />
        </div>
        <Button variant="primary" size="md" onClick={goFocus}>
          Review flagged players
          {flaggedCount > 0 && (
            <Badge tone="adjust" className="ml-0.5 bg-ink/15 text-ink">
              {flaggedCount}
            </Badge>
          )}
        </Button>
      </div>

      <TeamOverviewCards players={players} loadTrend={loadTrend} now={now} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReadinessSummary players={players} />
        </div>
        <MatchWeekPanel
          team={team}
          players={players}
          now={now}
          onSelectPlayer={openPlayer}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttentionList
            players={players}
            onSelectPlayer={openPlayer}
            onRecommendationAction={(a, p) => notify(`${a} · ${p.name}`)}
            limit={3}
            onSeeAll={goFocus}
          />
        </div>
        <CoachActionsPanel
          players={players}
          onExport={() => notify("Preparing this week's report…")}
        />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs uppercase tracking-wide text-soft">{label}</span>
      <span className="text-sm font-medium text-body">{value}</span>
    </div>
  );
}
