import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computeReadiness } from '../lib/Readiness.js';
import TrainingCalendar from '../components/TrainingCalendar.jsx';
import ReadinessHero from '../components/ui/ReadinessHero.jsx';
import LoadBand from '../components/ui/LoadBand.jsx';

const DISC_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Ride', brick: 'Brick', general: 'Movement' };
const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function shortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(s => s.sessions);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);
  const load = useTrainingStore(s => s.load);
  const adaptation = useTrainingStore(s => s.adaptation);
  const completeSession = useTrainingStore(s => s.completeSession);
  const skipSession = useTrainingStore(s => s.skipSession);
  const revertWeekAdaptation = useTrainingStore(s => s.revertWeekAdaptation);
  const unrevertWeekAdaptation = useTrainingStore(s => s.unrevertWeekAdaptation);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const readiness = computeReadiness(dailyMetrics, logs);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  const hasCalendar = !!Plan.getStartDate();
  const next = hasCalendar ? null : Plan.recommendedSession(sessions);

  const todayISO = Plan.localISO(now);
  const cal = hasCalendar ? Plan.buildCalendar(sessions) : null;
  let pastDue = [];
  if (cal) {
    Object.keys(cal.byDate).filter(iso => iso < todayISO).forEach(iso => {
      cal.byDate[iso].forEach(e => { if (!e.completed && !e.skipped) pastDue.push({ ...e, iso }); });
    });
    pastDue.sort((a, b) => b.iso.localeCompare(a.iso));
    pastDue = pastDue.slice(0, 6);
  }

  return (
    <>
      <div className="today-greeting">
        <div className="today-date">{greeting(now)} · {dateLabel}</div>
      </div>

      {/* READINESS — verdict-first hero */}
      <ReadinessHero readiness={readiness} onOpen={() => navigate('/tracking/wearables')} />

      {/* ADAPTATION — shown when the load engine adjusted this week */}
      {adaptation && (
        <div className={`home-adapt${adaptation.reverted ? ' reverted' : ''}`}>
          <div className="ha-title">{adaptation.reverted ? 'Following the plan' : 'Plan adjusted'}</div>
          <div className="ha-reason">{adaptation.reason}</div>
          <button className="ha-action"
            onClick={() => adaptation.reverted ? unrevertWeekAdaptation(adaptation.week) : revertWeekAdaptation(adaptation.week)}>
            {adaptation.reverted ? 'Let load adapt this week' : 'Revert to plan'}
          </button>
        </div>
      )}

      {/* TODAY + WEEK STRIP */}
      {hasCalendar ? (
        <TrainingCalendar sessions={sessions} onOpen={openSession} />
      ) : next ? (
        <button className="today-card" onClick={() => navigate(`/phases/${next.phase.id}/weeks/${next.week.num}/sessions/${next.sessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}>
          <div className="today-eyebrow">Week {next.week.num} · {next.phase.title || `Phase ${next.phase.id}`}</div>
          <div className="today-title">{next.session.title}</div>
          <div className="today-meta">{next.session.duration}</div>
        </button>
      ) : null}

      {/* TRAINING LOAD — verdict band */}
      <LoadBand load={load} adaptation={adaptation} />

      {/* CATCH UP — one-tap Done/Missed for past-due sessions */}
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

      {/* TRAIN NOW — on-demand "got a gap" session (demoted to the bottom) */}
      <button onClick={() => navigate('/train-now')} className="trainnow-cta">
        <span className="tn-cta-text">
          <span className="tn-cta-title">Train now</span>
          <span className="tn-cta-sub">Got a gap? A session for your time &amp; kit</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
      </button>
    </>
  );
}
