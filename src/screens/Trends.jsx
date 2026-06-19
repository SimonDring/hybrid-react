import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '../stores/trainingStore.js';
import { fitnessAge } from '../lib/fitnessAge.js';

// Midnight line chart: subtle grid, soft area fill, emphasised latest point.
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
  const w = rect.width, h = rect.height, pad = 18;
  ctx.clearRect(0, 0, w, h);
  const values = data.filter(v => !isNaN(v));
  if (values.length === 0) return;
  const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
  const xAt = (i) => pad + (w - 2 * pad) * (values.length > 1 ? i / (values.length - 1) : 0.5);
  const yAt = (v) => h - pad - (h - 2 * pad) * ((v - min) / range);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + (h - 2 * pad) * (i / 3);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  if (values.length > 1) {
    ctx.beginPath();
    values.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.lineTo(xAt(values.length - 1), h - pad);
    ctx.lineTo(xAt(0), h - pad);
    ctx.closePath();
    ctx.fillStyle = hexA(color, 0.12);
    ctx.fill();
  }
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  values.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();
  const lx = xAt(values.length - 1), ly = yAt(values[values.length - 1]);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.35); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.stroke();
}

const CHARTS = [
  { field: 'readiness_score', tab: 'Readiness', label: 'Readiness', unit: '', color: '#6FD3C4', higherIsBetter: true,
    up: 'Recovery is improving — you’re absorbing training well.', down: 'Recovery is slipping — watch fatigue and sleep.' },
  { field: 'hrv_ms', tab: 'HRV', label: 'HRV', unit: ' ms', color: '#6FD3C4', higherIsBetter: true,
    up: 'Higher HRV points to better recovery capacity.', down: 'Lower HRV can signal accumulating fatigue or stress.' },
  { field: 'resting_hr', tab: 'Resting HR', label: 'Resting HR', unit: ' bpm', color: '#E8836F', higherIsBetter: false,
    up: 'An elevated resting heart rate can flag fatigue, illness or stress.', down: 'A lower resting heart rate points to improving aerobic fitness.' },
  { field: 'sleep_duration_min', tab: 'Sleep', label: 'Sleep', unit: ' h', color: '#97A6FF', higherIsBetter: true, transform: v => Math.round((v / 60) * 10) / 10,
    up: 'More sleep — strong support for recovery and adaptation.', down: 'Less sleep lately — protect recovery by prioritising it.' },
  { field: 'steps', tab: 'Steps', label: 'Steps', unit: '', color: '#F2C14E', higherIsBetter: true,
    up: 'More daily movement than before.', down: 'Less daily movement than before.' }
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
  const [metric, setMetric] = useState('readiness_score');
  const canvasRef = useRef(null);
  const fa = fitnessAge(profile, dailyMetrics);

  const sorted = [...dailyMetrics].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const days = RANGES.find(r => r.id === range).days;
  const displayMetrics = days === Infinity ? sorted : sorted.slice(-days);
  const rangeLabel = RANGES.find(r => r.id === range).label;

  const seriesFor = (c) => displayMetrics
    .map(m => (m[c.field] == null ? NaN : (c.transform ? c.transform(m[c.field]) : m[c.field])))
    .filter(v => !isNaN(v));

  const available = CHARTS.filter(c => seriesFor(c).length > 0);
  const sel = available.find(c => c.field === metric) || available[0] || null;

  useEffect(() => {
    if (sel) drawChart(canvasRef.current, seriesFor(sel), sel.color);
  }, [sel, range, displayMetrics]);

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

  const data = sel ? seriesFor(sel) : [];
  const current = data.length ? data[data.length - 1] : null;
  const avg = data.length ? Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 10) / 10 : null;
  const lo = data.length ? Math.min(...data) : null;
  const hi = data.length ? Math.max(...data) : null;
  const delta = data.length > 1 ? Math.round((current - data[0]) * 10) / 10 : null;
  const improving = delta == null || delta === 0 ? null : (sel.higherIsBetter ? delta > 0 : delta < 0);
  const deltaColor = delta == null || delta === 0 ? 'var(--txt-muted)' : (improving ? 'var(--status-positive)' : 'var(--status-strain)');
  const arrow = delta == null || delta === 0 ? '' : (delta > 0 ? '↑' : '↓');
  const context = sel && (delta == null || delta === 0
    ? `Holding steady over the last ${rangeLabel}.`
    : `Trending ${delta > 0 ? 'up' : 'down'} over the last ${rangeLabel}. ${delta > 0 ? sel.up : sel.down}`);

  return (
    <>
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

      {/* METRIC SELECTOR BANNER */}
      <div className="metric-tabs">
        {available.map(c => (
          <button key={c.field} className={`metric-tab${sel && sel.field === c.field ? ' active' : ''}`} onClick={() => setMetric(c.field)}>
            {c.tab}
          </button>
        ))}
      </div>

      {sel ? (
        <div className="metric-detail">
          <div className="md-head">
            <div>
              <div className="md-label">{sel.label}</div>
              <div className="md-value">{current}<span>{sel.unit}</span></div>
            </div>
            {delta != null && delta !== 0 && (
              <div className="md-delta" style={{ color: deltaColor }}>
                {arrow} {Math.abs(delta)}{sel.unit}
                <div className="md-delta-sub">vs {rangeLabel} ago</div>
              </div>
            )}
          </div>

          <div className="md-stats">
            <span>avg {avg}{sel.unit}</span>
            <span>range {lo}–{hi}{sel.unit}</span>
          </div>

          <div className="trend-range" style={{ margin: '10px 0' }}>
            {RANGES.map(r => (
              <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
            ))}
          </div>

          <canvas className="md-chart" ref={canvasRef} />

          <div className="md-context">{context}</div>
        </div>
      ) : (
        <div className="callout amber"><strong>Not enough data in this range.</strong> Try a wider range, or sync more days.</div>
      )}
    </>
  );
}
