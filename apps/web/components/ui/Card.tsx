import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Base surface card — the building block for every dashboard panel. */
export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-surface shadow-md",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Consistent section header used at the top of cards. */
export function SectionHeader({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="font-display text-sm font-semibold tracking-wide text-strong">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
