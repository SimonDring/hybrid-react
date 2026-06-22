import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { computeReadiness } from '../lib/Readiness.js';
import WeekSchedule from '../components/WeekSchedule.jsx';
import RingTile from '../components/ui/RingTile.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { readinessVerdict, loadVerdict } from '../lib/verdicts.js';
import { buildCoachNote } from '../lib/coachNote.js';

const DISC_LABEL = { gym: 'Gym', run: 'Run', swim: 'Swim', cycle: 'Ride', brick: 'Brick', general: 'Movement' };
const stripDay = (title) => (title || '').replace(/^[A-Za-z]+\s·\s/, '');

function shortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Home() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
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
  const readiness = computeReadiness(dailyMetrics, logs);
  const rv = readinessVerdict(readiness);
  const lv = loadVerdict(load, adaptation);

  const openSession = (s) => navigate(`/phases/${s.phaseId}/weeks/${s.weekNum}/sessions/${s.idx}`);

  const hasCalendar = !!Plan.getStartDate();
  const next = hasCalendar ? null : Plan.recommendedSession(sessions);

  // Coach-note context — where we are in the plan (for the educator summary).
  const cw = Plan.currentWeekNumber();
  const phases = Plan.getPhases();
  const totalWeeks = phases.reduce((m, p) => Math.max(m, p.weekEnd || 0), 0);
  let curPhase = null, curWeek = null;
  for (const p of phases) { const w = (p.weeks || []).find(w => w.num === cw); if (w) { curPhase = p; curWeek = w; break; } }
  const coach = buildCoachNote(profile, {
    phaseTitle: curPhase ? (curPhase.title || `Phase ${curPhase.id}`) : null,
    weekNum: cw, totalWeeks,
    isDeload: !!(curWeek && (curWeek.deload || curWeek.taper))
  });

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
      {/* IDENTITY — avatar + name (→ profile) on the left, day + date on the right */}
      <div className="home-head">
        <button className="home-id" onClick={() => navigate('/profile')} aria-label="Your profile">
          <Avatar name={profile.name} avatar={profile.avatar} size={42} />
          <span className="home-id-text">
            <span className="home-name">{profile.name || 'Your profile'}</span>
            {coach.tag && <span className="home-sub">{coach.tag}</span>}
          </span>
        </button>
        <div className="home-date">
          <span className="home-dow">{now.toLocaleDateString(undefined, { weekday: 'long' })}</span>
          <span className="home-dom">{now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* COACH NOTE — what we're working on, why, and how it helps your sport */}
      <div className="coachnote">
        <div className="cn-eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><polygon points="14.5 9.5 9.5 11.5 9.5 14.5 14.5 12.5" />
          </svg>
          {coach.eyebrow}
        </div>
        <div className="cn-headline">{coach.headline}</div>
        <div className="cn-body">{coach.body}</div>
        {coach.translatesTo && <div className="cn-translates">{coach.translatesTo}</div>}
        {coach.footer && <div className="cn-footer">{coach.footer}</div>}
      </div>

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

      {/* THIS WEEK — the schedule is the hero */}
      {hasCalendar ? (
        <WeekSchedule sessions={sessions} onOpen={openSession} />
      ) : next ? (
        <button className="today-card" onClick={() => navigate(`/phases/${next.phase.id}/weeks/${next.week.num}/sessions/${next.sessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}>
          <div className="today-eyebrow">Week {next.week.num} · {next.phase.title || `Phase ${next.phase.id}`}</div>
          <div className="today-title">{next.session.title}</div>
          <div className="today-meta">{next.session.duration}</div>
        </button>
      ) : null}

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

      {/* SUPPORTING SIGNALS — readiness + training load, demoted to the bottom */}
      <div className="home-rings">
        <RingTile
          eyebrow="Readiness"
          value={readiness.score != null ? readiness.score : '—'}
          fill={readiness.score != null ? readiness.score : 0}
          max={100}
          color={rv.color}
          verdict={rv.label}
          onClick={() => navigate('/tracking/wearables')}
        />
        <RingTile
          eyebrow="Training load"
          value={load && load.acwr != null ? load.acwr.toFixed(1) : '—'}
          fill={load && load.acwr != null ? load.acwr : 0}
          max={2}
          color={lv.color}
          verdict={lv.label}
          onClick={() => navigate('/tracking/load')}
        />
      </div>
    </>
  );
}
