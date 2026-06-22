// src/components/ui/Sparkline.jsx
// Minimal inline trend line. Needs ≥2 points; scales to its own min/max.
export default function Sparkline({ values, color = 'var(--accent-2)', width = 96, height = 34 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values), rng = (max - min) || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${(height - 3) - ((v - min) / rng) * (height - 6)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
