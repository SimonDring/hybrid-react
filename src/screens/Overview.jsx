import * as Plan from '../data/Plan.js';

export default function Overview() {
  const phases = Plan.getPhases();

  return (
    <>
      <h1 className="h1">12-month overview</h1>
      <p className="sub">
        A week-by-week plan written 12 months out is fiction. Phase 1 is locked;
        Phases 2–5 are provisional — rewritten from your data at each quarterly checkpoint.
      </p>

      {phases.map(phase => (
        <div key={phase.id} className="phase-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div className="when">
            <div className="num">{phase.id}</div>
            <div className="tag" style={{ marginTop: 4 }}>{phase.range.replace('Wks ', '')}</div>
          </div>
          <div>
            <h3>{phase.title}</h3>
            <p>{phase.summary}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {phase.tags.map(t => (
                <span key={t} style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', background: 'var(--accent-bg)', borderRadius: 100 }}>{t.toUpperCase()}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
