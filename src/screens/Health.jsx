/**
 * Health — the recovery + training-load detail hub. It deliberately does NOT
 * repeat the readiness score/verdict (that's the Home hero); instead it shows the
 * detail behind it: sleep (incl. stages), recovery markers (HRV, resting HR),
 * training load, and links to the deep metric/trend/injury screens.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fmtSleep } from '../lib/Readiness.js';
import { loadVerdict } from '../lib/verdicts.js';
import { fitnessAge } from '../lib/fitnessAge.js';
import Sparkline from '../components/ui/Sparkline.jsx';

function LinkRow({ title, sub, badge, onClick }) {
  return (
    <button className="link-row" onClick={onClick}>
      <div className="lr-body"><div className="lr-title">{title}</div><div className="lr-sub">{sub}</div></div>
      {badge && <span className="lr-badge">{badge}</span>}
      <svg className="lr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}

export default function Health() {
  const navigate = useNavigate();
  const profile = useTrainingStore(s => s.profile);
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const load = useTrainingStore(s => s.load);
  const adaptation = useTrainingStore(s => s.adaptation);
  const injuries = useTrainingStore(s => s.injuries);

  const lv = loadVerdict(load, adaptation);
  const fa = fitnessAge(profile, dailyMetrics);
  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = sorted[sorted.length - 1] || {};
  const series = (field, t) => sorted.map(m => (m[field] == null ? NaN : (t ? t(m[field]) : m[field]))).filter(v => !isNaN(v)).slice(-14);
  const sleepHrs = series('sleep_duration_min', v => Math.round((v / 60) * 10) / 10);
  const hrvSeries = series('hrv_ms');
  const rhrSeries = series('resting_hr');
  const avgSleep = sleepHrs.length ? Math.round((sleepHrs.reduce((a, b) => a + b, 0) / sleepHrs.length) * 10) / 10 : null;
  const activeInjuries = (injuries || []).filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));

  const deep = Number(latest.sleep_deep_min) || 0, rem = Number(latest.sleep_rem_min) || 0, light = Number(latest.sleep_light_min) || 0, awake = Number(latest.sleep_awake_min) || 0;
  const hasStages = (deep + rem + light) > 0;

  return (
    <>
      <h1 className="h1">Health</h1>
      <p className="sub">Sleep, recovery markers and training load, in detail.</p>

      {fa && (
        <div className="fitage-card">
          <div className="fitage-main">
            <div>
              <div className="fitage-label">Fitness age</div>
              <div className="fitage-val">{fa.fitnessAge}<span> yrs</span></div>
            </div>
            <div className="fitage-delta" style={{ color: fa.color }}>
              {fa.status === 'younger' ? `${fa.delta} yrs younger` : fa.status === 'older' ? `${Math.abs(fa.delta)} yrs older` : 'On par'}
              <div className="fitage-vs">vs your age of {fa.age}</div>
            </div>
          </div>
          <div className="fitage-note">From resting HR + HRV vs typical for your age — an estimate, not medical.</div>
        </div>
      )}

      {/* SLEEP */}
      <h2 className="h3">Sleep</h2>
      <div className="health-card">
        {latest.sleep_duration_min != null ? (
          <>
            <div className="sleep-head">
              <div>
                <div className="hc-eyebrow">Last night</div>
                <div className="sleep-dur">{fmtSleep(latest.sleep_duration_min)}</div>
              </div>
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
            {sleepHrs.length >= 2 && (
              <div className="hc-trend"><span className="hc-trend-label">{sleepHrs.length}-day avg {avgSleep} h</span><Sparkline values={sleepHrs} color="var(--accent-2)" /></div>
            )}
          </>
        ) : (
          <button className="hc-note" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--accent)', textAlign: 'left' }} onClick={() => navigate('/tracking/wearables')}>
            No sleep data yet — connect a wearable or add it in daily metrics →
          </button>
        )}
      </div>

      {/* RECOVERY MARKERS */}
      <h2 className="h3" style={{ marginTop: 22 }}>Recovery markers</h2>
      <div className="health-card">
        <div className="marker-row">
          <div><div className="hc-eyebrow">HRV</div><div className="marker-val">{latest.hrv_ms != null ? latest.hrv_ms : '—'}<span> ms</span></div></div>
          {hrvSeries.length >= 2 && <Sparkline values={hrvSeries} color="#6FD3C4" />}
        </div>
        <div className="marker-row bordered">
          <div><div className="hc-eyebrow">Resting HR</div><div className="marker-val">{latest.resting_hr != null ? latest.resting_hr : '—'}<span> bpm</span></div></div>
          {rhrSeries.length >= 2 && <Sparkline values={rhrSeries} color="#E8836F" />}
        </div>
      </div>

      {/* TRAINING LOAD */}
      <h2 className="h3" style={{ marginTop: 22 }}>Training load</h2>
      <div className="health-card">
        <div className="hc-load-label" style={{ color: lv.color }}>{lv.label}</div>
        <div className="hc-note" style={{ marginTop: 4 }}>{lv.note}</div>
        {load && load.acwr != null && (
          <div className="stat-grid cols-3" style={{ marginTop: 14 }}>
            <div className="stat-card"><div className="l">Acute · 7d</div><div className="v">{load.acute}</div><div className="d">recent</div></div>
            <div className="stat-card"><div className="l">Chronic · 28d</div><div className="v">{load.chronic}</div><div className="d">baseline</div></div>
            <div className="stat-card"><div className="l">Ratio</div><div className="v" style={{ color: lv.color }}>{load.acwr.toFixed(2)}</div><div className="d">{lv.label}</div></div>
          </div>
        )}
      </div>

      {/* DETAIL */}
      <h2 className="h3" style={{ marginTop: 22 }}>Detail</h2>
      <div className="link-list">
        <LinkRow title="Daily metrics" sub="Sleep, HRV, resting HR, readiness — wearable + manual" onClick={() => navigate('/tracking/wearables')} />
        <LinkRow title="Trends" sub="Fitness age, recovery & activity over time" onClick={() => navigate('/tracking/trends')} badge={dailyMetrics.length >= 2 ? `${dailyMetrics.length} days` : null} />
        <LinkRow title="Training load" sub="Acute vs chronic load & how the plan adapts" onClick={() => navigate('/tracking/load')} badge={load && load.acwr != null ? load.acwr.toFixed(1) : null} />
        <LinkRow title="Injuries" sub={activeInjuries.length === 0 ? 'No current injuries' : activeInjuries.map(i => i.title || i.body_part || 'Injury').join(' · ')} badge={activeInjuries.length > 0 ? `${activeInjuries.length} active` : null} onClick={() => navigate('/tracking/injuries')} />
      </div>
    </>
  );
}
