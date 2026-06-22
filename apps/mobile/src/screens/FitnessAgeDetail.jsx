/**
 * Fitness age detail — behind the Health "Fitness age" tile. Shows the current
 * estimate plus how it has trended over time as the person trains.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fitnessAge, fitnessAgeSeries } from '../lib/fitnessAge.js';
import LineChart from '../components/ui/LineChart.jsx';

export default function FitnessAgeDetail() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);

  const fa = fitnessAge(profile, dailyMetrics);
  const series = fitnessAgeSeries(profile, dailyMetrics);
  const vals = series.map(s => s.fitnessAge);

  if (!fa) {
    return (
      <>
        <h1 className="h1">Fitness age</h1>
        <p className="sub">Add HRV and resting HR (or connect a wearable) to estimate your fitness age.</p>
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>Add metrics →</strong>
        </button>
      </>
    );
  }

  const change = vals.length > 1 ? vals[vals.length - 1] - vals[0] : null;
  const ctx = change == null
    ? 'Tracking from today — keep training and your fitness age trend appears here.'
    : change < 0
      ? `Down ${Math.abs(change)} ${Math.abs(change) === 1 ? 'year' : 'years'} over ${vals.length} days — your training is paying off.`
      : change > 0
        ? `Up ${change} ${change === 1 ? 'year' : 'years'} over ${vals.length} days — ease in and protect recovery to bring it back down.`
        : `Holding steady over ${vals.length} days.`;

  return (
    <>
      <h1 className="h1">Fitness age</h1>
      <p className="sub">How your estimated fitness age changes as you train.</p>

      <div className="fitage-card">
        <div className="fitage-main">
          <div>
            <div className="fitage-label">Now</div>
            <div className="fitage-val">{fa.fitnessAge}<span> yrs</span></div>
          </div>
          <div className="fitage-delta" style={{ color: fa.color }}>
            {fa.status === 'younger' ? `${fa.delta} yrs younger` : fa.status === 'older' ? `${Math.abs(fa.delta)} yrs older` : 'On par'}
            <div className="fitage-vs">vs your age of {fa.age}</div>
          </div>
        </div>
        <div className="fitage-note">From resting HR + HRV vs typical for your age — an estimate, not medical.</div>
      </div>

      {vals.length >= 2 ? (
        <div className="health-card">
          <div className="hc-eyebrow" style={{ marginBottom: 6 }}>Fitness age · last {vals.length} days</div>
          <LineChart values={vals} color="#6FD3C4" height={196} />
          <div className="md-context" style={{ marginTop: 10 }}>{ctx}</div>
        </div>
      ) : (
        <div className="health-card"><div className="hc-note">Keep logging — your fitness age trend builds over time.</div></div>
      )}
    </>
  );
}
