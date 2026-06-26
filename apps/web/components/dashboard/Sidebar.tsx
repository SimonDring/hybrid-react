"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useDashboard } from "./DashboardProvider";
import { cn } from "@/lib/cn";
import {
  ChevronLeftIcon,
  CloseIcon,
  FocusIcon,
  HomeIcon,
  SlidersIcon,
  SquadIcon,
} from "@/components/ui/icons";

interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", hint: "Squad at a glance", icon: HomeIcon },
  { href: "/dashboard/focus", label: "Focus", hint: "Direction + who needs you", icon: FocusIcon },
  { href: "/dashboard/squad", label: "Squad", hint: "Every player", icon: SquadIcon },
  { href: "/dashboard/constraints", label: "Constraints", hint: "What shapes plans", icon: SlidersIcon },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <>
      {/* Desktop: in-flow, collapsible rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-hairline bg-surface lg:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <SidebarBody collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile/tablet: overlay */}
      <div className={cn("lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div
          onClick={onCloseMobile}
          className={cn(
            "fixed inset-0 z-40 bg-app/70 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-hairline bg-surface transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody collapsed={false} onCloseMobile={onCloseMobile} />
        </aside>
      </div>
    </>
  );
}

function SidebarBody({
  collapsed,
  onToggleCollapse,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { team } = useDashboard();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-hairline px-4",
          collapsed && "justify-center px-0",
        )}
      >
        {/* Shared RAG-dot brand mark — the same mark used on the website. */}
        <span className="flex flex-shrink-0 items-center gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-ready" />
          <span className="h-2 w-2 rounded-full bg-monitor" />
          <span className="h-2 w-2 rounded-full bg-adjust" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-strong">
              {team.name}
            </p>
            <p className="text-[11px] text-muted">Performance OS</p>
          </div>
        )}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-strong"
          >
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-card px-3 py-2.5 transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-surface-3 text-strong"
                  : "text-muted hover:bg-surface-2 hover:text-body",
              )}
            >
              <Icon
                className={cn("flex-shrink-0", active ? "text-accent" : "text-current")}
              />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-soft">{item.hint}</span>
                </span>
              )}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapse && (
        <div className="border-t border-hairline p-3">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-card px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-body",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeftIcon
              width={18}
              height={18}
              className={cn("transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );
}
