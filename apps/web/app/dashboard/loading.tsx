import { Card, SectionHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SECTION } from "@/content/dashboardCopy";

/**
 * Segment-level loading state for /dashboard. The layout fetches the live
 * board server-side (app/dashboard/layout.tsx awaits getLiveDashboardData),
 * so on route entry this file replaces the WHOLE segment — sidebar included —
 * until the data resolves. It therefore renders standalone: a plain server
 * component with its own minimal shell, no DashboardProvider/useDashboard.
 *
 * The blocks mirror the Home view's real frames (facts strip, six overview
 * stat cards, readiness + match-week row, attention list + coach actions) so
 * the reveal doesn't jump. Section titles are the real static strings — only
 * the data areas shimmer.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen" aria-busy="true">
      <span className="sr-only">Loading your dashboard…</span>

      {/* Sidebar strip — mirrors Sidebar's expanded desktop width (w-60). */}
      <div className="sticky top-0 hidden h-screen w-60 flex-shrink-0 border-r border-hairline bg-surface lg:block">
        <div className="flex h-16 items-center gap-2.5 border-b border-hairline px-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-1.5 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar strip — same h-16 + hairline as TopBar. */}
        <div className="flex h-16 items-center gap-3 border-b border-hairline bg-app px-4 sm:px-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="ml-auto h-8 w-8" />
        </div>

        {/* Home view frames — same spacing/grid as HomeView. */}
        <div className="flex-1 space-y-5 p-4 sm:p-6">
          {/* Facts strip + primary action */}
          <div className="flex flex-col gap-3 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-full sm:w-52" />
          </div>

          {/* Six overview stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2.5 h-7 w-14" />
                <Skeleton className="mt-2 h-3 w-full max-w-24" />
              </Card>
            ))}
          </div>

          {/* Readiness bar + match week */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="flex flex-col lg:col-span-2">
              <SectionHeader
                title={SECTION.overview}
                hint="Where every player sits right now"
              />
              <Skeleton className="h-3 w-full" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full max-w-28" />
                ))}
              </div>
              <div className="mt-5 border-t border-hairline pt-4">
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
            <Card className="flex flex-col">
              <SectionHeader title={SECTION.matchWeek} />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="mt-3 h-4 w-full" />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24" />
                ))}
              </div>
            </Card>
          </div>

          {/* Attention list + coach actions */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="flex flex-col lg:col-span-2">
              <SectionHeader title={SECTION.attention} />
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[74px] w-full" />
                  ))}
                </div>
              </div>
            </Card>
            <Card className="flex flex-col">
              <SectionHeader title={SECTION.coachActions} />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[62px] w-full" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
