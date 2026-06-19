// src/components/ui/ReadinessHero.jsx
// The Home hero: readiness as a verdict first, raw vitals demoted to faint evidence.
import { readinessVerdict, } from '../../lib/verdicts.js';
import { fmtSleep } from '../../lib/Readiness.js';
import MetricRing from './MetricRing.jsx';

export default function ReadinessHero({ readiness, onOpen }) {
  const v = readinessVerdict(readiness);
  const score = readiness ? readiness.score : null;
  const vitals = (readiness && readiness.vitals) || {};
  const evidence = [
    vitals.sleepMin != null ? `slept ${fmtSleep(vitals.sleepMin)}` : null,
    vitals.hrv != null ? `hrv ${vitals.hrv}` : null,
    vitals.rhr != null ? `rhr ${vitals.rhr}` : null
  ].filter(Boolean);

  return (
    <button className="rhero" data-tone={v.tone} style={{ '--tone': v.color }} onClick={onOpen}>
      <span className="rhero-glow" aria-hidden="true" />
      <span className="rhero-eyebrow">Readiness{readiness && readiness.estimated ? ' · estimate' : ''}</span>
      <span className="rhero-main">
        <MetricRing value={score ?? 0} size={104} stroke={6} color="var(--tone)">
          <span className="rhero-score">{score != null ? score : '—'}</span>
        </MetricRing>
        <span className="rhero-copy">
          <span className="rhero-headline">{v.headline}</span>
          <span className="rhero-note">{v.note}</span>
        </span>
      </span>
      {evidence.length > 0 && <span className="rhero-evidence">{evidence.join(' · ')}</span>}
    </button>
  );
}
