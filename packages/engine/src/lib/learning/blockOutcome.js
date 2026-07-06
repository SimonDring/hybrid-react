/**
 * learning/blockOutcome — the FIRST honest learning loop (WP-59; EDS FR5, D16 seed;
 * Art 12 "athlete response validates"; Art 16 "learn, don't assume").
 *
 * At a block boundary, treat the block's diagnosis as a FALSIFIABLE HYPOTHESIS: did
 * the athlete respond to what we prescribed? Two cheap, already-logged proxies:
 *   • strength-quality response — the e1RM slope over the block for the tracked lifts
 *     (any maximal-force priority: maxStrength / explosiveStrength / hypertrophy-base);
 *   • recovery tolerance — the trend of the athlete's own 1–5 session-recovery ratings.
 *
 * Output: per-priority verdicts (responded / flat / declined / insufficient-data),
 * each with a rationale — plus at most ONE conservative candidate prior:
 * volumeTolerance 0.9 when BOTH signals corroborate a struggling block (declining
 * recovery AND non-responding lifts). Corroboration is required (Art 13: a single
 * low-confidence signal never acts alone) and the candidate is only ever DOWNWARD
 * (we reduce dose for a struggling athlete; we never auto-escalate).
 *
 * STAGED, NOT LIVE: the engine reads model.learnedPriors; this produces candidates
 * the app persists under model.stagedPriors, which NOTHING consumes. Promotion
 * (staged → learned) is a deliberate, reviewed step (TAS §10 staging; the same
 * twice-gated pattern as the AI seam) — Simon decides when the first writer goes live.
 *
 * Pure: history arrives as plain arrays; no clock (the block window is an argument).
 */

const STRENGTH_QUALITIES = new Set(['maxStrength', 'explosiveStrength', 'hypertrophy', 'strengthEndurance']);

// Least-squares slope of value-per-day over [startISO, endISO]; null when < minPoints.
function slopePerDay(points, minPoints = 3) {
  if (!Array.isArray(points) || points.length < minPoints) return null;
  const t0 = Date.parse(points[0].date);
  const xs = points.map((p) => (Date.parse(p.date) - t0) / 86400000);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den === 0 ? null : num / den;
}

const inWindow = (iso, startISO, endISO) => iso && iso >= startISO && iso <= endISO;

/**
 * @param {object} args
 *   priorityQualities — the block's D5 output: [{ qualityId, ... }]
 *   liftLog — [{ date: 'YYYY-MM-DD', e1rm: number }] any tracked-lift history (merged)
 *   sessionRecoveries — [{ date: 'YYYY-MM-DD', recovery: 1..5 }] the athlete's own ratings
 *   startISO / endISO — the block window (no clock reads)
 * @returns {{ verdicts: object[], candidatePriors: object[] }}
 */
export function blockOutcome({ priorityQualities = [], liftLog = [], sessionRecoveries = [], startISO, endISO } = {}) {
  const lifts = liftLog.filter((r) => r && r.e1rm > 0 && inWindow(r.date, startISO, endISO))
    .map((r) => ({ date: r.date, value: r.e1rm })).sort((a, b) => a.date.localeCompare(b.date));
  const recs = sessionRecoveries.filter((r) => r && r.recovery != null && inWindow(r.date, startISO, endISO))
    .map((r) => ({ date: r.date, value: Number(r.recovery) })).sort((a, b) => a.date.localeCompare(b.date));

  const liftSlope = slopePerDay(lifts);          // kg/day across tracked lifts
  const recSlope = slopePerDay(recs);            // recovery-points/day
  const recMean = recs.length ? recs.reduce((a, r) => a + r.value, 0) / recs.length : null;

  const verdicts = priorityQualities.map((p) => {
    const q = p.qualityId;
    if (STRENGTH_QUALITIES.has(q)) {
      if (liftSlope == null) return { qualityId: q, metric: 'e1RM slope', observed: null, verdict: 'insufficient-data', rationale: `fewer than 3 in-block e1RM points — the ${q} hypothesis is untested this block.` };
      const verdict = liftSlope > 0.02 ? 'responded' : liftSlope < -0.02 ? 'declined' : 'flat';
      return { qualityId: q, metric: 'e1RM slope', observed: Math.round(liftSlope * 1000) / 1000, verdict, rationale: `tracked-lift e1RM moved ${(liftSlope * 7).toFixed(2)} kg/week over the block — ${verdict}.` };
    }
    // Capacity/durability qualities: the recovery trend is the honest cheap proxy.
    if (recSlope == null) return { qualityId: q, metric: 'session-recovery trend', observed: null, verdict: 'insufficient-data', rationale: 'fewer than 3 in-block recovery ratings.' };
    const verdict = recSlope > 0.005 ? 'responded' : recSlope < -0.005 ? 'declined' : 'flat';
    return { qualityId: q, metric: 'session-recovery trend', observed: Math.round(recSlope * 1000) / 1000, verdict, rationale: `session-recovery ratings trended ${verdict} (${(recSlope * 7).toFixed(2)} pts/week, mean ${recMean?.toFixed(1)}).` };
  });

  // The single conservative candidate: corroborated struggle → volumeTolerance 0.9.
  const candidatePriors = [];
  const liftsStruggling = liftSlope != null && liftSlope <= 0;
  const recoveryStruggling = recSlope != null && recSlope < 0 && recMean != null && recMean < 3.5;
  if (liftsStruggling && recoveryStruggling) {
    candidatePriors.push({
      type: 'volumeTolerance', value: 0.9, source: 'learned', confidence: 'low',
      evidence: `block ${startISO}→${endISO}: e1RM ${liftSlope <= 0 ? 'non-responding' : ''} (${(liftSlope * 7).toFixed(2)} kg/wk) AND recovery declining (${(recSlope * 7).toFixed(2)} pts/wk, mean ${recMean.toFixed(1)}) — corroborated under-recovery; candidate −10% volume tolerance.`,
    });
  }
  return { verdicts, candidatePriors };
}

export default { blockOutcome };
