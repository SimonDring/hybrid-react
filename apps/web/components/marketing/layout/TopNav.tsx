"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS, PRIMARY_CTA, COACH_CTA } from "@/content/marketing/site";
import { cn } from "@/lib/cn";
import { CtaLink } from "@/components/marketing/ui/CtaLink";
import { Wordmark } from "@/components/marketing/ui/Wordmark";

/**
 * TopNav — sticky marketing header. Goes translucent + blurred once scrolled so
 * the hero reads cleanly at the top. Links and CTAs come from content/site.ts.
 * Mobile collapses to a full-screen menu.
 */
export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "border-b border-hairline bg-app/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Wordmark />

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-pill px-3 py-2 text-sm text-muted transition-colors hover:text-strong"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={COACH_CTA.href}
            className="rounded-pill px-3 py-2 text-sm text-body transition-colors hover:text-strong"
          >
            {COACH_CTA.label}
          </Link>
          <CtaLink href={PRIMARY_CTA.href} variant="primary" size="sm" label="nav_primary">
            {PRIMARY_CTA.label}
          </CtaLink>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-strong transition-colors hover:bg-surface-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-hairline bg-app/95 backdrop-blur-md transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[80vh]" : "max-h-0 border-transparent",
        )}
      >
        <div className="space-y-1 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-card px-3 py-3 text-base text-body transition-colors hover:bg-surface-2 hover:text-strong"
            >
              {link.label}
            </Link>
          ))}
          <div className="grid gap-2 pt-3">
            <CtaLink href={COACH_CTA.href} variant="secondary" size="md" label="nav_login">
              {COACH_CTA.label}
            </CtaLink>
            <CtaLink href={PRIMARY_CTA.href} variant="primary" size="md" label="nav_primary_mobile">
              {PRIMARY_CTA.label}
            </CtaLink>
          </div>
        </div>
      </div>
    </header>
  );
}
