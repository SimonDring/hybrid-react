/**
 * Progress — the motivating snapshot, strength-first. Goal momentum (each main
 * lift toward its next strength standard, or a set target, plus consistency) and
 * what's working / to watch. Recovery + training-load detail live on the Health tab.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { goalMomentum } from '../lib/goals.js';
import MetricRing from '../components/ui/MetricRing.jsx';

const SHORT = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', consistency: 'Consist.' };
const PILL = { on_track: 'On track', building: 'Building', behind: 'Behind', nodata: '—' };

export default function Progress() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const sessions = useTrainingStore(s => s.sessions);

  const currentWeek = Plan.currentWeekNumber();
  const { goals, onTrack, tracked } = goalMomentum(profile, sessions, currentWeek);

  const trackedGoals = goals.filter(g => g.status !== 'nodata');
  const sorted = trackedGoals.slice().sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

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
    </>
  );
}
