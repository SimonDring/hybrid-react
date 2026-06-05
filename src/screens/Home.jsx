import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computeReadiness } from '../lib/Readiness.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';

// Greeting that matches the time of day.
function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);
  const logs = useTrainingStore(state => state.logs);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const readiness = computeReadiness(dailyMetrics, logs);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  // Dated (generated) plans get the calendar; legacy plans fall back to a
  // simple next-session card.
  const hasCalendar = !!Plan.getStartDate();
  const next = hasCalendar ? null : Plan.recommendedSession(sessions);

  // Readiness ring geometry
  const rR = 30;
  const rCirc = 2 * Math.PI * rR;
  const rPct = readiness.score != null ? readiness.score : 0;
  const rOffset = rCirc - (rCirc * rPct / 100);
  const accentVar = `var(--${readiness.accent})`;

  return (
    <>
      <div className="today-greeting">
        <div className="today-date">{greeting(now)} · {dateLabel}</div>
      </div>

      {/* TRAINING CALENDAR — top of the page */}
      {hasCalendar ? (
        <TrainingCalendar sessions={sessions} onOpen={openSession} />
      ) : next ? (
        <button
          className="today-card"
          onClick={() => navigate(`/phases/${next.phase.id}/weeks/${next.week.num}/sessions/${next.sessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer', color: '#f4f1ea', marginBottom: 22 }}
        >
          <div className="today-eyebrow">Week {next.week.num} · {next.phase.title || `Phase ${next.phase.id}`}</div>
          <div className="today-title">{next.session.title}</div>
          <div className="today-meta">{next.session.duration}</div>
        </button>
      ) : null}

      {/* READINESS — the score, tap through to the detailed metrics */}
      <button className="today-hero readiness-tap" data-status={readiness.status} onClick={() => navigate('/tracking/wearables')}>
        <div className="th-eyebrow">
          {readiness.status === 'unknown' ? 'Readiness' : readiness.estimated ? 'Readiness · estimate' : 'Readiness'}
        </div>
        <div className="th-main">
          <div className="th-ring">
            <svg viewBox="0 0 72 72">
              <circle cx="36" cy="36" r={rR} fill="none" stroke="rgba(244,241,234,0.14)" strokeWidth="5" />
              {readiness.score != null && (
                <circle cx="36" cy="36" r={rR} fill="none" stroke={accentVar} strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={rCirc} strokeDashoffset={rOffset}
                  transform="rotate(-90 36 36)" />
              )}
            </svg>
            <div className="th-ring-text">{readiness.score != null ? readiness.score : '—'}</div>
          </div>
          <div className="th-copy">
            <div className="th-headline">{readiness.headline}</div>
            <div className="th-note">
              {readiness.status === 'unknown' ? "Add today's metrics →" : 'View details →'}
            </div>
          </div>
        </div>
      </button>
    </>
  );
}
