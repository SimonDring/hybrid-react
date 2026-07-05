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

/**
 * The shared honest-empty-state card: same frame + title as the populated
 * panel, one plain-English line on what will fill it. Empty states are the
 * live board's dominant state until the history/schedule feeds land — keep
 * them consistent by using this, not hand-rolled copies.
 */
export function CardEmptyState({
  title,
  message,
  className,
}: {
  title: string;
  message: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <SectionHeader title={title} />
      <p className="rounded-card bg-surface-2 p-4 text-sm text-body">{message}</p>
    </Card>
  );
}
