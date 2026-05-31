import { useTrainingStore } from '../stores/trainingStore.js';

function latestValue(logs, field) {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i][field] !== '' && logs[i][field] != null) return logs[i][field];
  }
  return null;
}

function trend(logs, field) {
  const values = logs.map(l => parseFloat(l[field])).filter(v => !isNaN(v));
  if (values.length < 2) return null;
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const delta = latest - previous;
  if (Math.abs(delta) < 0.01) return null;
  return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
}

export default function Metrics() {
  const logs = useTrainingStore(state => state.logs);

  if (logs.length === 0) {
    return (
      <>
        <h1 className="h1">Key metrics</h1>
        <p className="sub">Log a weekly check-in to see your metrics here.</p>
      </>
    );
  }

  const metrics = [
    { label: 'Bodyweight', field: 'bw', unit: 'kg' },
    { label: 'Resting HR', field: 'rhr', unit: 'bpm' },
    { label: 'Avg RPE', field: 'rpe', unit: '/10' },
    { label: 'Sleep', field: 'sleep', unit: '/10' },
    { label: 'Knee', field: 'knee', unit: '/10' }
  ];

  return (
    <>
      <h1 className="h1">Key metrics</h1>
      <p className="sub">Latest values from your check-ins. Trend shows change from previous week.</p>

      <div className="stat-grid">
        {metrics.map(m => {
          const v = latestValue(logs, m.field);
          const t = trend(logs, m.field);
          return (
            <div key={m.field} className="stat-card">
              <div className="l">{m.label}</div>
              <div className="v">{v != null ? v : '—'}</div>
              <div className="d">{v != null ? m.unit : ''}{t && <span style={{ marginLeft: 6, color: 'var(--muted)' }}>{t}</span>}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
