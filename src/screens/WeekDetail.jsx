import { useNavigate, useParams } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';

// Days of the week strip (M T W T F S S)
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Map session titles to day labels for the strip indicator
function dayForSession(sessionTitle) {
  const t = sessionTitle.toLowerCase();
  if (t.includes('monday')) return 0;
  if (t.includes('tuesday')) return 1;
  if (t.includes('wednesday')) return 2;
  if (t.includes('thursday')) return 3;
  if (t.includes('friday')) return 4;
  if (t.includes('saturday') || t.includes('sat')) return 5;
  if (t.includes('sunday')) return 6;
  return null;
}

export default function WeekDetail() {
  const navigate = useNavigate();
  const { phaseId, weekNum } = useParams();
  const sessions = useTrainingStore(state => state.sessions);

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  if (!phase || !week) return <div>Week not found</div>;

  // Build day index → session indices map for the strip
  const dayMap = {};
  week.sessions.forEach((s, i) => {
    const d = dayForSession(s.title);
    if (d !== null) {
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push(i);
    }
  });

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · {phase.title}</div>
      <h1 className="h1">Week {week.num}</h1>
      <p className="sub">{week.theme}</p>

      {week.deload && (
        <div className="callout amber">
          <strong>Deload week</strong>
          Volume reduced, intensity capped. Mandatory recovery. Skip is not optional.
        </div>
      )}

      <div className="week-strip">
        {DAYS.map((d, i) => {
          const idxs = dayMap[i] || [];
          const allDone = idxs.length > 0 && idxs.every(idx => {
            const k = Utils.weekKey(phase.id, week.num, idx);
            return sessions[k] && sessions[k].completed;
          });
          const cls = allDone ? 'done' : idxs.length > 0 ? 'planned' : 'empty';
          return (
            <div key={i} className={`week-strip-day ${cls}`}>
              <div className="wsd-label">{d}</div>
              <div className="wsd-dot">{idxs.length || ''}</div>
            </div>
          );
        })}
      </div>

      <h2 className="h3">Sessions</h2>
      <div className="ses-list">
        {week.sessions.map((s, i) => {
          const key = Utils.weekKey(phase.id, week.num, i);
          const state = sessions[key];
          const isDone = state && state.completed;
          const isStarted = state && state.startedAt && !state.completed;
          const dayLabel = s.title.split('·')[0].trim();
          const focus = s.title.split('·').slice(1).join('·').trim();

          return (
            <button
              key={i}
              className={`ses-card ${isDone ? 'is-done' : ''} ${isStarted ? 'is-started' : ''}`}
              onClick={() => navigate(`/phases/${phase.id}/weeks/${week.num}/sessions/${i}`)}
            >
              <div>
                <div className="ses-day">{dayLabel}</div>
                {isDone && <div className="ses-badge done">DONE</div>}
                {isStarted && <div className="ses-badge started">STARTED</div>}
              </div>
              <div>
                <div className="ses-focus">{focus || s.title}</div>
                <div className="ses-dur">{s.duration}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          );
        })}
      </div>
    </>
  );
}
