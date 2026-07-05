"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * A small ⓘ affordance that explains a jargon term in plain English.
 *
 * Opens on hover AND keyboard focus AND click/tap (so touch works); closes on
 * blur, mouse-leave, Escape, or an outside tap. The popover is portalled to
 * <body> and positioned `fixed` from the button's viewport rect, so it is
 * never clipped by overflow containers (the squad table's overflow-x wrapper)
 * or offset by transformed ancestors (the player drawer's slide-in).
 * Prefers below the button; flips above when it would leave the viewport.
 */
export function InfoTip({
  label,
  body,
  className,
}: {
  /** The term being explained — used for the heading + aria-label. */
  label: string;
  /** Plain-English explanation (1–3 sentences). */
  body: string;
  className?: string;
}) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const b = btn.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    // Prefer below; flip above if the popover would run off the bottom.
    let top = b.bottom + 6;
    if (top + p.height > window.innerHeight - 8) {
      top = Math.max(8, b.top - p.height - 6);
    }
    const left = Math.min(
      Math.max(8, b.left + b.width / 2 - p.width / 2),
      Math.max(8, window.innerWidth - p.width - 8),
    );
    setPos({ top, left });
  }, []);

  // Measure + position after the popover renders (it starts hidden off-screen).
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Fixed positioning goes stale on scroll/resize — just close.
    const onMove = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={`What does ${label.toLowerCase()} mean?`}
        aria-describedby={open ? id : undefined}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[12px] font-normal normal-case leading-none text-muted transition-colors hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        // Click toggles (covers touch). Hover open/close is mouse-only so a
        // tap doesn't fire enter→open then click→close in one gesture.
        onClick={(e) => {
          e.stopPropagation(); // don't trigger sortable-header / row clicks
          setOpen((o) => !o);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={id}
            role="tooltip"
            className="fixed z-50 max-w-[260px] rounded-card border border-hairline bg-surface-3 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-body shadow-md"
            style={
              pos
                ? { top: pos.top, left: pos.left }
                : { top: -9999, left: -9999, visibility: "hidden" }
            }
          >
            <p className="mb-1 font-medium text-strong">{label}</p>
            {body}
          </div>,
          document.body,
        )}
    </span>
  );
}
