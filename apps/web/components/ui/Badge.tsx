import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "ready"
  | "monitor"
  | "adjust"
  | "nodata"
  | "accent"
  | "neutral";

const TONE: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  ready: { bg: "bg-ready-soft", text: "text-ready", dot: "bg-ready" },
  monitor: { bg: "bg-monitor-soft", text: "text-monitor", dot: "bg-monitor" },
  adjust: { bg: "bg-adjust-soft", text: "text-adjust", dot: "bg-adjust" },
  nodata: { bg: "bg-nodata-soft", text: "text-nodata", dot: "bg-nodata" },
  accent: { bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent" },
  neutral: { bg: "bg-surface-2", text: "text-muted", dot: "bg-nodata" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium",
        t.bg,
        t.text,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
