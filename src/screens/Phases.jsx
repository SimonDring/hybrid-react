import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';

export default function Phases() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);
  const phases = Plan.getPhases();

  return (
    <>
      <h1 className="h1">Training Phases</h1>
      <p className="sub">5 phases over 52 weeks. Phase 1 is locked; Phases 2–5 are provisional until each quarterly reassessment.</p>

      {phases.map(phase => {
        // Count completed sessions in this phase
        let totalSessions = 0;
        let completedSessions = 0;
        if (phase.weeks) {
          phase.weeks.forEach(wk => {
            wk.sessions.forEach((_, i) => {
              totalSessions++;
              const k = Utils.weekKey(phase.id, wk.num, i);
              if (sessions[k] && sessions[k].completed) completedSessions++;
            });
          });
        }
        const pct = totalSessions > 0 ? Math.round(completedSessions / totalSessions * 100) : 0;

        return (
          <button
            key={phase.id}
            className="phase-tile"
            onClick={() => navigate(`/phases/${phase.id}`)}
            data-status={phase.status}
          >
            <div className="pt-num">{phase.id}</div>
            <div className="pt-range">{phase.range}</div>
            <div className="pt-title">{phase.title}</div>
            <div className="pt-desc">{phase.tagline}</div>
            <div className="pt-foot">
              <span className={`pt-status ${phase.status}`}>{phase.status}</span>
              {totalSessions > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>{completedSessions}/{totalSessions} sessions · {pct}%</span>}
            </div>
          </button>
        );
      })}
    </>
  );
}
