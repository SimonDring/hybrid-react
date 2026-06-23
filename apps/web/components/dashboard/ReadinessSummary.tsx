import type { CoachVisiblePlayer } from "@/types/dashboard";
import { Card, SectionHeader } from "@/components/ui/Card";
import { READINESS_LEGEND } from "@/content/dashboardCopy";
import { squadReadinessInterpretation, squadSplit } from "@/lib/dashboardUtils";

const SEGMENTS = [
  { key: "green", label: READINESS_LEGEND.green, bar: "bg-ready", text: "text-ready" },
  { key: "amber", label: READINESS_LEGEND.amber, bar: "bg-monitor", text: "text-monitor" },
  { key: "red", label: READINESS_LEGEND.red, bar: "bg-adjust", text: "text-adjust" },
  { key: "grey", label: READINESS_LEGEND.grey, bar: "bg-nodata", text: "text-nodata" },
] as const;

/** The squad readiness split — a segmented bar with a plain-English read. */
export function ReadinessSummary({
  players,
}: {
  players: CoachVisiblePlayer[];
}) {
  const split = squadSplit(players);
  const total = Math.max(1, split.total);

  return (
    <Card className="flex h-full flex-col">
      <SectionHeader
        title="Squad readiness"
        hint="Where every player sits right now"
      />

      <div className="flex h-3 w-full gap-1 overflow-hidden rounded-pill">
        {SEGMENTS.map((s) => {
          const count = split[s.key];
          if (count === 0) return null;
          return (
            <div
              key={s.key}
              className={s.bar}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${count} ${s.label}`}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.bar}`} />
            <div className="flex items-baseline gap-1.5">
              <span className={`tnum text-lg font-semibold ${s.text}`}>
                {split[s.key]}
              </span>
              <span className="text-xs text-muted">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 border-t border-hairline pt-4 text-sm leading-relaxed text-body">
        {squadReadinessInterpretation(split)}
      </p>
    </Card>
  );
}
