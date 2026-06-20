/**
 * Strength engine — builds a week of gym sessions from the user's profile.
 *
 * As of the adaptive rebuild this is a THIN wrapper: it works out the week's
 * per-muscle volume target (src/lib/strength/targets.js) and hands it, plus one
 * "slot" per gym day, to the allocator (src/lib/plan/allocator.js), which fills
 * each slot with the highest-value work toward that target. The science that
 * used to live here (movement-pattern coverage, rep/RPE schemes, ≥2×/week
 * frequency, equipment gating, sex tuning) now lives in those two modules — see
 * their headers.
 *
 * buildWeek(ctx) → array of session specs (no day assigned yet — the scheduler
 * places them). Each spec:
 *    { discipline:'gym', focus, duration, items, intensity, lowerBody }
 *
 * The functional activation primer + slot-budget helper are exported so the
 * PlanService reflow can reuse them — keeping the baseline plan and the adapted
 * (actually-trained) weeks identical in style.
 */

import { weeklyMuscleTargets } from '../strength/targets.js';
import { allocateGym } from './allocator.js';

const FUNCTIONAL_PRIMER = [
  { num: 'P1', name: '90/90 Hip Flexor Stretch',       sets: '5 × 30s ea.', rpe: 'Easy', tag: 'mobility', note: 'Open hip flexors before loading',         restSec: 20 },
  { num: 'P2', name: 'Glute Bridge (2s hold)',          sets: '2 × 10',      rpe: 'RPE 4', tag: 'mobility', note: 'Activate glutes — squeeze 2s at top',    restSec: 20 },
  { num: 'P3', name: 'Band Pull-Apart',                 sets: '2 × 15',      rpe: 'RPE 4', tag: 'mobility', note: 'Retract shoulder blades',                restSec: 20 },
  { num: 'P4', name: 'Cat-Camel + Thoracic Rotation',  sets: '2 × 8',       rpe: 'Easy',  tag: 'mobility', note: 'Thoracic rotation each side',             restSec: 0  }
];

// Functional sessions open with the 4-exercise activation primer (~7 min); deduct
// that from the slot budget so the allocator doesn't overfill. These two helpers
// are shared with the PlanService reflow so the baseline plan and the adapted
// (actually-trained) weeks stay identical in style — no drift.
export function functionalSlotMinutes(style, minutes) {
  return style === 'functional' ? Math.max(15, (minutes || 60) - 7) : (minutes || 60);
}
export function applyFunctionalPrimer(sessions, style) {
  if (style !== 'functional') return sessions;
  return sessions.map(s => ({ ...s, items: [...FUNCTIONAL_PRIMER, ...s.items] }));
}

/**
 * Build the week's gym sessions.
 * @param {object} ctx
 *   gymDays   number 1–7 (how many gym sessions this week)
 *   style     'strength' | 'bodybuilding' | 'functional' | 'sport'
 *   intent    'base' | 'build' | 'peak'
 *   deload    boolean
 *   winp      week-in-phase (1-based); phaseWeeks total weeks in the phase
 *   blockFrac optional 0→1 block-continuous ramp position (preferred over winp)
 *   minutes   typical session length (caps each slot's exercise/set count)
 *   access    array of equipment keys; level  experience; sex  for rep tuning
 *   lifts     optional 1RMs for target weights; emphasis/volumeScalar/exercisePriority
 *             from resolveProgram (goal tuning)
 * @returns {Array} session specs (no day assigned yet)
 */
export function buildWeek(ctx = {}) {
  const gymDays = Math.max(1, Math.min(7, ctx.gymDays || 3));
  const style = ctx.style || 'functional';
  const minutes = ctx.minutes || 60;
  const deload = !!ctx.deload;

  const targets = weeklyMuscleTargets({
    style, intent: ctx.intent, level: ctx.level,
    weekInPhase: ctx.winp, phaseWeeks: ctx.phaseWeeks, deload,
    emphasis: ctx.emphasis, volumeScalar: ctx.volumeScalar, blockFrac: ctx.blockFrac
  });

  const slots = Array.from({ length: gymDays }, () => ({ minutes: functionalSlotMinutes(style, minutes), equip: ctx.access || [] }));

  const sessions = allocateGym({
    targets, slots,
    ctx: {
      style, intent: ctx.intent, deload, weekNum: ctx.weekNum,
      level: ctx.level, sex: ctx.sex, lifts: ctx.lifts, access: ctx.access || [],
      exercisePriority: ctx.exercisePriority || []
    }
  });

  return applyFunctionalPrimer(sessions, style);
}

export default { buildWeek, functionalSlotMinutes, applyFunctionalPrimer };
