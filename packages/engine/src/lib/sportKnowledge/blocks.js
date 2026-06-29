/**
 * Sport block templates + the gymProgramming validator. Moved out of the retired
 * sports/_schema.js so the SKB is self-contained. SPORT_BLOCKS / DEFAULT_SEASON_VOLUME
 * are unchanged values (Rønnestad/Bosquet/Mujika — see the old _schema.js header).
 */
export const SEASONS = ['off', 'pre', 'in', 'transition'];
export const DEFAULT_SEASON_VOLUME = { off: 1.0, pre: 0.85, in: 0.6, transition: 0.7 };
export const SPORT_BLOCKS = {
  off:        { totalWeeks: 12, split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 5 }, { intent: 'peak', weeks: 2 }], deloads: [5, 10] },
  pre:        { totalWeeks: 6,  split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 3 }], deloads: [6] },
  in:         { totalWeeks: 4,  split: [{ intent: 'build', weeks: 4 }], deloads: [] },
  transition: { totalWeeks: 4,  split: [{ intent: 'base', weeks: 4 }], deloads: [] }
};

const ENGINE_MUSCLES = new Set(['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','calves','core']);
export function isBlock(b){ return !!b && typeof b.totalWeeks === 'number' && Array.isArray(b.split) && Array.isArray(b.deloads); }

/** Validate a gymProgramming block. @returns {string[]} errors. */
export function validateGymProgramming(gp){
  if (!gp || typeof gp !== 'object') return ['gymProgramming must be an object'];
  const errs = [];
  if (!gp.emphasis || typeof gp.emphasis !== 'object') errs.push('gymProgramming.emphasis must be an object');
  else for (const k of Object.keys(gp.emphasis)) if (!ENGINE_MUSCLES.has(k)) errs.push(`gymProgramming.emphasis: unknown muscle "${k}"`);
  if (!Array.isArray(gp.priorityExercises)) errs.push('gymProgramming.priorityExercises must be an array');
  if (typeof gp.power !== 'boolean') errs.push('gymProgramming.power must be a boolean');
  for (const s of SEASONS) {
    if (typeof (gp.seasonModifiers || {})[s] !== 'number') errs.push(`gymProgramming.seasonModifiers.${s} must be a number`);
    if (!isBlock((gp.periodization || {})[s])) errs.push(`gymProgramming.periodization.${s} must be a block`);
  }
  if (gp.keyMuscles && (!Array.isArray(gp.keyMuscles) || gp.keyMuscles.some(m => !ENGINE_MUSCLES.has(m))))
    errs.push('gymProgramming.keyMuscles must be engine-muscle ids');
  if (gp.byDiscipline) for (const [d, o] of Object.entries(gp.byDiscipline)) {
    if (o.emphasis && typeof o.emphasis !== 'object') errs.push(`gymProgramming.byDiscipline.${d}.emphasis must be an object`);
    if (o.priorityExercises && !Array.isArray(o.priorityExercises)) errs.push(`gymProgramming.byDiscipline.${d}.priorityExercises must be an array`);
    if (o.periodization) for (const s of SEASONS) if (o.periodization[s] && !isBlock(o.periodization[s])) errs.push(`gymProgramming.byDiscipline.${d}.periodization.${s} not a block`);
  }
  return errs;
}
export default { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS, isBlock, validateGymProgramming };
