/**
 * Training load (pure, no IO). Per-session Edwards zone-TRIMP → EWMA acute/chronic
 * → ACWR → a week-level load decision, plus the combined readiness×load multiplier.
 *
 * The thresholds are sourced from the evidence knowledge base (src/lib/knowledge/),
 * where they carry their provenance + confidence — the ACWR bands are tagged
 * confidence:'low' because the ratio is mathematically contested (Impellizzeri 2019/
 * 2020; Lolli). Behaviour is unchanged by this sourcing; demoting ACWR from a gate to
 * a soft input is a later, deliberate step (roadmap Phase 3).
 */
import kb from '../knowledge/kb.js';
import skb, { normalizeSportId } from '../sportKnowledge/index.js';

const DAY_MS = 86400000;
const _T = kb.value('load.acwr.thresholds');
const _P = kb.value('load.acwr.policy');
export const SWEET_LOW = _T.sweetLow, EASE_FROM = _T.easeFrom, HIGH = _T.high;

const DEFAULT_T = { sweetLow: SWEET_LOW, easeFrom: EASE_FROM, high: HIGH, policy: _P };

// Edwards TRIMP from HR-zone minutes; fallback to a moderate duration proxy.
export function sessionLoad(log) {
  if (!log) return { load: 0, estimated: false };
  const z = log.hr_zones;
  if (z && (z.z1 || z.z2 || z.z3 || z.z4 || z.z5)) {
    const load = (z.z1 || 0) * 1 + (z.z2 || 0) * 2 + (z.z3 || 0) * 3 + (z.z4 || 0) * 4 + (z.z5 || 0) * 5;
    return { load: Math.round(load), estimated: false };
  }
  const min = log.duration_sec ? log.duration_sec / 60 : 0;
  return { load: Math.round(min * 3), estimated: true };
}

// Unlinked workout load — duration proxy (Strava summaries have no zones).
export function workoutLoad(workout) {
  const min = workout && workout.duration_sec ? workout.duration_sec / 60 : 0;
  return Math.round(min * 3);
}

// Per-day total load: every session log + every UNLINKED workout (linked workouts
// are already represented by their session's log, so they aren't counted again).
export function dailyLoads(sessionLogs = [], workouts = []) {
  const byDate = {};
  const add = (iso, load) => {
    if (!iso || !load) return;
    const d = String(iso).split('T')[0];
    byDate[d] = (byDate[d] || 0) + load;
  };
  for (const log of sessionLogs) add(log.completed_at || log.started_at, sessionLoad(log).load);
  for (const w of workouts) if (!w.session_id) add(w.start_time, workoutLoad(w));
  return Object.entries(byDate).map(([date, load]) => ({ date, load })).sort((a, b) => a.date.localeCompare(b.date));
}

// A continuous daily load array of length `days`, ending on `asOf`, missing days = 0.
function seriesEndingAt(dl, asOf, days) {
  const end = new Date(asOf + 'T00:00:00Z').getTime();
  const map = {};
  dl.forEach(d => { map[d.date] = d.load; });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(map[new Date(end - i * DAY_MS).toISOString().split('T')[0]] || 0);
  }
  return out;
}

function ewma(values, N) {
  const lambda = 2 / (N + 1);
  let e = 0, init = false;
  for (const v of values) { e = init ? v * lambda + e * (1 - lambda) : v; init = true; }
  return init ? e : 0;
}

export function acuteChronic(dl, asOf) {
  return { acute: ewma(seriesEndingAt(dl, asOf, 7), 7), chronic: ewma(seriesEndingAt(dl, asOf, 28), 28) };
}

export function acwr({ acute, chronic } = {}) {
  if (!chronic || chronic < 1) return null;   // not enough load history
  return acute / chronic;
}

// The last `n` days' ACWR (chronological; entries may be null).
export function acwrSeries(dl, asOf, n = 4) {
  const end = new Date(asOf + 'T00:00:00Z').getTime();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(acwr(acuteChronic(dl, new Date(end - i * DAY_MS).toISOString().split('T')[0])));
  }
  return out;
}

// Decide the week-level adaptation from today's ACWR + a short recent series.
// An optional `thresholds` object overrides the global kb values — useful for per-sport
// ACWR bands (call acwrThresholdsForSport to build one). Defaults to DEFAULT_T so all
// existing call sites are unaffected.
export function loadDecision(acwrVal, recentAcwr = [], thresholds = DEFAULT_T) {
  const { sweetLow, easeFrom, high, policy } = thresholds;
  if (acwrVal == null) return { action: 'none', multiplier: 1, reason: null };
  const sustainedHigh = recentAcwr.filter(v => v != null && v > high).length >= policy.sustainedDays;
  const sustainedLow  = recentAcwr.filter(v => v != null && v < sweetLow).length >= policy.sustainedDays;
  if (acwrVal > high && sustainedHigh) return { action: 'deload', multiplier: policy.deloadMultiplier, reason: 'Sustained high load — deload this week' };
  if (acwrVal > easeFrom) {
    const t = Math.min(1, (acwrVal - easeFrom) / (high - easeFrom));
    return { action: 'ease', multiplier: Math.round((1.0 - policy.easeSlope * t) * 100) / 100, reason: 'Load high — eased this week' };
  }
  if (acwrVal < sweetLow && sustainedLow) return { action: 'nudge_up', multiplier: policy.nudgeUp, reason: 'Load low — building back toward plan' };
  return { action: 'none', multiplier: 1, reason: null };
}

// Returns a thresholds object for `loadDecision` built from a sport's loadManagement.acwr
// section in the sport knowledge base. Returns null for unknown sports or sports without
// ACWR data — callers should fall back to DEFAULT_T (or pass no thresholds arg).
export function acwrThresholdsForSport(sportId) {
  const lm = ((skb.get(normalizeSportId(sportId)) || {}).loadManagement || {}).acwr;
  if (!lm) return null;
  return { sweetLow: lm.sweetSpotLow ?? SWEET_LOW, easeFrom: lm.sweetSpotHigh ?? EASE_FROM, high: lm.highRiskAbove ?? HIGH, policy: _P };
}

// Combine the readiness multiplier (≤1) with the load decision. ease/deload/none
// take the more conservative value (and never below a 0.5 floor). nudge_up raises
// to the full plan only when readiness is adequate; otherwise readiness wins.
export function combinedMultiplier(rm, decision = { action: 'none', multiplier: 1 }) {
  if (decision.action === 'nudge_up') return rm >= 0.9 ? 1.0 : rm;
  return Math.max(_P.combinedFloor, Math.min(rm, decision.multiplier));
}

// Adaptive deload decision for the CURRENT week. Promotes real fatigue into a TRUE
// deload (lighter scheme + MEV volume + banner), or DEFERS a planned deload when the
// athlete is clearly fresh — so deloads track real fatigue instead of only firing on
// fixed weeks. Pure.
//
// ACWR DEMOTED (Impellizzeri 2019/2020; Lolli — knowledge base load.acwr.validity):
// sustained high load no longer FORCES a deload on its own (it's a coupled, low-
// confidence signal). It only CORROBORATES — a deload is forced by illness, or by low
// readiness + poor recovery, or by a high-load signal BACKED BY low readiness/poor
// recovery. This makes the strongest behavioural call the most-evidenced one.
//   loadAction      'deload'|'ease'|'nudge_up'|'none' from the load module (ACWR-derived)
//   readiness       0–100 blended recovery score (today) or null
//   recentRecovery  mean of recent session 'recovery' ratings (1–5) or null
//   illness         athlete flagged ill today
//   scheduledDeload is the current week already a planned deload?
// → { action: 'force' | 'defer' | 'none', reason }
export function deloadRecommendation({ loadAction = null, readiness = null, recentRecovery = null, illness = false, scheduledDeload = false } = {}) {
  const loadDeload = loadAction === 'deload';
  const lowReadiness = readiness != null && readiness < 50;
  const poorRecovery = recentRecovery != null && recentRecovery <= 2;
  // Fatigued: illness, OR low readiness backed by poor recovery, OR a high-load signal
  // CORROBORATED by low readiness / poor recovery (ACWR alone is not enough).
  const fatigued = illness || (lowReadiness && poorRecovery) || (loadDeload && (lowReadiness || poorRecovery));
  // Fresh: high readiness, good recovery, and load not elevated.
  const fresh = readiness != null && readiness >= 70
    && (recentRecovery == null || recentRecovery >= 4)
    && loadAction !== 'deload' && loadAction !== 'ease';

  if (!scheduledDeload && fatigued) {
    const reason = illness ? 'Illness — deload and recover this week'
      : loadDeload ? 'Sustained high load with low recovery — deload this week'
        : 'Low readiness and recovery — deload this week';
    return { action: 'force', reason };
  }
  if (scheduledDeload && fresh) {
    return { action: 'defer', reason: 'Recovered and fresh — pushing the planned deload' };
  }
  return { action: 'none', reason: null };
}

export default {
  sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries,
  loadDecision, combinedMultiplier, deloadRecommendation, acwrThresholdsForSport,
  EASE_FROM, HIGH, SWEET_LOW
};
