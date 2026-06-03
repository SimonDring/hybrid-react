/**
 * Wearables / Daily metrics screen (under Tracking).
 *
 * READ-ONLY: data comes from the wearable (Fitbit via the Google Health API),
 * not manual entry. Where the wearable doesn't provide a readiness or sleep
 * score, we show an ESTIMATE derived from the underlying numbers (sleep
 * duration, HRV, resting HR) and mark it clearly until those metrics are
 * tightened up.
 */

import { useTrainingStore } from '../stores/trainingStore.js';
import { computeReadiness, readinessFor, sleepScoreFor } from '../lib/Readiness.js';

// A value box that shows "est" when the number is derived rather than measured.
function ScoreBox({ label, result, suffix }) {
  return (
    <div className="stat-card">
      <div className="l">{label}</div>
      <div className="v">
        {result ? result.score : '—'}
        {result?.estimated && <span className="est-tag">est</span>}
      </div>
      <div className="d">{result ? suffix : 'no data'}</div>
    </div>
  );
}

function Vital({ label, value, suffix }) {
  return (
    <div className="stat-card">
      <div className="l">{label}</div>
      <div className="v">{value ?? '—'}</div>
      <div className="d">{value != null ? suffix : ''}</div>
    </div>
  );
}

export default function Wearables() {
  const dailyMetrics = useTrainingStore(s => s.dailyMetrics);

  // Newest first, plus oldest-first for baseline look-ups.
  const desc = [...dailyMetrics].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const asc = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = desc[0] || null;

  // The ~7 days before a given row, for HRV/RHR baselines.
  const priorFor = (metric) => {
    const idx = asc.findIndex(m => m.id === metric.id);
    return idx > 0 ? asc.slice(Math.max(0, idx - 7), idx) : [];
  };

  const readiness = computeReadiness(dailyMetrics, []);
  const latestReadiness = latest ? readinessFor(latest, priorFor(latest)) : null;
  const latestSleep = latest ? sleepScoreFor(latest) : null;

  const recent = desc.slice(0, 7);

  return (
    <>
      <h1 className="h1">Daily metrics</h1>
      <p className="sub">Recovery and activity straight from your wearable. Readiness and sleep scores are estimated from the underlying data where your device doesn't supply them.</p>

      {!latest ? (
        <div className="callout amber">
          <strong>No data yet.</strong> Connect your wearable in Settings → Integrations, then sync to start seeing your recovery and activity here.
        </div>
      ) : (
        <>
          {/* TODAY */}
          <div className="dash-head">
            <h2 className="h3" style={{ marginBottom: 0 }}>{latest.date}</h2>
            <span className="dash-meta">{latest.source === 'fitbit' ? 'Fitbit' : 'Manual'}</span>
          </div>
          <div className="stat-grid cols-2" style={{ marginBottom: 10 }}>
            <ScoreBox label="Readiness" result={latestReadiness} suffix="/ 100" />
            <ScoreBox label="Sleep score" result={latestSleep} suffix="/ 100" />
          </div>
          <div className="stat-grid cols-3" style={{ marginBottom: 24 }}>
            <Vital label="Sleep" value={readiness.vitals.sleepHrs} suffix="hours" />
            <Vital label="HRV" value={readiness.vitals.hrv} suffix="ms" />
            <Vital label="Resting HR" value={readiness.vitals.rhr} suffix="bpm" />
            <Vital label="Steps" value={latest.steps ?? null} suffix="" />
            <Vital label="Active" value={latest.active_minutes ?? null} suffix="min" />
            <Vital label="SpO₂" value={latest.spo2_pct ?? null} suffix="%" />
          </div>

          {/* RECENT */}
          {recent.length > 1 && (
            <>
              <h2 className="h3">Recent</h2>
              <div className="link-list">
                {recent.map(d => {
                  const r = readinessFor(d, priorFor(d));
                  const s = sleepScoreFor(d);
                  return (
                    <div key={d.id} className="recent-row">
                      <div className="rr-date">{d.date}</div>
                      <div className="rr-metrics">
                        {[
                          r && `Readiness ${r.score}${r.estimated ? '~' : ''}`,
                          d.resting_hr != null && `RHR ${d.resting_hr}`,
                          d.hrv_ms != null && `HRV ${d.hrv_ms}`,
                          s && `Sleep ${s.score}${s.estimated ? '~' : ''}`
                        ].filter(Boolean).join(' · ') || 'No metrics'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="sub" style={{ marginTop: 12, fontSize: 11 }}>
                <strong>~</strong> = estimated from your underlying data, not measured directly.
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
