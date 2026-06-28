/**
 * SubstituteSheet — a bottom-sheet listing same-muscle alternatives for the current
 * exercise, for when a piece of equipment isn't available in the gym. Options are ranked
 * by how closely they match the original (same movement first). Picking one swaps it for
 * THIS session only — the generated plan and future weeks are untouched.
 */
import { useEffect } from 'react';

const EQUIP_LABEL = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable',
  band: 'Band', kettlebell: 'Kettlebell', bodyweight: 'Bodyweight'
};

export default function SubstituteSheet({ originalName, options, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.35)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-surface)', padding: '8px 18px 10px', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hairline)', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--txt-muted)' }}>SUBSTITUTE</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-strong)', margin: '2px 0 0', lineHeight: 1.2 }}>{originalName}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--bg-surface-2)', border: 'none', fontSize: 17, color: 'var(--txt-muted)', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding: '12px 18px calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ fontSize: 12, color: 'var(--txt-muted)', marginBottom: 12 }}>
            Same muscles, ranked by closest match. Swaps this session only — your plan won’t change.
          </div>
          {(!options || options.length === 0) ? (
            <div style={{ fontSize: 14, color: 'var(--txt-body)', padding: '12px 0' }}>
              No alternatives available for your equipment.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {options.map((o, i) => (
                <button key={o.id} onClick={() => onPick(o)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left',
                  background: 'var(--bg-surface-2)', border: `1px solid ${i === 0 ? 'rgba(111,211,196,0.55)' : 'var(--hairline)'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span aria-label={`rank ${i + 1}`} style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: 12, display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                      color: i === 0 ? 'var(--on-success, #08130F)' : 'var(--txt-muted)',
                      background: i === 0 ? 'var(--accent)' : 'var(--bg-surface)'
                    }}>{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)' }}>{o.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
                        {EQUIP_LABEL[o.equip] || o.equip}{o.sameLift ? ' · tracks your main lift' : ''}{i === 0 ? ' · best match' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: o.weight ? 'var(--txt-body)' : 'var(--txt-muted)' }}>
                    {o.weight || '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
