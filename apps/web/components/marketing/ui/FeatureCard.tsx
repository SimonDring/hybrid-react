import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * FeatureCard — a surface card for a single value point. Optional `accent` adds a
 * top hairline in the interactive teal for the highlighted item in a row.
 */
export function FeatureCard({
  title,
  body,
  icon,
  accent = false,
  className,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative h-full rounded-card border border-hairline bg-surface p-6 shadow-md transition-colors hover:border-hairline-strong",
        className,
      )}
    >
      {accent && (
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
      {icon && (
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-strong">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
    </div>
  );
}
