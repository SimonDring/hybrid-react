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

// Theme colour for a derived-index band (green/amber/red) → real tokens.
export const INDEX_BAND_COLOR = { green: 'var(--moss)', amber: 'var(--ochre)', red: 'var(--rust)' };
export function indexBandColor(band) { return INDEX_BAND_COLOR[band] || 'var(--txt-muted)'; }

// A short confidence caveat for a 0–1 index confidence; null when confidence is high
// (no caveat needed) or absent. Drives "how much to trust this" copy under readiness.
export function confidenceNote(confidence) {
  if (confidence == null) return null;
  const p = Math.round(confidence * 100);
  if (p >= 70) return null;
  if (p >= 40) return `Moderate confidence · ${p}%`;
  return `Low confidence · ${p}% — log more to sharpen this`;
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

// FORM: plain-language read of computeForm()'s {ctl,atl,tsb,band,confidence,rationale}
// (packages/engine). 'fresh' = positive TSB (recovered, good day to push); 'fatigued' =
// negative TSB (carrying fatigue, ease off); 'neutral' = balanced form — reads as caution/
// steady content-wise, distinct from the true no-data 'neutral' tone used when band is null.
const FORM = {
  fresh:    { tone: 'positive', label: 'Fresh',    headline: 'Fresh — good day to push',   note: "Your form's up — you're recovered. Good day to push." },
  neutral:  { tone: 'caution',  label: 'Balanced', headline: 'Balanced — train as planned', note: 'Your form is steady — train as planned.' },
  fatigued: { tone: 'strain',   label: 'Fatigued', headline: 'Fatigued — ease off today',   note: "Your form's negative — you're carrying fatigue. Ease off and let it absorb." }
};

export function formVerdict(form) {
  const band = form && form.band;
  const base = FORM[band];
  if (!base) {
    return {
      tone: 'neutral',
      label: 'Building baseline',
      headline: 'Building your baseline',
      note: 'A few more sessions and your form trend appears here.',
      color: TONE.neutral
    };
  }
  let note = base.note;
  if (form.confidence != null && form.confidence < 0.5) {
    const caveat = confidenceNote(form.confidence);
    if (caveat) note = `${note} ${caveat}`;
  }
  return { tone: base.tone, label: base.label, headline: base.headline, note, color: TONE[base.tone] };
}
