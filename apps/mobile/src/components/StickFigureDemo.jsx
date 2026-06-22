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
import { SIDE_BONES } from '../data/exerciseDemos.js';

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
  const idxRef = useRef(0); // current segment index, for per-segment timing (demo.durs)

  useEffect(() => {
    if (!playing) return undefined;
    const tick = (now) => {
      if (last.current == null) last.current = now;
      const dt = now - last.current;
      last.current = now;
      setT(prev => {
        // each segment can have its own duration multiplier (demo.durs) to emphasise explosive phases
        const seg = (demo.segMs || SEG_MS) * (demo.durs ? (demo.durs[idxRef.current] || 1) : 1);
        let nt = prev + dt / seg;
        if (nt >= 1) { nt = 0; setIdx(i => { const ni = (i + 1) % frames.length; idxRef.current = ni; return ni; }); }
        return nt;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); last.current = null; };
  }, [playing, frames.length]);

  const a = frames[idx];
  const b = frames[(idx + 1) % frames.length];
  const e = demo.linear ? t : easeInOut(t); // `linear` = continuous (no stop at each keyframe)
  const p = {};
  for (const k in a) p[k] = [lerp(a[k][0], b[k][0], e), lerp(a[k][1], b[k][1], e)];

  // Each demo can declare its own skeleton; default to the side-view set.
  const bones = demo.bones || SIDE_BONES;
  const dots = demo.dots || ['hand', 'ankle'];
  const ground = demo.ground !== false;

  // Feet: every ankle joint gets a foot. Priority: explicit toe joint → else, if the demo opts into
  // `shinFeet`, a RIGID foot perpendicular to the shin (constant length & ankle angle, so it doesn't
  // foreshorten/turn as the leg swings) → else a default foot pointing forward (or back if faceLeft).
  const RUST = 'var(--rust)';
  const dir = demo.faceLeft ? -1 : 1;
  const FOOTLEN = 7;
  const feet = [['ankle', 'knee', 'toe'], ['ankleF', 'kneeF', 'toeF'], ['ankleB', 'kneeB', 'toeB']]
    .filter(([ak]) => p[ak])
    .map(([ak, kn, toe]) => {
      const [ax, ay] = p[ak];
      if (p[toe]) return [ax, ay, p[toe][0], p[toe][1]];
      if (demo.shinFeet && p[kn]) {
        const dx = ax - p[kn][0], dy = ay - p[kn][1], L = Math.hypot(dx, dy) || 1; // shin (knee→ankle)
        return [ax, ay, ax + FOOTLEN * (dy / L) * dir, ay - FOOTLEN * (dx / L)];    // 90° to the shin
      }
      return [ax - 3 * dir, ay + 0.5, ax + 6 * dir, ay + 0.5];
    });
  const propAt = (at) => (typeof at === 'string' ? p[at] : at); // equipment position: joint name or [x,y]

  return (
    <div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }} aria-label="exercise demonstration">
        {ground && <line x1="14" y1="91" x2="86" y2="91" stroke="var(--hairline)" strokeWidth="1.5" />}
        {/* furniture (bench / step / seat) drawn BEHIND the figure */}
        {(demo.props || []).map((pr, i) => {
          if (pr.type === 'seat') { // leg-extension style seat: seat pad + backrest + post
            const [bx, sy] = pr.at; const w = pr.w || 22; const bh = pr.bh || 20;
            return (
              <g key={'bg' + i}>
                <rect x={bx} y={sy} width={w} height="3.5" rx="1" fill="#3a3e44" stroke="#565c64" strokeWidth="0.7" />
                <rect x={bx - 2.5} y={sy - bh} width="3" height={bh + 1} rx="1" fill="#3a3e44" stroke="#565c64" strokeWidth="0.7" />
                <rect x={bx + w / 2 - 1} y={sy + 3.5} width="2" height={91 - sy - 3.5} fill="#565c64" />
                <rect x={bx + w / 2 - 6} y="89" width="12" height="2" rx="1" fill="#565c64" />
              </g>
            );
          }
          if (pr.type === 'wall') { // a wall to push against (serratus)
            const [wx] = pr.at;
            return <rect key={'bg' + i} x={wx} y="6" width="3" height="85" fill="#33373d" stroke="#565c64" strokeWidth="0.7" />;
          }
          if (pr.type === 'dipbar') { // parallel dip bars: grip bar at hand height on two posts
            const [cx, by] = pr.at; const w = pr.w || 30;
            return (
              <g key={'bg' + i}>
                <rect x={cx - w / 2} y={by} width={w} height="2.2" rx="1" fill="#565c64" />
                <rect x={cx - w / 2} y={by} width="2" height={91 - by} fill="#565c64" />
                <rect x={cx + w / 2 - 2} y={by} width="2" height={91 - by} fill="#565c64" />
              </g>
            );
          }
          if (pr.type === 'pullupbar') { // overhead bar with uprights
            const [cx, by] = pr.at; const w = pr.w || 30;
            return (
              <g key={'bg' + i}>
                <rect x={cx - w / 2} y={by} width={w} height="2.2" rx="1" fill="#565c64" />
                <rect x={cx - w / 2} y="5" width="2" height={by - 5} fill="#565c64" />
                <rect x={cx + w / 2 - 2} y="5" width="2" height={by - 5} fill="#565c64" />
              </g>
            );
          }
          if (pr.type === 'line') { // generic line: a back plate (thick) or a travel-axis guide (dashed)
            const [x1, y1] = pr.at, [x2, y2] = pr.to;
            return <line key={'bg' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={pr.color || '#565c64'} strokeWidth={pr.w || 2} strokeLinecap="round" strokeDasharray={pr.dash ? '3 3' : undefined} />;
          }
          if (pr.type === 'backpad') { // reclined seat back (leg press): an angled pad
            const [bx, byy] = pr.at;
            return <rect key={'bg' + i} x={bx} y={byy} width="5" height={pr.h || 22} rx="1.5" fill="#3a3e44" stroke="#565c64" strokeWidth="0.7" transform={`rotate(${pr.rot || 0} ${bx} ${byy})`} />;
          }
          if (pr.type === 'sled') { // prowler/sled: runner on the floor + weight + upright pole
            const [bx, ty2] = pr.at;
            return (
              <g key={'bg' + i}>
                <rect x={bx - 1} y="89" width="16" height="2.4" rx="1" fill="#565c64" />
                <circle cx={bx + 9} cy="85" r="5" fill="#2b2e33" fillOpacity="0.5" stroke="#aab2bd" strokeWidth="1" />
                <line x1={bx} y1="89" x2={bx} y2={ty2} stroke="#565c64" strokeWidth="2.4" />
                <rect x={bx - 3} y={ty2 - 1} width="6" height="2.4" rx="1" fill="#565c64" />
              </g>
            );
          }
          if (pr.type !== 'bench' && pr.type !== 'step') return null;
          const [cx, ty] = pr.at; const w = pr.w || 24;
          if (pr.type === 'bench') return ( // padded bench on two legs
            <g key={'bg' + i}>
              <rect x={cx - w / 2} y={ty} width={w} height="3.6" rx="1" fill="#3a3e44" stroke="#565c64" strokeWidth="0.7" />
              <rect x={cx - w / 2 + 1.5} y={ty + 3.6} width="2" height={91 - ty - 3.6} fill="#565c64" />
              <rect x={cx + w / 2 - 3.5} y={ty + 3.6} width="2" height={91 - ty - 3.6} fill="#565c64" />
            </g>
          );
          return ( // solid step / block resting on the floor
            <g key={'bg' + i}>
              <rect x={cx - w / 2} y={ty} width={w} height={91 - ty} fill="#33373d" stroke="#565c64" strokeWidth="0.7" />
              <line x1={cx - w / 2} y1={ty} x2={cx + w / 2} y2={ty} stroke="#6b7280" strokeWidth="1.2" />
            </g>
          );
        })}
        {bones.map(([from, to], i) => (p[from] && p[to]) && (
          <line key={i} x1={p[from][0]} y1={p[from][1]} x2={p[to][0]} y2={p[to][1]}
            stroke={RUST} strokeWidth="3.2" strokeLinecap="round" />
        ))}
        {feet.map((f, i) => <line key={'f' + i} x1={f[0]} y1={f[1]} x2={f[2]} y2={f[3]} stroke={RUST} strokeWidth="3.2" strokeLinecap="round" />)}
        {p.head && <circle cx={p.head[0]} cy={p.head[1]} r="5.5" fill="none" stroke={RUST} strokeWidth="3.2" />}
        {dots.map(d => p[d] && <circle key={d} cx={p[d][0]} cy={p[d][1]} r="2" fill={RUST} />)}
        {(demo.props || []).map((pr, i) => {
          if (pr.type === 'band') { // resistance band between two joints
            const a = p[pr.from], b = p[pr.to];
            return (a && b) ? <line key={'p' + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#c8a24a" strokeWidth="1.8" /> : null;
          }
          const at = propAt(pr.at); if (!at) return null;
          const [x, y] = at;
          const r = pr.r || 8.4; // plate radius (bigger = heavier)
          if (pr.type === 'barbell') return (
            // translucent plate so the hands gripping behind it stay visible
            <g key={'p' + i}><circle cx={x} cy={y} r={r} fill="#2b2e33" fillOpacity="0.5" stroke="#aab2bd" strokeWidth="1.1" /><circle cx={x} cy={y} r="2" fill="#c4ccd6" /></g>
          );
          if (pr.type === 'dumbbell') return pr.vert ? (
            // held on one end, vertical (goblet): the grip [x,y] is just BELOW the top bell, so the
            // dumbbell hangs down in front of the chest.
            <g key={'p' + i}>
              <rect x={x - 1} y={y - 3} width="2" height="15" rx="1" fill="#9aa0a8" />
              <rect x={x - 3.4} y={y - 5.7} width="6.8" height="3.4" rx="1" fill="#2b2e33" fillOpacity="0.6" stroke="#aab2bd" strokeWidth="0.7" />
              <rect x={x - 3.4} y={y + 10} width="6.8" height="3.4" rx="1" fill="#2b2e33" fillOpacity="0.6" stroke="#aab2bd" strokeWidth="0.7" />
            </g>
          ) : (
            <g key={'p' + i}>
              <rect x={x - 5} y={y - 1} width="10" height="2" rx="1" fill="#9aa0a8" />
              <rect x={x - 7.5} y={y - 3.2} width="3.2" height="6.4" rx="1" fill="#2b2e33" fillOpacity="0.6" stroke="#aab2bd" strokeWidth="0.7" />
              <rect x={x + 4.3} y={y - 3.2} width="3.2" height="6.4" rx="1" fill="#2b2e33" fillOpacity="0.6" stroke="#aab2bd" strokeWidth="0.7" />
            </g>
          );
          if (pr.type === 'dumbbellEnd') return ( // dumbbell seen end-on (side view): a weight head in the hand
            <g key={'p' + i}>
              <circle cx={x} cy={y} r="4.6" fill="#2b2e33" stroke="#aab2bd" strokeWidth="1" />
              <circle cx={x} cy={y} r="1.6" fill="#9aa0a8" />
            </g>
          );
          if (pr.type === 'cable') { // cable machine: post (or overhead pulley) + rope running to a hand
            const h = p[pr.to];
            return (
              <g key={'p' + i}>
                {pr.post === false
                  ? <rect x={x - 6} y={y - 3} width="12" height="3" rx="1" fill="#565c64" />
                  : <line x1={x} y1={y} x2={x} y2="91" stroke="#565c64" strokeWidth="3" />}
                <circle cx={x} cy={y} r="3" fill="#2b2e33" stroke="#6b7280" strokeWidth="1" />
                {h && <line x1={x} y1={y} x2={h[0]} y2={h[1]} stroke="#aab2bd" strokeWidth="1.2" />}
                {h && <circle cx={h[0]} cy={h[1]} r="2.2" fill="#9aa0a8" />}
              </g>
            );
          }
          if (pr.type === 'anchor') return ( // foot anchor: base + strut + a (translucent) pad over the ankle
            <g key={'p' + i}>
              <rect x={x - 5} y="88.5" width="10" height="2.5" rx="1" fill="#565c64" />
              <line x1={x - 3.5} y1="89" x2={x - 3.5} y2={y - 2} stroke="#565c64" strokeWidth="2" />
              <rect x={x - 5.5} y={y - 5} width="12" height="4" rx="2" fill="#3a3e44" fillOpacity="0.55" stroke="#565c64" strokeWidth="0.7" />
            </g>
          );
          if (pr.type === 'roller') { // padded lever roller (e.g. leg-extension ankle pad) — translucent
            const rx = x + (pr.dx || 0), ry = y + (pr.dy || 0);
            return (
              <g key={'p' + i}>
                {pr.pivot && <line x1={pr.pivot[0]} y1={pr.pivot[1]} x2={rx} y2={ry} stroke="#565c64" strokeWidth="2" />}
                <circle cx={rx} cy={ry} r="4.5" fill="#3a3e44" fillOpacity="0.55" stroke="#565c64" strokeWidth="0.9" />
                <circle cx={rx} cy={ry} r="1.5" fill="#565c64" />
              </g>
            );
          }
          if (pr.type === 'kettlebell') return ( // bell hangs from the gripped handle
            <g key={'p' + i}>
              <path d={`M ${x - 2.6} ${y} Q ${x} ${y - 4} ${x + 2.6} ${y}`} fill="none" stroke="#9aa0a8" strokeWidth="1.5" />
              <circle cx={x} cy={y + 5} r="4.3" fill="#2b2e33" stroke="#aab2bd" strokeWidth="1" />
            </g>
          );
          if (pr.type === 'abwheel') return ( // wheel (translucent so the body shows through)
            <g key={'p' + i}>
              <circle cx={x} cy={y} r="4.6" fill="#2b2e33" fillOpacity="0.5" stroke="#aab2bd" strokeWidth="1.3" />
              <circle cx={x} cy={y} r="1.3" fill="#9aa0a8" />
            </g>
          );
          if (pr.type === 'footplate') return ( // leg-press platform the feet push (translucent)
            <rect key={'p' + i} x={x - 1.5} y={y - 8} width="3.5" height="16" rx="1" fill="#3a3e44" fillOpacity="0.55" stroke="#565c64" strokeWidth="0.9" transform={`rotate(${pr.rot || 0} ${x} ${y})`} />
          );
          return null;
        })}
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
