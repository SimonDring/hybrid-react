import type { CoachVisiblePlayer, LoadTrendPoint, RosterSummary } from "@/types/dashboard";
import type { Tone } from "@/lib/statusLogic";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { InfoTip } from "@/components/ui/InfoTip";
import { JARGON, type JargonKey } from "@/content/dashboardCopy";
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
  /** Which JARGON entry explains this card (rendered as an ⓘ beside the label). */
  jargonKey: JargonKey;
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
  roster,
  loadTrend,
  now,
}: {
  players: CoachVisiblePlayer[];
  roster: RosterSummary;
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
      jargonKey: "squadReadiness",
      value: avg === null ? "—" : `${avg}`,
      sub: `${split.green} of ${split.total} ready to train`,
      tone: avg === null ? "nodata" : avg >= 70 ? "ready" : avg >= 55 ? "monitor" : "adjust",
    },
    {
      label: "Needs attention",
      jargonKey: "needsAttention",
      value: `${flagged}`,
      sub: "players to check before training",
      tone: split.red > 0 ? "adjust" : split.amber > 0 ? "monitor" : "ready",
    },
    {
      label: "Sessions this week",
      jargonKey: "sessionsThisWeek",
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
      jargonKey: "trainingLoadCard",
      value: load.value,
      sub: load.sub,
      tone: load.tone,
    },
    {
      label: "Recovery trend",
      jargonKey: "recoveryTrend",
      value: recovery.value,
      sub: "squad average vs last week",
      tone: recovery.tone,
      accessory: recovery.accessory,
    },
    {
      // Denominator is the ROSTER, not just reporting rows — 2/2 would read
      // "all current" when eight joined players have never synced at all.
      label: "Updated today",
      jargonKey: "updatedToday",
      value: `${updated}/${roster.joined}`,
      sub: `${split.grey} without a readiness score`,
      tone: updated / Math.max(1, roster.joined) >= 0.8 ? "ready" : "monitor",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <Stat
            label={c.label}
            labelTip={<InfoTip {...JARGON[c.jargonKey]} />}
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
