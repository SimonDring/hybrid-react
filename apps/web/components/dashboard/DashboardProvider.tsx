"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  CoachVisiblePlayer,
  LoadTrendPoint,
  Team,
  TeamConstraints,
} from "@/types/dashboard";
import { DEFAULT_CONSTRAINTS } from "@/data/mockConstraints";
import { cn } from "@/lib/cn";
import { PlayerDetailDrawer } from "./PlayerDetailDrawer";

interface DashboardContextValue {
  team: Team;
  players: CoachVisiblePlayer[];
  loadTrend: LoadTrendPoint[];
  now: Date;
  constraints: TeamConstraints;
  setConstraints: (c: TeamConstraints) => void;
  selectedPlayer: CoachVisiblePlayer | null;
  openPlayer: (id: string) => void;
  closePlayer: () => void;
  notify: (message: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/** Read the shared dashboard state from any view. */
export function useDashboard(): DashboardContextValue {
  const value = useContext(DashboardContext);
  if (!value) {
    throw new Error("useDashboard must be used within <DashboardProvider>");
  }
  return value;
}

/**
 * The one client island that wraps every view. It holds the cross-view state —
 * the selected player (so the detail drawer works from any view), the editable
 * team constraints (so editing them on Constraints updates the Focus direction),
 * and the toast — and renders the shared drawer + toast once.
 */
export function DashboardProvider({
  team,
  players,
  loadTrend,
  now: nowIso,
  children,
}: {
  team: Team;
  players: CoachVisiblePlayer[];
  loadTrend: LoadTrendPoint[];
  now: string;
  children: ReactNode;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [constraints, setConstraints] = useState<TeamConstraints>(DEFAULT_CONSTRAINTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId) ?? null,
    [players, selectedId],
  );

  const notify = useCallback((message: string) => setToast(message), []);
  const openPlayer = useCallback((id: string) => setSelectedId(id), []);
  const closePlayer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      team,
      players,
      loadTrend,
      now,
      constraints,
      setConstraints,
      selectedPlayer,
      openPlayer,
      closePlayer,
      notify,
    }),
    [team, players, loadTrend, now, constraints, selectedPlayer, openPlayer, closePlayer, notify],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
      <PlayerDetailDrawer
        player={selectedPlayer}
        now={now}
        onClose={closePlayer}
        onAction={(action, player) => notify(`${action} · ${player.name}`)}
      />
      <Toast message={toast} />
    </DashboardContext.Provider>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 transition-all duration-300",
        message ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      {message && (
        <div className="rounded-pill border border-hairline-strong bg-surface-3 px-4 py-2 text-sm text-strong shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}
