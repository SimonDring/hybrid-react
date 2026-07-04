/**
 * Sleep detail — behind the Health "Sleep" tile. Last night (duration, score,
 * stage breakdown) + a recent-nights trend.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fmtSleep } from '../lib/uiHelpers.js';
import Sparkline from '../components/ui/Sparkline.jsx';

export default function SleepDetail() {
  const navigate = useNavigate();
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = sorted[sorted.length - 1] || {};
  const sleepHrs = sorted.map(m => (m.sleep_duration_min == null ? NaN : Math.round((m.sleep_duration_min / 60) * 10) / 10)).filter(v => !isNaN(v)).slice(-14);
  const avgSleep = sleepHrs.length ? Math.round((sleepHrs.reduce((a, b) => a + b, 0) / sleepHrs.length) * 10) / 10 : null;
  const deep = Number(latest.sleep_deep_min) || 0, rem = Number(latest.sleep_rem_min) || 0, light = Number(latest.sleep_light_min) || 0, awake = Number(latest.sleep_awake_min) || 0;
  const hasStages = (deep + rem + light) > 0;

  if (latest.sleep_duration_min == null) {
    return (
      <>
        <h1 className="h1">Sleep</h1>
        <p className="sub">No sleep data yet.</p>
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>Add sleep or connect a wearable →</strong>
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="h1">Sleep</h1>
      <p className="sub">Last night and your recent nights.</p>

      <div className="health-card">
        <div className="sleep-head">
          <div><div className="hc-eyebrow">Last night</div><div className="sleep-dur">{fmtSleep(latest.sleep_duration_min)}</div></div>
          {latest.sleep_score != null && <div className="sleep-score">{latest.sleep_score}<span> score</span></div>}
        </div>
        {hasStages && (
          <>
            <div className="sleep-bar">
              {deep > 0 && <span className="sg deep" style={{ flexGrow: deep }} />}
              {rem > 0 && <span className="sg rem" style={{ flexGrow: rem }} />}
              {light > 0 && <span className="sg light" style={{ flexGrow: light }} />}
              {awake > 0 && <span className="sg awake" style={{ flexGrow: awake }} />}
            </div>
            <div className="sleep-legend">
              <span><i className="deep" />Deep {fmtSleep(deep)}</span>
              <span><i className="rem" />REM {fmtSleep(rem)}</span>
              <span><i className="light" />Light {fmtSleep(light)}</span>
            </div>
          </>
        )}
      </div>

      {sleepHrs.length >= 2 && (
        <div className="health-card">
          <div className="marker-row">
            <div><div className="hc-eyebrow">Last {sleepHrs.length} nights</div><div className="marker-val">{avgSleep}<span> h avg</span></div></div>
            <Sparkline values={sleepHrs} color="var(--accent-2)" />
          </div>
        </div>
      )}
    </>
  );
}
