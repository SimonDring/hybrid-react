// src/components/ui/LineChart.jsx
// Reusable Midnight canvas line chart: subtle grid, soft area fill, emphasised
// latest point. Canvas can't read CSS vars, so `color` must be a hex string.
import { useEffect, useRef } from 'react';

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export default function LineChart({ values, color = '#6FD3C4', height = 180 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height, pad = 18;
    ctx.clearRect(0, 0, w, h);
    const vals = (values || []).filter(v => !isNaN(v));
    if (vals.length === 0) return;
    const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
    const xAt = (i) => pad + (w - 2 * pad) * (vals.length > 1 ? i / (vals.length - 1) : 0.5);
    const yAt = (v) => h - pad - (h - 2 * pad) * ((v - min) / range);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad + (h - 2 * pad) * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }
    if (vals.length > 1) {
      ctx.beginPath();
      vals.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.lineTo(xAt(vals.length - 1), h - pad);
      ctx.lineTo(xAt(0), h - pad);
      ctx.closePath();
      ctx.fillStyle = hexA(color, 0.12);
      ctx.fill();
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    vals.forEach((v, i) => { const x = xAt(i), y = yAt(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
    const lx = xAt(vals.length - 1), ly = yAt(vals[vals.length - 1]);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(color, 0.35); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.stroke();
  }, [values, color]);

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />;
}
