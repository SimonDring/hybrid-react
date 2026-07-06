/**
 * despine — post-schedule refinement. The scheduler spaces high-axial sessions
 * apart, but on tight weeks one can still land the day after another. Here we keep
 * the spine recovering: on a training day whose PREVIOUS training day was high-axial
 * (and adjacent), swap that day's high-axial, intent-tagged lifts for the lowest-
 * axial member of the same intent (e.g. barbell row → chest-supported row), then
 * re-apply the suggested weight. Pure-ish: mutates the items it swaps; returns the
 * sessions. Sessions must carry `dayIdx`, `axialLoad`, and items may carry `intent`.
 */
import { EXERCISES } from '../../data/strengthExercises.js';
import { applyWeights } from '../liftProgression.js';
import { HIGH_DAY_THRESHOLD, axialOf } from './axial.js';

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const dist = (a, b) => { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); };

// Ordering class for a rendered item — mirrors the allocator's pickClass so a
// re-ordered session sequences the same way: power(0) < primary(1) < accessory(2)
// < isoCore(3) < health/mobility(4).
const LETTERS = 'ABCDEFGH';
function itemClass(it) {
  const ex = BY_NAME.get(String(it.name || '').toLowerCase());
  if (it.tag === 'mobility' || (ex && ex.loadClass === 'health')) return 4;
  if (!ex) return 2;
  if (ex.quality === 'power') return 0;
  if (ex.pattern === 'core' || ex.loadClass === 'isoCore') return 3;
  return ex.role === 'primary' ? 1 : 2;
}

// Re-sequence a session after a de-spine swap: de-spining a primary (e.g. back squat)
// to an accessory (goblet squat) must not leave it ahead of a real primary (bench).
// Mirrors the allocator: keep the anchor (group-A block) leading ONLY if it's still
// power/primary; otherwise sort the working blocks by class so the heaviest remaining
// lift leads. Leading non-working items (the functional primer, group 'P…') stay put.
function reorderSession(items) {
  const lead = items.filter(it => !/^[A-H]$/.test(it.group || ''));
  const work = items.filter(it => /^[A-H]$/.test(it.group || ''));
  if (work.length < 2) return items;
  const blocks = []; const byG = new Map();
  for (const it of work) {
    if (!byG.has(it.group)) { byG.set(it.group, []); blocks.push(byG.get(it.group)); }
    byG.get(it.group).push(it);
  }
  const rank = (blk) => Math.min(...blk.map(itemClass));
  let anchor = null;
  if (rank(blocks[0]) <= 1) anchor = blocks.shift();   // power/primary anchor stays first
  const ordered = blocks
    .map((blk, i) => ({ blk, i, r: rank(blk) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.blk);
  const finalBlocks = anchor ? [anchor, ...ordered] : ordered;
  const out = [];
  finalBlocks.forEach((blk, bi) => {
    const g = LETTERS[Math.min(bi, 7)];
    blk.forEach((it, pos) => { it.group = g; it.num = `${g}${pos + 1}`; out.push(it); });
  });
  return [...lead, ...out];
}

export function despineWeek(sessions = [], { priorityByIntent = new Map(), lifts = {}, level = 'intermediate', bodyweight = null, blockedNameRegexes = [] } = {}) {
  // WP-40: a de-spine swap is a SELECTION and must honour runtime contraindications —
  // without this, despine could re-introduce an injury-blocked lift AFTER the allocator
  // (legacy or D11) deliberately avoided it. The pure generator passes none.
  const isBlocked = (ex) => blockedNameRegexes.length > 0 && blockedNameRegexes.some((r) => r.test(ex.name));
  const ordered = [...sessions].sort((a, b) => (a.dayIdx ?? 0) - (b.dayIdx ?? 0));
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1], cur = ordered[i];
    if ((prev.axialLoad || 0) < HIGH_DAY_THRESHOLD) continue;       // prior day wasn't spine-heavy
    if (dist(cur.dayIdx ?? 0, prev.dayIdx ?? 0) > 1) continue;       // not adjacent → spacing handled it
    let swapped = false;
    for (const it of cur.items || []) {
      const ex = BY_NAME.get(String(it.name || '').toLowerCase());
      if (!ex || axialOf(ex) < 2 || !it.intent) continue;           // only de-spine high-axial intent lifts
      const cands = priorityByIntent.get(it.intent) || [];
      // lowest-axial available candidate of this intent
      let best = null, bestAx = Infinity;
      for (const id of cands) { const c = BY_ID.get(id); if (c && !isBlocked(c) && axialOf(c) < bestAx) { best = c; bestAx = axialOf(c); } }
      if (best && best.id !== ex.id && bestAx < axialOf(ex)) {
        it.name = best.name; it.exId = best.id; it.weight = undefined; swapped = true;
      }
    }
    if (swapped) {
      applyWeights(cur.items, lifts, level, bodyweight);   // refresh suggested loads
      cur.items = reorderSession(cur.items);               // keep the heaviest lift leading
    }
  }
  return sessions;
}

export default { despineWeek };
