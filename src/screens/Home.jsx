import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computeReadiness } from '../lib/Readiness.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';

const DISC_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Ride', brick: 'Brick', general: 'Movement' };
const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

// Greeting that matches the time of day.
function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// "Mon 8 Jun" from a YYYY-MM-DD string.
function shortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);
  const logs = useTrainingStore(state => state.logs);
  const completeSession = useTrainingStore(state => state.completeSession);
  const skipSession = useTrainingStore(state => state.skipSession);
  const adaptation = useTrainingStore(s => s.adaptation);
  const revertWeekAdaptation = useTrainingStore(s => s.revertWeekAdaptation);
  const unrevertWeekAdaptation = useTrainingStore(s => s.unrevertWeekAdaptation);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const readiness = computeReadiness(dailyMetrics, logs);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  // Dated (generated) plans get the calendar; legacy plans fall back to a
  // simple next-session card.
  const hasCalendar = !!Plan.getStartDate();
  const next = hasCalendar ? null : Plan.recommendedSession(sessions);

  // Past-due sessions still awaiting an outcome (not done, not yet marked missed).
  // Surfacing them with one-tap Done/Missed lets the plan reflow around real life
  // without opening each session. Today's session is left to the calendar.
  const todayISO = Plan.localISO(now);
  const cal = hasCalendar ? Plan.buildCalendar(sessions) : null;
  let pastDue = [];
  if (cal) {
    Object.keys(cal.byDate).filter(iso => iso < todayISO).forEach(iso => {
      cal.byDate[iso].forEach(e => { if (!e.completed && !e.skipped) pastDue.push({ ...e, iso }); });
    });
    // Most-recent first (this week's misses — the ones that reflow the plan — sit
    // at the top), capped so a long-ignored backlog can't swamp the home screen.
    pastDue.sort((a, b) => b.iso.localeCompare(a.iso));
    pastDue = pastDue.slice(0, 6);
  }

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

      {/* TRAIN NOW — on-demand session for whatever time + kit you've got */}
      <button onClick={() => navigate('/train-now')} className="trainnow-cta">
        <span className="tn-cta-text">
          <span className="tn-cta-title">Train now</span>
          <span className="tn-cta-sub">Got a gap? A session for your time &amp; kit</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
      </button>

      {/* ADAPTATION BANNER — shown when load engine has adjusted this week's plan */}
      {adaptation && (
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 14,
          background: adaptation.reverted ? 'var(--bg-surface-2)' : 'rgba(200,154,58,0.10)',
          border: `1px solid ${adaptation.reverted ? 'var(--hairline)' : 'rgba(200,154,58,0.30)'}`
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-strong)', marginBottom: 2 }}>
            {adaptation.reverted ? 'Following the plan' : 'Plan adjusted'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt-body)' }}>{adaptation.reason}</div>
          <button
            onClick={() => adaptation.reverted ? unrevertWeekAdaptation(adaptation.week) : revertWeekAdaptation(adaptation.week)}
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--rust)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {adaptation.reverted ? 'Let load adapt this week' : 'Revert to plan'}
          </button>
        </div>
      )}

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

      {/* CATCH UP — one-tap Done / Missed for past-due sessions, so the plan
          reflows around what actually happened without opening each one. */}
      {pastDue.length > 0 && (
        <div className="catchup">
          <div className="catchup-head">Catch up — {pastDue.length} to settle</div>
          {pastDue.map(e => (
            <div className="catchup-row" key={e.key}>
              <button className="catchup-main" onClick={() => openSession(e)}>
                <span className="catchup-title">{stripDay(e.title)}</span>
                <span className="catchup-sub">{shortDate(e.iso)} · {DISC_LABEL[e.discipline] || 'Session'}</span>
              </button>
              <button className="catchup-btn done" onClick={() => completeSession(e.key, {})}>Done</button>
              <button className="catchup-btn miss" onClick={() => skipSession(e.key)}>Missed</button>
            </div>
          ))}
        </div>
      )}

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
