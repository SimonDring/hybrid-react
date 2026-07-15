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
 * @property {number} rpeOffset           0 | -1 — target-RPE shift by readiness band (WP-10,
 *                                        knowledge: recovery.intensity_policy); loads follow
 * @property {number} intensityModifier  superseded by rpeOffset (still emitted as 1)
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
const INTENSITY = kb.value('recovery.intensity_policy');

// Readiness → target-RPE offset (intensity honesty). Governed knowledge; the
// allocator applies it before weights are computed, so load follows RPE.
function rpeOffsetFromScore(score, greenCut = BANDS.greenCut) {
  const band = bandFromScore(score, greenCut);
  return band === 'unknown' ? 0 : (INTENSITY.rpeOffsetByBand[band] || 0);
}

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

// ── Signal-confidence gate on the readiness-driven cut (TR-13/SR-04; Art 13 — confidence
// governs authority). The volume/intensity CUT is scaled by how much we trust the signal
// (its input completeness × source reliability × baseline maturity × recency, already
// blended into `confidence`): at/above FULL_AUTHORITY_CONFIDENCE the cut applies in FULL;
// below it the cut is bounded toward the plan — never less than MIN_RETAINED_FRACTION of it
// (uncertainty widens the margin toward the established trajectory, never halts) — so one
// un-baselined OR stale wellness entry can NUDGE, never swing, volume. rpeOffset is discrete,
// so intensity is eased only at/above RPE_AUTHORITY_CONFIDENCE. These constants live beside the
// confidence model they consume (as readinessIndex's V2_WEIGHTS do); the reliability + maturity
// inputs are the governed/derived signal. The gate is INERT unless a confidence is supplied, so
// every legacy caller (no confidence → full authority) is byte-identical.
const FULL_AUTHORITY_CONFIDENCE = 0.5;
const MIN_RETAINED_FRACTION = 0.15;
const RPE_AUTHORITY_CONFIDENCE = 0.5;

/** Fraction (MIN_RETAINED_FRACTION..1) of a readiness cut to apply at this confidence. */
function authorityGate(confidence) {
  if (confidence == null) return 1;                    // no confidence → legacy full authority
  const c = Math.max(0, Math.min(1, confidence));
  const scaled = MIN_RETAINED_FRACTION + (1 - MIN_RETAINED_FRACTION) * (c / FULL_AUTHORITY_CONFIDENCE);
  return Math.max(MIN_RETAINED_FRACTION, Math.min(1, scaled));
}

/** Scale a volume modifier's CUT (its distance below 1.0) by the confidence gate. */
function gateVolume(modifier, confidence) {
  if (confidence == null || modifier >= 1) return modifier;
  return Math.round((1 - (1 - modifier) * authorityGate(confidence)) * 1000) / 1000;
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
    rpeOffset: rpeOffsetFromScore(score),
    intensityModifier: 1,   // superseded by rpeOffset; kept for shape-compat
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
  // Confidence gates the CUT: a low-confidence (immature-baseline / stale / single-entry)
  // signal produces a bounded, small adjustment; a mature, high-confidence one keeps full
  // authority (TR-13/SR-04). Inert when confidence is absent → legacy behaviour preserved.
  const rawRpe = rpeOffsetFromScore(score, greenCut);
  return {
    readinessLevel: bandFromScore(score, greenCut),
    volumeModifier: gateVolume(volumeFromScore(score, greenCut), confidence),
    rpeOffset: (confidence == null || confidence >= RPE_AUTHORITY_CONFIDENCE) ? rawRpe : 0,
    intensityModifier: 1,   // superseded by rpeOffset; kept for shape-compat
    sessionOverride,
    score,
    confidence
  };
}

export default { assessRecovery, recoveryFromScore, subjectiveScore };
