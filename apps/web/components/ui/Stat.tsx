import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/statusLogic";
import { toneClasses } from "@/lib/statusLogic";

/** A single headline metric: big value + label + optional sub-line. */
export function Stat({
  label,
  labelTip,
  value,
  sub,
  tone,
  accessory,
  className,
}: {
  label: string;
  /** Optional ⓘ InfoTip rendered beside the label. */
  labelTip?: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  accessory?: ReactNode;
  className?: string;
}) {
  const valueColor = tone ? toneClasses(tone).text : "text-strong";
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
        {labelTip}
      </span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={cn("tnum text-3xl font-semibold leading-none", valueColor)}>
          {value}
        </span>
        {accessory}
      </div>
      {sub && <span className="mt-1.5 text-xs text-muted">{sub}</span>}
    </div>
  );
}
