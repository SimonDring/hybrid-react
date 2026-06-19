import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fitnessAge } from '../lib/fitnessAge.js';

// Midnight line chart: subtle grid, soft area fill, emphasised latest point.
// Canvas can't read CSS vars, so colours are passed as hex.
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function drawChart(canvas, data, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height, pad = 16;
  ctx.clearRect(0, 0, w, h);
  const values = data.filter(v => !isNaN(v));
  if (values.length === 0) return;
  const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
  const xAt = (i) => pad + (w - 2 * pad) * (values.length > 1 ? i / (values.length - 1) : 0.5);
  const yAt = (v) => h - pad - (h - 2 * pad) * ((v - min) / range);

  // Grid (light on dark)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + (h - 2 * pad) * (i / 3);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  // Soft area fill
  if (values.length > 1) {
    ctx.beginPath();
    values.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.lineTo(xAt(values.length - 1), h - pad);
    ctx.lineTo(xAt(0), h - pad);
    ctx.closePath();
    ctx.fillStyle = hexA(color, 0.12);
    ctx.fill();
  }

  // Line
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  values.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  // Latest point emphasised
  const lx = xAt(values.length - 1), ly = yAt(values[values.length - 1]);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.35); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.stroke();
}

// higherIsBetter drives whether an upward delta reads as good (teal) or bad (coral).
const CHARTS = [
  { field: 'readiness_score', label: 'Readiness', unit: '', color: '#6FD3C4', higherIsBetter: true },
  { field: 'hrv_ms', label: 'HRV', unit: ' ms', color: '#6FD3C4', higherIsBetter: true },
  { field: 'resting_hr', label: 'Resting HR', unit: ' bpm', color: '#E8836F', higherIsBetter: false },
  { field: 'sleep_duration_min', label: 'Sleep', unit: ' h', color: '#97A6FF', higherIsBetter: true, transform: v => Math.round((v / 60) * 10) / 10 },
  { field: 'steps', label: 'Steps', unit: '', color: '#F2C14E', higherIsBetter: true }
];

const RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: 'all', label: 'All', days: Infinity }
];

export default function Trends() {
  const navigate = useNavigate();
  const dailyMetrics = useTrainingStore(state => state.dailyMetrics);
  const profile = useTrainingStore(state => state.profile);
  const [range, setRange] = useState('30d');
  const canvasRefs = useRef({});
  const fa = fitnessAge(profile, dailyMetrics);

  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const days = RANGES.find(r => r.id === range).days;
  const displayMetrics = days === Infinity ? sorted : sorted.slice(-days);

  const seriesFor = (c) => displayMetrics
    .map(m => (m[c.field] == null ? NaN : (c.transform ? c.transform(m[c.field]) : m[c.field])))
    .filter(v => !isNaN(v));

  useEffect(() => {
    CHARTS.forEach(c => drawChart(canvasRefs.current[c.field], seriesFor(c), c.color));
  }, [displayMetrics, range]);

  if (dailyMetrics.length === 0) {
    return (
      <>
        <h1 className="h1">Trends</h1>
        <p className="sub">No wearable data yet. Sync your wearable or add daily metrics to see trends.</p>
        <button className="callout amber" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }} onClick={() => navigate('/tracking/wearables')}>
          <strong>Add daily metrics →</strong>
        </button>
      </>
    );
  }

  const hasAny = CHARTS.some(c => seriesFor(c).length > 0);

  return (
    <>
      <h1 className="h1">Trends</h1>
      <p className="sub">Recovery and activity from your wearable. {dailyMetrics.length} day{dailyMetrics.length !== 1 ? 's' : ''} recorded.</p>

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
          <div className="fitage-note">
            Estimated from your resting HR{fa.rhr ? ` (${fa.rhr} bpm)` : ''} and HRV{fa.hrv ? ` (${fa.hrv} ms)` : ''} versus typical for your age — directional, not medical.
          </div>
        </div>
      )}

      <div className="trend-range">
        {RANGES.map(r => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
        ))}
      </div>

      {!hasAny && (
        <div className="callout amber"><strong>Not enough data in this range.</strong> Try a wider range, or sync more days.</div>
      )}

      {CHARTS.map(c => {
        const data = seriesFor(c);
        if (data.length === 0) return null;
        const current = data[data.length - 1];
        const avg = Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 10) / 10;
        const delta = data.length > 1 ? Math.round((current - data[0]) * 10) / 10 : null;
        const improving = delta == null ? null : (c.higherIsBetter ? delta > 0 : delta < 0);
        const deltaColor = delta == null || delta === 0 ? 'var(--txt-muted)' : (improving ? 'var(--status-positive)' : 'var(--status-strain)');
        const arrow = delta == null || delta === 0 ? '' : (delta > 0 ? '↑' : '↓');
        return (
          <div key={c.field} className="trend-card">
            <div className="trend-head">
              <div>
                <div className="trend-label">{c.label}</div>
                <div className="trend-meta">
                  {delta != null && delta !== 0 && (
                    <span className="trend-delta" style={{ color: deltaColor }}>{arrow} {Math.abs(delta)}{c.unit}</span>
                  )}
                  <span className="trend-avg">avg {avg}{c.unit}</span>
                </div>
              </div>
              <div className="trend-val">{current}<span>{c.unit}</span></div>
            </div>
            <canvas className="trend-chart" ref={el => canvasRefs.current[c.field] = el} />
          </div>
        );
      })}
    </>
  );
}
