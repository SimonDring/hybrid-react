"use client";

import type { AdherenceState, CoachVisiblePlayer } from "@/types/dashboard";
import { SECTION } from "@/content/dashboardCopy";
import { cn } from "@/lib/cn";
import { Card, SectionHeader } from "@/components/ui/Card";

const CELL: Record<AdherenceState, { className: string; label: string }> = {
  completed: { className: "bg-ready", label: "Completed" },
  partial: { className: "bg-monitor", label: "Partial" },
  missed: { className: "bg-adjust", label: "Missed" },
  none: { className: "bg-surface-3", label: "No session" },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Rows = players, columns = this week's sessions. Read the squad at a glance. */
export function AdherenceHeatmap({
  players,
  onSelectPlayer,
}: {
  players: CoachVisiblePlayer[];
  onSelectPlayer: (id: string) => void;
}) {
  return (
    <Card className="flex h-full flex-col">
      <SectionHeader
        title={SECTION.adherence}
        hint="Completed · partial · missed · no session"
        action={<HeatLegend />}
      />

      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          {/* Header row */}
          <div className="grid grid-cols-[84px_repeat(7,minmax(0,1fr))] gap-1 pb-1">
            <span />
            {DAYS.map((d) => (
              <span key={d} className="text-center text-[10px] font-medium uppercase text-soft">
                {d}
              </span>
            ))}
          </div>

          {/* Player rows */}
          <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {players.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[84px_repeat(7,minmax(0,1fr))] items-center gap-1"
              >
                <button
                  onClick={() => onSelectPlayer(p.id)}
                  className="truncate text-left text-xs text-muted transition-colors hover:text-strong"
                  title={p.name}
                >
                  {p.name}
                </button>
                {p.weeklyAdherence.map((day, i) => {
                  const cell = CELL[day.state];
                  return (
                    <span
                      key={i}
                      className={cn("h-5 rounded", cell.className, day.state === "none" && "opacity-50")}
                      title={`${day.label}: ${day.sessionName ? `${day.sessionName} — ` : ""}${cell.label}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HeatLegend() {
  const items: AdherenceState[] = ["completed", "partial", "missed", "none"];
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {items.map((s) => (
        <span key={s} className="flex items-center gap-1 text-[11px] text-muted">
          <span className={cn("h-2.5 w-2.5 rounded-sm", CELL[s].className)} />
          {CELL[s].label}
        </span>
      ))}
    </div>
  );
}
