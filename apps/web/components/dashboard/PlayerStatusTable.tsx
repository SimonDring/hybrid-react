"use client";

import { useMemo, useState } from "react";
import type { CoachVisiblePlayer } from "@/types/dashboard";
import { getLoadMeta, getStatusMeta, toneClasses } from "@/lib/statusLogic";
import {
  type SortDir,
  type SortKey,
  type StatusFilter,
  filterPlayers,
  sortPlayers,
  squadSplit,
} from "@/lib/dashboardUtils";
import { SECTION } from "@/content/dashboardCopy";
import { cn } from "@/lib/cn";
import { formatRelativeTime, pct } from "@/lib/formatting";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Confidence } from "@/components/ui/Confidence";
import { Tabs } from "@/components/ui/Tabs";

interface Column {
  key: SortKey | null;
  label: string;
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Player" },
  { key: "status", label: "Status" },
  { key: "readiness", label: "Readiness" },
  { key: "load", label: "Load", className: "hidden md:table-cell" },
  { key: "adherence", label: "Adherence", className: "hidden sm:table-cell" },
  { key: null, label: "Updated", className: "hidden xl:table-cell" },
  { key: null, label: "Recommended action", className: "hidden lg:table-cell" },
  { key: null, label: "Confidence", className: "hidden md:table-cell" },
];

export function PlayerStatusTable({
  players,
  now,
  onSelectPlayer,
}: {
  players: CoachVisiblePlayer[];
  now: Date;
  onSelectPlayer: (id: string) => void;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const split = squadSplit(players);
  const filterTabs = [
    { value: "all", label: "All", count: split.total },
    { value: "green", label: "Ready", count: split.green },
    { value: "amber", label: "Monitor", count: split.amber },
    { value: "red", label: "Adjust", count: split.red },
    { value: "grey", label: "Missing data", count: split.grey },
  ];

  const rows = useMemo(() => {
    const filtered = filterPlayers(players, { status, search });
    return sortPlayers(filtered, sortKey, sortDir);
  }, [players, status, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey | null) => {
    if (!key) return;
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <Card className="flex flex-col">
      <SectionHeader
        title={SECTION.table}
        hint="Filter, sort, or search — click a player for the full picture"
        action={
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player…"
            className="h-9 w-44 rounded-pill border border-hairline-strong bg-surface-2 px-3.5 text-xs text-body placeholder:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        }
      />

      <div className="mb-4">
        <Tabs
          items={filterTabs}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          ariaLabel="Filter players by status"
        />
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              {COLUMNS.map((c) => {
                const active = c.key && c.key === sortKey;
                return (
                  <th
                    key={c.label}
                    className={cn(
                      "px-3 py-2 text-xs font-medium uppercase tracking-wide text-soft",
                      c.key && "cursor-pointer select-none hover:text-body",
                      c.className,
                    )}
                    onClick={() => toggleSort(c.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {active && (
                        <span className="text-accent">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-soft">
                  No players match this filter.
                </td>
              </tr>
            ) : (
              rows.map((p) => <PlayerRow key={p.id} player={p} now={now} onClick={() => onSelectPlayer(p.id)} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PlayerRow({
  player,
  now,
  onClick,
}: {
  player: CoachVisiblePlayer;
  now: Date;
  onClick: () => void;
}) {
  const meta = getStatusMeta(player.status);
  const load = getLoadMeta(player.loadState);
  const adherence = player.adherencePercent; // null = no logged sessions yet
  const adherenceTone =
    adherence !== null && adherence >= 80
      ? "ready"
      : adherence !== null && adherence >= 60
        ? "monitor"
        : "adjust";

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-surface-2"
    >
      <td className="px-3 py-3 font-medium text-strong">{player.name}</td>
      <td className="px-3 py-3">
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <span className={cn("tnum font-semibold", player.readinessScore === null ? "text-soft" : toneClasses(meta.tone).text)}>
          {player.readinessScore ?? "—"}
        </span>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span className={cn("text-xs font-medium", toneClasses(load.tone).text)}>
          {load.label}
        </span>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        {adherence === null ? (
          <span className="text-xs text-soft">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="tnum text-xs text-body">{pct(adherence)}</span>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-3">
              <span
                className={cn("block h-full rounded-full", toneClasses(adherenceTone).bar)}
                style={{ width: `${adherence}%` }}
              />
            </span>
          </div>
        )}
      </td>
      <td className="hidden px-3 py-3 text-xs text-muted xl:table-cell">
        {player.lastUpdated === null
          ? "—"
          : formatRelativeTime(player.lastUpdated, now)}
      </td>
      <td className="hidden max-w-[220px] px-3 py-3 text-xs text-body lg:table-cell">
        <span className="line-clamp-2">{player.coachAction}</span>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <Confidence level={player.confidence} showLabel={false} />
      </td>
    </tr>
  );
}
