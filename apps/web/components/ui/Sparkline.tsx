import { cn } from "@/lib/cn";

/** Minimal SVG sparkline for the small readiness/load trends in the drawer. */
export function Sparkline({
  data,
  className = "text-accent-2",
  width = 132,
  height = 40,
  fill = true,
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (data.length < 2) {
    return <span className="text-xs text-soft">Not enough data</span>;
  }
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - 2 * pad);

  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const lastX = x(data.length - 1);
  const lastY = y(data[data.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn(className)}
      aria-hidden
    >
      {fill && (
        <polygon points={area} fill="currentColor" fillOpacity={0.12} />
      )}
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
