import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { computeReadiness } from '../lib/Readiness.js';

// One link row to a deep-dive screen.
function LinkRow({ title, sub, badge, onClick }) {
  return (
    <button className="link-row" onClick={onClick}>
      <div className="lr-body">
        <div className="lr-title">{title}</div>
        <div className="lr-sub">{sub}</div>
      </div>
      {badge && <span className="lr-badge">{badge}</span>}
      <svg className="lr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

export default function Tracking() {
  const navigate = useNavigate();
  const logs = useTrainingStore(state => state.logs);
  const injuries = useTrainingStore(state => state.injuries);
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);

  const readiness = computeReadiness(dailyMetrics, logs);
  const daysRecorded = dailyMetrics.length;
  const activeInjuries = injuries.filter(i =>
    i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring'
  );

  return (
    <>
      <h1 className="h1">Tracking</h1>
      <p className="sub">Your wearable recovery data at a glance — feeds plan adaptation when AI integration arrives.</p>

      {/* TODAY'S RECOVERY */}
      <div className="dash-head">
        <h2 className="h3" style={{ marginBottom: 0 }}>Today's recovery</h2>
        {readiness.score != null && (
          <span className="readiness-pill" style={{
            color: `var(--${readiness.accent})`,
            background: readiness.accent === 'moss' ? 'rgba(74,93,58,0.12)'
              : readiness.accent === 'rust' ? 'rgba(176,74,46,0.12)'
              : 'rgba(200,154,58,0.14)'
          }}>
            {readiness.estimated ? '~' : ''}{readiness.score}{readiness.estimated ? ' est' : ''}
          </span>
        )}
      </div>

      {dailyMetrics.length === 0 ? (
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>No recovery data yet.</strong> Add today's sleep, HRV and resting HR →
        </button>
      ) : (
        <div className="stat-grid cols-3" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="l">Sleep</div>
            <div className="v">{readiness.vitals.sleepHrs ?? '—'}</div>
            <div className="d">{readiness.vitals.sleepHrs != null ? 'hours' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="l">HRV</div>
            <div className="v">{readiness.vitals.hrv ?? '—'}</div>
            <div className="d">{readiness.vitals.hrv != null ? 'ms' : ''}</div>
          </div>
          <div className="stat-card">
            <div className="l">Resting HR</div>
            <div className="v">{readiness.vitals.rhr ?? '—'}</div>
            <div className="d">{readiness.vitals.rhr != null ? 'bpm' : ''}</div>
          </div>
        </div>
      )}

      <button className="full-btn" style={{ marginTop: 4 }} onClick={() => navigate('/tracking/wearables')}>
        {daysRecorded ? "Update today's metrics" : 'Add daily metrics'}
      </button>

      {/* ACTIVE INJURIES */}
      {activeInjuries.length > 0 && (
        <button className="callout" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block', marginTop: 18, borderLeftColor: 'var(--rust)' }} onClick={() => navigate('/tracking/injuries')}>
          <strong>{activeInjuries.length} active {activeInjuries.length === 1 ? 'injury' : 'injuries'}.</strong>{' '}
          {activeInjuries.map(i => i.title || i.body_part).filter(Boolean).join(' · ')} →
        </button>
      )}

      {/* DEEP DIVES */}
      <h2 className="h3" style={{ marginTop: 24 }}>Explore</h2>
      <div className="link-list">
        <LinkRow title="Trends" sub="Recovery & activity charts over time" onClick={() => navigate('/tracking/trends')} badge={daysRecorded >= 2 ? `${daysRecorded} days` : null} />
        <LinkRow title="Daily metrics" sub="Sleep, HRV, resting HR, readiness — manual + Fitbit" onClick={() => navigate('/tracking/wearables')} />
        <LinkRow title="Injury log" sub="Injuries, rehab plans, recovery" onClick={() => navigate('/tracking/injuries')} badge={activeInjuries.length ? `${activeInjuries.length} active` : null} />
      </div>
    </>
  );
}
