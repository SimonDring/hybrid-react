import { redirect } from "next/navigation";
import { getLiveDashboardData } from "@/lib/liveBoard";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";

// Always render from the live rows — the board is a monitoring surface.
export const dynamic = "force-dynamic";

/**
 * Shared layout for every dashboard view. Fetches the coach-safe data ONCE —
 * LIVE from the team spine (teams / player_status, RLS-scoped to this coach's
 * session) — and hands it to the client provider; the sidebar, drawer, toast,
 * and constraints state then persist across view switches.
 *
 * The proxy (S12) has already verified session + active-coach membership; the
 * redirects here are the belt-and-braces fallback for edge states.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getLiveDashboardData();
  if (!data) redirect("/get-started");

  const { team, players, roster, initialConstraints, loadTrend, now } = data;

  return (
    <DashboardProvider
      team={team}
      players={players}
      roster={roster}
      initialConstraints={initialConstraints}
      loadTrend={loadTrend}
      now={now}
    >
      <DashboardFrame>{children}</DashboardFrame>
    </DashboardProvider>
  );
}
