"use client";

import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

/** A lightly styled native select — accessible and keyboard-friendly by default. */
export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-pill border border-hairline-strong bg-surface-2 pl-3.5 pr-9 text-xs font-medium text-body",
          "hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-body">
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden
      >
        ▾
      </span>
    </div>
  );
}
