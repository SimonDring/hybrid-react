"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCoachSession, signOutSession, type CoachSession } from "@/lib/session";
import { cn } from "@/lib/cn";

/**
 * AccountMenu — the dashboard's wayfinding control, so the surface is never a
 * dead-end. Adapts to how you arrived:
 *   • Signed in (via /login) → identity + "Back to site" + "Log out".
 *   • Demo visitor (via the site's "See it live") → a "Live demo" tag +
 *     "Back to site" + "Book a pilot".
 * Resolves the session AFTER mount to avoid hydration mismatch.
 */
export function AccountMenu() {
  const router = useRouter();
  const [session, setSession] = useState<CoachSession | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(getCoachSession());
    setReady(true);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function logOut() {
    signOutSession();
    router.push("/");
  }

  // Stable placeholder pre-mount so SSR and first client render match.
  if (!ready) return <div className="h-9 w-9" aria-hidden="true" />;

  // ── Demo visitor (not signed in) ─────────────────────────────────────────
  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live demo
        </span>
        <Link
          href="/"
          className="hidden rounded-pill px-3 py-1.5 text-xs text-muted transition-colors hover:text-strong sm:inline-block"
        >
          Back to site
        </Link>
        <Link
          href="/contact"
          className="inline-flex h-8 items-center rounded-pill bg-accent px-3 text-xs font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Book a pilot
        </Link>
      </div>
    );
  }

  // ── Signed-in coach ──────────────────────────────────────────────────────
  const initials = session.email.slice(0, 2).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-pill border border-hairline bg-surface-2 py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-3"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {initials}
        </span>
        <svg viewBox="0 0 24 24" width={14} height={14} className={cn("text-muted transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-card border border-hairline-strong bg-surface shadow-lg"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[11px] text-muted">Signed in as</p>
            <p className="truncate text-sm font-medium text-strong">{session.email}</p>
          </div>
          <Link
            href="/get-started"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-body transition-colors hover:bg-surface-2 hover:text-strong"
          >
            Manage teams &amp; codes
          </Link>
          <Link
            href="/"
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-body transition-colors hover:bg-surface-2 hover:text-strong"
          >
            Back to site
          </Link>
          <button
            onClick={logOut}
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm text-body transition-colors hover:bg-surface-2 hover:text-strong"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
