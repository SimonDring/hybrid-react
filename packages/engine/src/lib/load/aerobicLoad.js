/**
 * Aerobic load — Banister TRIMP (pure, governed; Phase 2 T1).
 *
 * A PARALLEL load basis for the form model (spec
 * docs/superpowers/specs/2026-07-20-phase2-aerobic-form-model-design.md). It does
 * NOT feed generatePlan and does NOT replace the live ACWR path — trainingLoad.js's
 * workoutLoad/dailyLoads (duration×3 proxy) are unchanged; this module is the form
 * model's own, more physiologically real load estimate. When Simon flips the switch,
 * trainingLoad.workoutLoad adopts this; until then the two bases coexist deliberately
 * (a visible seam, not a smoothed-over lie — DAAS §3.6).
 *
 * The science (Banister 1991; Morton, Fitz-Clarke & Banister 1990): TRIMP =
 * duration_min × HRr × weight(HRr, sex), HRr = clamp((avgHr−restHr)/(maxHr−restHr),
 * 0,1). HRmax defaults to the Tanaka 2001 age estimate when not observed; HRrest
 * defaults to a population value when not observed (that default alone drops
 * confidence — see load.aerobic.trimp, kb.js). Falls back to the existing duration
 * proxy when avgHr or a usable HRmax/HRrest pair is unavailable. Confidence caps at
 * 'moderate' (Art 13) — the formula is established, per-individual HR estimation
 * still adds error.
 */
import kb from '../knowledge/kb.js';
import { sessionLoad } from '../plan/trainingLoad.js';

const _T = kb.value('load.aerobic.trimp');

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// One workout → { load, method:'trimp'|'duration', confidence:'moderate'|'low' }.
// ctx: { restHr, maxHr, sex, age } — all optional; every fallback is documented above.
export function aerobicLoad(workout, { restHr = null, maxHr = null, sex = null, age = null } = {}) {
  const durationMin = workout && workout.duration_sec ? workout.duration_sec / 60 : 0;
  const avgHr = workout && workout.avg_hr != null ? workout.avg_hr : null;

  const restHrIsDefault = restHr == null;
  const resolvedRestHr = restHr != null ? restHr : _T.restHrDefault;
  const resolvedMaxHr = maxHr != null ? maxHr
    : (age != null ? Math.round(_T.hrMaxIntercept - _T.hrMaxAgeSlope * age) : null);

  const usable = avgHr != null && resolvedMaxHr != null && (resolvedMaxHr - resolvedRestHr) > 0;
  if (!usable) {
    return { load: Math.round(durationMin * 3), method: 'duration', confidence: 'low' };
  }

  const HRr = clamp01((avgHr - resolvedRestHr) / (resolvedMaxHr - resolvedRestHr));
  const weight = sex === 'female'
    ? _T.femaleC * Math.exp(_T.femaleK * HRr)
    : _T.maleC * Math.exp(_T.maleK * HRr);
  const load = Math.round(durationMin * HRr * weight);
  return { load, method: 'trimp', confidence: restHrIsDefault ? 'low' : 'moderate' };
}

// Per-day total aerobic load: every session log (via the existing sessionLoad) +
// every UNLINKED workout (via aerobicLoad — Banister TRIMP or its duration fallback).
// Mirrors trainingLoad.dailyLoads exactly, save the unlinked-workout scorer.
export function aerobicDailyLoads(sessionLogs = [], workouts = [], ctx = {}) {
  const byDate = {};
  const add = (iso, load) => {
    if (!iso || !load) return;
    const d = String(iso).split('T')[0];
    byDate[d] = (byDate[d] || 0) + load;
  };
  for (const log of sessionLogs) add(log.completed_at || log.started_at, sessionLoad(log).load);
  for (const w of workouts) if (!w.session_id) add(w.start_time, aerobicLoad(w, ctx).load);
  return Object.entries(byDate).map(([date, load]) => ({ date, load })).sort((a, b) => a.date.localeCompare(b.date));
}

export default { aerobicLoad, aerobicDailyLoads };
