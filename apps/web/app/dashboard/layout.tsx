import { getDashboardData } from "@/data/mockApi";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";

/**
 * Shared layout for every dashboard view. Fetches the coach-safe data ONCE and
 * hands it to the client provider; the sidebar, drawer, toast, and constraints
 * state then persist across view switches (Next keeps the layout mounted).
 *
 * When auth lands, read the coach's team id from the session here before calling
 * the data layer.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { team, players, loadTrend, now } = await getDashboardData();

  return (
    <DashboardProvider team={team} players={players} loadTrend={loadTrend} now={now}>
      <DashboardFrame>{children}</DashboardFrame>
    </DashboardProvider>
  );
}
