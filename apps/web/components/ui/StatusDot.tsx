import type { PlayerStatus } from "@/types/dashboard";
import { getStatusMeta, toneClasses } from "@/lib/statusLogic";
import { cn } from "@/lib/cn";

const SIZE = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

/** The squad's at-a-glance RAG indicator. */
export function StatusDot({
  status,
  size = "md",
  glow = false,
  className,
}: {
  status: PlayerStatus;
  size?: keyof typeof SIZE;
  glow?: boolean;
  className?: string;
}) {
  const tone = getStatusMeta(status).tone;
  const t = toneClasses(tone);
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        SIZE[size],
        t.bar,
        glow && "ring-4 ring-current/15",
        className,
      )}
      aria-hidden
    />
  );
}
