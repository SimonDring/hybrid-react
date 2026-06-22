/**
 * ExerciseInfo — a bottom-sheet that explains an exercise or drill: what it is,
 * how to do it, and form cues (look for / avoid). Opened from a session when the
 * athlete taps the ⓘ next to a movement they're unsure about.
 *
 * The `demo` area is a placeholder for the long-term goal: a small animated
 * stick-figure / frame-by-frame demonstration that talks through the movement.
 * For now it shows a "demo coming soon" panel.
 *
 * Props: { name, focus, fallbackCue, onClose } — name/focus drive the lookup;
 * fallbackCue is the session's own note, shown when there's no library entry yet.
 */

import { useEffect } from 'react';
import { lookupExercise } from '../data/exerciseLibrary.js';
import { DEMOS } from '../data/exerciseDemos.js';
import StickFigureDemo from './StickFigureDemo.jsx';

const ACCENT = { strength: 'var(--txt-strong)', swim: 'var(--moss)', run: 'var(--rust)', mobility: 'var(--ochre)' };

export default function ExerciseInfo({ name, focus, fallbackCue, onClose }) {
  const entry = lookupExercise(name, focus);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const accent = entry ? (ACCENT[entry.type] || 'var(--txt-strong)') : 'var(--txt-strong)';
  const title = entry ? entry.name : (name || 'Exercise');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.35)'
      }}>
        {/* sticky header — grab handle, title and close stay reachable while scrolling */}
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-surface)', padding: '8px 18px 10px', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hairline)', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--txt-strong)', margin: 0, lineHeight: 1.2 }}>{title}</h2>
            <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--bg-surface-2)', border: 'none', fontSize: 17, color: 'var(--txt-muted)', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '14px 18px calc(24px + env(safe-area-inset-bottom))' }}>
          {entry && <p style={{ fontSize: 14, color: 'var(--txt-body)', lineHeight: 1.5, margin: '0 0 16px' }}>{entry.summary}</p>}

        {/* Animated demo when we have one, else a placeholder. */}
        {entry && entry.demo && DEMOS[entry.demo] ? (
          <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--hairline)', borderRadius: 14, padding: '16px 16px 12px', marginBottom: 18 }}>
            <StickFigureDemo demo={DEMOS[entry.demo]} />
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface-2)', border: '1px dashed var(--hairline)', borderRadius: 14, padding: '22px 16px', textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🧍‍♂️</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.05em' }}>ANIMATED DEMO COMING SOON</div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 4 }}>A step-by-step demonstration of this movement will live here.</div>
          </div>
        )}

        {entry ? (
          <div style={{ display: 'grid', gap: 18 }}>
            <Section title="How to do it" accent={accent}>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                {entry.how.map((s, i) => <li key={i} style={{ fontSize: 14, color: 'var(--txt-body)', lineHeight: 1.45 }}>{s}</li>)}
              </ol>
            </Section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <CueList title="Look for" mark="✓" colour="var(--moss)" items={entry.lookFor} />
              <CueList title="Avoid" mark="✕" colour="var(--rust)" items={entry.avoid} />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--txt-body)', lineHeight: 1.5 }}>
            {fallbackCue
              ? <><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--txt-muted)', marginBottom: 6 }}>COACH'S CUE</div>{fallbackCue}</>
              : 'A full form guide for this one is coming soon. For now, focus on controlled, pain-free movement — and ask your coach if you\'re unsure.'}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: accent, marginBottom: 8 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function CueList({ title, mark, colour, items }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: colour, marginBottom: 8 }}>{title.toUpperCase()}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--txt-body)', lineHeight: 1.4 }}>
            <span style={{ color: colour, fontWeight: 700, flexShrink: 0 }}>{mark}</span>
            <span>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
