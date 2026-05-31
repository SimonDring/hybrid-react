import { useEffect, useRef, useState } from 'react';
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

const CHARTS = [
  { field: 'bw', label: 'Bodyweight (kg)', color: '#b04a2e' },
  { field: 'rhr', label: 'Resting HR (bpm)', color: '#c89a3a' },
  { field: 'sleep', label: 'Sleep score', color: '#4a5d3a' },
  { field: 'rpe', label: 'Avg RPE', color: '#7a5d3a' },
  { field: 'knee', label: 'Knee rating', color: '#7a3a4a' }
];

export default function Trends() {
  const logs = useTrainingStore(state => state.logs);
  const [range, setRange] = useState('12w');
  const canvasRefs = useRef({});

  // Filter logs by range
  let displayLogs = logs;
  if (range === '4w') displayLogs = logs.slice(-4);
  else if (range === '12w') displayLogs = logs.slice(-12);

  useEffect(() => {
    CHARTS.forEach(c => {
      const canvas = canvasRefs.current[c.field];
      const data = displayLogs.map(l => parseFloat(l[c.field])).filter(v => !isNaN(v));
      drawChart(canvas, data, c.color);
    });
  }, [displayLogs, range]);

  if (logs.length === 0) {
    return (
      <>
        <h1 className="h1">Trends</h1>
        <p className="sub">Log at least 2 weekly check-ins to see trends.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="h1">Trends</h1>
      <p className="sub">Track your metrics across time. {logs.length} check-ins logged.</p>

      <div className="chart-filter" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button className={range === '4w' ? 'active' : ''} onClick={() => setRange('4w')}>4 wks</button>
        <button className={range === '12w' ? 'active' : ''} onClick={() => setRange('12w')}>12 wks</button>
        <button className={range === 'all' ? 'active' : ''} onClick={() => setRange('all')}>All</button>
      </div>

      {CHARTS.map(c => {
        const data = displayLogs.map(l => parseFloat(l[c.field])).filter(v => !isNaN(v));
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
