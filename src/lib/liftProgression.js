/**
 * liftProgression — RPE-autoregulated weight progression for the main lifts
 * (squat / bench / deadlift).
 *
 * How it works:
 *  • We track an estimated 1RM (e1RM) per lift. Week-1 targets are seeded from
 *    the maxes the user entered, or estimated from experience + bodyweight + sex.
 *  • Each session, the displayed working weight = e1RM × %1RM(reps, target RPE).
 *  • After a set, the athlete logs the weight used + the final-set RPE. That
 *    updates the e1RM: easier than target → it climbs (next week heavier); on
 *    target → a small step up; harder than target → it holds/eases back. So
 *    "did the last set feel easy?" drives next week's load, per the user's spec.
 *
 * Stored in profile.lift_log = { squat: { e1rm, rpe, at }, bench: {...}, ... }.
 * Pure functions here; the store writes the log and the engine reads e1RMs.
 */

import { getGymLevel } from './Utils.js';

// Bodyweight multipliers for an approx e1RM (male reference); female scaled below.
const STANDARDS = {
  squat:    { beginner: 0.9, returning: 1.2, intermediate: 1.5, advanced: 1.85 },
  bench:    { beginner: 0.6, returning: 0.85, intermediate: 1.1, advanced: 1.35 },
  deadlift: { beginner: 1.1, returning: 1.45, intermediate: 1.8, advanced: 2.15 }
};
// Women's lifts ≈ this fraction of men's at the same level (upper lower than lower).
const FEMALE_FACTOR = { squat: 0.75, bench: 0.6, deadlift: 0.8 };
const DEFAULT_BW = { male: 78, female: 64, other: 72 };

const round2_5 = (x) => Math.round(x / 2.5) * 2.5;

// Estimate a starting e1RM when the user didn't give a max.
export function estimateE1RM(key, level, bodyweightKg, sex) {
  const std = STANDARDS[key];
  if (!std) return null;
  const mult = std[level] ?? std.beginner;
  const bw = Number(bodyweightKg) || DEFAULT_BW[sex] || DEFAULT_BW.other;
  let e = bw * mult;
  if (sex === 'female') e *= FEMALE_FACTOR[key];
  return round2_5(e);
}

// Effective e1RMs for the three main lifts: logged → entered max → estimate.
export function resolveLifts(profile = {}) {
  const log = profile.lift_log || {};
  const inputs = profile.lifts || {};
  const level = getGymLevel(profile);
  const out = {};
  ['squat', 'bench', 'deadlift'].forEach(k => {
    const logged = log[k] && Number(log[k].e1rm);
    const input = Number(inputs[k]);
    out[k] = logged || input || estimateE1RM(k, level, profile.bodyweight_kg, profile.sex) || null;
  });
  return out;
}

// Map an exercise name → which main lift drives it + its strength factor vs that
// lift (so front/box squat etc. track the same e1RM). Barbell lifts only.
export function matchLift(name) {
  const n = (name || '').toLowerCase();
  if (/\bdb\b|dumbbell|goblet|kettlebell|\bband\b/.test(n)) return null;
  if (/bench press/.test(n)) return { key: 'bench', factor: 1 };
  if (/romanian deadlift/.test(n)) return { key: 'deadlift', factor: 0.8 };
  if (/trap-bar|hex deadlift|deadlift/.test(n) && !/romanian/.test(n)) return { key: 'deadlift', factor: 1 };
  if (/front squat/.test(n)) return { key: 'squat', factor: 0.85 };
  if (/box squat/.test(n)) return { key: 'squat', factor: 0.9 };
  if (/squat/.test(n) && /back/.test(n) && !/split/.test(n)) return { key: 'squat', factor: 1 };
  return null;
}

export function parseReps(sets) { const m = /×\s*(\d+)/.exec(sets || ''); return m ? Number(m[1]) : null; }
export function parseRpe(rpe) { const m = /(\d+)/.exec(rpe || ''); return m ? Number(m[1]) : 8; }

// New e1RM from a logged top set, autoregulated by how it compared to target RPE.
export function nextE1RM({ weight, reps, rpe, targetRpe = 8, factor = 1 }) {
  const w = Number(weight); const r = Number(reps); const re = Number(rpe);
  if (!w || !r || !re) return null;
  const rir = Math.max(0, 10 - re);
  const fresh = (w * (1 + (r + rir) / 30)) / factor;   // base-lift e1RM implied by this set
  const delta = (targetRpe || 8) - re;                  // + = easier than target
  const step = delta >= 0 ? Math.max(0.01, delta * 0.02) : delta * 0.02;
  return round2_5(fresh * (1 + step));
}

// Annotate a session's barbell main lifts with a target working weight from the
// tracked e1RMs: weight = e1RM × lift-factor × %1RM(reps, reps-in-reserve). Items
// that aren't a tracked barbell lift (dumbbell, bodyweight, no max) are left as-is.
// Mutates + returns `items`. Shared by the strength engine and the allocator.
export function applyWeights(items = [], lifts = {}) {
  for (const it of items) {
    const m = matchLift(it.name);
    if (!m) continue;
    const oneRM = Number(lifts[m.key]);
    const reps = parseReps(it.sets);
    if (!oneRM || !reps) continue;
    const rir = Math.max(0, 10 - parseRpe(it.rpe));
    const pct = 1 / (1 + (reps + rir) / 30);   // Epley inverse
    it.weight = `${round2_5(oneRM * m.factor * pct)} kg`;
  }
  return items;
}

// The main barbell lifts present in a session (for the top-set logging UI).
// Returns one entry per lift key (the primary A-slot item).
export function trackedLiftsInSession(session) {
  const out = [];
  const seen = new Set();
  (session.items || []).forEach(it => {
    const m = matchLift(it.name);
    const reps = parseReps(it.sets);
    if (!m || !reps || seen.has(m.key)) return;
    seen.add(m.key);
    out.push({ key: m.key, factor: m.factor, name: it.name, reps, targetRpe: parseRpe(it.rpe), target: it.weight });
  });
  return out;
}

export default { estimateE1RM, resolveLifts, matchLift, applyWeights, nextE1RM, trackedLiftsInSession, parseReps, parseRpe };
