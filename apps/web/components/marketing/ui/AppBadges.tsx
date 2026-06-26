"use client";

import { APP_LINKS } from "@/content/marketing/site";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * AppBadges — the player's path from the website into the app. Shows store
 * badges only when their URLs exist (so it's never a dead link), plus an "Open
 * the web app" button for the live PWA. Tracks clicks as the app on-ramp.
 */
export function AppBadges({
  className,
  webAppLabel = "Open the web app",
}: {
  className?: string;
  webAppLabel?: string;
}) {
  const onClick = (store: string) => () => track("demo_open", { store });

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {APP_LINKS.ios && (
        <StoreBadge href={APP_LINKS.ios} onClick={onClick("ios")} label="App Store" sub="Download on the" />
      )}
      {APP_LINKS.android && (
        <StoreBadge href={APP_LINKS.android} onClick={onClick("android")} label="Google Play" sub="Get it on" />
      )}
      {APP_LINKS.webApp && (
        <a
          href={APP_LINKS.webApp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick("web")}
          className="inline-flex h-11 items-center gap-2 rounded-card border border-hairline-strong bg-surface-2 px-4 text-sm font-medium text-strong transition-colors hover:bg-surface-3"
        >
          <PhoneIcon />
          {webAppLabel}
        </a>
      )}
    </div>
  );
}

function StoreBadge({
  href,
  onClick,
  label,
  sub,
}: {
  href: string;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2.5 rounded-card border border-hairline-strong bg-ink px-4 text-strong transition-colors hover:bg-surface-2"
    >
      <span className="text-left leading-none">
        <span className="block text-[9px] uppercase tracking-wide text-muted">{sub}</span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} className="text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}
