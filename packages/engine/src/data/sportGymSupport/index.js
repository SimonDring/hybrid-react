// src/data/sportGymSupport/index.js
/**
 * Sport gym-support registry — RELOCATED knowledge (Sprint 9 19c): these tables are
 * coaching knowledge, not engine logic, so they live in data/ (Constitution Art 17).
 * Values verbatim from the former lib/sports/* modules — byte-identical.
 *
 * STATUS after Sprint 9 (what each field still drives):
 *   emphasis          → weekly muscle targets + split-region weights (ALL sport paths;
 *                       WP-23 derives this from the SKB demand profile instead)
 *   periodization     → block templates per season (SKB seasonalModel is narrative
 *                       and cannot carry these yet; folds into the SKB at WP-23)
 *   systemicFactor / seasonModifiers → the sportLoad volume scalar
 *   priorityExercises → the LEGACY fill only: gaa/rugby/soccer, and the safety
 *                       fallback for a D11 sport with an empty diagnosis. Run/cycle
 *                       selection is rating-based (19a); swim is category-led (WP-20)
 *                       — neither reads these lists any more.
 *   power             → the power-work gate (all sport paths)
 * The SKB (src/data/sport-knowledge/) is the PRIMARY sport model; this table is the
 * residue that retires with the legacy fill (WP-23). One vocabulary lands there too.
 *
 * `get(id)` returns undefined for an unknown sport (callers fall back to generic
 * sport defaults) — unlike the knowledge base, an unknown sport id is a legitimate
 * runtime case, not a code typo.
 */
import { running } from './running.js';
import { cycling } from './cycling.js';
import { swimming } from './swimming.js';
import { rugby } from './rugby.js';
import { soccer } from './soccer.js';
import { gaa } from './gaa.js';
import { triathlon } from './triathlon.js';
import { validateRegistry } from './_schema.js';

// Order is irrelevant to behaviour; alphabetical-ish by introduction.
const MODULES = [running, cycling, swimming, rugby, soccer, gaa, triathlon];

const BY_ID = new Map(MODULES.map(m => [m.id, m]));

export function get(id) { return BY_ID.get(id); }
export function has(id) { return BY_ID.has(id); }
export function all() { return MODULES.slice(); }
export function ids() { return MODULES.map(m => m.id); }

/** Validate every registered module against the SportModule contract. */
export function validate() { return validateRegistry(MODULES); }

export default { get, has, all, ids, validate };
