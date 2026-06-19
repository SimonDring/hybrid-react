/**
 * Training Load — acute vs chronic load, the acute:chronic ratio (ACWR) band,
 * and recent per-session loads. Read-only insight; the full Progress redesign is
 * a later sub-project (E).
 */

import { useTrainingStore } from '../stores/trainingStore.js';

const BAND = {
  under: { label: 'Under-loaded', color: 'var(--ochre)' },
  sweet: { label: 'Sweet spot',   color: 'var(--moss)' },
  high:  { label: 'High',         color: 'var(--ochre)' },
  over:  { label: 'Overreaching', color: 'var(--rust)' }
};

export default function TrainingLoad() {
  const load = useTrainingStore(s => s.load) || { acute: 0, chronic: 0, acwr: null, band: null, sessions: [] };
  const b = load.band ? BAND[load.band] : null;

  return (
    <>
      <h1 className="h1">Training load</h1>
      <p className="sub">How hard you've been training lately vs your recent baseline.</p>

      {load.acwr == null ? (
        <div className="callout amber">Not enough history yet — a few weeks of sessions and your load trend appears here.</div>
      ) : (
        <>
          <div className="stat-grid cols-3" style={{ marginBottom: 18 }}>
            <div className="stat-card"><div className="l">Acute (7d)</div><div className="v">{load.acute}</div><div className="d">recent</div></div>
            <div className="stat-card"><div className="l">Chronic (28d)</div><div className="v">{load.chronic}</div><div className="d">baseline</div></div>
            <div className="stat-card"><div className="l">Ratio</div><div className="v" style={{ color: b ? b.color : 'var(--txt-strong)' }}>{load.acwr.toFixed(2)}</div><div className="d">{b ? b.label : ''}</div></div>
          </div>
          <p className="sub" style={{ fontSize: 12, marginBottom: 22 }}>
            The sweet spot is roughly 0.8–1.3. Above ~1.5 means you're ramping faster than your body has adapted to — the plan eases off automatically.
          </p>
        </>
      )}

      <h2 className="h3">Recent sessions</h2>
      {load.sessions.length === 0 ? (
        <p className="sub">No logged sessions yet.</p>
      ) : (
        <div className="link-list">
          {load.sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ color: 'var(--txt-body)', fontSize: 13 }}>{s.date}{s.estimated ? ' · est.' : ''}</span>
              <span style={{ color: 'var(--txt-strong)', fontSize: 13, fontWeight: 700 }}>{s.load}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
