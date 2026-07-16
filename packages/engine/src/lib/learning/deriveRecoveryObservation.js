/**
 * learning/deriveRecoveryObservation — M5-L2 (§3 of the app-wiring design; DAAS §5.3).
 *
 * Materialises ONE block's recovery observation from the athlete's own already-logged
 * data, in the exact shape `promoteFromOutcomes` reads: `{ recoveryRate, confidence }`,
 * to be stored on a `block_outcomes` row's `observed`.
 *
 * `recoveryRate` is a RELATIVE signal (Art 13 — this athlete vs their OWN norm, never an
 * absolute physiological claim), normalised so ≈1.0 = recovered in line with baseline,
 * >1.0 = recovered faster (tolerated the load), <1.0 = under-recovered:
 *
 *     recoveryRate = clamp( meanBlockRecovery / rollingBaselineRecovery , 0.7 , 1.3 )
 *
 *   • meanBlockRecovery    — mean of the athlete's 1–5 session-recovery ratings INSIDE the
 *                            block window.
 *   • rollingBaselineRecovery — mean of those ratings over the trailing `baselineDays`
 *                            BEFORE the block (their personal norm).
 *   • the [0.7,1.3] clamp bounds a single block's authority (Art 16 — never oversell); it
 *     is SEPARATE from (and upstream of) the policy's own ≤15–30% shrinkage vs population.
 *
 * ABSTAIN (recoveryRate=null, confidence=0) when the block can't test the prior — fewer
 * than `minBlockSessions` rated sessions in-block, or no baseline history yet (Art 15 — the
 * abstain is recorded, not hidden; the policy treats null as "could not test").
 *
 * `confidence` is a numeric 0..1 composed confidence of THIS block's signal (DAAS §5.3):
 *   confidence = clamp( 0.35 + 0.1·(ratedSessions − minBlockSessions) , 0 , 0.9 )
 *   + 0.1 when an in-block e1RM slope CORROBORATES the recovery direction (both up / both
 *     down) — a single low-confidence signal never acts alone (Art 13).
 * At `minBlockSessions` (3) it sits at 0.35 (below the policy's Gate-A 0.5 floor → the
 * block STAGES, does not promote); corroborated, richer blocks cross 0.5.
 *
 * PURE: dates arrive as arguments; no clock read, no randomness, no I/O (Art 18). Date math
 * uses Date.parse on the given ISO strings only (deterministic — the same inputs, the same
 * observation).
 */

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const DAY_MS = 86400000;

// Least-squares slope of value-per-day; null when < minPoints (mirrors blockOutcome.js).
function slopePerDay(points, minPoints = 3) {
  if (!Array.isArray(points) || points.length < minPoints) return null;
  const t0 = Date.parse(points[0].date);
  const xs = points.map((p) => (Date.parse(p.date) - t0) / DAY_MS);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den === 0 ? null : num / den;
}

const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : null);

/**
 * @param {object} args
 *   sessionRecoveries — [{ date:'YYYY-MM-DD', recovery:1..5 }] the athlete's own ratings
 *                       (FULL history; the function splits in-block vs baseline)
 *   liftLog           — [{ date:'YYYY-MM-DD', e1rm:number }] tracked-lift e1RMs (corroboration)
 *   startISO / endISO — the block window (inclusive; no clock reads)
 *   baselineDays      — trailing window before the block for the personal norm (default 56 ≈ 8wk)
 *   minBlockSessions  — abstain below this many rated in-block sessions (default 3)
 * @returns {{ recoveryRate: number|null, confidence: number }}
 */
export function deriveRecoveryObservation({
  sessionRecoveries = [], liftLog = [], startISO, endISO,
  baselineDays = 56, minBlockSessions = 3,
} = {}) {
  const ABSTAIN = { recoveryRate: null, confidence: 0 };
  if (!startISO || !endISO) return ABSTAIN;

  const startMs = Date.parse(startISO);
  const baselineLowerMs = startMs - baselineDays * DAY_MS;

  const rated = sessionRecoveries
    .filter((r) => r && r.recovery != null && dateOf(r.date))
    .map((r) => ({ date: dateOf(r.date), value: Number(r.recovery) }))
    .filter((r) => Number.isFinite(r.value));

  const inBlock = rated.filter((r) => r.date >= startISO && r.date <= endISO);
  const baseline = rated.filter((r) => r.date < startISO && Date.parse(r.date) >= baselineLowerMs);

  if (inBlock.length < minBlockSessions || baseline.length < 1) return ABSTAIN;

  const mean = (arr) => arr.reduce((a, r) => a + r.value, 0) / arr.length;
  const meanBlock = mean(inBlock);
  const meanBaseline = mean(baseline);
  if (!(meanBaseline > 0)) return ABSTAIN;

  const recoveryRate = Math.round(clamp(meanBlock / meanBaseline, 0.7, 1.3) * 1000) / 1000;

  let confidence = clamp(0.35 + 0.1 * (inBlock.length - minBlockSessions), 0, 0.9);

  // Corroboration: does the in-block e1RM trend agree with the recovery direction?
  const inBlockLifts = liftLog
    .filter((r) => r && Number(r.e1rm) > 0 && dateOf(r.date) && dateOf(r.date) >= startISO && dateOf(r.date) <= endISO)
    .map((r) => ({ date: dateOf(r.date), value: Number(r.e1rm) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const liftSlope = slopePerDay(inBlockLifts);
  if (liftSlope != null) {
    const recoveryUp = meanBlock >= meanBaseline;
    const liftUp = liftSlope >= 0;
    if (recoveryUp === liftUp) confidence = clamp(confidence + 0.1, 0, 0.9);
  }

  return { recoveryRate, confidence: Math.round(confidence * 1000) / 1000 };
}

export default { deriveRecoveryObservation };
