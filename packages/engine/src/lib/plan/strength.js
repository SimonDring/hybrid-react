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
import { resolveSplit } from './split.js';
import { olympicPriorityIds } from '../../data/disciplines/olympic.js';

// Functional sessions reserve a few minutes for an activation primer; deduct that from
// the slot budget so the allocator doesn't overfill. The primer ITEMS are no longer
// added here — PlanService decorates every gym session with the curated, movement-
// specific primer (data/primers.js + plan/primers.js) when it surfaces it to the UI.
// This helper just keeps the time reservation so session durations stay stable.
const PRIMER_FULL_MIN = 7;
const PRIMER_SHORT_MIN = 3;
function primerMinutes(style, minutes) {
  if (style !== 'functional') return 0;
  return (minutes || 60) <= 30 ? PRIMER_SHORT_MIN : PRIMER_FULL_MIN;
}
export function functionalSlotMinutes(style, minutes) {
  return style === 'functional' ? Math.max(15, (minutes || 60) - primerMinutes(style, minutes)) : (minutes || 60);
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
  const taper = !!ctx.taper;

  const targets = weeklyMuscleTargets({
    style, intent: ctx.intent, level: ctx.level,
    weekInPhase: ctx.winp, phaseWeeks: ctx.phaseWeeks,
    deload: deload || taper,   // both cut weekly VOLUME; taper keeps intensity (scheme)
    emphasis: ctx.emphasis, volumeScalar: ctx.volumeScalar, blockFrac: ctx.blockFrac
  });

  // The training SPLIT decides which region each day trains + the pattern it opens
  // on. We pass each day its FOCUS (the split's per-muscle weights) and ANCHORS to
  // the allocator, which biases selection toward that day's region — so the week
  // reads as a curated split (Upper / Lower / …) instead of near-identical full-body
  // days. The shared weekly deficit still controls total volume, so the MEV→MAV ramp
  // and MRV ceiling are untouched.
  // Build splits are body-part based; sport splits are emphasis-weighted (push/pull/
  // lower day counts from the sport's muscle emphasis). Both pass each day its FOCUS
  // (per-muscle weights) so the allocator biases that day toward its region and the
  // week reads as curated, varied days — sport days are now non-uniform, so the focus
  // bias steers them without the old even-split overshoot. Shared deficit still owns
  // total volume (ramp + MRV untouched).
  const split = resolveSplit({ gymDays, style, emphasis: ctx.emphasis, competedLift: ctx.competedLift || 'both' });
  const slotMin = functionalSlotMinutes(style, minutes);
  const slots = split.map(day => ({
    minutes: slotMin, equip: ctx.access || [], anchors: day.anchors, focus: day.weights, focusLabel: day.focus,
    // WP-49 Plan 2 T4b-2: olympic days carry a per-day priority subset (the day's lift family) +
    // a target-quality override (snatch/C&J days are explosive; the squat day is max strength).
    // Absent for every other split → the allocator falls back to the discipline-wide priority list.
    ...(day.emphasis ? { priorityIds: olympicPriorityIds(day.emphasis, ctx.exercisePriority || []), targetQualityOverride: day.targetQuality } : {})
  }));

  const sessions = allocateGym({
    targets, slots,
    ctx: {
      style, intent: ctx.intent, deload, taper, weekNum: ctx.weekNum,
      level: ctx.level, sex: ctx.sex, lifts: ctx.lifts, access: ctx.access || [],
      bodyweight: ctx.bodyweight,
      exercisePriority: ctx.exercisePriority || [], sport: ctx.sport || null, power: !!ctx.power,
      priorityByIntent: ctx.priorityByIntent || new Map(),
      priorityQualities: ctx.priorityQualities || [], season: ctx.season || null, skbIds: ctx.skbIds || new Set(),
      categoryPlan: ctx.categoryPlan || null, discipline: ctx.discipline || null,
      secondaryGoals: ctx.secondaryGoals || [],   // WP-49 T5 — accessory-tail corrective add-ons
      programming: ctx.programming || null, roundOut: ctx.roundOut || null,   // season-phased SKB (2026-07-09)
      // Phase 3 M2 — estimator-driven creep inputs (powerlifting T2 + hypertrophy T3 + olympic T4, gated in the allocator):
      // completed prior working weeks in the block + the athlete's LOGGED lift keys (untouched).
      creepWeeks: ctx.creepWeeks || 0, loggedLiftKeys: ctx.loggedLiftKeys instanceof Set ? ctx.loggedLiftKeys : new Set(),
    }
  });

  return sessions;
}

export default { buildWeek, functionalSlotMinutes };
