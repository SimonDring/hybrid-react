/**
 * Readiness — turns the latest daily_metrics row into a plain-language status.
 *
 * Pure functions, no side effects, no other-module dependencies (like Utils.js).
 *
 * This is the "translate stats into words" layer the Today screen renders from,
 * and the surface the AI coach will eventually write to (it just sets a
 * readiness_score + headline). Until then we show a real number when the
 * wearable/manual entry has one, a clearly-labelled ESTIMATE when we can only
 * derive it, and a friendly prompt when there's no data at all.
 *
 * IMPORTANT: the Google Health API does NOT return a readiness score (and often
 * not a sleep score), so in practice the estimate path below is what runs until
 * the user enters a readiness value manually. See memory/reference for details.
 */

// Status → which approved theme accent token to colour the hero with.
const ACCENT = { strong: 'moss', moderate: 'ochre', low: 'rust', unknown: 'ochre' };

// Plain-language copy per status. note = the supporting "what to do" line.
const COPY = {
  strong: {
    headline: 'Recovery looks solid',
    note: "Good day to push — you're recovered for the hard session."
  },
  moderate: {
    headline: 'Steady — train as planned',
    note: "You're in decent shape. Train as planned and listen to your body."
  },
  low: {
    headline: 'Ease in today',
    note: "Recovery's down. Keep it light, or swap for mobility or easy work."
  },
  unknown: {
    headline: 'How are you feeling?',
    note: 'Connect Fitbit or log a morning check-in to see your readiness.'
  }
};

// Map a 0-100 score to a status band.
function bandFromScore(score) {
  if (score >= 70) return 'strong';
  if (score >= 50) return 'moderate';
  return 'low';
}

// Clamp a number into [0, 100].
function clamp100(n) {
  return Math.max(0, Math.min(100, n));
}

// Average of an array of numbers, or null if empty.
function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Derive a rough 0-100 readiness from the metrics the wearable DOES provide:
 * sleep duration, HRV (vs recent baseline), and resting HR (vs recent baseline).
 * Returns null if none of the three inputs are available.
 *
 * @param {object} latest  the most recent daily_metrics row
 * @param {object[]} prior up to ~7 days of metrics BEFORE `latest`, newest first
 * @param {object|null} weights optional { sleep, hrv, rhr } importance values; null = equal weights
 */
function deriveScore(latest, prior, weights = null) {
  const parts = [];

  // Sleep: target ~8h (480 min). Linear up to the target.
  if (latest.sleep_duration_min != null) {
    parts.push({ key: 'sleep', v: clamp100((latest.sleep_duration_min / 480) * 100) });
  }

  // HRV: higher than your recent baseline is better. 50 = at baseline.
  if (latest.hrv_ms != null) {
    const base = avg(prior.map(d => d.hrv_ms).filter(v => v != null));
    parts.push({ key: 'hrv', v: base ? clamp100(50 + ((latest.hrv_ms - base) / base) * 200) : 60 });
  }

  // Resting HR: lower than your recent baseline is better. 50 = at baseline.
  if (latest.resting_hr != null) {
    const base = avg(prior.map(d => d.resting_hr).filter(v => v != null));
    parts.push({ key: 'rhr', v: base ? clamp100(50 + ((base - latest.resting_hr) / base) * 200) : 55 });
  }

  if (!parts.length) return null;
  let wsum = 0, vsum = 0;
  for (const p of parts) { const w = (weights && weights[p.key] != null) ? weights[p.key] : 1; wsum += w; vsum += p.v * w; }
  return Math.round(vsum / wsum);
}

// Maps sport readinessModel factor metrics to the keys used in deriveScore.
const COLLECTED_METRIC = { sleep: 'sleep', hrv: 'hrv', resting_hr: 'rhr' };

/**
 * Build a weights object from a sport's readinessModel.
 * Returns null if the model is absent or has no matching collected metrics.
 *
 * @param {object|null} model  the readinessModel from a sport knowledge profile
 * @returns {{ sleep?: number, hrv?: number, rhr?: number }|null}
 */
function weightsFromModel(model) {
  if (!model || !Array.isArray(model.factors)) return null;
  const w = {};
  for (const f of model.factors) if (COLLECTED_METRIC[f.metric]) w[COLLECTED_METRIC[f.metric]] = f.importance;
  return Object.keys(w).length ? w : null;
}

/**
 * Readiness for ONE day. Uses a real readiness_score if present, else derives an
 * estimate from sleep / HRV / RHR. Returns null if nothing usable.
 *
 * @param {object} metric  a single daily_metrics row
 * @param {object[]} prior earlier days (for HRV/RHR baseline); order ignored
 * @returns {{ score: number, estimated: boolean }|null}
 */
export function readinessFor(metric, prior = [], weights = null) {
  if (!metric) return null;
  if (metric.readiness_score != null) return { score: metric.readiness_score, estimated: false };
  const derived = deriveScore(metric, prior, weights);
  if (derived != null) return { score: derived, estimated: true };
  return null;
}

/**
 * Sleep score for ONE day. Uses a real sleep_score if present, else estimates
 * from sleep duration (vs an 8h target) blended with deep+REM quality when the
 * stage breakdown is available. Returns null if there's no sleep data.
 *
 * @param {object} metric  a single daily_metrics row
 * @returns {{ score: number, estimated: boolean }|null}
 */
export function sleepScoreFor(metric) {
  if (!metric) return null;
  if (metric.sleep_score != null) return { score: metric.sleep_score, estimated: false };
  if (metric.sleep_duration_min == null) return null;

  // Duration: 8h (480 min) → 100.
  const base = clamp100((metric.sleep_duration_min / 480) * 100);

  // Quality: deep + REM as a share of total sleep, ideal ~45%.
  const deep = metric.sleep_deep_min;
  const rem = metric.sleep_rem_min;
  let score = base;
  if (deep != null && rem != null && metric.sleep_duration_min > 0) {
    const ratio = (deep + rem) / metric.sleep_duration_min;
    const quality = clamp100((ratio / 0.45) * 100);
    score = 0.7 * base + 0.3 * quality;
  }
  return { score: Math.round(score), estimated: true };
}

/**
 * Compute the day's readiness view-model for the Today screen.
 *
 * @param {object[]} dailyMetrics  rows from store.dailyMetrics (any order)
 * @param {object[]} logs          weekly check-ins (reserved for future use)
 * @returns {{
 *   score: number|null, estimated: boolean, status: string,
 *   headline: string, note: string, accent: string,
 *   vitals: { sleepHrs: number|null, hrv: number|null, rhr: number|null },
 *   date: string|null
 * }}
 */
// Format a sleep duration (minutes) as "7h 25m". Null when no data.
export function fmtSleep(min) {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function computeReadiness(dailyMetrics = [], logs = [], readinessModel = null) {
  const sorted = [...dailyMetrics].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );
  const latest = sorted[0];

  const blank = {
    score: null, estimated: false, status: 'unknown',
    headline: COPY.unknown.headline, note: COPY.unknown.note,
    accent: ACCENT.unknown,
    vitals: { sleepHrs: null, hrv: null, rhr: null },
    date: null
  };

  if (!latest) return blank;

  const vitals = {
    sleepHrs: latest.sleep_duration_min != null
      ? Math.round((latest.sleep_duration_min / 60) * 10) / 10
      : null,
    sleepMin: latest.sleep_duration_min ?? null,
    hrv: latest.hrv_ms ?? null,
    rhr: latest.resting_hr ?? null
  };

  const r = readinessFor(latest, sorted.slice(1, 8), weightsFromModel(readinessModel));
  if (r) {
    const status = bandFromScore(r.score);
    return {
      score: r.score, estimated: r.estimated, status,
      headline: COPY[status].headline, note: COPY[status].note,
      accent: ACCENT[status], vitals, date: latest.date || null
    };
  }

  // We have a row but nothing usable — still show any vitals, no score.
  return { ...blank, vitals, date: latest.date || null };
}

export default { computeReadiness, readinessFor, sleepScoreFor };
