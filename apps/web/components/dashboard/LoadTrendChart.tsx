"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LoadTrendPoint } from "@/types/dashboard";
import { SECTION } from "@/content/dashboardCopy";
import { Card, SectionHeader } from "@/components/ui/Card";

// Theme hex values — Recharts needs literal colours, not Tailwind classes.
const ACCENT = "#6fd3c4";
const PLANNED = "#97a6ff";
const FLAGGED = "#e8836f";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#7f8a9c";

/** Is team load building too fast, too low, or stable? — answered in one line. */
function caption(data: LoadTrendPoint[]): string {
  if (data.length < 2) return "A few more weeks and the load trend appears here.";
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const rising = last.teamAvgLoad > prev.teamAvgLoad;
  if (last.teamAvgLoad >= last.flaggedThreshold) {
    return "Team load is above the flagged line — ease the squad back before it sticks.";
  }
  if (rising) {
    return "Load is building steadily and sitting just below the flagged line — no action needed yet.";
  }
  return "Load is stable and tracking the plan.";
}

export function LoadTrendChart({ data }: { data: LoadTrendPoint[] }) {
  const threshold = data[0]?.flaggedThreshold ?? 0;

  // No aggregated history on the live board yet — say so, no fake axes.
  if (data.length === 0) {
    return (
      <Card className="flex h-full flex-col">
        <SectionHeader title={SECTION.loadTrend} />
        <p className="rounded-card bg-surface-2 p-4 text-sm text-body">
          Team load history builds up as players train.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <SectionHeader
        title={SECTION.loadTrend}
        hint="Team average vs planned, with the flagged line"
        action={<Legend />}
      />

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week"
              stroke={AXIS}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis
              stroke={AXIS}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={44}
              domain={[300, 520]}
            />
            <Tooltip
              cursor={{ stroke: GRID }}
              contentStyle={{
                background: "#1b2230",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                fontSize: 12,
                color: "#f0f3f7",
              }}
              labelStyle={{ color: "#7f8a9c" }}
              formatter={(value: number, name) => [
                `${value}`,
                name === "teamAvgLoad"
                  ? "Team load"
                  : name === "plannedLoad"
                    ? "Planned"
                    : name,
              ]}
            />
            <ReferenceLine
              y={threshold}
              stroke={FLAGGED}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Flagged", position: "right", fill: FLAGGED, fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="teamAvgLoad"
              stroke={ACCENT}
              strokeWidth={2.5}
              fill="url(#loadFill)"
              dot={{ r: 3, fill: ACCENT }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="plannedLoad"
              stroke={PLANNED}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 border-t border-hairline pt-3 text-sm text-body">
        {caption(data)}
      </p>
    </Card>
  );
}

function Legend() {
  const items = [
    { label: "Team load", className: "bg-accent" },
    { label: "Planned", className: "bg-accent-2" },
    { label: "Flagged", className: "bg-adjust" },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-1.5 w-3 rounded-full ${i.className}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
