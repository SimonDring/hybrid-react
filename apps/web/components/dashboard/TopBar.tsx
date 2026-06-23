"use client";

import { usePathname } from "next/navigation";
import { useDashboard } from "./DashboardProvider";
import { Button } from "@/components/ui/Button";
import { MenuIcon } from "@/components/ui/icons";
import { CTA } from "@/content/dashboardCopy";
import { formatRelativeTime } from "@/lib/formatting";

const TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Home", sub: "The squad situation at a glance" },
  "/dashboard/focus": { title: "Focus", sub: "Direction and who needs you today" },
  "/dashboard/squad": { title: "Squad", sub: "Every player — sortable and searchable" },
  "/dashboard/constraints": {
    title: "Team constraints",
    sub: "What shapes every player's plan",
  },
};

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const pathname = usePathname();
  const { team, now, notify } = useDashboard();
  const meta = TITLES[pathname] ?? TITLES["/dashboard"];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-app/85 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMobileNav}
        aria-label="Open menu"
        className="rounded-card p-2 text-muted hover:bg-surface-2 hover:text-strong lg:hidden"
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-strong">{meta.title}</h1>
        <p className="hidden truncate text-xs text-muted sm:block">{meta.sub}</p>
      </div>

      <span className="hidden text-xs text-soft md:inline">
        Synced {formatRelativeTime(team.lastSyncAt, now)}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => notify("Preparing this week's report…")}
      >
        {CTA.exportReport}
      </Button>
    </header>
  );
}
