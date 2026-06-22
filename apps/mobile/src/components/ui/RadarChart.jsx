/**
 * RadarChart — a small, dependency-free SVG radar (spider) chart.
 *
 * Renders N axes generically (so any sport's pillar count just works) with up to
 * three overlaid series. The last series is treated as the primary ("you") and
 * gets value dots. Colours are passed in (theme vars) so it stays dark-mode safe.
 *
 *   labels: string[]                         one per axis
 *   series: [{ name, color, values[], fill?, dash?, width? }]   fill = 0..1 opacity
 *   max:    number (default 100)
 *   size:   number (svg width, default 300)
 */
export default function RadarChart({ labels, series, max = 100, size = 300 }) {
  const N = labels.length;
  if (!N) return null;
  const W = size, H = Math.round(size * 0.92);
  const PAD = 56;                        // horizontal gutter so side labels never clip
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) / 2 - 30;
  const levels = 4;

  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i, val) => {
    const rad = r * (val / max);
    return [cx + rad * Math.cos(ang(i)), cy + rad * Math.sin(ang(i))];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  const gridPoly = (f) => labels.map((_, i) => pt(i, max * f).join(',')).join(' ');
  const you = series[series.length - 1];

  return (
    <svg viewBox={`${-PAD} 0 ${W + PAD * 2} ${H}`} width="100%" role="img"
      aria-label={`Radar chart of ${labels.join(', ')}`} style={{ display: 'block' }}>
      {Array.from({ length: levels }, (_, l) => (
        <polygon key={`g${l}`} points={gridPoly((l + 1) / levels)} fill="none" stroke="var(--hairline)" strokeWidth="1" />
      ))}
      {labels.map((_, i) => {
        const [x, y] = pt(i, max);
        return <line key={`a${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1" />;
      })}
      {series.map((s, si) => (
        <polygon key={`s${si}`} points={poly(s.values)}
          fill={s.fill ? s.color : 'none'} fillOpacity={s.fill || 0}
          stroke={s.color} strokeWidth={s.width || 2}
          strokeDasharray={s.dash || 'none'} strokeLinejoin="round" />
      ))}
      {you.values.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={`d${i}`} cx={x} cy={y} r="2.6" fill={you.color} />;
      })}
      {labels.map((lab, i) => {
        const rad = r + 16;
        const x = cx + rad * Math.cos(ang(i));
        const y = cy + rad * Math.sin(ang(i));
        const c = Math.cos(ang(i));
        const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
        return (
          <text key={`l${i}`} x={x} y={y} fontSize="9" fill="var(--txt-muted)"
            textAnchor={anchor} dominantBaseline="middle">{lab}</text>
        );
      })}
    </svg>
  );
}
