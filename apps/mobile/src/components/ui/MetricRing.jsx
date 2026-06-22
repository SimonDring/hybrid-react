// src/components/ui/MetricRing.jsx
// Reusable circular progress ring. value/max drives the arc; children render centered.
export default function MetricRing({
  value = 0, max = 100, size = 132, stroke = 7,
  color = 'var(--accent)', trackColor = 'rgba(255,255,255,0.08)', children
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (Number(value) || 0) / max));
  const offset = circ * (1 - pct);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {value != null && (
          <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} />
        )}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
