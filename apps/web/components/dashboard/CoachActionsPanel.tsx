"use client";

import { useState } from "react";
import type { CoachVisiblePlayer } from "@/types/dashboard";
import { buildCoachActions } from "@/lib/dashboardUtils";
import { SECTION } from "@/content/dashboardCopy";
import { cn } from "@/lib/cn";
import { Card, SectionHeader } from "@/components/ui/Card";

const TONE_DOT: Record<string, string> = {
  ready: "bg-ready",
  monitor: "bg-monitor",
  adjust: "bg-adjust",
  nodata: "bg-nodata",
  accent: "bg-accent",
};

/**
 * Turns the squad state into a short, tickable to-do list, so the dashboard is
 * operational (what to do) rather than only analytical (what's happening).
 */
export function CoachActionsPanel({
  players,
  onExport,
}: {
  players: CoachVisiblePlayer[];
  onExport: () => void;
}) {
  const actions = buildCoachActions(players);
  const [done, setDone] = useState<Set<string>>(new Set());

  const handle = (id: string) => {
    if (id === "export") {
      onExport();
      return;
    }
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const remaining = actions.filter((a) => a.id !== "export" && !done.has(a.id)).length;

  return (
    <Card className="flex h-full flex-col">
      <SectionHeader
        title={SECTION.coachActions}
        hint={remaining > 0 ? `${remaining} still to do` : "All clear"}
      />
      <ul className="space-y-2">
        {actions.map((a) => {
          const isDone = done.has(a.id);
          return (
            <li key={a.id}>
              <button
                onClick={() => handle(a.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors",
                  isDone
                    ? "border-hairline bg-surface opacity-60"
                    : "border-hairline bg-surface-2 hover:bg-surface-3",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                    isDone
                      ? "border-ready bg-ready text-ink"
                      : "border-hairline-strong",
                  )}
                >
                  {isDone ? (
                    <span className="text-[10px] leading-none">✓</span>
                  ) : (
                    <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[a.tone])} />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      isDone ? "text-muted line-through" : "text-strong",
                    )}
                  >
                    {a.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {a.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
