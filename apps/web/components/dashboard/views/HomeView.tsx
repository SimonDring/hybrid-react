"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../DashboardProvider";
import { TeamOverviewCards } from "../TeamOverviewCards";
import { ReadinessSummary } from "../ReadinessSummary";
import { MatchWeekPanel } from "../MatchWeekPanel";
import { AttentionList } from "../AttentionList";
import { CoachActionsPanel } from "../CoachActionsPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { attentionPlayers } from "@/lib/dashboardUtils";
import { formatDaysUntil } from "@/lib/formatting";

/** The 5-minute landing: situation + the single most useful next action. */
export function HomeView() {
  const { team, players, roster, loadTrend, now, openPlayer, notify } =
    useDashboard();
  const router = useRouter();
  const flaggedCount = attentionPlayers(players).length;
  const awaitingFirstSync = roster.joined - roster.reporting;
  const goFocus = () => router.push("/dashboard/focus");

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* No players yet → the join code IS the next action; lead with it. */}
      {players.length === 0 && <JoinCodeCard code={team.joinCode ?? null} />}

      <div className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Only facts we actually know — sport/season from the teams row;
              week + fixture arrive with the team-schedule feature. */}
          {team.sport && <Fact label="Sport" value={team.sport} />}
          {team.seasonPhase !== "—" && (
            <Fact label="Season" value={team.seasonPhase} />
          )}
          {team.currentWeek !== undefined && team.totalWeeks !== undefined && (
            <Fact label="Week" value={`${team.currentWeek} of ${team.totalWeeks}`} />
          )}
          <Fact
            label="Next match"
            value={
              team.nextFixture
                ? formatDaysUntil(team.nextFixture.date, now)
                : "None scheduled"
            }
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

      {awaitingFirstSync > 0 && (
        <p className="text-xs text-muted">
          {awaitingFirstSync} joined, awaiting their first sync
        </p>
      )}

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

/** Zero-state lead card: share the join code so the board can fill in. */
function JoinCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no clipboard — the code is still visible to copy by hand */
    }
  }

  return (
    <Card>
      <SectionHeader
        title="Get your squad on the board"
        hint="Share this code — the dashboard fills in as players join and sync"
      />
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded-card bg-surface-2 px-4 py-2.5 font-mono text-2xl font-semibold tracking-widest text-strong">
          {code ?? "—"}
        </code>
        {code && (
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? "Copied ✓" : "Copy code"}
          </Button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        Players enter this code in the mobile app under Settings → Teams.
      </p>
    </Card>
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
