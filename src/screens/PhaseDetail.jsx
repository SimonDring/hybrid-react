import { useNavigate, useParams } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';

export default function PhaseDetail() {
  const navigate = useNavigate();
  const { phaseId } = useParams();
  const sessions = useTrainingStore(state => state.sessions);

  const phase = Plan.getPhase(Number(phaseId));
  if (!phase) return <div>Phase not found</div>;

  return (
    <>
      <div className="eyebrow">{phase.range}</div>
      <h1 className="h1">{phase.title}</h1>
      <p className="sub">{phase.tagline}</p>

      {phase.status === 'provisional' && (
        <div className="callout amber">
          <strong>Provisional</strong>
          Scaffolded from assumptions about Phase 1 outcomes. Will be revised at quarterly reassessment.
        </div>
      )}

      <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>{phase.summary}</p>

      <h2 className="h3">Outcome gates</h2>
      <ul className="kv-list" style={{ marginBottom: 24 }}>
        {phase.gates.map((g, i) => (
          <li key={i}>
            <span className="k">{g.label}</span>
            <span className="v">{g.required ? 'required' : 'optional'}</span>
          </li>
        ))}
      </ul>

      <h2 className="h3">Weeks</h2>
      <div className="week-list">
        {(phase.weeks || []).map(wk => {
          let weekCompleted = 0;
          wk.sessions.forEach((_, i) => {
            const k = Utils.weekKey(phase.id, wk.num, i);
            if (sessions[k] && sessions[k].completed) weekCompleted++;
          });
          const pct = wk.sessions.length > 0 ? Math.round(weekCompleted / wk.sessions.length * 100) : 0;

          return (
            <button
              key={wk.num}
              className="week-tile"
              data-deload={wk.deload ? 'true' : 'false'}
              onClick={() => navigate(`/phases/${phase.id}/weeks/${wk.num}`)}
            >
              <div className="wt-num">{wk.num}</div>
              <div className="wt-tag">{wk.deload ? 'DELOAD' : 'BUILD'}</div>
              <div className="wt-theme">{wk.theme}</div>
              <div className="wt-progress">
                <div className="wt-bar"><div style={{ width: `${pct}%`, height: '100%', background: 'var(--rust)' }}></div></div>
                <span style={{ fontSize: 10, marginTop: 4, display: 'block', opacity: 0.7 }}>{weekCompleted}/{wk.sessions.length}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
