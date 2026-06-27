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

const HIGH_DAY_THRESHOLD = 3;
const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const axialOf = (ex) => (ex && ex.axialLoad != null ? ex.axialLoad : 0);
const dist = (a, b) => { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); };

export function despineWeek(sessions = [], { priorityByIntent = new Map(), lifts = {}, level = 'intermediate', bodyweight = null } = {}) {
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
      for (const id of cands) { const c = BY_ID.get(id); if (c && axialOf(c) < bestAx) { best = c; bestAx = axialOf(c); } }
      if (best && best.id !== ex.id && bestAx < axialOf(ex)) {
        it.name = best.name; it.weight = undefined; swapped = true;
      }
    }
    if (swapped) applyWeights(cur.items, lifts, level, bodyweight);  // refresh suggested loads
  }
  return sessions;
}

export default { despineWeek };
