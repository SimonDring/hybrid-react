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

export const ENGINE_VERSION = '1.4.0'; // 1.4.0 (2026-07-09, retire-legacy P4): deriveSeason gains a season-WINDOW mode — a season-based athlete's phase is derived from first_game_date..last_game_date (pre/in/transition/off), boundaries from the SKB meta. No window / single-event / intent paths unchanged (byte-identical). // 1.3.0 (2026-07-09, retire-legacy P2): resolveProgram derives the priority list from the exerciseLibrary instead of a curated list. // 1.2.0 (2026-07-09, retire-legacy P1): program/sportLoad/periodization/constraints read sport gym-support (emphasis/priority/power/systemicFactor/seasonVolume/periodization/keyMuscles) from the SKB gymSupport section instead of the legacy sportGymSupport modules — byte-identical (values relocated verbatim). 1.1.0 (2026-07-09): season-phased SKB (Approach A) — resolveProgram reads per-phase SKB emphasis; the allocator's round-out pass covers a sport's derived under-developed patterns on an off-season round-out session. Gated on a programming block → byte-identical for un-migrated sports.

/** The stamp attached to every plan / reflow output. */
export function provenance() {
  return { engineVersion: ENGINE_VERSION, knowledgeSetVersion: KNOWLEDGE_SET_VERSION };
}
