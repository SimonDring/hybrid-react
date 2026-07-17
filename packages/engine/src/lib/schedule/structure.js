/**
 * schedule/structure — the D13 session-structuring core (M-SCHED, structuring cluster),
 * extracted VERBATIM from allocator.js (M6 sub-phase (b), extraction 2; 🔒 9).
 *
 * Turns a flat list of selected+dosed picks into a sequenced session: heavy/high-CNS work
 * runs straight-set; lower-CNS accessory/iso work pairs into non-competing supersets;
 * blocks are ordered power → primary → accessory → isoCore → health, anchored on the
 * session's lead lift. Plus `shiftRpe`, the RPE-offset post-pass. Volume is never changed.
 *
 * BYTE-IDENTICAL EXTRACTION: exactly the code that lived in allocator.js; only its home
 * changed (the golden masters prove behaviour is unchanged).
 *
 * SCOPE (M-SCHED extraction 2a): only the structuring CORE moves here — it depends solely on
 * `cnsTier` (M-DOSE), `muscleContribution`, and `REST_SECONDS`, with NO selection-side helper.
 * The session-assembly post-passes (addHypertrophyIsolation / addSupportiveFinishers /
 * injectSecondaryGoals / styleObjective / finaliseSlot) stay in allocator.js for now: they
 * depend on selection helpers (perSetMin / finisherPool / focusLabel) that only get a home
 * when M-SESS is extracted, so they travel with that extraction (2b) to avoid a cycle.
 *
 * No circular import: allocator imports FROM here; this imports only leaf helpers.
 */

import { cnsTier } from '../dose/dose.js';
import { muscleContribution } from '../plan/contributions.js';
import { REST_SECONDS } from '../../data/doseSchemes.js';

// Two exercises share a muscle? (then they compete — don't pair them).
function shareMuscle(a, b) {
  const ca = muscleContribution(a), cb = muscleContribution(b);
  for (const m in ca) if (cb[m]) return true;
  return false;
}
// Can these be supersetted? Not two heavy mains; never overlapping muscles (so
// antagonist push↔pull, or compound↔unrelated isolation, but not squat↔deadlift).
function canPair(a, b) {
  if (a.id === b.id) return false;
  if (a.role === 'primary' && b.role === 'primary') return false;
  // Don't pair two CNS-demanding moves. A 'moderate' accessory may only superset with
  // 'low' isolation/core work (high-CNS work is straight-set and never reaches here),
  // so a heavy lift's rest is never spent on another heavy lift.
  if (cnsTier(a) !== 'low' && cnsTier(b) !== 'low') return false;
  return !shareMuscle(a, b);
}

// Turn a flat list of picks (each { ex, item }) into a structured session:
// heavy mains get a non-competing filler in their rest gap; remaining accessories
// pair into antagonist/non-competing supersets. Emits items renumbered A1/A2…
// with `superset` + `group` flags for rendering. Volume is unchanged.
export function structureItems(picks) {
  const LET = 'ABCDEFGH';
  // The session OPENS on its anchor (picks[0]) — its headline lift. The anchor, every
  // primary, and every high-CNS accessory run as STRAIGHT SETS (their own block, full
  // rest); only lower-CNS work is eligible to be supersetted below. This keeps heavy /
  // neurally-demanding work — including a sport's lead lift — out of supersets, instead
  // of cramming a light isolation into its rest gap (which isn't "free" recovery).
  const anchorId = picks[0] && picks[0].ex.id;
  const isStraightSet = (p) => p.ex.role === 'primary' || cnsTier(p.ex) === 'high' || p.ex.id === anchorId;
  const mains = [], rest = [];
  picks.forEach(p => (isStraightSet(p) ? mains : rest).push(p));
  let blocks = [];

  // Core + health/mobility work is never supersetted into another block — it forms
  // its own singleton blocks so it can be sequenced cleanly at the end of the session.
  const isSupportive = (p) => p.ex.loadClass === 'health' || p.ex.pattern === 'core' || (p.item && p.item.tag === 'mobility');

  for (const m of mains) blocks.push([m]);

  // Pair the remaining (lower-CNS) work into antagonist / non-competing supersets,
  // preferring the LIGHTEST compatible partner — so it's the isolation/core work that
  // gets compressed into a rest gap, never two demanding moves crammed together.
  const cnsWeight = { low: 0, moderate: 1, high: 2 };
  const rem = rest.map((p, i) => ({ p, i }));
  const taken = new Set();
  for (let i = 0; i < rem.length; i++) {
    if (taken.has(i)) continue;
    if (isSupportive(rem[i].p)) { taken.add(i); blocks.push([rem[i].p]); continue; }
    let j = -1, bestW = Infinity;
    for (let k = i + 1; k < rem.length; k++) {
      if (taken.has(k) || isSupportive(rem[k].p)) continue;
      if (!canPair(rem[i].p.ex, rem[k].p.ex)) continue;
      const w = cnsWeight[cnsTier(rem[k].p.ex)] ?? 1;
      if (w < bestW) { bestW = w; j = k; }
    }
    if (j >= 0) { taken.add(i); taken.add(j); blocks.push([rem[i].p, rem[j].p]); }
    else { taken.add(i); blocks.push([rem[i].p]); }
  }

  // Sequence the session soundly: explosive/plyometric work first (performed
  // fresh), then heavy compound primaries, then accessories, then isoCore, then
  // health/mobility. A block ranks by its MOST important pick (min class), so a
  // heavy main paired with a calf/core filler still leads — it no longer sorts
  // behind the lone accessories it used to (the old rank took the MAX class, which
  // demoted any main+filler block). Volume is unchanged; this only reorders.
  const pickClass = (p) => {
    const role = p.effectiveRole || p.ex.role;
    if (p.ex.quality === 'power') return 0;                                  // plyo/ballistic — lead when fresh
    if (p.ex.loadClass === 'health' || (p.item && p.item.tag === 'mobility')) return 4; // prehab/mobility — last
    if (p.ex.pattern === 'core' || p.ex.loadClass === 'isoCore') return 3;   // trunk / iso filler
    if (role === 'primary') return 1;                                        // heavy compound
    return 2;                                                                // accessory
  };
  const blockRank = (blk) => Math.min(...blk.map(pickClass));

  // The session OPENS on its anchor (picks[0]) — a sport-priority lift for sport, the
  // split's fundamental compound for build. Pin it first (by design — sessions lead
  // with their most important/sport-specific work), then order the REMAINING blocks
  // power → primary → accessory → isoCore → health, so a heavy main is never buried
  // behind the lone accessory/core filler it used to sort behind.
  let anchorBlock = null;
  if (anchorId) {
    const ai = blocks.findIndex(blk => blk.some(p => p.ex.id === anchorId));
    if (ai >= 0) anchorBlock = blocks.splice(ai, 1)[0];
  }
  const ordered = blocks
    .map((blk, i) => ({ blk, i, r: blockRank(blk) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.blk);
  blocks = anchorBlock ? [anchorBlock, ...ordered] : ordered;

  const items = [];
  blocks.forEach((blk, bi) => {
    const g = LET[Math.min(bi, 7)];
    const paired = blk.length > 1;
    blk.forEach((p, pos) => {
      const restSec = (paired && pos > 0) ? REST_SECONDS.supersetB : p.item.restSec;
      items.push({ ...p.item, num: `${g}${pos + 1}`, group: g, superset: paired, restSec });
    });
  });
  return items;
}

// Readiness intensity honesty (WP-10): shift a rendered 'RPE n' by the caller's
// rpeOffset, floored (knowledge: recovery.intensity_policy). Applied BEFORE
// applyWeights, so the suggested kg drop coherently via the inverse-Epley %1RM —
// one lever, no second load model. The pure generator passes no offset (0) and is
// byte-identical.
export function shiftRpe(items, rpeOffset, rpeFloor) {
  if (!rpeOffset) return items;
  for (const it of items) {
    const m = /^RPE\s+(\d+(?:\.\d+)?)/i.exec(it.rpe || '');
    if (!m) continue;
    const n = Number(m[1]);
    if (n <= rpeFloor) continue;   // already at/below the floor — never raise, never cut further
    it.rpe = `RPE ${Math.max(rpeFloor, n + rpeOffset)}`;
  }
  return items;
}

export default { structureItems, shiftRpe };
