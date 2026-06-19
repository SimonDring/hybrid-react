/**
 * Progress — the motivating snapshot, strength-first. Leads with goal momentum
 * (each main lift's progress toward its next strength standard, or a set target,
 * plus consistency), then what's working / to watch, recovery trend, and links to
 * the detail screens. Goal data comes from the Goal Engine (src/lib/goals.js).
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { goalMomentum } from '../lib/goals.js';
import { computeReadiness } from '../lib/Readiness.js';
import MetricRing from '../components/ui/MetricRing.jsx';

const SHORT = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', consistency: 'Consist.' };
const PILL = { on_track: 'On track', building: 'Building', behind: 'Behind', nodata: '—' };

function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null;
  const w = 96, h = 34, max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${(h - 3) - ((v - min) / rng) * (h - 6)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkRow({ title, sub, badge, onClick }) {
  return (
    <button className="link-row" onClick={onClick}>
      <div className="lr-body"><div className="lr-title">{title}</div><div className="lr-sub">{sub}</div></div>
      {badge && <span className="lr-badge">{badge}</span>}
      <svg className="lr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const sessions = useTrainingStore(s => s.sessions);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);
  const injuries = useTrainingStore(s => s.injuries);
  const load = useTrainingStore(s => s.load);

  const currentWeek = Plan.currentWeekNumber();
  const { goals, onTrack, tracked } = goalMomentum(profile, sessions, currentWeek);
  const readiness = computeReadiness(dailyMetrics, logs);
  const activeInjuries = (injuries || []).filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));

  const trackedGoals = goals.filter(g => g.status !== 'nodata');
  const sorted = trackedGoals.slice().sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const recScores = (dailyMetrics || []).map(m => Number(m.readiness_score)).filter(v => !isNaN(v)).slice(-10);
  const recAvg = recScores.length ? Math.round(recScores.reduce((a, b) => a + b, 0) / recScores.length) : null;

  const headline = tracked === 0 ? 'Start logging to see your progress' : `On track for ${onTrack} of ${tracked} goals`;

  return (
    <>
      <h1 className="h1">Progress</h1>
      <p className="sub">Your strength at a glance.</p>

      {/* MOMENTUM HERO */}
      <div className="prog-hero">
        <div className="prog-hero-title">{headline}</div>
        <div className="prog-hero-sub">Each lift against the next strength standard for your bodyweight, plus consistency.</div>
        <div className="prog-rings">
          {goals.map(g => (
            <button key={g.key} className="goal-ring" onClick={() => navigate('/profile')}>
              <MetricRing value={g.pct || 0} max={100} size={64} stroke={5} color={g.color}>
                <span className="gr-pct">{g.pct != null ? g.pct : '—'}</span>
              </MetricRing>
              <span className="gr-cap">{SHORT[g.key] || g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* GOAL ROWS */}
      <h2 className="h3" style={{ marginTop: 22 }}>Goals</h2>
      <div className="goal-rows">
        {goals.map(g => (
          <div key={g.key} className="goal-row">
            <div className="goal-row-head">
              <span className="grw-name">{g.label}</span>
              <span className={`grw-pill ${g.status}`}>{PILL[g.status]}</span>
            </div>
            <div className="grw-sub">
              <span>{g.current != null ? (g.key === 'consistency' ? `${g.current}/wk` : `${g.current} kg`) : 'Log a set'}</span>
              <span>{g.sub}</span>
            </div>
            <div className="grw-bar"><span style={{ width: `${g.pct || 0}%`, background: g.color }} /></div>
          </div>
        ))}
      </div>

      {/* WORKING / WATCH */}
      {trackedGoals.length > 0 && best && worst && (
        <div className="prog-insights">
          <div className="insight working">
            <div className="ins-label">Working</div>
            <div className="ins-text">{best.label} leading — {best.sub.toLowerCase()}.</div>
          </div>
          <div className="insight watch">
            <div className="ins-label">Watch this</div>
            <div className="ins-text">{worst.label}: {worst.pct}% to target.</div>
          </div>
        </div>
      )}

      {/* RECOVERY TREND */}
      <h2 className="h3" style={{ marginTop: 22 }}>Recovery</h2>
      {recScores.length >= 2 ? (
        <div className="prog-recovery">
          <div>
            <div className="pr-title">Recovery trend</div>
            <div className="pr-sub">{recScores.length}-day readiness avg {recAvg}</div>
          </div>
          <Sparkline values={recScores} color="var(--accent-2)" />
        </div>
      ) : (
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>No recovery data yet.</strong> Connect a wearable or add today's sleep, HRV and resting HR →
        </button>
      )}

      {/* DETAIL LINKS */}
      <div className="link-list" style={{ marginTop: 14 }}>
        <LinkRow title="Daily metrics" sub="Sleep, HRV, resting HR, readiness" onClick={() => navigate('/tracking/wearables')} />
        <LinkRow title="Trends" sub="Recovery & activity over time" onClick={() => navigate('/tracking/trends')} badge={dailyMetrics.length >= 2 ? `${dailyMetrics.length} days` : null} />
        <LinkRow title="Injuries" sub={activeInjuries.length === 0 ? 'No current injuries' : activeInjuries.map(i => i.title || i.body_part || 'Injury').join(' · ')} badge={activeInjuries.length > 0 ? `${activeInjuries.length} active` : null} onClick={() => navigate('/tracking/injuries')} />
        <LinkRow title="Training load" sub="Acute vs chronic load & how the plan adapts" onClick={() => navigate('/tracking/load')} badge={load && load.acwr != null ? load.acwr.toFixed(1) : null} />
      </div>
    </>
  );
}
