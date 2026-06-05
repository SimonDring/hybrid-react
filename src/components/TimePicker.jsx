/**
 * TimePicker — a tap-to-open, scroll-to-select time input.
 *
 * Shows the value as a button; tapping opens a bottom-sheet with scrollable
 * wheels for hours/minutes/seconds (mode 'hms') or minutes/seconds (mode 'ms',
 * e.g. a swim pace). Snapping is CSS scroll-snap; we read the centred item on
 * scroll-end. Value is a plain string the existing parsers understand: "mm:ss"
 * for short times, "h:mm:ss" once hours are non-zero.
 */

import { useState, useRef, useEffect } from 'react';

const ITEM = 38, VISIBLE = 5;
const pad2 = (n) => String(n).padStart(2, '0');

function parse(value, mode) {
  const p = String(value || '').split(':').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
  if (mode === 'ms') return p.length >= 2 ? { h: 0, m: p[p.length - 2], s: p[p.length - 1] } : { h: 0, m: 0, s: 0 };
  if (p.length === 3) return { h: p[0], m: p[1], s: p[2] };
  if (p.length === 2) return { h: 0, m: p[0], s: p[1] };
  return { h: 0, m: 0, s: 0 };
}
function fmt(t, mode) {
  if (mode === 'ms') return `${t.m}:${pad2(t.s)}`;
  return t.h > 0 ? `${t.h}:${pad2(t.m)}:${pad2(t.s)}` : `${t.m}:${pad2(t.s)}`;
}

function Wheel({ label, count, value, onChange, pad }) {
  const ref = useRef(null);
  const timer = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = value * ITEM; /* eslint-disable-next-line */ }, []);
  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.max(0, Math.min(count - 1, Math.round(ref.current.scrollTop / ITEM)));
      if (idx !== value) onChange(idx);
    }, 80);
  };
  return (
    <div className="tw-group">
      <div className="tw-label">{label}</div>
      <div className="tw-col" ref={ref} onScroll={onScroll} style={{ height: ITEM * VISIBLE }}>
        <div style={{ height: ITEM * 2 }} />
        {Array.from({ length: count }, (_, n) => (
          <div key={n} className="tw-item" style={{ height: ITEM, opacity: n === value ? 1 : 0.32, fontWeight: n === value ? 700 : 500 }}>
            {pad ? pad2(n) : n}
          </div>
        ))}
        <div style={{ height: ITEM * 2 }} />
      </div>
    </div>
  );
}

export default function TimePicker({ value, onChange, mode = 'hms', placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(() => parse(value, mode));

  useEffect(() => {
    if (open) {
      setT(parse(value, mode));
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    return undefined;
  }, [open, value, mode]);

  const set = (k, v) => setT(prev => ({ ...prev, [k]: v }));
  const commit = () => { onChange(fmt(t, mode)); setOpen(false); };
  const display = value ? fmt(parse(value, mode), mode) : '';

  return (
    <>
      <button type="button" className="time-input" onClick={() => setOpen(true)}>
        {display || <span style={{ color: 'var(--txt-muted)' }}>{placeholder}</span>}
      </button>

      {open && (
        <div className="tp-overlay" onClick={() => setOpen(false)}>
          <div className="tp-sheet" onClick={e => e.stopPropagation()}>
            <div className="tp-grab" />
            <div className="tp-wheels">
              <div className="tp-band" />
              {mode === 'hms' && <Wheel label="hr" count={10} value={t.h} onChange={v => set('h', v)} />}
              <Wheel label="min" count={60} value={t.m} onChange={v => set('m', v)} pad />
              <Wheel label="sec" count={60} value={t.s} onChange={v => set('s', v)} pad />
            </div>
            <button className="tp-done" onClick={commit}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}
