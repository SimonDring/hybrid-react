/**
 * Wellness Index — the subjective, self-reported dimension that leads physiology.
 *
 * Subjective wellness is at least as sensitive to the training response as objective
 * HRV/RHR (knowledge base: readiness.subjective_priority — Saw, Main & Gastin 2016).
 * Each item is 1–5 where 5 = best, INCLUDING soreness (5 = no soreness) and stress
 * (5 = calm). This module is also the home of `subjectiveScore` (re-exported by
 * recovery.js for back-compat), so the leaf maths lives in one place and the
 * index layer has no import cycle. Pure, no IO.
 *
 * See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md §3.6.
 */
import { makeIndex } from './contract.js';

const ITEMS = ['sleepQuality', 'soreness', 'mood', 'stress', 'energy'];

/** Subjective wellness → 0..100 (mean of present 1–5 items; null if none). */
export function subjectiveScore(s = {}) {
  const vals = ITEMS.map(k => s[k]).filter(v => v != null && !Number.isNaN(Number(v))).map(Number);
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(((mean - 1) / 4) * 100); // 1 → 0, 5 → 100
}

/**
 * @param {object} subjective  { sleepQuality, soreness, mood, stress, energy } (1–5)
 * @returns index contract
 */
export function wellnessIndex(subjective = {}) {
  const value = subjectiveScore(subjective);
  const parts = ITEMS.map(k => ({
    name: k,
    present: subjective[k] != null && !Number.isNaN(Number(subjective[k])),
    value: subjective[k] ?? null,
    weight: 1,
    source: 'manual',
    baselineMaturity: 1
  }));
  return makeIndex({ value, parts });
}

export default { wellnessIndex, subjectiveScore };
