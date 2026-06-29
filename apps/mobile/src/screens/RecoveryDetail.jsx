/**
 * Recovery detail — behind the Health "Recovery" tile. Readiness (with its trend)
 * and the markers behind it: HRV and resting HR.
 */
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { computeReadiness } from '@performance-os/engine/lib/Readiness.js';
import { readinessVerdict, indexBandColor, confidenceNote } from '../lib/verdicts.js';
import MetricRing from '../components/ui/MetricRing.jsx';
import Sparkline from '../components/ui/Sparkline.jsx';

// Pretty labels for the Readiness Index contributors.
const IX_LABELS = {
  sleep: 'Sleep', cardio: 'Cardio recovery', wellness: 'Wellness', recovery: 'Recovery',
  fatigue: 'Freshness', trainingLoad: 'Training load', recoveryCapacity: 'Recovery capacity', consistency: 'Consistency'
};

export default function RecoveryDetail() {
  const navigate = useNavigate();
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);
  const logs = useTrainingStore(s => s.logs);
  const rdx = useTrainingStore(s => s.readiness);
  const readiness = computeReadiness(dailyMetrics, logs);
  const rv = readinessVerdict(readiness);
  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = sorted[sorted.length - 1] || {};
  const ser = (f) => sorted.map(m => Number(m[f])).filter(v => !isNaN(v)).slice(-14);
  const rd = ser('readiness_score'), hrv = ser('hrv_ms'), rhr = ser('resting_hr');

  if (dailyMetrics.length === 0) {
    return (
      <>
        <h1 className="h1">Recovery</h1>
        <p className="sub">No recovery data yet.</p>
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>Add metrics or connect a wearable →</strong>
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="h1">Recovery</h1>
      <p className="sub">Readiness and the markers behind it.</p>

      <div className="health-card">
        <div className="hc-top">
          <MetricRing value={readiness.score || 0} max={100} size={84} stroke={6} color={rv.color}>
            <span className="hc-score">{readiness.score != null ? readiness.score : '—'}</span>
          </MetricRing>
          <div className="hc-copy">
            <div className="hc-eyebrow">Readiness{readiness.estimated ? ' · estimate' : ''}</div>
            <div className="hc-headline">{rv.headline}</div>
            <div className="hc-note">{rv.note}</div>
          </div>
        </div>
        {rd.length >= 2 && (
          <div className="hc-trend"><span className="hc-trend-label">{rd.length}-day trend</span><Sparkline values={rd} color={rv.color} /></div>
        )}
      </div>

      <div className="health-card">
        <div className="marker-row">
          <div><div className="hc-eyebrow">HRV</div><div className="marker-val">{latest.hrv_ms != null ? latest.hrv_ms : '—'}<span> ms</span></div></div>
          {hrv.length >= 2 && <Sparkline values={hrv} color="#6FD3C4" />}
        </div>
        <div className="marker-row bordered">
          <div><div className="hc-eyebrow">Resting HR</div><div className="marker-val">{latest.resting_hr != null ? latest.resting_hr : '—'}<span> bpm</span></div></div>
          {rhr.length >= 2 && <Sparkline values={rhr} color="#E8836F" />}
        </div>
      </div>

      {rdx && rdx.contributors && rdx.contributors.length > 0 && (
        <div className="health-card">
          <div className="hc-eyebrow">
            Readiness Index{rdx.value != null ? ` · ${rdx.value}` : ''}{rdx.confidence != null ? ` · conf ${Math.round(rdx.confidence * 100)}%` : ''}
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {rdx.contributors.map(c => (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '110px 34px 1fr 40px', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--txt-muted)' }}>{IX_LABELS[c.name] || c.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: indexBandColor(c.band) }}>{c.value == null ? '—' : c.value}</span>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((c.confidence || 0) * 100)}%`, height: '100%', background: indexBandColor(c.band) }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--txt-muted)', textAlign: 'right' }}>{Math.round((c.confidence || 0) * 100)}%</span>
              </div>
            ))}
          </div>
          {rdx.missingInputs && rdx.missingInputs.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--txt-muted)', marginTop: 8 }}>missing: {rdx.missingInputs.join(', ')}</div>
          )}
          {confidenceNote(rdx.confidence) && (
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 6 }}>{confidenceNote(rdx.confidence)}</div>
          )}
        </div>
      )}
    </>
  );
}
