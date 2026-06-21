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

import { resolveLifts } from '../liftProgression.js';
import STANDARDS from '../../data/strengthStandards.js';
import { computeReadiness } from '../Readiness.js';
import { consistencyGoal } from '../goals.js';
import { resolveProgram } from '../strength/program.js';
import { getGymLevel } from '../Utils.js';

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Which muscles each tracked lift develops (used to spread strength → capability).
const LIFT_MUSCLES = {
  squat: ['quads', 'glutes', 'core'],
  deadlift: ['back', 'hamstrings', 'glutes'],
  bench: ['chest', 'triceps', 'shoulders']
};
const LEVEL_BASE = { beginner: 32, returning: 40, intermediate: 55, advanced: 70 };

// Per-lift score = how close the e1RM-to-bodyweight ratio sits to the elite standard.
function liftScores(profile) {
  const lifts = resolveLifts(profile);
  const bw = Number(profile.bodyweight_kg) || null;
  const sex = profile.sex === 'female' ? 'female' : 'male';
  const out = {};
  for (const key of ['squat', 'bench', 'deadlift']) {
    const e1rm = lifts[key];
    const table = STANDARDS[sex] && STANDARDS[sex][key];
    if (!e1rm || !bw || !table || !table.elite) continue;
    out[key] = clamp((e1rm / bw) / table.elite * 100);
  }
  return out;
}

// Overall strength score — average of the tracked lifts vs elite. null if untracked.
export function strength(profile) {
  const vals = Object.values(liftScores(profile));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
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
