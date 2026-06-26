"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * FaqItem — a single expandable question. Native <button> for keyboard + screen
 * readers; the chevron rotates on open. Pure client state, no library.
 */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app"
      >
        <span className="font-display text-base font-medium text-strong sm:text-lg">
          {q}
        </span>
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          className={cn(
            "flex-shrink-0 text-muted transition-transform duration-300",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl text-sm leading-relaxed text-body sm:text-base">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}
