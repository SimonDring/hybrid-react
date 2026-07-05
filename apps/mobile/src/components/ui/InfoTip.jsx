// src/components/ui/InfoTip.jsx
// A small ⓘ glossary affordance (same visual language as the exercise-row
// .sx-info button). Tap toggles a plain-English popover; outside tap, Escape,
// or scrolling closes it. The popover is portalled to <body> and positioned
// `fixed` from the button's rect so it's never clipped by scroll containers.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function InfoTip({ label, body }) {
  const id = useId();
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  // Position after the popover renders (it mounts hidden off-screen).
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const btn = btnRef.current, pop = popRef.current;
    if (!btn || !pop) return;
    const b = btn.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    // Prefer below the ⓘ; flip above if it would run off the bottom.
    let top = b.bottom + 6;
    if (top + p.height > window.innerHeight - 8) top = Math.max(8, b.top - p.height - 6);
    const left = Math.min(
      Math.max(8, b.left + b.width / 2 - p.width / 2),
      Math.max(8, window.innerWidth - p.width - 8)
    );
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onMove = () => setOpen(false); // fixed coords go stale on scroll
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="infotip-btn"
        aria-label={`What does ${label} mean?`}
        aria-describedby={open ? id : undefined}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >ⓘ</button>
      {open && createPortal(
        <div
          ref={popRef}
          id={id}
          role="tooltip"
          className="infotip-pop"
          style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999, visibility: 'hidden' }}
        >
          <b>{label}</b>
          {body}
        </div>,
        document.body
      )}
    </>
  );
}
