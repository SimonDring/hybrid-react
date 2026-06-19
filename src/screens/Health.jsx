/**
 * Health — recovery + training load in detail. The wearable/recovery and
 * acute:chronic-load content that used to sit low on Progress now lives here as a
 * dedicated tab: a readiness verdict + vitals + trend, the load breakdown, and
 * links to the deep metric/trend/injury screens.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { computeReadiness, fmtSleep } from '../lib/Readiness.js';
import { readinessVerdict, loadVerdict } from '../lib/verdicts.js';
import MetricRing from '../components/ui/MetricRing.jsx';
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
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);
  const load = useTrainingStore(s => s.load);
  const adaptation = useTrainingStore(s => s.adaptation);
  const injuries = useTrainingStore(s => s.injuries);

  const readiness = computeReadiness(dailyMetrics, logs);
  const rv = readinessVerdict(readiness);
  const lv = loadVerdict(load, adaptation);
  const vitals = readiness.vitals || {};
  const hasVitals = vitals.sleepMin != null || vitals.hrv != null || vitals.rhr != null;
  const recScores = (dailyMetrics || []).map(m => Number(m.readiness_score)).filter(v => !isNaN(v)).slice(-14);
  const recAvg = recScores.length ? Math.round(recScores.reduce((a, b) => a + b, 0) / recScores.length) : null;
  const activeInjuries = (injuries || []).filter(i => ['active', 'rehabbing', 'monitoring'].includes(i.status));

  return (
    <>
      <h1 className="h1">Health</h1>
      <p className="sub">Recovery and training load, in detail.</p>

      {/* RECOVERY */}
      {dailyMetrics.length === 0 ? (
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>No recovery data yet.</strong> Connect a wearable or add today's sleep, HRV and resting HR →
        </button>
      ) : (
        <div className="health-card">
          <div className="hc-top">
            <MetricRing value={readiness.score || 0} max={100} size={88} stroke={6} color={rv.color}>
              <span className="hc-score">{readiness.score != null ? readiness.score : '—'}</span>
            </MetricRing>
            <div className="hc-copy">
              <div className="hc-eyebrow">Readiness{readiness.estimated ? ' · estimate' : ''}</div>
              <div className="hc-headline">{rv.headline}</div>
              <div className="hc-note">{rv.note}</div>
            </div>
          </div>
          {hasVitals && (
            <div className="vitals-row">
              <div className="vital"><div className="v-label">Sleep</div><div className="v-val">{vitals.sleepMin != null ? fmtSleep(vitals.sleepMin) : '—'}</div></div>
              <div className="vital"><div className="v-label">HRV</div><div className="v-val">{vitals.hrv != null ? `${vitals.hrv} ms` : '—'}</div></div>
              <div className="vital"><div className="v-label">Resting HR</div><div className="v-val">{vitals.rhr != null ? `${vitals.rhr} bpm` : '—'}</div></div>
            </div>
          )}
          {recScores.length >= 2 && (
            <div className="hc-trend">
              <span className="hc-trend-label">{recScores.length}-day readiness · avg {recAvg}</span>
              <Sparkline values={recScores} color="var(--accent-2)" />
            </div>
          )}
        </div>
      )}

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
        <LinkRow title="Trends" sub="Recovery & activity over time" onClick={() => navigate('/tracking/trends')} badge={dailyMetrics.length >= 2 ? `${dailyMetrics.length} days` : null} />
        <LinkRow title="Training load" sub="Acute vs chronic load & how the plan adapts" onClick={() => navigate('/tracking/load')} badge={load && load.acwr != null ? load.acwr.toFixed(1) : null} />
        <LinkRow title="Injuries" sub={activeInjuries.length === 0 ? 'No current injuries' : activeInjuries.map(i => i.title || i.body_part || 'Injury').join(' · ')} badge={activeInjuries.length > 0 ? `${activeInjuries.length} active` : null} onClick={() => navigate('/tracking/injuries')} />
      </div>
    </>
  );
}
