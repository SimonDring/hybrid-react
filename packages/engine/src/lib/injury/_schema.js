// src/lib/injury/_schema.js
/**
 * InjuryProfile contract for the data-driven injury layer.
 *
 * Each region (body_part_key) is a structured profile: phase-staged contraindications
 * (Protect → Early Motion → Loading → Return-to-Sport), risk factors, an evidence-based
 * PREVENTION protocol with dosing + provenance, and return-to-performance notes. Adding
 * an injury = a new profile entry; injuryRules / injuryFilter don't change.
 *
 * Contraindications are still matched against the rendered exercise NAME (session items
 * carry only a name, not the exercise `pattern`), so each phase is an array of RegExp —
 * this preserves the exact prior blocking behaviour while moving the KNOWLEDGE into
 * auditable per-region data with citations. See docs/engine/01-PANEL-REVIEW.md §3.5 / §9.
 *
 * @typedef {Object} PreventionExercise
 * @property {string} id            exercise id (e.g. 'copenhagen')
 * @property {string} dosing        e.g. '3×/wk pre-season, 1×/wk in-season; 3 progressions'
 * @property {string} [progression] how to advance
 * @property {string} [evidenceId]  knowledge-base entry id (provenance + confidence)
 *
 * @typedef {Object} InjuryProfile
 * @property {string} region        body_part_key, e.g. 'hamstring'
 * @property {string} label
 * @property {{protect:RegExp[], early_motion:RegExp[], loading:RegExp[], return_to_sport:RegExp[]}} contraindications
 * @property {string[]} riskFactors
 * @property {PreventionExercise[]} preventionExercises
 * @property {string[]} returnToPerformance
 */

export const PHASES = ['protect', 'early_motion', 'loading', 'return_to_sport'];

const isRegexArray = (a) => Array.isArray(a) && a.every(r => r && typeof r.test === 'function');

/** Validate one InjuryProfile. @returns {string[]} errors (empty = valid). */
export function validateInjuryProfile(p) {
  if (!p || typeof p !== 'object') return ['injury profile is not an object'];
  const errs = [];
  const id = p.region || '(no region)';
  if (typeof p.region !== 'string' || !p.region) errs.push(`${id}: region must be a non-empty string`);
  if (typeof p.label !== 'string' || !p.label) errs.push(`${id}: label required`);
  if (!p.contraindications || typeof p.contraindications !== 'object') errs.push(`${id}: contraindications object required`);
  else for (const ph of PHASES) if (!isRegexArray(p.contraindications[ph])) errs.push(`${id}: contraindications.${ph} must be a RegExp[]`);
  if (!Array.isArray(p.riskFactors)) errs.push(`${id}: riskFactors must be an array`);
  if (!Array.isArray(p.preventionExercises)) errs.push(`${id}: preventionExercises must be an array`);
  else p.preventionExercises.forEach((e, i) => { if (!e || !e.id || !e.dosing) errs.push(`${id}: preventionExercises[${i}] needs id + dosing`); });
  if (!Array.isArray(p.returnToPerformance)) errs.push(`${id}: returnToPerformance must be an array`);
  return errs;
}

/** Validate a registry map (region key matches profile.region + each valid). */
export function validateRegistry(profilesByRegion) {
  const errors = [];
  for (const [key, p] of Object.entries(profilesByRegion || {})) {
    errors.push(...validateInjuryProfile(p));
    if (p && p.region && p.region !== key) errors.push(`${key}: region field "${p.region}" must match its map key`);
  }
  return { ok: errors.length === 0, errors };
}

export default { PHASES, validateInjuryProfile, validateRegistry };
