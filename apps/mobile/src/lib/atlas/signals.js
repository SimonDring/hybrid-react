/**
 * atlas/signals — reusable "signal providers" for the athlete profile.
 *
 * Each provider turns the user's real data into a single 0–100 score. Pillars
 * (see ../../data/athletePillars.js) are built by composing these, and a sport
 * (see ../../data/sports) just picks which pillars it cares about. Adding a sport
 * almost never needs new code here — it reuses these providers.
 *
 * What's real vs estimated:
 *   - strength: REAL — e1RM vs strength standards.
 *   - recovery / consistency: REAL — readiness + sessions completed.
 *   - aerobicEngine: rough proxy from chronic training load (estimated without a
 *     wearable).
 *   - per-muscle capability: REAL where a tracked lift covers the muscle, else a
 *     level/consistency baseline (estimated).
 * All pure — no side effects.
 */

import { resolveLifts } from '@performance-os/engine/lib/liftProgression.js';
import STANDARDS from '../../data/strengthStandards.js';
import { computeReadiness } from '@performance-os/engine/lib/Readiness.js';
import { consistencyGoal } from '../goals.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { getGymLevel } from '@performance-os/engine/lib/Utils.js';

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Which muscles each tracked lift develops (used to spread strength → capability).
// With OHP + pull now tracked, the upper-body pull (back/biceps) and shoulder/overhead
// (shoulders/triceps) capabilities are REAL — so sport pillars that lean on them (a
// swimmer's upper_pull + shoulder_health, etc.) stop falling back to a level estimate.
const LIFT_MUSCLES = {
  squat: ['quads', 'glutes', 'core'],
  deadlift: ['back', 'hamstrings', 'glutes'],
  bench: ['chest', 'triceps', 'shoulders'],
  ohp: ['shoulders', 'triceps'],
  pull: ['back', 'biceps']
};
const LEVEL_BASE = { beginner: 32, returning: 40, intermediate: 55, advanced: 70 };

// Per-lift score = how close the e1RM-to-bodyweight ratio sits to the elite standard.
function liftScores(profile) {
  const lifts = resolveLifts(profile);
  const bw = Number(profile.bodyweight_kg) || null;
  const sex = profile.sex === 'female' ? 'female' : 'male';
  const out = {};
  for (const key of ['squat', 'bench', 'deadlift', 'ohp', 'pull']) {
    const e1rm = lifts[key];
    const table = STANDARDS[sex] && STANDARDS[sex][key];
    if (!e1rm || !bw || !table || !table.elite) continue;
    out[key] = clamp((e1rm / bw) / table.elite * 100);
  }
  return out;
}

// A lift's relevance to the athlete's sport = how much the gym engine emphasises the
// muscles it trains (SPORT_EMPHASIS via resolveProgram). So a swimmer's pull/OHP count
// for more than their squat; a sprinter's squat/deadlift count for more than their bench.
function liftSportWeight(key, emphasis) {
  const muscles = LIFT_MUSCLES[key] || [];
  if (!muscles.length) return 1;
  return muscles.reduce((a, m) => a + (emphasis[m] ?? 1), 0) / muscles.length;
}

// Overall strength score — vs elite standards, weighted toward the lifts that matter
// for the user's sport (so the number is relative to that sport). For a `build` athlete
// the emphasis is ~neutral, so it stays an even average. null if nothing is tracked.
export function strength(profile) {
  const scores = liftScores(profile);
  const keys = Object.keys(scores);
  if (!keys.length) return null;
  const emphasis = resolveProgram(profile).emphasis || {};
  let sSum = 0, wSum = 0;
  for (const k of keys) {
    const w = liftSportWeight(k, emphasis);
    sSum += scores[k] * w;
    wSum += w;
  }
  return wSum ? Math.round(sSum / wSum) : null;
}

// Rolling recovery/readiness (0–100). null without metrics.
export function recovery(dailyMetrics, logs) {
  const r = computeReadiness(dailyMetrics, logs);
  return r && r.score != null ? r.score : null;
}

// How well the athlete is hitting their planned session frequency (0–100).
export function consistency(profile, sessions, currentWeek) {
  const g = consistencyGoal(profile, sessions, currentWeek);
  return g.pct != null ? g.pct : null;
}

// Aerobic "engine size" — a rough proxy from chronic (28-day) training load.
// Estimated; a real VO2/zone signal can replace this later. null without load.
export function aerobicEngine(load) {
  if (!load || load.chronic == null) return null;
  return Math.round(clamp(load.chronic / 120 * 100));   // ~120/day chronic ≈ strong base
}

/**
 * Per-muscle capability map (0–100). Muscles covered by a tracked lift take that
 * lift's score; the rest fall back to a baseline from experience + consistency.
 * Returns { cap(muscle), base } — `cap` is what muscle-balance pillars call.
 */
export function muscleCapabilities(profile, sessions, currentWeek) {
  const ls = liftScores(profile);
  const byMuscle = {};
  for (const [lift, muscles] of Object.entries(LIFT_MUSCLES)) {
    if (ls[lift] == null) continue;
    for (const m of muscles) (byMuscle[m] = byMuscle[m] || []).push(ls[lift]);
  }
  const level = getGymLevel(profile, 'intermediate');
  const cons = consistency(profile, sessions, currentWeek);
  const consAdj = cons == null ? 0 : (cons - 70) * 0.15;   // small ± nudge around target
  const base = Math.round(clamp((LEVEL_BASE[level] ?? 55) + consAdj));
  const cap = (m) => {
    const arr = byMuscle[m];
    return arr && arr.length ? Math.round(clamp(arr.reduce((a, b) => a + b, 0) / arr.length)) : base;
  };
  return { cap, base };
}

// Average capability across a set of muscles (for muscle-balance pillars).
export function muscleBalance(caps, muscles) {
  const vals = muscles.map(m => caps.cap(m));
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Explosive/power readiness — lower-body capability lifted by whether the
// programme actually trains power (plyos / Olympic lifts).
export function explosivePower(profile, caps) {
  const prog = resolveProgram(profile);
  const factor = prog.power ? 1 : 0.82;
  const lower = (caps.cap('glutes') + caps.cap('hamstrings') + caps.cap('quads')) / 3;
  return Math.round(clamp(lower * factor));
}

export default { strength, recovery, consistency, aerobicEngine, muscleCapabilities, muscleBalance, explosivePower };
