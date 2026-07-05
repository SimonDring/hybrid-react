import { cn } from "@/lib/cn";

/**
 * Shimmer placeholder block, shown while real data is on its way (see
 * app/dashboard/loading.tsx). The caller supplies ALL dimensions via
 * className (h-*, w-*); the primitive only brings the surface colour,
 * radius and shimmer. `rounded-card` clamps to a pill on short bars, so
 * no radius overrides are needed. Purely decorative → aria-hidden.
 *
 * The `.skeleton` shimmer keyframe lives in app/globals.css and uses only
 * existing theme tokens (surface-3 highlight over the surface-2 base).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton rounded-card bg-surface-2", className)}
    />
  );
}
