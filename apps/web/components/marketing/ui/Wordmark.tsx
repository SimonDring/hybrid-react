import Link from "next/link";
import { SITE } from "@/content/marketing/site";
import { cn } from "@/lib/cn";

/**
 * Wordmark — the brand lockup used in the nav and footer. The mark is a small
 * RAG "traffic light" (the product's whole idea in three dots). Swap the dots
 * for an <Image> logo later without touching anything else.
 */
export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app",
        className,
      )}
      aria-label={`${SITE.name} home`}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-ready" />
        <span className="h-2 w-2 rounded-full bg-monitor" />
        <span className="h-2 w-2 rounded-full bg-adjust" />
      </span>
      <span className="font-display text-base font-semibold tracking-tight text-strong">
        {SITE.name}
      </span>
    </Link>
  );
}
