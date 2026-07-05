"use client";

import { useState } from "react";
import type { CoachVisiblePlayer } from "@/types/dashboard";
import { getLoadMeta, getStatusMeta, toneClasses } from "@/lib/statusLogic";
import { ACTIONS } from "@/content/dashboardCopy";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeTime, pct } from "@/lib/formatting";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/ui/Sparkline";
import { PlayerRecommendationCard } from "./PlayerRecommendationCard";

const WEEK_CELL: Record<string, string> = {
  completed: "bg-ready",
  partial: "bg-monitor",
  missed: "bg-adjust",
  none: "bg-surface-3 opacity-50",
};

export function PlayerDetailDrawer({
  player,
  now,
  onClose,
  onAction,
}: {
  player: CoachVisiblePlayer | null;
  now: Date;
  onClose: () => void;
  onAction: (action: string, player: CoachVisiblePlayer) => void;
}) {
  return (
    <Drawer open={player !== null} onClose={onClose} label="Player detail">
      {player && (
        <DrawerContent
          key={player.id}
          player={player}
          now={now}
          onClose={onClose}
          onAction={onAction}
        />
      )}
    </Drawer>
  );
}

function DrawerContent({
  player,
  now,
  onClose,
  onAction,
}: {
  player: CoachVisiblePlayer;
  now: Date;
  onClose: () => void;
  onAction: (action: string, player: CoachVisiblePlayer) => void;
}) {
  const meta = getStatusMeta(player.status);
  const load = getLoadMeta(player.loadState);
  const [note, setNote] = useState("");

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-hairline p-5">
        <div className="flex items-center gap-3">
          <span className={cn("h-3 w-3 rounded-full", toneClasses(meta.tone).bar)} />
          <h2 className="text-lg font-semibold text-strong">{player.name}</h2>
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-strong"
        >
          ✕
        </button>
      </div>

      {/* Scroll body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            label="Readiness"
            value={player.readinessScore === null ? "—" : `${player.readinessScore}`}
            tone={meta.tone}
          />
          <MiniStat label="Load" value={load.label} />
          <MiniStat
            label="Adherence"
            value={player.adherencePercent === null ? "—" : pct(player.adherencePercent)}
          />
        </div>

        {/* Trends — empty on the live board until a history feed lands. */}
        {player.readinessTrend.length === 0 && player.loadTrend.length === 0 ? (
          <p className="text-xs text-muted">
            History appears as they log sessions and check-ins.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TrendCard title="Readiness — last 10 days">
              <Sparkline data={player.readinessTrend} className="text-accent" />
            </TrendCard>
            <TrendCard title="Load — last 10 days">
              <Sparkline data={player.loadTrend} className="text-accent-2" />
            </TrendCard>
          </div>
        )}

        {/* This week's plan */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-soft">
            This week
          </p>
          {player.weeklyAdherence.length === 0 ? (
            <p className="text-xs text-muted">
              History appears as they log sessions and check-ins.
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {player.weeklyAdherence.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1" title={d.sessionName}>
                  <span className="text-[10px] uppercase text-soft">{d.label}</span>
                  <span className={cn("h-7 w-full rounded", WEEK_CELL[d.state])} />
                </div>
              ))}
            </div>
          )}
          <p className="mt-2.5 text-xs text-muted">
            {player.nextSession && (
              <>
                Next: <span className="text-body">{player.nextSession.name}</span> ·{" "}
                {formatDate(player.nextSession.date)} ·{" "}
              </>
            )}
            {player.lastUpdated === null
              ? "No update yet"
              : `Updated ${formatRelativeTime(player.lastUpdated, now)}`}
          </p>
        </div>

        {/* Recommendation */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-soft">
            Recommendation
          </p>
          <PlayerRecommendationCard player={player} onAction={onAction} />
        </div>

        {/* Advanced details (ACWR tucked away — not the primary read) */}
        <details className="rounded-card border border-hairline bg-surface-2 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted">
            Advanced details
          </summary>
          {/* Raw weekly/planned load numbers are deliberately NOT shown — the
              coach-safe surface carries only the derived ratio. */}
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <Detail label="Workload ratio" value={player.acwr === null ? "—" : player.acwr.toFixed(2)} />
          </dl>
        </details>

        {/* Coach notes */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-soft">
            Coach notes
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private notes for this player…"
            rows={3}
            className="w-full rounded-card border border-hairline bg-surface-2 p-3 text-sm text-body placeholder:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 border-t border-hairline p-4">
        <Button variant="primary" size="sm" onClick={() => onAction(ACTIONS.modify, player)}>
          Modify next session
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction(ACTIONS.message, player)}>
          Message player
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAction(ACTIONS.reviewed, player)}>
          Mark reviewed
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAction(ACTIONS.flag, player)}>
          Flag for follow-up
        </Button>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: ReturnType<typeof getStatusMeta>["tone"];
}) {
  return (
    <div className="rounded-card border border-hairline bg-surface-2 p-3">
      <p className="text-[10px] uppercase tracking-wide text-soft">{label}</p>
      <p className={cn("tnum mt-1 text-xl font-semibold", tone ? toneClasses(tone).text : "text-strong")}>
        {value}
      </p>
    </div>
  );
}

function TrendCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-surface-2 p-3">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-soft">{title}</p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-soft">{label}</dt>
      <dd className="tnum mt-0.5 font-medium text-body">{value}</dd>
    </div>
  );
}
