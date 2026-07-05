import type { Confidence as ConfidenceLevel } from "@/types/dashboard";
import { CONFIDENCE_COPY, JARGON } from "@/content/dashboardCopy";
import { InfoTip } from "@/components/ui/InfoTip";
import { cn } from "@/lib/cn";

const FILLED: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };

/**
 * Shows how much to trust a recommendation, based on data completeness.
 * Rendered in a neutral data colour (not the RAG ramp) so it never reads as a
 * player-status signal.
 */
export function Confidence({
  level,
  showLabel = true,
  showNote = false,
  showTip = false,
  className,
}: {
  level: ConfidenceLevel;
  showLabel?: boolean;
  showNote?: boolean;
  /** Renders an ⓘ explaining confidence levels — only where a label shows. */
  showTip?: boolean;
  className?: string;
}) {
  const filled = FILLED[level];
  const copy = CONFIDENCE_COPY[level];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <span className="flex items-end gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "w-1 rounded-full",
                i === 0 ? "h-2" : i === 1 ? "h-3" : "h-4",
                i < filled ? "bg-accent-2" : "bg-hairline-strong",
              )}
            />
          ))}
        </span>
        {showLabel && (
          <span className="text-xs text-muted">
            {copy.label} confidence
          </span>
        )}
        {showLabel && showTip && <InfoTip {...JARGON.confidence} />}
      </div>
      {showNote && <p className="text-xs text-soft">{copy.note}</p>}
    </div>
  );
}
