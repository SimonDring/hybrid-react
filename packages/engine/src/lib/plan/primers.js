/**
 * buildPrimer — derive a movement-specific PRIMER for a session and tag every item
 * with the section it belongs to ('primer' | 'main').
 *
 * A primer is 1–2 short activation moves matched to the day's main lifts (see
 * data/primers.js). We look at the session's working items, find which movement
 * PATTERNS they cover, pull the matching primer move for each (de-duplicated and
 * capped so the primer stays short), swap any move whose kit the athlete lacks for
 * its no-equipment alternative, and number them P1, P2…
 *
 * Pure function. The caller (PlanService) concatenates [...primer, ...main] when it
 * surfaces the session to the UI. Primer moves are tagged `mobility`, so they add
 * ZERO counted muscle volume — exactly like the old functional primer.
 */

import { availableEquip } from '../../data/strengthExercises.js';
import { PRIMERS } from '../../data/primers.js';

const MAX_PRIMER_MOVES = 3;

// Map an exercise NAME to a primer pattern key (or null for isolation / non-compound
// work that needs no priming). Session items only carry a name, not the engine's
// `pattern` field, so we classify from the name. Order matters: hinge & squat are
// checked before the press patterns so "leg press" → squat (not a horizontal press),
// and vertical press is checked before horizontal so "DB shoulder press" → vpush.
export function patternForName(name) {
  const n = (name || '').toLowerCase();
  if (/deadlift|romanian|\brdl\b|hip thrust|hip hinge|good morning|kettlebell swing|\bswing\b|back extension/.test(n)) return 'hinge';
  if (/squat|leg press|lunge|split squat|step-?up|hack/.test(n)) return 'squat';
  if (/overhead|shoulder press|\bohp\b|military|arnold|push press/.test(n)) return 'vpush';
  if (/bench|chest press|push-?up|\bdip\b|incline press|floor press|db press|dumbbell press/.test(n)) return 'hpush';
  if (/\brow\b|pull-?up|chin-?up|lat pulldown|pulldown|face-?pull|pull-?apart/.test(n)) return 'pull';
  return null;
}

// Should this item drive a primer? Skip work that's already prep / not loaded
// strength: existing mobility, an already-tagged primer, or rehab moves.
function isWorkingItem(it) {
  return it && it.tag !== 'mobility' && it.section !== 'primer' && !it.rehab && !it.prevention;
}

/**
 * @param {object} session   a session spec with an `items` array
 * @param {object} opts      { access: equipment keys/tiers }
 * @returns {{ primer: object[], main: object[] }}
 */
export function buildPrimer(session, { access = [] } = {}) {
  const items = (session && session.items) || [];
  const have = availableEquip(access);

  // First-seen pattern order — the allocator puts primary compounds first, so this
  // naturally primes the day's main lifts before any accessory.
  const seen = [];
  for (const it of items) {
    if (!isWorkingItem(it)) continue;
    const p = patternForName(it.name);
    if (p && PRIMERS[p] && !seen.includes(p)) seen.push(p);
    if (seen.length >= MAX_PRIMER_MOVES) break;
  }

  const primer = seen.map((p, i) => {
    let move = PRIMERS[p][0];
    // Swap for the no-kit alternative when the athlete lacks the move's equipment.
    if (move.equip && move.equip !== 'bodyweight' && !have.has(move.equip) && move.alt) {
      move = move.alt;
    }
    return {
      num: `P${i + 1}`,
      name: move.name,
      sets: move.sets,
      rpe: move.rpe,
      note: move.note,
      restSec: move.restSec ?? 0,
      tag: 'mobility',
      equip: move.equip,
      section: 'primer'
    };
  });

  const main = items.map(it => ({ ...it, section: 'main' }));
  return { primer, main };
}

export default { buildPrimer, patternForName };
