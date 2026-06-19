// src/components/ui/ReadinessHero.jsx
// The Home hero: readiness as a verdict — score + plain-language headline only.
// Raw metrics (sleep/HRV/RHR) live one tap in, on the daily-metrics screen.
import { readinessVerdict } from '../../lib/verdicts.js';
import MetricRing from './MetricRing.jsx';

export default function ReadinessHero({ readiness, onOpen }) {
  const v = readinessVerdict(readiness);
  const score = readiness ? readiness.score : null;

  return (
    <button className="rhero" data-tone={v.tone} onClick={onOpen}>
      <span className="rhero-eyebrow">Readiness{readiness && readiness.estimated ? ' · estimate' : ''}</span>
      <span className="rhero-main">
        <MetricRing value={score ?? 0} size={104} stroke={6} color={v.color}>
          <span className="rhero-score">{score != null ? score : '—'}</span>
        </MetricRing>
        <span className="rhero-copy">
          <span className="rhero-headline">{v.headline}</span>
          <span className="rhero-note">{v.note}</span>
        </span>
      </span>
    </button>
  );
}
