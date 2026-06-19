// src/components/ui/RingTile.jsx
// Compact metric tile: eyebrow label, a ring with a center value, and a one-word
// verdict beneath. Used side-by-side for readiness + training load on Home.
import MetricRing from './MetricRing.jsx';

export default function RingTile({ eyebrow, value, fill = 0, max = 100, color = 'var(--accent)', verdict, onClick }) {
  return (
    <button className="ring-tile" onClick={onClick}>
      <span className="rt-eyebrow">{eyebrow}</span>
      <MetricRing value={fill} max={max} size={96} stroke={6} color={color}>
        <span className="rt-value">{value}</span>
      </MetricRing>
      <span className="rt-verdict" style={{ color }}>{verdict}</span>
    </button>
  );
}
