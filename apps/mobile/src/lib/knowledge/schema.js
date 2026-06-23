/**
 * Knowledge-base schema — the contract every scientific KnowledgeEntry obeys.
 *
 * The engine consumes entry VALUES; the provenance (evidenceLevel / source /
 * confidence / lastReviewed) makes every number auditable and lets the science
 * evolve without touching engine logic. See docs/engine/01-PANEL-REVIEW.md §13.
 *
 * @typedef {Object} KnowledgeEntry
 * @property {string}  id            unique dotted id, e.g. 'volume.landmarks'
 * @property {string}  rule          one-line human statement of the rule
 * @property {*}       value         the value the engine consumes (number|object|boolean|string|…)
 * @property {'L1'|'L2'|'L3'|'L4'|'L5'} evidenceLevel  L1 = meta/systematic review … L5 = expert opinion
 * @property {string}  source        citation(s)
 * @property {'high'|'moderate'|'low'} confidence
 * @property {string}  lastReviewed  'YYYY-MM-DD'
 * @property {string[]} appliesTo    engine areas that consume it, e.g. ['load']
 */

export const EVIDENCE_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const CONFIDENCE = ['high', 'moderate', 'low'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate one entry. @returns {string[]} errors (empty array = valid). */
export function validateEntry(e) {
  if (!e || typeof e !== 'object') return ['entry is not an object'];
  const errs = [];
  const id = e.id || '(no id)';
  if (typeof e.id !== 'string' || !e.id) errs.push(`${id}: id must be a non-empty string`);
  if (typeof e.rule !== 'string' || !e.rule) errs.push(`${id}: rule must be a non-empty string`);
  if (!('value' in e)) errs.push(`${id}: value is required`);
  if (!EVIDENCE_LEVELS.includes(e.evidenceLevel)) errs.push(`${id}: evidenceLevel must be one of ${EVIDENCE_LEVELS.join('/')}`);
  if (typeof e.source !== 'string' || !e.source) errs.push(`${id}: source must be a non-empty string`);
  if (!CONFIDENCE.includes(e.confidence)) errs.push(`${id}: confidence must be one of ${CONFIDENCE.join('/')}`);
  if (typeof e.lastReviewed !== 'string' || !DATE_RE.test(e.lastReviewed)) errs.push(`${id}: lastReviewed must be 'YYYY-MM-DD'`);
  if (!Array.isArray(e.appliesTo) || e.appliesTo.length === 0) errs.push(`${id}: appliesTo must be a non-empty string[]`);
  return errs;
}

/** Validate a registry array (every entry valid + ids unique). @returns {{ok, errors}} */
export function validateRegistry(entries) {
  if (!Array.isArray(entries)) return { ok: false, errors: ['registry is not an array'] };
  const errors = [];
  const seen = new Set();
  for (const e of entries) {
    errors.push(...validateEntry(e));
    if (e && e.id) { if (seen.has(e.id)) errors.push(`duplicate id: ${e.id}`); seen.add(e.id); }
  }
  return { ok: errors.length === 0, errors };
}

export default { EVIDENCE_LEVELS, CONFIDENCE, validateEntry, validateRegistry };
