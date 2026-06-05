/**
 * StickFigureDemo — animates a stick figure through an exercise's key poses,
 * interpolating between frames so the movement plays as a loop, with a caption
 * for the current phase. Data comes from src/data/exerciseDemos.js.
 *
 * This is the first cut of the animated form library that replaces the static
 * "demo coming soon" placeholder. It's deliberately lightweight (an SVG skeleton
 * driven by requestAnimationFrame) so it works offline with no assets.
 */

import { useState, useEffect, useRef } from 'react';
import { BONES } from '../data/exerciseDemos.js';

const SEG_MS = 1100; // time to move between two key poses
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export default function StickFigureDemo({ demo }) {
  const { frames, captions } = demo;
  const [idx, setIdx] = useState(0);  // index of the pose we're moving FROM
  const [t, setT] = useState(0);      // 0→1 progress to the next pose
  const [playing, setPlaying] = useState(true);
  const raf = useRef(null);
  const last = useRef(null);

  useEffect(() => {
    if (!playing) return undefined;
    const tick = (now) => {
      if (last.current == null) last.current = now;
      const dt = now - last.current;
      last.current = now;
      setT(prev => {
        let nt = prev + dt / SEG_MS;
        if (nt >= 1) { nt = 0; setIdx(i => (i + 1) % frames.length); }
        return nt;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); last.current = null; };
  }, [playing, frames.length]);

  const a = frames[idx];
  const b = frames[(idx + 1) % frames.length];
  const e = easeInOut(t);
  const p = {};
  for (const k in a) p[k] = [lerp(a[k][0], b[k][0], e), lerp(a[k][1], b[k][1], e)];

  return (
    <div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }} aria-label="exercise demonstration">
        {/* ground */}
        <line x1="14" y1="91" x2="86" y2="91" stroke="var(--hairline)" strokeWidth="1.5" />
        {/* bones */}
        {BONES.map(([from, to], i) => (
          <line key={i} x1={p[from][0]} y1={p[from][1]} x2={p[to][0]} y2={p[to][1]}
            stroke="var(--rust)" strokeWidth="3.2" strokeLinecap="round" />
        ))}
        {/* head */}
        <circle cx={p.head[0]} cy={p.head[1]} r="5.5" fill="none" stroke="var(--rust)" strokeWidth="3.2" />
        {/* hands/feet dots */}
        <circle cx={p.hand[0]} cy={p.hand[1]} r="2" fill="var(--rust)" />
        <circle cx={p.ankle[0]} cy={p.ankle[1]} r="2" fill="var(--rust)" />
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 }}>
        <button onClick={() => setPlaying(pl => !pl)} aria-label={playing ? 'Pause' : 'Play'} style={{
          border: '1px solid var(--hairline)', background: 'var(--bg-surface)', color: 'var(--txt-strong)',
          borderRadius: 8, width: 30, height: 26, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit'
        }}>{playing ? '❚❚' : '▶'}</button>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt-body)', textAlign: 'center', minHeight: 16 }}>
          {captions[idx]}
        </div>
      </div>
      {/* phase dots */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8 }}>
        {frames.map((_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? 'var(--rust)' : 'var(--bg-surface-2)' }} />
        ))}
      </div>
    </div>
  );
}
