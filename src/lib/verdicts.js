/**
 * verdicts — turns engine signals (readiness, load) into a plain-language verdict
 * with a status tone + color token. Pure functions, no deps. Rule-based today;
 * the AI coach can replace the copy behind this same interface later.
 */

export const TONE = {
  positive: 'var(--status-positive)',
  caution: 'var(--status-caution)',
  strain: 'var(--status-strain)',
  neutral: 'var(--txt-muted)'
};

const READINESS = {
  strong:   { tone: 'positive', headline: 'Primed — push today', note: "You're recovered. Good day to go hard." },
  moderate: { tone: 'caution',  headline: 'Train as planned',    note: 'Solid enough — train as planned and listen to your body.' },
  low:      { tone: 'strain',   headline: 'Ease in today',       note: "Recovery's down. Keep it light or swap for easy work." },
  unknown:  { tone: 'neutral',  headline: 'How are you feeling?', note: 'Log a check-in or connect a wearable to see readiness.' }
};

export function readinessVerdict(readiness) {
  const status = (readiness && readiness.status) || 'unknown';
  const base = READINESS[status] || READINESS.unknown;
  return { ...base, color: TONE[base.tone] };
}
