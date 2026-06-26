import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * StatusChip — the signature motif of the site: the readiness "traffic light"
 * that turns data into a decision. Reuses the dashboard's RAG ramp so the colour
 * means the same thing on the website as it does in the product.
 *   ready = green · monitor = amber · adjust = red · neutral = grey
 */
export type ChipTone = "ready" | "monitor" | "adjust" | "neutral" | "accent";

const TONE: Record<ChipTone, { bg: string; text: string; dot: string }> = {
  ready: { bg: "bg-ready-soft", text: "text-ready", dot: "bg-ready" },
  monitor: { bg: "bg-monitor-soft", text: "text-monitor", dot: "bg-monitor" },
  adjust: { bg: "bg-adjust-soft", text: "text-adjust", dot: "bg-adjust" },
  neutral: { bg: "bg-surface-2", text: "text-muted", dot: "bg-nodata" },
  accent: { bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent" },
};

export function StatusChip({
  tone = "neutral",
  pulse = false,
  children,
  className,
}: {
  tone?: ChipTone;
  /** Adds a gentle ping to the dot — use only on the hero's live verdict. */
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-3 py-1 font-mono text-xs font-medium tracking-wide",
        t.bg,
        t.text,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
              t.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", t.dot)} />
      </span>
      {children}
    </span>
  );
}
