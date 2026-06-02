import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';

// Draws a simple line chart on a canvas given numeric data points
function drawChart(canvas, data, color) {
  if (!canvas || data.length === 0) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = 20;

  ctx.clearRect(0, 0, w, h);

  const values = data.filter(v => !isNaN(v));
  if (values.length === 0) return;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Background grid
  ctx.strokeStyle = 'rgba(14,20,16,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (h - 2 * pad) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Plot line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + (w - 2 * pad) * (values.length > 1 ? i / (values.length - 1) : 0.5);
    const y = h - pad - (h - 2 * pad) * ((v - min) / range);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = color;
  values.forEach((v, i) => {
    const x = pad + (w - 2 * pad) * (values.length > 1 ? i / (values.length - 1) : 0.5);
    const y = h - pad - (h - 2 * pad) * ((v - min) / range);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Wearable (daily_metrics) charts. `transform` adapts the stored unit for display.
const CHARTS = [
  { field: 'readiness_score', label: 'Readiness', color: '#4a5d3a' },
  { field: 'hrv_ms', label: 'HRV (ms)', color: '#4a5d3a' },
  { field: 'resting_hr', label: 'Resting HR (bpm)', color: '#c89a3a' },
  { field: 'sleep_duration_min', label: 'Sleep (hours)', color: '#2a3a44', transform: v => Math.round((v / 60) * 10) / 10 },
  { field: 'steps', label: 'Steps', color: '#b04a2e' }
];

const RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: 'all', label: 'All', days: Infinity }
];

export default function Trends() {
  const navigate = useNavigate();
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);
  const [range, setRange] = useState('30d');
  const canvasRefs = useRef({});

  // Oldest → newest, so the line reads left-to-right in time order.
  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const days = RANGES.find(r => r.id === range).days;
  const displayMetrics = days === Infinity ? sorted : sorted.slice(-days);

  useEffect(() => {
    CHARTS.forEach(c => {
      const canvas = canvasRefs.current[c.field];
      const data = displayMetrics
        .map(m => (m[c.field] == null ? NaN : (c.transform ? c.transform(m[c.field]) : m[c.field])))
        .filter(v => !isNaN(v));
      drawChart(canvas, data, c.color);
    });
  }, [displayMetrics, range]);

  if (dailyMetrics.length === 0) {
    return (
      <>
        <h1 className="h1">Trends</h1>
        <p className="sub">No wearable data yet. Sync your Fitbit or add daily metrics to see trends.</p>
        <button className="full-btn" onClick={() => navigate('/tracking/wearables')}>Add daily metrics</button>
      </>
    );
  }

  const hasAny = CHARTS.some(c => displayMetrics.some(m => m[c.field] != null));

  return (
    <>
      <h1 className="h1">Trends</h1>
      <p className="sub">Recovery and activity from your wearable. {dailyMetrics.length} day{dailyMetrics.length !== 1 ? 's' : ''} recorded.</p>

      <div className="chart-filter" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {RANGES.map(r => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
        ))}
      </div>

      {!hasAny && (
        <div className="callout">
          <strong>Not enough data in this range.</strong> Try a wider range, or sync more days from your wearable.
        </div>
      )}

      {CHARTS.map(c => {
        const data = displayMetrics
          .map(m => (m[c.field] == null ? NaN : (c.transform ? c.transform(m[c.field]) : m[c.field])))
          .filter(v => !isNaN(v));
        if (data.length === 0) return null;
        return (
          <div key={c.field} className="chart-card">
            <h5>{c.label}</h5>
            <canvas
              ref={el => canvasRefs.current[c.field] = el}
              style={{ width: '100%', height: 120, display: 'block' }}
            />
          </div>
        );
      })}
    </>
  );
}
