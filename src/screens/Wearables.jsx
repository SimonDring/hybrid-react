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
import { useAuthStore } from '../stores/authStore.js';
import { getFitbitAuthUrl } from '../lib/SyncService.js';
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
  const dailyMetrics            = useTrainingStore(s => s.dailyMetrics);
  const fitbitConnection        = useTrainingStore(s => s.fitbitConnection);
  const fitbitSyncing           = useTrainingStore(s => s.fitbitSyncing);
  const syncFitbitToday         = useTrainingStore(s => s.syncFitbitToday);
  const refreshFitbitConnection = useTrainingStore(s => s.refreshFitbitConnection);
  const user = useAuthStore(s => s.user);

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

  const connectFitbit = () => {
    if (!user) return;
    window.open(getFitbitAuthUrl(user.id), '_blank');
  };

  const lastSynced = fitbitConnection?.last_synced_at
    ? new Date(fitbitConnection.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const recent = desc.slice(0, 7);

  return (
    <>
      <h1 className="h1">Daily metrics</h1>
      <p className="sub">Recovery and activity straight from your wearable. Readiness and sleep scores are estimated from the underlying data where your device doesn't supply them.</p>

      {/* Fitbit connection panel */}
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginBottom: 20,
        border: '1px solid var(--hairline)', background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-strong)' }}>
              {fitbitConnection ? 'Fitbit connected' : 'Connect Fitbit'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-muted)', marginTop: 2 }}>
              {fitbitConnection
                ? (lastSynced ? `Last synced today at ${lastSynced}` : 'Not yet synced today')
                : 'Auto-fills sleep, HR, HRV, steps, and more'}
            </div>
          </div>
          {!fitbitConnection ? (
            <button onClick={connectFitbit} style={{
              padding: '8px 14px', borderRadius: 9, border: 'none',
              background: 'var(--rust)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Connect
            </button>
          ) : (
            <button
              onClick={syncFitbitToday}
              disabled={fitbitSyncing}
              style={{
                padding: '8px 14px', borderRadius: 9,
                border: '1px solid var(--hairline)', background: 'transparent',
                color: fitbitSyncing ? 'var(--txt-muted)' : 'var(--txt-strong)',
                fontSize: 13, fontWeight: 600, cursor: fitbitSyncing ? 'default' : 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {fitbitSyncing ? 'Syncing…' : 'Sync now'}
            </button>
          )}
        </div>
        {!fitbitConnection && (
          <button
            onClick={refreshFitbitConnection}
            style={{
              fontSize: 11, color: 'var(--txt-muted)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 8
            }}
          >
            Already connected? Tap to check status
          </button>
        )}
      </div>

      {!latest ? (
        <div className="callout amber">
          <strong>No data yet.</strong> Connect your Fitbit and sync to start seeing your recovery and activity here.
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
