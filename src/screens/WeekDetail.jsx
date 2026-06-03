import { useNavigate, useParams } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dayForSession(title) {
  const t = title.toLowerCase();
  if (t.includes('monday')) return 0;
  if (t.includes('tuesday')) return 1;
  if (t.includes('wednesday')) return 2;
  if (t.includes('thursday')) return 3;
  if (t.includes('friday')) return 4;
  if (t.includes('saturday') || t.includes('sat')) return 5;
  if (t.includes('sunday')) return 6;
  return null;
}

// Derive a short type tag from the session title
function sessionType(title) {
  const t = title.toLowerCase();
  if (t.includes('swim')) return { label: 'SWIM', color: '#4a5d3a' };
  if (t.includes('run')) return { label: 'RUN', color: '#b04a2e' };
  if (t.includes('ride') || t.includes('cycle') || t.includes('bike')) return { label: 'RIDE', color: '#3a6d7a' };
  if (t.includes('upper')) return { label: 'UPPER', color: '#c89a3a' };
  if (t.includes('lower')) return { label: 'LOWER', color: '#7a5d3a' };
  if (t.includes('ski')) return { label: 'SKI', color: '#4a5d7a' };
  if (t.includes('africa') || t.includes('deload')) return { label: 'DELOAD', color: '#b04a2e' };
  if (t.includes('race') || t.includes('half marathon')) return { label: 'RACE', color: '#b04a2e' };
  return { label: 'LIFT', color: '#7a5d3a' };
}

export default function WeekDetail() {
  const navigate = useNavigate();
  const { phaseId, weekNum } = useParams();
  const sessions = useTrainingStore(state => state.sessions);

  const phase = Plan.getPhase(Number(phaseId));
  const week = phase ? phase.weeks.find(w => w.num === Number(weekNum)) : null;
  if (!phase || !week) return <div style={{ padding: 24 }}>Week not found</div>;

  // Build day → session index map for the strip
  const dayMap = {};
  week.sessions.forEach((s, i) => {
    const d = dayForSession(s.title);
    if (d !== null) {
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push(i);
    }
  });

  const completedCount = week.sessions.filter((_, i) => {
    const k = Utils.weekKey(phase.id, week.num, i);
    return sessions[k] && sessions[k].completed;
  }).length;

  return (
    <>
      <div className="eyebrow">Phase {phase.id} · {phase.title}</div>
      <h1 className="h1" style={{ fontSize: 28 }}>Week {week.num}</h1>

      {/* Progress line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.round(completedCount / week.sessions.length * 100)}%`,
            height: '100%',
            background: 'var(--rust)',
            borderRadius: 2,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {completedCount}/{week.sessions.length}
        </span>
      </div>

      <p className="sub" style={{ marginBottom: 14 }}>{week.theme}</p>

      {week.deload && (
        <div className="callout amber" style={{ marginBottom: 14 }}>
          <strong>Deload week</strong> — Volume reduced. Mandatory.
        </div>
      )}

      {/* Day strip */}
      <div className="week-strip" style={{ marginBottom: 20 }}>
        {DAYS.map((d, i) => {
          const idxs = dayMap[i] || [];
          const allDone = idxs.length > 0 && idxs.every(idx => {
            const k = Utils.weekKey(phase.id, week.num, idx);
            return sessions[k] && sessions[k].completed;
          });
          const hasSession = idxs.length > 0;
          return (
            <div
              key={i}
              className={`week-strip-day ${allDone ? 'done' : hasSession ? 'planned' : 'empty'}`}
              onClick={() => {
                if (idxs.length === 1) {
                  navigate(`/phases/${phase.id}/weeks/${week.num}/sessions/${idxs[0]}`);
                }
              }}
              style={{ cursor: idxs.length === 1 ? 'pointer' : 'default' }}
            >
              <div className="wsd-label">{d}</div>
              <div className="wsd-dot">{hasSession ? (allDone ? '✓' : idxs.length) : ''}</div>
            </div>
          );
        })}
      </div>

      {/* Compact session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {week.sessions.map((s, i) => {
          const key = Utils.weekKey(phase.id, week.num, i);
          const st = sessions[key];
          const isDone = st && st.completed;
          const isStarted = st && st.startedAt && !st.completed;
          const type = sessionType(s.title);

          // Parse title: "Monday · Lower (heavy)" → day="Monday", focus="Lower (heavy)"
          const parts = s.title.split('·');
          const day = parts[0].trim();
          const focus = parts.slice(1).join('·').trim() || s.title;

          // Extract duration in short form: "60–70 min · RPE peak 8" → "60–70 min"
          const shortDur = s.duration ? s.duration.split('·')[0].trim() : '';

          return (
            <button
              key={i}
              onClick={() => navigate(`/phases/${phase.id}/weeks/${week.num}/sessions/${i}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto',
                alignItems: 'center',
                gap: 10,
                padding: '8px 11px',
                background: isDone
                  ? 'rgba(74,93,58,0.07)'
                  : 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 11,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
                fontFamily: 'inherit',
                opacity: isDone ? 0.75 : 1
              }}
            >
              {/* Type pill */}
              <div style={{
                fontSize: 8.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: type.color,
                background: `${type.color}18`,
                borderRadius: 5,
                padding: '3px 0',
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {type.label}
              </div>

              {/* Name + duration */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--txt-strong)',
                  lineHeight: 1.25,
                  marginBottom: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {focus}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.55 }}>
                  {day} · {shortDur}
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isDone && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#4a5d3a',
                    background: 'rgba(74,93,58,0.12)',
                    borderRadius: 6,
                    padding: '3px 7px'
                  }}>
                    DONE
                  </span>
                )}
                {isStarted && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#b04a2e',
                    background: 'rgba(176,74,46,0.12)',
                    borderRadius: 6,
                    padding: '3px 7px'
                  }}>
                    STARTED
                  </span>
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 14, height: 14, opacity: 0.3, flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
