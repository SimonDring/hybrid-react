import type { CoachVisiblePlayer, LoadTrendPoint } from "@/types/dashboard";
import type { Tone } from "@/lib/statusLogic";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { pct } from "@/lib/formatting";
import {
  averageReadiness,
  readinessTrendDirection,
  squadSplit,
  teamAdherence,
  updatedToday,
} from "@/lib/dashboardUtils";

interface OverviewCard {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
  accessory?: string;
}

/** Reads the recent team load series into a plain-English status. */
function loadStatus(loadTrend: LoadTrendPoint[]): { value: string; sub: string; tone: Tone } {
  if (loadTrend.length < 2) {
    return { value: "Building baseline", sub: "team load vs plan", tone: "nodata" };
  }
  const last = loadTrend[loadTrend.length - 1];
  const prev = loadTrend[loadTrend.length - 2];
  const rising = last.teamAvgLoad > prev.teamAvgLoad;
  const overLine = last.teamAvgLoad >= last.flaggedThreshold;
  if (overLine) return { value: "High", sub: "above the flagged line", tone: "adjust" };
  if (rising) return { value: "Building", sub: "climbing, still in range", tone: "monitor" };
  return { value: "Steady", sub: "tracking the plan", tone: "ready" };
}

export function TeamOverviewCards({
  players,
  loadTrend,
  now,
}: {
  players: CoachVisiblePlayer[];
  loadTrend: LoadTrendPoint[];
  now: Date;
}) {
  const split = squadSplit(players);
  const avg = averageReadiness(players);
  const adherence = teamAdherence(players);
  const dir = readinessTrendDirection(players);
  const updated = updatedToday(players, now);
  const load = loadStatus(loadTrend);
  const flagged = split.red + split.amber + split.grey;

  // dir is null until players have readiness history — an honest "building" state.
  const recovery =
    dir === null
      ? { value: "Building history", accessory: undefined, tone: "nodata" as Tone }
      : {
          up: { value: "Improving", accessory: "↑", tone: "ready" as Tone },
          down: { value: "Dipping", accessory: "↓", tone: "adjust" as Tone },
          flat: { value: "Steady", accessory: "→", tone: undefined },
        }[dir];

  const cards: OverviewCard[] = [
    {
      label: "Squad readiness",
      value: avg === null ? "—" : `${avg}`,
      sub: `${split.green} of ${split.total} ready to train`,
      tone: avg === null ? "nodata" : avg >= 70 ? "ready" : avg >= 55 ? "monitor" : "adjust",
    },
    {
      label: "Needs attention",
      value: `${flagged}`,
      sub: "players to check before training",
      tone: split.red > 0 ? "adjust" : split.amber > 0 ? "monitor" : "ready",
    },
    {
      label: "Sessions this week",
      value: adherence === null ? "—" : pct(adherence),
      sub: adherence === null ? "no sessions logged yet" : "completed across the squad",
      tone:
        adherence === null
          ? "nodata"
          : adherence >= 80
            ? "ready"
            : adherence >= 60
              ? "monitor"
              : "adjust",
    },
    {
      label: "Training load",
      value: load.value,
      sub: load.sub,
      tone: load.tone,
    },
    {
      label: "Recovery trend",
      value: recovery.value,
      sub: "squad average vs last week",
      tone: recovery.tone,
      accessory: recovery.accessory,
    },
    {
      label: "Updated today",
      value: `${updated}/${split.total}`,
      sub: `${split.grey} waiting on data`,
      tone: updated / Math.max(1, split.total) >= 0.8 ? "ready" : "monitor",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <Stat
            label={c.label}
            value={c.value}
            sub={c.sub}
            tone={c.tone}
            accessory={
              c.accessory ? (
                <span className="text-lg font-semibold text-muted">
                  {c.accessory}
                </span>
              ) : undefined
            }
          />
        </Card>
      ))}
    </div>
  );
}
