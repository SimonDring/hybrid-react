/**
 * rollUp — the pure team roll-up: a coach-safe `player_status` row → the derived
 * coaching SIGNAL (RAG status, confidence, normalised load/injury). WP-53 / TAS
 * Appendix A: the engine owns this derivation so there is ONE source, testable at the
 * decision level and reusable by the web dashboard AND a future server-side edge function.
 *
 * THE PRIVACY LINE (Constitution Art 11): the input is ALREADY the coach-safe surface —
 * the roll-up from raw vitals happened on the player's device and the safety fields were
 * server-stamped. rollUp derives ONLY from those coach-visible fields; it never sees HRV /
 * sleep / resting-HR. It emits the signal (status/confidence/…), NOT presentation copy —
 * the English reasons + coach/player action words stay in the consumer (apps/web).
 *
 * Pure (Art 18): `nowMs` is PASSED IN (never a clock read) so the same row + same now
 * always yields the same signal. Ported verbatim from apps/web/lib/liveDerive.ts +
 * dashboardUtils.ts; wp53-rollup.js snapshot-locks the behaviour so the two can't drift.
 */

const LOAD_STATES = ['no-data', 'ramping', 'balanced', 'high', 'overreaching'];
export const LOW_ADHERENCE_THRESHOLD = 60;

const DAY = 86_400_000;
const FRESH_WINDOW = 2 * DAY;  // an update in the last 48h counts as current
const STALE_WINDOW = 7 * DAY;  // older than this → confidence drops to low

export function asLoadState(value) {
  return LOAD_STATES.includes(value) ? value : 'no-data';
}
export function asInjuryStatus(value) {
  return value === 'out' || value === 'modified' ? value : 'available';
}
export function isLowAdherence(pct) {
  return pct !== null && pct != null && pct < LOW_ADHERENCE_THRESHOLD;
}

/**
 * RAG status from the safe fields (the transparent severity model):
 * 'out' is red regardless (server-authoritative availability); no readiness → grey.
 */
export function deriveStatus(readiness, loadState, injuryStatus, lowAdherence) {
  if (injuryStatus === 'out') return 'red';
  if (readiness === null || readiness == null) return 'grey';
  let severity = 0;
  if (readiness < 50) severity += 2;
  else if (readiness < 65) severity += 1;
  if (loadState === 'overreaching') severity += 2;
  else if (loadState === 'high') severity += 1;
  if (injuryStatus === 'modified') severity += 1;
  if (lowAdherence) severity += 1;
  if (severity >= 3) return 'red';
  if (severity >= 1) return 'amber';
  return 'green';
}

function ageMs(iso, nowMs) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? nowMs - t : null;
}

/** Confidence from completeness + freshness of the derived signals. */
export function deriveConfidence(row, nowMs) {
  const age = ageMs(row.updated_at, nowMs);
  const fresh = age !== null && age <= FRESH_WINDOW;
  const stale = age === null || age > STALE_WINDOW;
  if (stale) return 'low';
  const hasReadiness = row.readiness !== null && row.readiness != null;
  const hasLoad = row.acwr !== null && row.acwr != null;
  if (hasReadiness && hasLoad && fresh) return 'high';
  if (hasReadiness || hasLoad) return 'medium';
  return 'low';
}

/**
 * A coach-safe player_status row → the derived coaching signal.
 * @param {object} row   { user_id, display_name, readiness, load_state, acwr, adherence_pct, injury_status, updated_at }
 * @param {object} opts  { nowMs } — the reference instant (passed in; never read from the clock)
 * @returns the derived signal (no presentation copy)
 */
export function rollUp(row = {}, { nowMs } = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const loadState = asLoadState(row.load_state);
  const injuryStatus = asInjuryStatus(row.injury_status);
  const readiness = row.readiness === undefined ? null : row.readiness;
  const adherencePercent = row.adherence_pct === null || row.adherence_pct == null ? null : Math.round(Number(row.adherence_pct));
  const lowAdherence = isLowAdherence(adherencePercent);
  const status = deriveStatus(readiness, loadState, injuryStatus, lowAdherence);
  return {
    userId: row.user_id ?? null,
    status,
    confidence: deriveConfidence(row, now),
    loadState,
    injuryStatus,
    injuryFlag: injuryStatus !== 'available',
    readinessScore: readiness,
    acwr: row.acwr === null || row.acwr == null ? null : Number(Number(row.acwr).toFixed(2)),
    adherencePercent,
    lowAdherence,
    lastUpdated: row.updated_at ?? null,
  };
}

export default { rollUp, deriveStatus, deriveConfidence, asLoadState, asInjuryStatus, isLowAdherence, LOW_ADHERENCE_THRESHOLD };
