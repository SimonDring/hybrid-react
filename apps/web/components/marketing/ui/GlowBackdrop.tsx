import { cn } from "@/lib/cn";

/**
 * GlowBackdrop — a soft, ambient gradient bloom behind the hero / CTA. Uses the
 * teal + periwinkle accents at low opacity for depth without the "neon on black"
 * cliché. Decorative only, so aria-hidden.
 */
export function GlowBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute left-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.18] blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 70%)" }}
      />
      <div
        className="absolute right-[-5%] top-[20%] h-[360px] w-[420px] rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--color-accent-2), transparent 70%)" }}
      />
    </div>
  );
}
