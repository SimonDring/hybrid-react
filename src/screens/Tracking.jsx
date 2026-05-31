import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';

export default function Tracking() {
  const navigate = useNavigate();
  const logs = useTrainingStore(state => state.logs);
  const injuries = useTrainingStore(state => state.injuries);
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const activeInjuries = injuries.filter(i => i.status === 'active' || i.status === 'rehabbing' || i.status === 'monitoring');

  const sections = [
    {
      title: 'Weekly check-in',
      sub: 'Bodyweight, RHR, RPE, sleep, knee',
      path: '/tracking/checkin',
      badge: latestLog ? `Last: ${latestLog.date}` : 'Not logged yet'
    },
    {
      title: 'Daily metrics',
      sub: 'Sleep, HRV, resting HR, readiness',
      path: '/tracking/wearables',
      badge: 'Manual + Fitbit-ready'
    },
    {
      title: 'Injury log',
      sub: 'Injuries, rehab plans, recovery',
      path: '/tracking/injuries',
      badge: activeInjuries.length > 0 ? `${activeInjuries.length} active` : 'None active'
    },
    {
      title: 'Key metrics',
      sub: 'Latest snapshot across all sources',
      path: '/tracking/metrics',
      badge: logs.length > 0 ? `${logs.length} entries` : null
    },
    {
      title: 'Trends',
      sub: 'Multi-metric charts over time',
      path: '/tracking/trends',
      badge: null
    },
    {
      title: 'Log history',
      sub: 'All past check-ins with edit/delete',
      path: '/tracking/log',
      badge: null
    }
  ];

  return (
    <>
      <h1 className="h1">Tracking</h1>
      <p className="sub">
        Weekly check-ins, wearable data, and progress trends. When AI integration arrives, this data feeds directly into plan adaptation.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sections.map(s => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--hairline)',
              borderRadius: 14,
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt-strong)', marginBottom: 2 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{s.sub}</div>
              {s.badge && (
                <div style={{
                  display: 'inline-block',
                  marginTop: 5,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'var(--bg-surface-2)',
                  color: 'var(--txt-muted)'
                }}>
                  {s.badge}
                </div>
              )}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, opacity: 0.3, flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </>
  );
}
