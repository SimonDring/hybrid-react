/**
 * kb — the read interface over the evidence knowledge base (./entries.js).
 *
 * Engine modules consume VALUES via kb.value(id); reviewers and the /dev surface can
 * read the full entry (with provenance). New science = a new/edited entry in
 * entries.js, not an engine change. See docs/engine/01-PANEL-REVIEW.md §13.
 */
import { ENTRIES } from './entries.js';
import { validateRegistry } from './schema.js';

const BY_ID = new Map(ENTRIES.map(e => [e.id, e]));

/** Full entry (value + provenance). Throws on unknown id — a fail-fast typo guard. */
export function get(id) {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`knowledge base: unknown entry "${id}"`);
  return e;
}

/** The value the engine consumes. Throws on unknown id. */
export function value(id) { return get(id).value; }

export function has(id) { return BY_ID.has(id); }
export function all() { return ENTRIES.slice(); }
export function byTag(tag) { return ENTRIES.filter(e => e.appliesTo.includes(tag)); }

/** Validate the whole registry against the schema. @returns {{ok, errors}} */
export function validate() { return validateRegistry(ENTRIES); }

/** Entries whose lastReviewed is older than `months` — drives a staleness check. */
export function staleEntries(months = 18, asOf = new Date()) {
  const cutoff = new Date(asOf);
  cutoff.setMonth(cutoff.getMonth() - months);
  return ENTRIES.filter(e => new Date(e.lastReviewed + 'T00:00:00') < cutoff);
}

export default { get, value, has, all, byTag, validate, staleEntries };
