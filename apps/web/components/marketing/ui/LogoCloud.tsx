import { cn } from "@/lib/cn";

/**
 * LogoCloud — social-proof strip. Today it renders text placeholders for the
 * teams in pilot; swap each for a real <Image> logo once partners agree to be
 * named (and update content/marketing/landing.ts → SOCIAL_PROOF).
 */
export function LogoCloud({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-10 gap-y-4",
        className,
      )}
    >
      {items.map((item) => (
        <span
          key={item}
          className="font-display text-base font-semibold text-soft/80 grayscale transition-colors hover:text-muted"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
