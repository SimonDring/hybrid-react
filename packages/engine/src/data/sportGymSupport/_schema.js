// src/lib/sports/_schema.js
/**
 * SportModule contract + shared defaults for the pluggable sport layer.
 *
 * A sport biases the GYM programme (per-muscle emphasis, priority lifts, periodisation
 * season) to SUPPORT a sport the athlete trains on their own — it does NOT yet program
 * endurance sessions (a deliberate future stage). Adding a new sport = a new module in
 * this folder + one line in index.js; the core engine (resolveProgram /
 * resolvePeriodization) does not change. See docs/engine/01-PANEL-REVIEW.md §7 and
 * docs/engine/02-REFACTOR-ROADMAP.md §9.
 *
 * @typedef {Object} BlockTemplate
 * @property {number} totalWeeks
 * @property {Array<{intent:'base'|'build'|'peak', weeks:number}>} split
 * @property {number[]} deloads
 *
 * @typedef {Object} SportModule
 * @property {string}  id                       profile.sport value, e.g. 'run'
 * @property {string}  label
 * @property {Object<string,number>} emphasis   per-muscle × multipliers (default / no discipline)
 * @property {string[]} priorityExercises       ordered exercise ids (×1.35 in the allocator)
 * @property {boolean} power                    include power/plyometric work
 * @property {Object<string,number>} seasonModifiers  volume × per season (off/pre/in/transition)
 * @property {Object<string,BlockTemplate>} periodization  block template per season
 * @property {Object<string,{emphasis?:Object,priorityExercises?:string[],periodization?:Object}>} [byDiscipline]
 *           per-discipline overrides (e.g. run sprint/middle); a missing season falls back to the module default
 * // descriptive — consumed by future injury/conditioning modules; optional today:
 * @property {string[]} [movementDemands] @property {string[]} [injuryPatterns]
 * @property {string[]} [keyMuscles] @property {string[]} [performanceDeterminants]
 * @property {string[]} [commonDeficiencies] @property {string[]} [conditioningPriorities]
 */

export const SEASONS = ['off', 'pre', 'in', 'transition'];

// Shared default season volume scalar (in-season = maintenance dose; Rønnestad 2011).
// Off-season pulled back from 1.0 → 0.90 so gym strength SUPPORTS the sport instead of
// piling full volume on a body that already trains its sport (sportLoadScalar trims further).
export const DEFAULT_SEASON_VOLUME = { off: 0.90, pre: 0.85, in: 0.6, transition: 0.7 };

// Generic sport block templates, reused by most sports (running sprint/middle add
// their own). Off-season builds a max-strength base (Rønnestad 2015); pre-season
// tapers in (Bosquet 2007); in-season holds a maintenance dose; transition recovers
// (Mujika 2010). These moved here from periodization.js so sports own their season
// shape and new sports need no core edits.
export const SPORT_BLOCKS = {
  off:        { totalWeeks: 12, split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 7 }], deloads: [5, 10] },
  pre:        { totalWeeks: 6,  split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 3 }], deloads: [6] },
  in:         { totalWeeks: 4,  split: [{ intent: 'build', weeks: 4 }], deloads: [] },
  transition: { totalWeeks: 4,  split: [{ intent: 'base', weeks: 4 }], deloads: [] }
};

function isBlock(b) {
  return !!b && typeof b.totalWeeks === 'number' && Array.isArray(b.split) && Array.isArray(b.deloads);
}

/** Validate one SportModule. @returns {string[]} errors (empty array = valid). */
export function validateSportModule(m) {
  if (!m || typeof m !== 'object') return ['sport module is not an object'];
  const errs = [];
  const id = m.id || '(no id)';
  if (typeof m.id !== 'string' || !m.id) errs.push(`${id}: id must be a non-empty string`);
  if (typeof m.label !== 'string' || !m.label) errs.push(`${id}: label required`);
  if (!m.emphasis || typeof m.emphasis !== 'object') errs.push(`${id}: emphasis must be an object`);
  if (!Array.isArray(m.priorityExercises)) errs.push(`${id}: priorityExercises must be an array`);
  if (typeof m.power !== 'boolean') errs.push(`${id}: power must be a boolean`);
  for (const s of SEASONS) {
    if (typeof (m.seasonModifiers || {})[s] !== 'number') errs.push(`${id}: seasonModifiers.${s} must be a number`);
    if (!isBlock((m.periodization || {})[s])) errs.push(`${id}: periodization.${s} must be a block template`);
  }
  if (m.byDiscipline) {
    for (const [disc, o] of Object.entries(m.byDiscipline)) {
      if (o.emphasis && typeof o.emphasis !== 'object') errs.push(`${id}.${disc}: emphasis must be an object`);
      if (o.priorityExercises && !Array.isArray(o.priorityExercises)) errs.push(`${id}.${disc}: priorityExercises must be an array`);
      if (o.periodization) for (const s of SEASONS) if (o.periodization[s] && !isBlock(o.periodization[s])) errs.push(`${id}.${disc}: periodization.${s} is not a valid block`);
    }
  }
  return errs;
}

/** Validate a registry array (every module valid + ids unique). @returns {{ok, errors}} */
export function validateRegistry(modules) {
  const errors = [];
  const seen = new Set();
  for (const m of modules) {
    errors.push(...validateSportModule(m));
    if (m && m.id) { if (seen.has(m.id)) errors.push(`duplicate sport id: ${m.id}`); seen.add(m.id); }
  }
  return { ok: errors.length === 0, errors };
}

export default { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS, validateSportModule, validateRegistry };
