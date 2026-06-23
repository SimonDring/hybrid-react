"use client";

import { useState } from "react";
import type { CoachVisiblePlayer } from "@/types/dashboard";
import { getStatusMeta, toneClasses } from "@/lib/statusLogic";
import { ACTIONS, INJURY_SAFE } from "@/content/dashboardCopy";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { Confidence } from "@/components/ui/Confidence";

/**
 * The product's differentiator: not data, but a decision. It states the
 * player's status in plain English, why, what the player should do, what the
 * coach should do, what the call is based on, how confident it is, and when to
 * look again. When an injury is flagged it shows conservative, non-medical
 * language (handled upstream in lib/derive.ts).
 */
export function PlayerRecommendationCard({
  player,
  onAction,
}: {
  player: CoachVisiblePlayer;
  onAction?: (action: string, player: CoachVisiblePlayer) => void;
}) {
  const meta = getStatusMeta(player.status);
  const tone = toneClasses(meta.tone);
  const [reviewed, setReviewed] = useState(false);

  const act = (label: string) => {
    if (label === ACTIONS.reviewed) setReviewed(true);
    onAction?.(label, player);
  };

  return (
    <div
      className={cn(
        "rounded-card border bg-surface-2",
        reviewed ? "border-ready/40" : tone.border,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-hairline p-4">
        <div className="flex items-center gap-3">
          <StatusDot status={player.status} size="lg" glow />
          <div>
            <p className="font-semibold text-strong">{player.name}</p>
            <p className="text-xs text-muted">{player.position}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
          {player.injuryFlag && (
            <Badge tone="adjust">{INJURY_SAFE.badge}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Meaning + headline */}
        <div>
          <p className="text-sm font-medium text-strong">{meta.headline}</p>
          <p className="mt-0.5 text-sm text-muted">{meta.meaning}</p>
        </div>

        {/* Why */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-soft">
            Why
          </p>
          <div className="flex flex-wrap gap-1.5">
            {player.reasons.map((r) => (
              <span
                key={r}
                className="rounded-pill bg-surface-3 px-2.5 py-1 text-xs text-body"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Actions: player + coach */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ActionBlock label="Player action" text={player.playerAction} />
          <ActionBlock label="Coach action" text={player.coachAction} accent />
        </div>

        {/* Data used / missing */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <DataList title="Based on" items={player.dataUsed} kind="used" />
          <DataList title="Still missing" items={player.dataMissing} kind="missing" />
        </div>

        {/* Confidence + next review */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-hairline pt-3">
          <Confidence level={player.confidence} showNote />
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-soft">Next review</p>
            <p className="text-sm font-medium text-body">{player.nextReview}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={() => act(ACTIONS.accept)}>
            {ACTIONS.accept}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => act(ACTIONS.modify)}>
            {ACTIONS.modify}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => act(ACTIONS.message)}>
            {ACTIONS.message}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => act(ACTIONS.reviewed)}
            disabled={reviewed}
          >
            {reviewed ? "Reviewed ✓" : ACTIONS.reviewed}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionBlock({
  label,
  text,
  accent = false,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-3",
        accent ? "border-accent/30 bg-accent-soft" : "border-hairline bg-surface",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-soft">
        {label}
      </p>
      <p className={cn("mt-1 text-sm", accent ? "text-strong" : "text-body")}>
        {text}
      </p>
    </div>
  );
}

function DataList({
  title,
  items,
  kind,
}: {
  title: string;
  items: string[];
  kind: "used" | "missing";
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-soft">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-soft">—</p>
      ) : (
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-body">
              <span className={kind === "used" ? "text-ready" : "text-monitor"}>
                {kind === "used" ? "✓" : "○"}
              </span>
              {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
