/**
 * version — the provenance every engine output carries (WP-27; TAS traceability).
 *
 * ENGINE_VERSION versions the DECISION LOGIC: bump it when a change alters what
 * the engine prescribes (a golden-master re-baseline is the usual tell).
 * KNOWLEDGE_SET_VERSION lives with the knowledge base (knowledge/entries.js)
 * and bumps when the science — entries or data tables — changes.
 *
 * Keep ENGINE_VERSION in sync with packages/engine/package.json "version".
 */
import { KNOWLEDGE_SET_VERSION } from './lib/knowledge/entries.js';

export const ENGINE_VERSION = '1.0.0';

/** The stamp attached to every plan / reflow output. */
export function provenance() {
  return { engineVersion: ENGINE_VERSION, knowledgeSetVersion: KNOWLEDGE_SET_VERSION };
}
