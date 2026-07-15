/**
 * baseline — personal-baseline normalisation helpers (pure, no IO).
 *
 * The manufacturer-independence mechanism of the physiological framework: an
 * objective metric is judged against the INDIVIDUAL's own recent history, not a
 * population absolute or a vendor score. Devices disagree on absolutes but are
 * self-consistent over time, so the trustworthy signal is the intra-device trend.
 * (knowledge base: physio.normalization.personal_baseline.)
 *
 * Generalises the HRV/RHR-vs-7-day-baseline maths that lived inline in
 * Readiness.deriveScore so every index can reuse it. See
 * docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §2.
 */

/** Mean of the present (non-null) numbers, or null if none. */
export function mean(nums = []) {
  const a = nums.filter(v => v != null && !Number.isNaN(Number(v))).map(Number);
  if (!a.length) return null;
  return a.reduce((x, y) => x + y, 0) / a.length;
}

/** Clamp into [0, 100]. */
export function clamp100(n) {
  return Math.max(0, Math.min(100, n));
}

/**
 * A 0–100 deviation score for today's value vs a personal baseline. 50 = at
 * baseline; higher = better. Mirrors Readiness.deriveScore's scaling (±200% of
 * the proportional deviation), so behaviour is preserved when reused there.
 *
 * @param {number|null} latest    today's reading
 * @param {number|null} baseline  the personal rolling mean
 * @param {{higherIsBetter?: boolean}} opts  HRV → higher better; RHR → lower better
 * @returns {number|null}
 */
export function deviationScore(latest, baseline, { higherIsBetter = true } = {}) {
  if (latest == null || !baseline) return null;
  const dir = higherIsBetter ? latest - baseline : baseline - latest;
  return clamp100(50 + (dir / baseline) * 200);
}

/**
 * How mature a personal baseline is, in [0, 1]: a count of prior readings over the
 * number required for a stable baseline (default 7 days). Feeds the confidence model
 * — a thin baseline lowers confidence, it does not block the score.
 */
export function baselineMaturity(count = 0, required = 7) {
  return Math.max(0, Math.min(1, count / required));
}

/**
 * Recency weight in (0, 1] for a driving reading dated `date`, seen from `asOf` (both
 * local YYYY-MM-DD). A same-day reading weighs 1; older readings decay with a half-life
 * of `halfLifeDays` (a reading `halfLifeDays` old weighs 0.5). A STALE driving row is
 * thus down-weighted, so a single old wellness/metric entry cannot swing today's
 * adaptation (SR-04). Pure — dates are ARGUMENTS, never the clock (Art 18). Missing
 * dates → 1 (can't judge staleness → don't penalise). Future-dated → clamped to fresh.
 */
export function recencyFactor(asOf, date, halfLifeDays = 3) {
  if (!asOf || !date || !halfLifeDays) return 1;
  const ms = Date.parse(asOf) - Date.parse(date);
  if (!Number.isFinite(ms)) return 1;
  const days = Math.max(0, ms / 86400000);
  return Math.max(0, Math.min(1, 0.5 ** (days / halfLifeDays)));
}

/**
 * Coefficient of variation (%) of the present numbers — SD / mean × 100. Needs ≥2
 * points and a non-zero mean, else null. A low, steady HRV CV reflects a stable
 * autonomic baseline (recovery capacity); a collapsing CV is a separate acute
 * overreaching flag handled by the Fatigue Index. (physio.hrv.metric.)
 */
export function coefficientOfVariation(nums = []) {
  const a = nums.filter(v => v != null && !Number.isNaN(Number(v))).map(Number);
  if (a.length < 2) return null;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  if (!m) return null;
  const variance = a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length;
  return (Math.sqrt(variance) / m) * 100;
}

export default { mean, clamp100, deviationScore, baselineMaturity, recencyFactor, coefficientOfVariation };
