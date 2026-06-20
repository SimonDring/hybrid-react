/**
 * Progress — the motivating snapshot, strength-first, on one screen. One compact
 * ring-row per goal (each lift toward its next strength standard, or a set target,
 * plus consistency) and what's working / to watch. Recovery + load live on Health.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import * as Plan from '../lib/PlanService.js';
import { goalMomentum } from '../lib/goals.js';
import MetricRing from '../components/ui/MetricRing.jsx';

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

  const headline = tracked === 0 ? 'Start logging to see your progress.' : `On track for ${onTrack} of ${tracked} goals.`;

  return (
    <>
      <h1 className="h1">Progress</h1>
      <p className="sub">{headline}</p>

      <div className="goal-rows" style={{ marginTop: 6 }}>
        {goals.map(g => (
          <div key={g.key} className="goal-row-r">
            <MetricRing value={g.pct || 0} max={100} size={46} stroke={4} color={g.color}>
              <span className="grr-pct">{g.pct != null ? g.pct : '—'}</span>
            </MetricRing>
            <div className="grr-body">
              <div className="grr-top">
                <span className="grr-name">{g.label}</span>
                <span className={`grw-pill ${g.status}`}>{PILL[g.status]}</span>
              </div>
              <div className="grr-sub">
                {g.current != null ? (g.key === 'consistency' ? `${g.current}/wk` : `${g.current} kg`) : 'Log a set'} · {g.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

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
