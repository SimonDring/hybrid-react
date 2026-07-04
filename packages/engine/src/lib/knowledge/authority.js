/**
 * authority — how much a piece of knowledge is ALLOWED to influence a decision.
 *
 * Constitution Art 13 / EDS §28.3: evidence confidence must be operative, not
 * decorative. Every KnowledgeEntry already carries confidence; this module turns
 * that into a decision-facing authority tier, so "contested science can't make
 * strong calls" is a mechanism the code enforces rather than a convention each
 * consumer re-implements ad hoc.
 *
 * Tiers (the maximum influence an entry may exert on any decision):
 *   'gate'     — may force or veto a decision on its own.
 *   'soft'     — may scale/adjust a decision on its own, within its rule.
 *   'reported' — surfaced in rationale; may adjust only within conservative
 *                floors and may CORROBORATE a decision; never acts alone.
 *
 * The confidence→authority mapping is itself governed knowledge (KA Domain 10,
 * entry 'knowledge.authority.mapping') — changing what "low confidence" is
 * allowed to do is a knowledge change with provenance, not a code change.
 *
 * First consumers: the ACWR handling in load/ + plan/trainingLoad.js, where the
 * Impellizzeri/Lolli demotion (ACWR alone never cuts hard, never forces a
 * deload) was previously hardwired. Behaviour is identical; the reason is now
 * readable from the knowledge base.
 */
import kb from './kb.js';

/**
 * The authority tier of a knowledge entry.
 * @param {string|object} entryOrId — a KB entry id, or an entry-shaped object
 *   (anything with a valid `confidence`) so callers/tests can evaluate
 *   hypothetical entries without registering them.
 * @returns {'gate'|'soft'|'reported'}
 */
export function authorityOf(entryOrId) {
  const entry = typeof entryOrId === 'string' ? kb.get(entryOrId) : entryOrId;
  if (!entry || typeof entry !== 'object') throw new Error('authorityOf: entry or id required');
  const mapping = kb.value('knowledge.authority.mapping');
  const tier = mapping[entry.confidence];
  if (!tier) throw new Error(`authorityOf: no authority mapping for confidence "${entry.confidence}"`);
  return tier;
}

/** May this entry force/veto a decision on its own? */
export function mayForceAlone(entryOrId) { return authorityOf(entryOrId) === 'gate'; }

/** May this entry scale a decision on its own (without conservative floors)? */
export function mayScaleAlone(entryOrId) { return authorityOf(entryOrId) !== 'reported'; }

export default { authorityOf, mayForceAlone, mayScaleAlone };
