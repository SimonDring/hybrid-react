import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import * as Utils from '../lib/Utils.js';
import { computeReadiness } from '../lib/Readiness.js';

// Greeting that matches the time of day.
function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// A readiness-aware nudge for the recommended session.
function sessionNote(status) {
  if (status === 'strong') return "You're recovered — good day for it.";
  if (status === 'low') return 'Recovery looks low — ease off or swap for easy work if you need to.';
  if (status === 'moderate') return 'Train as planned, listen to your body.';
  return null;
}

// Friendly relative date for the recommended session (dated plans only).
function dayLabel(date) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);
  const logs = useTrainingStore(state => state.logs);

  const completed = Utils.countCompleted(sessions);
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  // Today's readiness — drives the hero.
  const readiness = computeReadiness(dailyMetrics, logs);

  // Today's recommended session — date-aware for generated plans, falls back to
  // the next incomplete session for the legacy plan.
  const next = Plan.recommendedSession(sessions);
  const nextSession = next ? next.session : null;
  const nextWeek = next ? next.week : null;
  const nextPhase = next ? next.phase : null;
  const nextSessionIdx = next ? next.sessionIdx : 0;
  const nextDayLabel = next ? dayLabel(Plan.dateForSession(next.week.num, next.session.title)) : null;

  // Current week progress for the (now secondary) streak ring
  const targetWeeklySessions = nextWeek ? nextWeek.sessions.length : 6;
  const thisWeekDone = nextWeek
    ? nextWeek.sessions.filter((_, i) => {
        const k = Utils.weekKey(nextPhase.id, nextWeek.num, i);
        return sessions[k] && sessions[k].completed;
      }).length
    : 0;
  const ringPct = Math.min(100, (thisWeekDone / targetWeeklySessions) * 100);
  const ringCircumference = 2 * Math.PI * 22;
  const ringOffset = ringCircumference - (ringCircumference * ringPct / 100);

  // Readiness ring geometry
  const rR = 30;
  const rCirc = 2 * Math.PI * rR;
  const rPct = readiness.score != null ? readiness.score : 0;
  const rOffset = rCirc - (rCirc * rPct / 100);
  const accentVar = `var(--${readiness.accent})`;

  const note = sessionNote(readiness.status);

  return (
    <>
      <div className="today-greeting">
        <div className="today-date">{greeting(now)} · {dateLabel}</div>
      </div>

      {/* READINESS HERO */}
      <div className="today-hero" data-status={readiness.status}>
        <div className="th-eyebrow">
          {readiness.status === 'unknown'
            ? 'Today'
            : readiness.estimated ? 'Readiness · estimate' : 'Readiness'}
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
            <div className="th-ring-text">
              {readiness.score != null ? readiness.score : '—'}
            </div>
          </div>
          <div className="th-copy">
            <div className="th-headline">{readiness.headline}</div>
            <div className="th-note">{readiness.note}</div>
          </div>
        </div>

        <div className="vital-row">
          <div className="vital-chip">
            <div className="vc-label">Sleep</div>
            <div className="vc-value">{readiness.vitals.sleepHrs != null ? readiness.vitals.sleepHrs : '—'}<span>{readiness.vitals.sleepHrs != null ? 'h' : ''}</span></div>
          </div>
          <div className="vital-chip">
            <div className="vc-label">HRV</div>
            <div className="vc-value">{readiness.vitals.hrv != null ? readiness.vitals.hrv : '—'}<span>{readiness.vitals.hrv != null ? 'ms' : ''}</span></div>
          </div>
          <div className="vital-chip">
            <div className="vc-label">Resting HR</div>
            <div className="vc-value">{readiness.vitals.rhr != null ? readiness.vitals.rhr : '—'}<span>{readiness.vitals.rhr != null ? 'bpm' : ''}</span></div>
          </div>
        </div>

        {readiness.status === 'unknown' && (
          <button className="th-prompt" onClick={() => navigate('/tracking/wearables')}>
            Add today's metrics →
          </button>
        )}
      </div>

      {/* RECOMMENDED TODAY */}
      {nextSession && nextWeek && nextPhase && (
        <h2 className="h3">Recommended today</h2>
      )}
      {nextSession && nextWeek && nextPhase && (
        <button
          className="today-card"
          onClick={() => navigate(`/phases/${nextPhase.id}/weeks/${nextWeek.num}/sessions/${nextSessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer', color: '#f4f1ea' }}
        >
          <div className="today-eyebrow">
            {nextDayLabel ? `${nextDayLabel} · ` : ''}Week {nextWeek.num} · {nextPhase.title || `Phase ${nextPhase.id}`}
          </div>
          <div className="today-title">{nextSession.title}</div>
          <div className="today-meta">{nextSession.duration}</div>
          {note && <div className="today-readiness-note">{note}</div>}
          <div className="today-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Open session
          </div>
        </button>
      )}

      {/* THIS WEEK (secondary) */}
      {nextWeek && (
        <div className="streak-card">
          <div className="streak-ring">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(14,20,16,0.08)" strokeWidth="4" />
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--rust)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                transform="rotate(-90 26 26)" />
            </svg>
            <div className="ring-text">{thisWeekDone}/{targetWeeklySessions}</div>
          </div>
          <div>
            <div className="streak-title">Week {nextWeek.num} progress</div>
            <div className="streak-sub">{thisWeekDone === 0 ? "Let's start" : thisWeekDone >= targetWeeklySessions ? 'Full week complete' : `${targetWeeklySessions - thisWeekDone} sessions to go · ${completed} done overall`}</div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS (trimmed) */}
      <h2 className="h3">Quick actions</h2>
      <div className="quick-grid">
        <button className="quick-tile" onClick={() => navigate('/tracking/wearables')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </div>
          <div className="qt-title">Today's metrics</div>
          <div className="qt-meta">Sleep, HRV, resting HR</div>
        </button>
        <button className="quick-tile" onClick={() => navigate('/tracking/trends')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
          <div className="qt-title">Trends</div>
          <div className="qt-meta">Last 4–12 weeks</div>
        </button>
      </div>
    </>
  );
}
