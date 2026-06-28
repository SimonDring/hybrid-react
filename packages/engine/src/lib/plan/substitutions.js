/**
 * substituteOptions — science-based, ranked exercise alternatives for an on-the-fly
 * swap when equipment isn't available in the gym.
 *
 * Candidates are gated to the same MOVEMENT TIER (compound↔compound, iso↔iso) and must
 * train the original's PRIMARY mover, then ranked by likeness to the original across:
 * primary-muscle alignment, main-mover coverage, synergist overlap, movement pattern,
 * resistance modality (force vector), loadability (StrengthLevel coefficient), same
 * tracked lift, laterality and ROM/length. Each option carries a recomputed weight
 * target so intensity is preserved.
 *
 * Pure + session-only: the caller writes the chosen swap to a local session override;
 * the generated plan is untouched. Muscle data comes from data/exerciseSimilarity.js
 * (separate from the allocator's pattern-based muscleContribution — see that file).
 */

import { EXERCISES, LEVELS, availableEquip } from '../../data/strengthExercises.js';
import { applyWeights, matchLift } from '../liftProgression.js';
import { anchorForName } from '../strength/exerciseLoad.js';
import { DEFAULT_MUSCLES, ISO_GROUP, OVERRIDES, modalitySim } from '../../data/exerciseSimilarity.js';

const BY_NAME = (() => { const m = {}; for (const e of EXERCISES) m[e.name.toLowerCase()] = e; return m; })();

// Resolve a session item's name to its exercise-library entry (null if not a known
// loadable lift — e.g. a mobility/cardio row, which has no substitutes).
export function exerciseByName(name) { return BY_NAME[(name || '').toLowerCase()] || null; }

// Accurate primary/secondary muscle groups for likeness scoring: per-exercise override →
// the exercise's own `muscle` (isolations) → the movement-pattern default.
export function resolveMuscles(ex) {
  if (!ex) return { primary: [], secondary: [] };
  const ov = OVERRIDES[ex.id];
  if (ov) return { primary: ov.primary || [], secondary: ov.secondary || [] };
  if (ex.pattern === 'iso') { const g = ISO_GROUP[ex.muscle]; return { primary: g ? [g] : [], secondary: [] }; }
  const d = DEFAULT_MUSCLES[ex.pattern] || { primary: [], secondary: [] };
  return { primary: d.primary || [], secondary: d.secondary || [] };
}

const UNI_RE = /single|split|bulgarian|lunge|step-?up|pistol|one-?arm|1-?arm|suitcase|cossack|skater/i;
const isUnilateral = (ex) => !!ex.unilateral || UNI_RE.test(ex.name || '');
const isBodyweight = (ex) => ex.equip === 'bodyweight';
const hashId = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

// Movement tier — a heavy compound is only swapped for another compound, an isolation
// for an isolation, etc. (a light prehab/iso move is never a substitute for a barbell row).
const tierOf = (ex) => {
  if (ex.loadClass === 'health' || ex.pattern === 'mobility') return 'mobility';
  if (ex.pattern === 'core' || ex.role === 'core') return 'core';
  if (ex.role === 'iso') return 'iso';
  return 'compound';
};

const jaccard = (a, b) => {
  if (!a.length && !b.length) return 0;
  const A = new Set(a); let inter = 0;
  for (const x of b) if (A.has(x)) inter++;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
};
const coverage = (need, have) => {
  if (!need.length) return 0;
  const H = new Set(have); let c = 0;
  for (const m of need) if (H.has(m)) c++;
  return c / need.length;
};

/**
 * @param {object} item   the session item being replaced (keeps its sets/reps/rpe)
 * @param {object} opts    { access, lifts, level, max }
 * @returns {Array<{ id, name, equip, pattern, sets, rpe, weight, sameLift, score }>}
 */
export function substituteOptions(item, { access = [], lifts = {}, level = 'intermediate', max = 8 } = {}) {
  const orig = exerciseByName(item && item.name);
  if (!orig) return [];
  const om = resolveMuscles(orig);
  if (!om.primary.length) return [];                     // no trainable primary → no subs (e.g. mobility)

  const origLift = matchLift(orig.name);
  const origTier = tierOf(orig);
  const origLoaded = !isBodyweight(orig);
  const origUni = isUnilateral(orig);
  const origCoeff = (anchorForName(orig.name) || {}).coefficient;
  const origStretch = !!orig.stretchBias;
  const have = availableEquip(access);
  const lvl = LEVELS[level] ?? LEVELS.intermediate;

  const out = [];
  for (const cand of EXERCISES) {
    if (cand.id === orig.id) continue;
    if (cand.quality === 'power') continue;               // Olympic/plyo/power lifts aren't equipment-swap subs
    if (tierOf(cand) !== origTier) continue;              // compound→compound, iso→iso
    if (cand.level > lvl) continue;
    if (!have.has(cand.equip)) continue;

    const cm = resolveMuscles(cand);
    const candAll = [...cm.primary, ...cm.secondary];
    if (!om.primary.some(m => candAll.includes(m))) continue;   // must train the original's PRIMARY mover

    let score = 0;
    score += 4 * jaccard(om.primary, cm.primary);         // exact primary alignment
    score += 3 * coverage(om.primary, candAll);           // trains the main mover at all
    score += 1 * jaccard(om.secondary, cm.secondary);     // synergist similarity
    if (cand.pattern === orig.pattern) score += 3;        // same movement / joint action
    score += 1.5 * modalitySim(orig.equip, cand.equip);   // force vector / resistance type
    const candCoeff = (anchorForName(cand.name) || {}).coefficient;
    if (origCoeff && candCoeff) score += 1 * Math.max(0, 1 - Math.abs(origCoeff - candCoeff) / Math.max(origCoeff, candCoeff)); // loadability
    const candLift = matchLift(cand.name);
    const sameLift = !!(candLift && origLift && candLift.key === origLift.key);
    if (sameLift) score += 2;                             // true variant — weight + progression carry across
    if (isUnilateral(cand) === origUni) score += 0.5;     // laterality match
    if (!!cand.stretchBias === origStretch) score += 0.3; // ROM / length emphasis
    if (origLoaded && isBodyweight(cand)) score -= 1.5;   // prefer a loaded swap for a loaded lift
    score += (hashId(cand.id) % 7) * 0.001;               // deterministic tie-break

    const clone = { name: cand.name, sets: item.sets, rpe: item.rpe, superset: item.superset };
    applyWeights([clone], lifts, level);
    out.push({ id: cand.id, name: cand.name, equip: cand.equip, pattern: cand.pattern, sets: item.sets, rpe: item.rpe, weight: clone.weight || null, sameLift, score });
  }
  out.sort((a, b) => b.score - a.score);

  // Diversify: cap same-pattern entries so a different-pattern same-muscle option (a
  // squat → split squat) still surfaces, then re-order by preference.
  const samePat = out.filter(o => o.pattern === orig.pattern);
  const diffPat = out.filter(o => o.pattern !== orig.pattern);
  const cap = Math.max(2, max - 2);   // reserve ≥2 slots for cross-pattern same-muscle options
  const sameTop = samePat.slice(0, cap);
  const diffTop = diffPat.slice(0, Math.max(0, max - sameTop.length));
  return [...sameTop, ...diffTop].sort((a, b) => b.score - a.score);
}

export default { substituteOptions, exerciseByName, resolveMuscles };
