/**
 * substituteOptions — on-the-fly, same-muscle exercise alternatives for when a piece
 * of equipment isn't available in the gym.
 *
 * Given a session item and the athlete's equipment + tracked lifts, returns a ranked
 * list of alternative exercises that train the SAME muscle groups, ordered by how
 * closely they match the original (same movement pattern first, then same muscles via a
 * different pattern). Each option carries a recomputed weight target so the intended
 * intensity is preserved. Never offers an unrelated movement (a squat won't list an OHP).
 *
 * Pure function. Session-only: the caller writes the chosen swap into a local session
 * override; the generated plan and future weeks are never touched.
 */

import { EXERCISES, LEVELS, availableEquip } from '../../data/strengthExercises.js';
import { muscleContribution } from './contributions.js';
import { applyWeights, matchLift } from '../liftProgression.js';

const BY_NAME = (() => { const m = {}; for (const e of EXERCISES) m[e.name.toLowerCase()] = e; return m; })();

// Resolve a session item's name to its exercise-library entry (null if not a known
// loadable lift — e.g. a mobility/cardio row, which has no substitutes).
export function exerciseByName(name) { return BY_NAME[(name || '').toLowerCase()] || null; }

const hashId = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const groupsOf = (ex) => { const mc = muscleContribution(ex); return Object.keys(mc).filter(k => mc[k] > 0); };
const dominantGroup = (ex) => { const mc = muscleContribution(ex); let best = null, bv = -1; for (const k in mc) if (mc[k] > bv) { bv = mc[k]; best = k; } return best; };
const isBodyweight = (ex) => ex.equip === 'bodyweight';

/**
 * @param {object} item   the session item being replaced (keeps its sets/reps/rpe)
 * @param {object} opts    { access, lifts, level, max }
 * @returns {Array<{ id, name, equip, pattern, sets, rpe, weight, sameLift, score }>}
 */
export function substituteOptions(item, { access = [], lifts = {}, level = 'intermediate', max = 6 } = {}) {
  const orig = exerciseByName(item && item.name);
  if (!orig) return [];
  const origGroups = groupsOf(orig);
  const origTop = dominantGroup(orig);
  if (!origTop || !origGroups.length) return [];
  const origLift = matchLift(orig.name);
  const origLoaded = !isBodyweight(orig);
  const have = availableEquip(access);
  const lvl = LEVELS[level] ?? LEVELS.intermediate;

  const out = [];
  for (const cand of EXERCISES) {
    if (cand.id === orig.id) continue;
    if (cand.quality === 'power') continue;               // Olympic/power lifts aren't equipment-swap subs
    if (cand.level > lvl) continue;                       // within the athlete's level
    if (!have.has(cand.equip)) continue;                  // equipment the athlete can use
    const candSet = new Set(groupsOf(cand));
    if (!candSet.has(origTop)) continue;                  // must train the original's main muscle
    let covered = 0;
    for (const g of origGroups) if (candSet.has(g)) covered++;
    const overlap = covered / origGroups.length;
    if (overlap < 0.5) continue;                          // "same muscle groups" gate

    let score = overlap;
    if (cand.pattern === orig.pattern) score += 3;        // closest movement match
    const candLift = matchLift(cand.name);
    const sameLift = !!(candLift && origLift && candLift.key === origLift.key);
    if (sameLift) score += 2;                             // true variant — weight + progression carry across
    if (cand.role === orig.role) score += 0.5;
    if (origLoaded && isBodyweight(cand)) score -= 1.5;   // prefer a loaded swap for a loaded lift
    score += (hashId(cand.id) % 7) * 0.001;               // deterministic tie-break

    // Recompute the weight target for the substitute, keeping the original's scheme.
    const clone = { name: cand.name, sets: item.sets, rpe: item.rpe, superset: item.superset };
    applyWeights([clone], lifts, level);

    out.push({
      id: cand.id, name: cand.name, equip: cand.equip, pattern: cand.pattern,
      sets: item.sets, rpe: item.rpe, weight: clone.weight || null, sameLift, score
    });
  }
  out.sort((a, b) => b.score - a.score);

  // Diversify: a lift with many same-pattern variants (e.g. a back squat) would
  // otherwise fill the whole list with squats and crowd out genuinely different
  // same-muscle options (a split squat / lunge). Cap same-pattern entries so
  // different-pattern alternatives always get slots, then re-order by preference.
  const samePat = out.filter(o => o.pattern === orig.pattern);
  const diffPat = out.filter(o => o.pattern !== orig.pattern);
  const cap = Math.max(2, Math.ceil(max * 0.6));
  const sameTop = samePat.slice(0, cap);
  const diffTop = diffPat.slice(0, Math.max(0, max - sameTop.length));
  return [...sameTop, ...diffTop].sort((a, b) => b.score - a.score);
}

export default { substituteOptions, exerciseByName };
