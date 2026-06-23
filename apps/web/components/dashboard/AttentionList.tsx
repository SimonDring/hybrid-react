"use client";

import type { CoachVisiblePlayer } from "@/types/dashboard";
import { getStatusMeta } from "@/lib/statusLogic";
import { attentionPlayers } from "@/lib/dashboardUtils";
import { EMPTY, SECTION } from "@/content/dashboardCopy";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Confidence } from "@/components/ui/Confidence";
import { PlayerRecommendationCard } from "./PlayerRecommendationCard";

/**
 * The prioritised queue: red first, then amber, then missing data, then
 * players who are behind on sessions. The most urgent player is shown as a full
 * recommendation card; the rest are compact rows that open the detail drawer.
 */
export function AttentionList({
  players,
  onSelectPlayer,
  onRecommendationAction,
  limit,
  onSeeAll,
}: {
  players: CoachVisiblePlayer[];
  onSelectPlayer: (id: string) => void;
  onRecommendationAction: (action: string, player: CoachVisiblePlayer) => void;
  /** Cap the number of compact rows shown after the spotlight (e.g. on Home). */
  limit?: number;
  /** When provided, renders a "see all in Focus" footer link. */
  onSeeAll?: () => void;
}) {
  const flagged = attentionPlayers(players);
  const [spotlight, ...rest] = flagged;
  const visibleRest = typeof limit === "number" ? rest.slice(0, limit) : rest;
  const hidden = rest.length - visibleRest.length;

  return (
    <Card className="flex h-full flex-col" >
      <div id="attention" className="scroll-mt-6" />
      <SectionHeader
        title={SECTION.attention}
        hint={
          flagged.length > 0
            ? `${flagged.length} ${flagged.length === 1 ? "player" : "players"} in priority order`
            : undefined
        }
      />

      {flagged.length === 0 ? (
        <p className="rounded-card bg-surface-2 p-4 text-sm text-body">
          {EMPTY.noAttention}
        </p>
      ) : (
        <div className="space-y-3">
          <PlayerRecommendationCard
            player={spotlight}
            onAction={onRecommendationAction}
          />

          {visibleRest.length > 0 && (
            <ul className="space-y-2">
              {visibleRest.map((p) => (
                <AttentionRow
                  key={p.id}
                  player={p}
                  onClick={() => onSelectPlayer(p.id)}
                />
              ))}
            </ul>
          )}

          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="w-full rounded-card border border-hairline bg-surface-2 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-surface-3"
            >
              {hidden > 0
                ? `See all ${flagged.length} in Focus →`
                : "Open Focus →"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function AttentionRow({
  player,
  onClick,
}: {
  player: CoachVisiblePlayer;
  onClick: () => void;
}) {
  const meta = getStatusMeta(player.status);
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-card border border-hairline bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-strong">
              {player.name}
            </span>
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
            <span className="truncate text-xs text-soft">{player.position}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted">
            {player.reasons.slice(0, 3).join(" · ")}
          </p>
          <p className="mt-1 truncate text-sm text-body">
            {player.coachAction}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Confidence level={player.confidence} showLabel={false} />
        </div>
      </button>
    </li>
  );
}
