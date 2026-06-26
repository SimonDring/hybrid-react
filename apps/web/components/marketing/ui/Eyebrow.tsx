import { cn } from "@/lib/cn";

/**
 * Eyebrow — the small mono label above a section title. Mono + wide tracking
 * gives the "instrument readout" feel that ties the site to the data product.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-xs uppercase tracking-[0.2em] text-accent",
        className,
      )}
    >
      {children}
    </p>
  );
}
