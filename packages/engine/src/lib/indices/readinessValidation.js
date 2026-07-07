/**
 * learning/readinessValidation — does OUR readiness signal predict the athlete's own
 * experience? (WP-59, closing the loop WP-44's reconciliation named: readiness-v2
 * shipped default-ON with its validation still owed — Art 12: athlete response
 * validates science.)
 *
 * Cheap, honest check over already-logged data: pair each day's readiness value with
 * the SAME day's post-session ratings (quality and recovery, 1–5) and report the
 * correlation. A readiness index that never predicts how sessions actually feel is
 * decoration; this readout says which we have. Report-only — nothing consumes it.
 * Pure: pairs arrive prepared; no clock, no IO.
 */

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

/**
 * @param {Array<{readiness:number, quality?:number, recovery?:number}>} pairs — same-day pairs
 * @returns {{ n:number, rQuality:number|null, rRecovery:number|null, verdict:string }}
 */
export function readinessValidation(pairs = []) {
  const q = pairs.filter((p) => p && p.readiness != null && p.quality != null);
  const r = pairs.filter((p) => p && p.readiness != null && p.recovery != null);
  const rQuality = pearson(q.map((p) => p.readiness), q.map((p) => p.quality));
  const rRecovery = pearson(r.map((p) => p.readiness), r.map((p) => p.recovery));
  const n = Math.max(q.length, r.length);
  const best = Math.max(rQuality ?? -1, rRecovery ?? -1);
  const verdict = n < 5 ? `insufficient data (${n} same-day pairs; need ≥5)`
    : best >= 0.3 ? `readiness predicts the athlete's own session experience (r=${best.toFixed(2)}, n=${n}) — the index is earning its keep`
    : best >= 0.1 ? `weak positive signal (r=${best.toFixed(2)}, n=${n}) — keep collecting before concluding`
    : `no predictive signal yet (best r=${best === -1 ? 'n/a' : best.toFixed(2)}, n=${n}) — the v2 weighting has not validated for THIS athlete`;
  return { n, rQuality, rRecovery, verdict };
}

export default { readinessValidation };
