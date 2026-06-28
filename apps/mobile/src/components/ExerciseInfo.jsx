/**
 * ExerciseInfo — a bottom-sheet that explains an exercise or drill: what it is,
 * how to do it, and form cues (look for / avoid). Opened from a session when the
 * athlete taps the ⓘ next to a movement they're unsure about.
 *
 * The `video` area is future-ready: when a library entry has a `video` (a captured
 * form clip) it plays inline; until that content exists it shows a "form video coming
 * soon" placeholder with a disabled upload affordance.
 *
 * Props: { name, focus, fallbackCue, onClose } — name/focus drive the lookup;
 * fallbackCue is the session's own note, shown when there's no library entry yet.
 */

import { useEffect } from 'react';
import { lookupExercise } from '../data/exerciseLibrary.js';

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

        {/* Form video — plays a captured clip when one exists, else a coming-soon
            placeholder with a (disabled) upload affordance for the future. */}
        {entry && entry.video ? (
          <video
            src={entry.video}
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 14, marginBottom: 18, display: 'block' }}
          />
        ) : (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              aspectRatio: '16 / 9', background: 'var(--bg-surface-2)', border: '1px solid var(--hairline)',
              borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 16
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--txt-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M10 9l5 3-5 3V9z" fill="var(--txt-muted)" stroke="none" />
              </svg>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.05em' }}>FORM VIDEO COMING SOON</div>
              <div style={{ fontSize: 11, color: 'var(--txt-muted)', maxWidth: 280 }}>A short demonstration of this movement will play here.</div>
            </div>
            <button
              type="button"
              disabled
              aria-label="Upload form video (coming soon)"
              style={{
                width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10, cursor: 'not-allowed',
                background: 'transparent', border: '1px dashed var(--hairline)', color: 'var(--txt-muted)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, opacity: 0.8
              }}
            >
              Upload form video
            </button>
            <div style={{ fontSize: 10, color: 'var(--txt-muted)', textAlign: 'center', marginTop: 5 }}>
              Enabled once we’ve captured form videos.
            </div>
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
