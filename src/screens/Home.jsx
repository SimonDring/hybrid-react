import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../data/Plan.js';
import * as Utils from '../lib/Utils.js';

export default function Home() {
  const navigate = useNavigate();
  const sessions = useTrainingStore(state => state.sessions);

  const completed = Utils.countCompleted(sessions);

  // Find next incomplete session (walk all phases, all weeks)
  const phases = Plan.getPhases();
  let nextSession = null;
  let nextWeek = null;
  let nextPhase = null;
  let nextSessionIdx = 0;
  outer: for (const phase of phases) {
    const fullPhase = Plan.getPhase(phase.id);
    if (!fullPhase || !fullPhase.weeks) continue;
    for (const wk of fullPhase.weeks) {
      for (let i = 0; i < wk.sessions.length; i++) {
        const key = Utils.weekKey(phase.id, wk.num, i);
        if (!sessions[key] || !sessions[key].completed) {
          nextSession = wk.sessions[i];
          nextWeek = wk;
          nextPhase = phase;
          nextSessionIdx = i;
          break outer;
        }
      }
    }
  }

  // Current week progress for streak ring
  const targetWeeklySessions = 6;
  const thisWeekDone = nextWeek
    ? nextWeek.sessions.filter((_, i) => {
        const k = Utils.weekKey(nextPhase.id, nextWeek.num, i);
        return sessions[k] && sessions[k].completed;
      }).length
    : 0;
  const ringPct = Math.min(100, (thisWeekDone / targetWeeklySessions) * 100);
  const ringCircumference = 2 * Math.PI * 22;
  const ringOffset = ringCircumference - (ringCircumference * ringPct / 100);

  return (
    <>
      <div className="eyebrow">Hybrid · 12-month plan</div>
      <h1 className="h1">Built to last</h1>
      <p className="sub">Strength + endurance, planned across phases. One session at a time.</p>

      {nextSession && nextWeek && nextPhase && (
        <button
          className="today-card"
          onClick={() => navigate(`/phases/${nextPhase.id}/weeks/${nextWeek.num}/sessions/${nextSessionIdx}`)}
          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', cursor: 'pointer', color: '#f4f1ea' }}
        >
          <div className="today-eyebrow">Up next · Week {nextWeek.num}</div>
          <div className="today-title">{nextSession.title}</div>
          <div className="today-meta">{nextSession.duration}</div>
          <div className="today-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Open session
          </div>
        </button>
      )}

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
            <div className="streak-sub">{thisWeekDone === 0 ? "Let's start" : thisWeekDone >= targetWeeklySessions ? 'Full week complete' : `${targetWeeklySessions - thisWeekDone} sessions to go`}</div>
          </div>
        </div>
      )}

      <div className="stats-strip">
        <div className="stat-tile">
          <div className="l">Sessions</div>
          <div className="v">{completed}</div>
          <div className="d">completed</div>
        </div>
        <div className="stat-tile">
          <div className="l">Phase</div>
          <div className="v">{nextPhase ? nextPhase.id : '—'}</div>
          <div className="d">of 5</div>
        </div>
        <div className="stat-tile">
          <div className="l">Week</div>
          <div className="v">{nextWeek ? nextWeek.num : '—'}</div>
          <div className="d">of 52</div>
        </div>
      </div>

      <h2 className="h3">Quick actions</h2>
      <div className="quick-grid">
        <button className="quick-tile" onClick={() => navigate('/phases')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div className="qt-title">View all phases</div>
          <div className="qt-meta">5 phases · 52 weeks</div>
        </button>
        <button className="quick-tile" onClick={() => navigate('/tracking/checkin')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="qt-title">Log this week</div>
          <div className="qt-meta">Bodyweight, RHR, sleep</div>
        </button>
        <button className="quick-tile" onClick={() => navigate('/tracking/trends')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </div>
          <div className="qt-title">Trends</div>
          <div className="qt-meta">Last 4–12 weeks</div>
        </button>
        <button className="quick-tile" onClick={() => navigate('/profile/reassess')}>
          <div className="qt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="qt-title">Reassess</div>
          <div className="qt-meta">Quarterly checkpoint</div>
        </button>
      </div>

      <h2 className="h3">Reference</h2>
      <div className="sec-links">
        <button className="sec-link" onClick={() => navigate('/profile/principles')}>Operating principles →</button>
        <button className="sec-link" onClick={() => navigate('/profile/decisions')}>Decision framework →</button>
        <button className="sec-link" onClick={() => navigate('/profile/overview')}>12-month overview →</button>
      </div>
    </>
  );
}
