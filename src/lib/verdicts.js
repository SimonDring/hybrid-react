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
  strong:   { tone: 'positive', label: 'Primed', headline: 'Primed — push today', note: "You're recovered. Good day to go hard." },
  moderate: { tone: 'caution',  label: 'Steady', headline: 'Train as planned',    note: 'Solid enough — train as planned and listen to your body.' },
  low:      { tone: 'strain',   label: 'Ease in', headline: 'Ease in today',      note: "Recovery's down. Keep it light or swap for easy work." },
  unknown:  { tone: 'neutral',  label: '—',      headline: 'How are you feeling?', note: 'Log a check-in or connect a wearable to see readiness.' }
};

export function readinessVerdict(readiness) {
  const status = (readiness && readiness.status) || 'unknown';
  const base = READINESS[status] || READINESS.unknown;
  return { ...base, color: TONE[base.tone] };
}

const LOAD = {
  sweet: { tone: 'positive', label: 'Balanced',     note: 'Right where you want to be — the plan stays as written.' },
  under: { tone: 'caution',  label: 'Light',        note: "Below your usual — there's room to build back up." },
  high:  { tone: 'caution',  label: 'High',         note: "You've ramped quickly — easing slightly this week." },
  over:  { tone: 'strain',   label: 'Overreaching', note: 'Well above baseline — easing off so you can absorb it.' }
};

export function loadVerdict(load, adaptation) {
  if (!load || load.acwr == null || !load.band) {
    return { tone: 'neutral', label: 'Building baseline', note: 'A few more sessions and your load trend appears here.', color: TONE.neutral };
  }
  const base = LOAD[load.band];
  if (!base) {
    return { tone: 'neutral', label: 'Steady', note: 'Your training load is steady.', color: TONE.neutral };
  }
  const note = (adaptation && !adaptation.reverted && adaptation.reason) ? adaptation.reason : base.note;
  return { tone: base.tone, label: base.label, note, color: TONE[base.tone] };
}
