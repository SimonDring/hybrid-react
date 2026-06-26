import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section — consistent vertical rhythm + max-width container for every landing
 * block. `tone` switches the background so the page alternates between the base
 * canvas and a slightly raised panel, giving the long page a sense of structure.
 */
export function Section({
  id,
  children,
  tone = "base",
  className,
  containerClassName,
}: {
  id?: string;
  children: ReactNode;
  tone?: "base" | "raised";
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28",
        tone === "raised" && "border-y border-hairline bg-surface/40",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8",
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
