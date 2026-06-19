/**
 * Training load (pure, no IO). Per-session Edwards zone-TRIMP → EWMA acute/chronic
 * → ACWR → a week-level load decision, plus the combined readiness×load multiplier.
 * Thresholds are the only tunables; they live here as constants.
 */

const DAY_MS = 86400000;
export const EASE_FROM = 1.3, HIGH = 1.5, SWEET_LOW = 0.8;

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
export function loadDecision(acwrVal, recentAcwr = []) {
  if (acwrVal == null) return { action: 'none', multiplier: 1, reason: null };
  const sustainedHigh = recentAcwr.filter(v => v != null && v > HIGH).length >= 3;
  const sustainedLow  = recentAcwr.filter(v => v != null && v < SWEET_LOW).length >= 3;
  if (acwrVal > HIGH && sustainedHigh) return { action: 'deload', multiplier: 0.5, reason: 'Sustained high load — deload this week' };
  if (acwrVal > EASE_FROM) {
    const t = Math.min(1, (acwrVal - EASE_FROM) / (HIGH - EASE_FROM));
    return { action: 'ease', multiplier: Math.round((1.0 - 0.3 * t) * 100) / 100, reason: 'Load high — eased this week' };
  }
  if (acwrVal < SWEET_LOW && sustainedLow) return { action: 'nudge_up', multiplier: 1.0, reason: 'Load low — building back toward plan' };
  return { action: 'none', multiplier: 1, reason: null };
}

// Combine the readiness multiplier (≤1) with the load decision. ease/deload/none
// take the more conservative value (and never below a 0.5 floor). nudge_up raises
// to the full plan only when readiness is adequate; otherwise readiness wins.
export function combinedMultiplier(rm, decision = { action: 'none', multiplier: 1 }) {
  if (decision.action === 'nudge_up') return rm >= 0.9 ? 1.0 : rm;
  return Math.max(0.5, Math.min(rm, decision.multiplier));
}

export default {
  sessionLoad, workoutLoad, dailyLoads, acuteChronic, acwr, acwrSeries,
  loadDecision, combinedMultiplier, EASE_FROM, HIGH, SWEET_LOW
};
