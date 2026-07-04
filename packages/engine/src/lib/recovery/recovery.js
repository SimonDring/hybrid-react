// src/lib/recovery/recovery.js
/**
 * recovery — turns the day's recovery signals into a normalized RecoveryOutput that
 * the programming engine consumes. It blends OBJECTIVE wearable readiness
 * (sleep / HRV / RHR, already computed by Readiness.js) with SUBJECTIVE wellness
 * (energy / soreness / mood / stress / sleep quality), weighting the subjective at
 * LEAST as heavily as the objective — Saw, Main & Gastin 2016 (BJSM) found subjective
 * self-report MORE sensitive to the training response than HRV/RHR (knowledge base:
 * readiness.subjective_priority). Illness / travel raise a session override.
 *
 * Pure, no IO. The orchestrator (PlanService) consumes the contract; it never reaches
 * back into wearable internals. See docs/engine/01-PANEL-REVIEW.md §3.3 / §6 / §9.
 *
 * @typedef {Object} RecoveryOutput
 * @property {'high'|'moderate'|'low'|'unknown'} readinessLevel
 * @property {number} volumeModifier     0.78..1.0 — scales the session's volume / length
 * @property {number} intensityModifier  0.85..1.0 — scales load/RPE (1.0 today; reserved)
 * @property {null|'easy'|'rest'|'deload'} sessionOverride
 * @property {number|null} score          0..100 blended readiness (bands + diagnostics)
 */

// Subjective wellness (the Wellness Index) is the leaf maths now — imported and
// re-exported here so existing importers of `subjectiveScore` from this module keep
// working while the index layer owns the single implementation.
import { subjectiveScore } from '../indices/wellnessIndex.js';
import { recoveryIndex } from '../indices/recoveryIndex.js';
import kb from '../knowledge/kb.js';
export { subjectiveScore };

// Bands + volume modifiers are governed knowledge (recovery.bands /
// recovery.volume_modifiers) — the cut-points carry provenance and can be reviewed
// without touching this logic. greenCut stays a parameter: the v2 readiness
// weighting passes 67 explicitly; the KB value is the default.
const BANDS = kb.value('recovery.bands');
const VOL_MOD = kb.value('recovery.volume_modifiers');

function bandFromScore(score, greenCut = BANDS.greenCut) {
  if (score == null) return 'unknown';
  if (score >= greenCut) return 'high';
  if (score >= BANDS.moderateCut) return 'moderate';
  return 'low';
}

function volumeFromScore(score, greenCut = BANDS.greenCut) {
  if (score == null) return VOL_MOD.high;
  if (score >= greenCut) return VOL_MOD.high;
  if (score >= BANDS.moderateCut) return VOL_MOD.moderate;
  return VOL_MOD.low;
}

/**
 * @param {Object} inputs
 * @param {number|null} inputs.objectiveScore  0..100 wearable readiness (Readiness.js)
 * @param {Object|null} inputs.subjective       { sleepQuality, soreness, mood, stress, energy } (1–5)
 * @param {boolean} inputs.illness
 * @param {boolean} inputs.travel
 * @returns {RecoveryOutput}
 */
export function assessRecovery({ objectiveScore = null, subjective = null, illness = false, travel = false, source } = {}) {
  // The blended score is produced by the Recovery Index (single source of truth); the
  // blend is identical (0.6 subjective / 0.4 objective, Saw 2016), so behaviour is
  // unchanged through the cut-over. The index also yields a confidence we surface.
  const ri = recoveryIndex({ objectiveScore, subjective, source });
  const score = ri.value;

  // Session override: illness > travel. Pure fatigue (low readiness + poor session
  // recovery) and rock-bottom readiness are composed downstream with session-recovery
  // feedback, so behaviour is unchanged when no illness/travel flag is set.
  let sessionOverride = null;
  if (illness) sessionOverride = 'rest';
  else if (travel) sessionOverride = 'easy';

  return {
    readinessLevel: bandFromScore(score),
    volumeModifier: volumeFromScore(score),
    intensityModifier: 1,   // reserved — readiness does not yet scale intensity
    sessionOverride,
    score,
    confidence: ri.confidence   // additive: how much to trust the score (0–1)
  };
}

/**
 * Build a RecoveryOutput from a precomputed 0–100 readiness score — the v2 hand-off,
 * where the Readiness Index value drives adaptation instead of the legacy blend.
 * Same contract + illness/travel override semantics as assessRecovery. greenCut
 * defaults to 70 (legacy); the v2 weighting passes 67.
 *
 * @param {number|null} score
 * @param {{illness?:boolean, travel?:boolean, confidence?:number, greenCut?:number}} opts
 * @returns {RecoveryOutput}
 */
export function recoveryFromScore(score = null, { illness = false, travel = false, confidence, greenCut = 70 } = {}) {
  let sessionOverride = null;
  if (illness) sessionOverride = 'rest';
  else if (travel) sessionOverride = 'easy';
  return {
    readinessLevel: bandFromScore(score, greenCut),
    volumeModifier: volumeFromScore(score, greenCut),
    intensityModifier: 1,
    sessionOverride,
    score,
    confidence
  };
}

export default { assessRecovery, recoveryFromScore, subjectiveScore };
