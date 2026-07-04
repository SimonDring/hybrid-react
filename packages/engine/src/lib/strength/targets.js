/**
 * targets — the weekly per-muscle SET-VOLUME target ("training debt") the gym
 * engine tries to pay each week. This is the first half of the "target → ledger
 * → fill" model: it says how much each muscle *should* get this week; the
 * allocator (src/lib/plan/allocator.js) then fills it across the week's sessions.
 *
 * The science (volume periodisation, Renaissance Periodisation / Israetel):
 *  • Sit in the productive band between MEV and MAV (see src/data/muscleVolume.js).
 *  • Don't hold volume flat all block — start a block near MEV and RAMP toward MAV
 *    as you accumulate fitness, because the same volume gets easier over weeks.
 *  • Deload weeks drop back to ~MEV so fatigue clears while you keep the gains.
 *
 * So the target for a muscle this week is a point on the MEV→MAV line set by how
 * far through the phase we are, nudged by training style and experience.
 *
 * Pure function — same inputs always give the same targets, so it's reproducible
 * and unit-checkable against the landmarks.
 */

import { MUSCLE_GROUPS, VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { LEVELS } from '../../data/strengthExercises.js';
import { roundHalf } from '../Utils.js';
import kb from '../knowledge/kb.js';

// Every style STARTS a block near MEV (conservative, room to progress). Style
// only changes where the ramp ENDS, as a fraction of the productive band:
//   strength      → ends partway to MAV (less volume; heavier work carries it).
//   functional    → ends at MAV (the sweet spot).
//   bodybuilding  → ends past MAV toward MRV (volume is the driver; overreach
//                   into the back of the block, then deload).
// 0 = MEV, 1 = MAV, >1 = into the MAV→MRV zone.
const STYLE_TOP = kb.value('volume.style_top');   // governed (WP-15)

// Experience scales the BAND, not a flat multiplier. LEVEL_START = how far up the
// MEV→top ramp week 1 begins (an adapted athlete never starts at a novice's MEV).
// LEVEL_TOP_BONUS = extra band height for advanced (ramps deeper toward MRV).
const { start: LEVEL_START, topBonus: LEVEL_TOP_BONUS } = kb.value('volume.level_bands');   // governed (WP-15)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Weekly set target per muscle group.
 * @param {object} ctx
 *   style       'strength' | 'bodybuilding' | 'functional'
 *   intent      'base' | 'build' | 'peak'   (reserved — peak can trim accessories)
 *   weekInPhase 1-based week within the current phase
 *   phaseWeeks  total weeks in the current phase
 *   level       'beginner' | 'returning' | 'intermediate' | 'advanced'
 *   deload      boolean — deload weeks sit at ~MEV
 *   emphasis    {muscle: ×} per-muscle multiplier from the goal (sport prime movers
 *               ↑, non-essential ↓); 1 = neutral. From resolveProgram (program.js).
 *   volumeScalar overall × on the week (sport in-season trims toward maintenance).
 * @returns {{ [muscle]: number }} sets/week, rounded to the nearest 0.5
 */
export function weeklyMuscleTargets(ctx = {}) {
  const style = STYLE_TOP[ctx.style] != null ? ctx.style : 'functional';
  const styleTop = STYLE_TOP[style] + (LEVEL_TOP_BONUS[ctx.level] ?? 0);
  const startFrac = LEVEL_START[ctx.level] ?? 0;
  const phaseWeeks = Math.max(1, ctx.phaseWeeks || 1);
  const wip = clamp(ctx.weekInPhase || 1, 1, phaseWeeks);
  const emphasis = ctx.emphasis || {};
  const scalar = ctx.volumeScalar != null ? ctx.volumeScalar : 1;

  // Volume ramp position 0→1. Prefer a BLOCK-continuous fraction (across the whole
  // plan, deload dips aside) when supplied, so volume progresses through the block
  // instead of sawtoothing back to MEV at every phase boundary. Falls back to the
  // per-phase ramp when blockFrac isn't given.
  const frac = (ctx.blockFrac != null)
    ? clamp(ctx.blockFrac, 0, 1)
    : (phaseWeeks > 1 ? (wip - 1) / (phaseWeeks - 1) : 0.5);

  const out = {};
  for (const m of MUSCLE_GROUPS) {
    const lm = VOLUME_LANDMARKS[m];
    if (!lm) { out[m] = 0; continue; }

    if (ctx.deload) {
      // Recover at ~MEV, scaled by the season volume scalar so in-season deloads/
      // tapers drop BELOW the (already-scaled) working weeks instead of above them.
      out[m] = roundHalf(lm.mev * scalar);
      continue;
    }

    // Ramp from a level-scaled START up to a level-scaled TOP of band, where the
    // band unit is (MAV − MEV) and styleTop says how many of those to climb. An
    // adapted athlete begins partway up the band instead of at a novice's MEV.
    const top = lm.mev + styleTop * (lm.mav - lm.mev);
    const effFrac = startFrac + frac * (1 - startFrac);
    const onRamp = lm.mev + effFrac * (top - lm.mev);
    // Base ramp keeps its MEV floor (a worked muscle shouldn't fall below ~MEV)…
    const floor = lm.mev > 0 ? Math.max(lm.mev * 0.9, lm.mev - 2) : 0;
    const base = clamp(onRamp, floor, lm.mrv);   // no level multiplier — level is in start/top now
    // …then the GOAL's emphasis + overall scalar adjust it. This may pull a
    // de-emphasised muscle below MEV (e.g. a runner's chest = maintenance only),
    // which is intended, so the floor doesn't apply after the goal adjustment.
    const adjusted = base * (emphasis[m] ?? 1) * scalar;
    out[m] = roundHalf(clamp(adjusted, 0, lm.mrv));
  }
  return out;
}

// Total weekly working-set target across all muscles (fractional sets included).
// Useful as a sanity number and for the "can this fit in the available time?" check.
export function totalTargetSets(targets) {
  return Object.values(targets).reduce((a, b) => a + b, 0);
}

export { LEVELS };
export default { weeklyMuscleTargets, totalTargetSets };
