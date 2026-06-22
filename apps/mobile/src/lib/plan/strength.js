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
import { availableEquip } from '../../data/strengthExercises.js';

// The functional activation primer. Each item carries the `equip` it needs so we
// can swap anything the user can't do — e.g. Band Pull-Apart → a no-kit scapular
// wall slide when there's no band (previously it was prescribed regardless, which
// left bodyweight/dumbbell-only users with an exercise they couldn't perform).
const SCAP_SLIDE = { name: 'Scapular Wall Slide', sets: '2 × 10', rpe: 'RPE 4', tag: 'mobility', note: 'Slide arms up the wall — blades down and back', restSec: 20, equip: 'bodyweight' };
const FUNCTIONAL_PRIMER = [
  { num: 'P1', name: '90/90 Hip Flexor Stretch',       sets: '5 × 30s ea.', rpe: 'Easy', tag: 'mobility', note: 'Open hip flexors before loading',         restSec: 20, equip: 'bodyweight' },
  { num: 'P2', name: 'Glute Bridge (2s hold)',          sets: '2 × 10',      rpe: 'RPE 4', tag: 'mobility', note: 'Activate glutes — squeeze 2s at top',    restSec: 20, equip: 'bodyweight' },
  { num: 'P3', name: 'Band Pull-Apart',                 sets: '2 × 15',      rpe: 'RPE 4', tag: 'mobility', note: 'Retract shoulder blades',                restSec: 20, equip: 'band', alt: SCAP_SLIDE },
  { num: 'P4', name: 'Cat-Camel + Thoracic Rotation',  sets: '2 × 8',       rpe: 'Easy',  tag: 'mobility', note: 'Thoracic rotation each side',             restSec: 0,  equip: 'bodyweight' }
];
// Short sessions (≤30 min) get a 2-item primer (glute activation + scapular set)
// so the warm-up doesn't eat a third of the session.
const SHORT_PRIMER_IDS = ['P2', 'P3'];
const PRIMER_FULL_MIN = 7;
const PRIMER_SHORT_MIN = 3;

// Minutes the primer costs for this session length (0 for non-functional styles).
function primerMinutes(style, minutes) {
  if (style !== 'functional') return 0;
  return (minutes || 60) <= 30 ? PRIMER_SHORT_MIN : PRIMER_FULL_MIN;
}

// Resolve the primer items for a session: trim for short sessions, then swap any
// item whose kit the user lacks for its no-equipment alternative.
function resolvePrimer(minutes, access) {
  // Resolve against the engine's real equipment set (handles legacy tier keys like
  // 'full_gym' and the bodyweight/band minimum) so the swap matches the allocator.
  const have = availableEquip(access || []);
  const base = (minutes || 60) <= 30
    ? FUNCTIONAL_PRIMER.filter(p => SHORT_PRIMER_IDS.includes(p.num))
    : FUNCTIONAL_PRIMER;
  return base.map(p => (
    p.equip && p.equip !== 'bodyweight' && !have.has(p.equip) && p.alt
      ? { num: p.num, ...p.alt }
      : p
  ));
}

// Functional sessions open with the activation primer; deduct its minutes from the
// slot budget so the allocator doesn't overfill. These two helpers are shared with
// the PlanService reflow so the baseline plan and the adapted (actually-trained)
// weeks stay identical in style — no drift.
export function functionalSlotMinutes(style, minutes) {
  return style === 'functional' ? Math.max(15, (minutes || 60) - primerMinutes(style, minutes)) : (minutes || 60);
}
export function applyFunctionalPrimer(sessions, style, minutes = 60, access = []) {
  if (style !== 'functional') return sessions;
  const primer = resolvePrimer(minutes, access);
  return sessions.map(s => ({ ...s, items: [...primer, ...s.items] }));
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
  const split = resolveSplit({ gymDays, style });
  const slotMin = functionalSlotMinutes(style, minutes);
  // Focus bias is for body-part splits (build goals). Sport plans use an even split
  // (no per-region bias — emphasis already shapes them) and differentiate via their
  // sport-priority anchors, so they pass focus:null and keep their on-target volume.
  const slots = split.map(day => ({
    minutes: slotMin, equip: ctx.access || [], anchors: day.anchors,
    focus: style === 'sport' ? null : day.weights
  }));

  const sessions = allocateGym({
    targets, slots,
    ctx: {
      style, intent: ctx.intent, deload, taper, weekNum: ctx.weekNum,
      level: ctx.level, sex: ctx.sex, lifts: ctx.lifts, access: ctx.access || [],
      exercisePriority: ctx.exercisePriority || []
    }
  });

  return applyFunctionalPrimer(sessions, style, minutes, ctx.access || []);
}

export default { buildWeek, functionalSlotMinutes, applyFunctionalPrimer };
