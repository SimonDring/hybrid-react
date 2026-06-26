"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";

/**
 * CtaLink — a Next.js <Link> styled like the app's Button, used for every
 * navigational call-to-action. Fires a tracked "cta_click" so lead sources are
 * measurable (see lib/analytics.ts). Variants mirror components/ui/Button.tsx.
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-strong font-semibold shadow-sm",
  secondary:
    "bg-surface-2 text-strong border border-hairline-strong hover:bg-surface-3",
  ghost: "text-body hover:bg-surface-2 hover:text-strong",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function CtaLink({
  href,
  variant = "secondary",
  size = "md",
  label,
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  /** For analytics — what this CTA is. Defaults to the link text. */
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  // Internal anchor/route → Link; external (http) → plain anchor.
  const isExternal = href.startsWith("http");
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-pill transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app",
    VARIANT[variant],
    SIZE[size],
    className,
  );

  const onClick = () =>
    track("cta_click", { label: label ?? String(children), href });

  if (isExternal) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {children}
    </Link>
  );
}
