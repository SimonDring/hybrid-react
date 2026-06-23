import { useState } from 'react';
import { useTrainingStore } from '../stores/trainingStore.js';

/**
 * DailyCheckin — a compact morning subjective-wellness card on Home. Captures
 * energy / soreness / mood / stress (1–5, 5 = best) + illness / travel flags into
 * today's daily_metrics row. These feed the recovery module's objective+subjective
 * readiness blend (Saw 2016) and the illness/travel session overrides — see
 * src/lib/recovery/recovery.js and docs/engine/01-PANEL-REVIEW.md §3.3.
 *
 * Writes MERGE with today's existing row so a partial edit never nulls wearable
 * fields (Database.upsertDailyMetric rebuilds the whole payload).
 */

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 5 = best for every item (incl. soreness = fresh, stress = calm) — matches recovery.subjectiveScore.
const RATINGS = [
  { key: 'energy', label: 'Energy', hint: '5 = buzzing' },
  { key: 'soreness', label: 'Soreness', hint: '5 = fresh' },
  { key: 'mood', label: 'Mood', hint: '5 = great' },
  { key: 'stress', label: 'Stress', hint: '5 = calm' }
];

export default function DailyCheckin() {
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const upsertDailyMetric = useTrainingStore(s => s.upsertDailyMetric);
  const date = todayISO();
  const today = (dailyMetrics || []).find(d => d.date === date) || {};
  const [open, setOpen] = useState(false);

  // Merge with the existing row so wearable + other subjective fields are preserved.
  const set = (patch) => upsertDailyMetric({ ...today, date, ...patch });

  const logged = RATINGS.filter(r => today[r.key] != null).length;
  const summary = logged ? `${logged}/4 logged${today.illness ? ' · ill' : ''}${today.travel ? ' · travel' : ''}` : 'How do you feel today?';

  const card = { background: 'var(--bg-surface)', border: '1px solid var(--hairline)', borderRadius: 14, marginBottom: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' };
  const head = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 15px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--txt-strong)' };
  const eyebrow = { fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--txt-muted)' };
  const dot = (v) => ({
    width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    border: '1px solid var(--hairline)',
    background: v ? 'var(--rust)' : 'var(--bg-surface-2)',
    color: v ? '#fff' : 'var(--txt-body)'
  });
  const pill = (on) => ({
    padding: '7px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    border: `1px solid ${on ? 'var(--ochre)' : 'var(--hairline)'}`,
    background: on ? 'var(--ochre)' : 'var(--bg-surface-2)',
    color: on ? '#1a1a1a' : 'var(--txt-body)'
  });

  return (
    <div style={card}>
      <button style={head} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
          <span style={eyebrow}>DAILY CHECK-IN</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{summary}</span>
        </span>
        <span style={{ color: 'var(--txt-muted)', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ padding: '4px 15px 15px', display: 'grid', gap: 12, borderTop: '1px solid var(--hairline)' }}>
          {RATINGS.map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--txt-body)' }}>
                <span style={{ fontWeight: 600, color: 'var(--txt-strong)' }}>{r.label}</span>
                <span style={{ color: 'var(--txt-muted)', marginLeft: 6, fontSize: 11 }}>{r.hint}</span>
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} style={dot(today[r.key] === n)} onClick={() => set({ [r.key]: n })} aria-label={`${r.label} ${n}`}>{n}</button>
                ))}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
            <button style={pill(!!today.illness)} onClick={() => set({ illness: !today.illness })}>Feeling ill</button>
            <button style={pill(!!today.travel)} onClick={() => set({ travel: !today.travel })}>Travelling</button>
          </div>
        </div>
      )}
    </div>
  );
}
