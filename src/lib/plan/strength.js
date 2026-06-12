/**
 * Strength engine — builds a week of gym sessions from the user's profile.
 *
 * As of the adaptive rebuild this is a THIN wrapper: it works out the week's
 * per-muscle volume target (src/lib/strength/targets.js) and hands it, plus one
 * "slot" per gym day, to the allocator (src/lib/plan/allocator.js), which fills
 * each slot with the highest-value work toward that target. The science that
 * used to live here (movement-pattern coverage, rep/RPE schemes, ≥2×/week
 * frequency, equipment gating, sex tuning) now lives in those two modules — see
 * their headers. Keeping buildWeek's signature unchanged means PlanGenerator and
 * the scheduler are untouched.
 *
 * buildWeek(ctx) → array of session specs (no day assigned yet — the scheduler
 * places them). Each spec:
 *    { discipline:'gym', focus, duration, items, intensity, lowerBody }
 * `intensity` ('hard'|'moderate') and `lowerBody` let the scheduler space heavy
 * leg work away from hard runs (the main concurrent-training conflict).
 *
 * The supplemental-strength builder (buildSupport) for endurance athletes who
 * didn't pick the gym is unchanged and still lives at the bottom of this file.
 */

import { weeklyMuscleTargets } from '../strength/targets.js';
import { allocateGym } from './allocator.js';

/**
 * Build the week's gym sessions.
 * @param {object} ctx
 *   gymDays   number 1–7 (how many gym sessions this week)
 *   style     'strength' | 'bodybuilding' | 'functional'
 *   intent    'base' | 'build' | 'peak'
 *   deload    boolean
 *   winp      week-in-phase (1-based); phaseWeeks total weeks in the phase
 *   minutes   typical session length (caps each slot's exercise/set count)
 *   access    array of equipment keys; level  experience; sex  for rep tuning
 *   lifts     optional 1RMs for target weights
 * @returns {Array} session specs (no day assigned yet)
 */
const FUNCTIONAL_PRIMER = [
  { num: 'P1', name: '90/90 Hip Flexor Stretch',       sets: '5 × 30s ea.', rpe: 'Easy', tag: 'mobility', note: 'Open hip flexors before loading',         restSec: 20 },
  { num: 'P2', name: 'Glute Bridge (2s hold)',          sets: '2 × 10',      rpe: 'RPE 4', tag: 'mobility', note: 'Activate glutes — squeeze 2s at top',    restSec: 20 },
  { num: 'P3', name: 'Band Pull-Apart',                 sets: '2 × 15',      rpe: 'RPE 4', tag: 'mobility', note: 'Retract shoulder blades',                restSec: 20 },
  { num: 'P4', name: 'Cat-Camel + Thoracic Rotation',  sets: '2 × 8',       rpe: 'Easy',  tag: 'mobility', note: 'Thoracic rotation each side',             restSec: 0  }
];

export function buildWeek(ctx = {}) {
  const gymDays = Math.max(1, Math.min(7, ctx.gymDays || 3));
  const style = ctx.style || 'functional';
  const minutes = ctx.minutes || 60;
  const deload = !!ctx.deload;

  // Functional sessions open with the 4-exercise activation primer (~7 min).
  // Deduct that time from the slot budget so the allocator doesn't overfill.
  const slotMinutes = style === 'functional' ? Math.max(15, minutes - 7) : minutes;

  const targets = weeklyMuscleTargets({
    style, intent: ctx.intent, level: ctx.level,
    weekInPhase: ctx.winp, phaseWeeks: ctx.phaseWeeks, deload,
    emphasis: ctx.emphasis, volumeScalar: ctx.volumeScalar
  });

  const slots = Array.from({ length: gymDays }, () => ({ minutes: slotMinutes, equip: ctx.access || [] }));

  const sessions = allocateGym({
    targets, slots,
    ctx: {
      style, intent: ctx.intent, deload, weekNum: ctx.weekNum,
      level: ctx.level, sex: ctx.sex, lifts: ctx.lifts, access: ctx.access || [],
      exercisePriority: ctx.exercisePriority || []
    }
  });

  if (style !== 'functional') return sessions;

  return sessions.map(session => ({
    ...session,
    items: [...FUNCTIONAL_PRIMER, ...session.items]
  }));
}

// ---- helpers shared by the supplemental builder below ----
function femaleRepBump(sex) { return sex === 'female' ? 2 : 0; }
function bumpReps(sets, d) {
  if (!d) return sets;
  return String(sets).replace(/×\s*(\d+(?:–\d+)?)(?!\s*[sm])/, (m, reps) =>
    '× ' + reps.replace(/\d+/g, n => String(Number(n) + d)));
}
// Bodyweight fall-back when the user has no weights.
function lift(weights, barbell, bodyweight) { return weights ? barbell : bodyweight; }

// ===========================================================================
// Supplemental strength — short sessions that SUPPORT an endurance athlete who
// didn't pick the gym. The research: endurance runners/swimmers benefit from
// 2×/week strength (posterior chain, single-leg, plyometrics, tendon work for
// runners; pulling, shoulders, core for swimmers) — it improves economy and
// durability without big hypertrophy volume. These are light/short and marked
// intensity:'moderate', lowerBody:false so the scheduler can pair them with an
// easy run/swim day (a double) rather than spacing them like a hard leg day.
// ===========================================================================
function supportItems(forSport, variant, weights, deload) {
  const sets = deload ? '2' : '3';
  const run = [
    [ // A — posterior chain + single-leg
      { num: 'A1', name: lift(weights, 'Romanian deadlift', 'Single-leg hip hinge'), sets: `${sets} × 6`, rpe: 'RPE 7', note: 'controlled hinge' },
      { num: 'B1', name: 'Bulgarian split squat', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'knee tracks toe' },
      { num: 'B2', name: 'Single-leg calf raise', sets: '3 × 12 ea.', rpe: 'RPE 7', note: 'tendon stiffness', tag: 'mobility' },
      { num: 'C1', name: 'Hip thrust / glute bridge', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation core', tag: 'mobility' }
    ],
    [ // B — plyometric + durability
      { num: 'A1', name: 'Pogo hops / low box jumps', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'stiff, springy — quality over height' },
      { num: 'B1', name: 'Step-up', sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'drive through the heel' },
      { num: 'B2', name: 'Nordic / slider hamstring curl', sets: `${sets} × 6`, rpe: 'RPE 7', note: 'slow eccentric', tag: 'mobility' },
      { num: 'C1', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor health', tag: 'mobility' },
      { num: 'C2', name: 'Calf raise', sets: '3 × 15', rpe: 'RPE 7', note: '', tag: 'mobility' }
    ]
  ];
  const swim = [
    [ // A — pull & posture
      { num: 'A1', name: lift(weights, 'Pull-up / lat pulldown', 'Band-assisted pull-up'), sets: `${sets} × 8`, rpe: 'RPE 7', note: 'full range' },
      { num: 'A2', name: 'Band / cable row', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'squeeze 1s' },
      { num: 'B1', name: 'DB shoulder press', sets: `${sets} × 10`, rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Prone Y-T-W raises', sets: '3 × 10', rpe: 'RPE 6', note: 'scap / rotator health', tag: 'mobility' },
      { num: 'C2', name: 'Hollow hold', sets: '3 × 30s', rpe: 'RPE 6', note: 'midline', tag: 'mobility' }
    ],
    [ // B — lats & rotation
      { num: 'A1', name: 'Straight-arm pulldown', sets: `${sets} × 12`, rpe: 'RPE 7', note: 'feel the lats' },
      { num: 'B1', name: lift(weights, 'Single-arm DB row', 'Inverted row'), sets: `${sets} × 10 ea.`, rpe: 'RPE 7', note: '' },
      { num: 'B2', name: 'External rotation', sets: '3 × 12 ea.', rpe: 'RPE 6', note: 'cuff health', tag: 'mobility' },
      { num: 'C1', name: 'Rotational core (Pallof / chop)', sets: '3 × 10 ea.', rpe: 'RPE 6', note: '', tag: 'mobility' },
      { num: 'C2', name: 'Plank', sets: '3 × 40s', rpe: 'RPE 6', note: '', tag: 'mobility' }
    ]
  ];
  const cycle = [
    [ // A — quad dominance + hip stability
      { num: 'A1', name: lift(weights, 'Single-leg leg press', 'Bulgarian split squat'), sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'quad focus — knee tracks toe' },
      { num: 'B1', name: lift(weights, 'Goblet squat', 'Bodyweight squat'), sets: `${sets} × 10`, rpe: 'RPE 7', note: 'full depth, controlled' },
      { num: 'B2', name: 'Lateral band walk', sets: '3 × 12 ea.', rpe: 'RPE 6', note: 'hip stability, quarter squat throughout', tag: 'mobility' },
      { num: 'C1', name: lift(weights, 'Romanian deadlift', 'Single-leg hip hinge'), sets: `${sets} × 8`, rpe: 'RPE 7', note: 'hamstring + glute balance' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', note: 'anti-rotation', tag: 'mobility' }
    ],
    [ // B — posterior chain + hip mobility
      { num: 'A1', name: lift(weights, 'Hip thrust', 'Glute bridge'), sets: `${sets} × 10`, rpe: 'RPE 7', note: 'drive through hips — not lower back' },
      { num: 'B1', name: lift(weights, 'Single-leg RDL', 'Prone hip extension'), sets: `${sets} × 8 ea.`, rpe: 'RPE 7', note: 'hip hinge, unilateral' },
      { num: 'B2', name: 'Thoracic foam roller', sets: '2 × 10', rpe: 'Easy', note: 'T5–T8 extension — reverse aero position', tag: 'mobility' },
      { num: 'C1', name: '90/90 hip flexor stretch', sets: '3 × 30s ea.', rpe: 'Easy', note: 'hip flexors shortened by saddle position', tag: 'mobility' },
      { num: 'C2', name: 'Copenhagen plank', sets: '3 × 20s ea.', rpe: 'RPE 7', note: 'adductor strength for Q-angle stability', tag: 'mobility' }
    ]
  ];
  const pool = forSport === 'swim' ? swim : forSport === 'cycle' ? cycle : run;
  return pool[variant % pool.length];
}

/**
 * Build short supplemental-strength sessions for an endurance athlete.
 * @param {object} ctx
 *   count    how many sessions this week (1–2)
 *   for      'run' | 'swim' (which support template family)
 *   deload   boolean
 *   access   equipment keys
 *   weekNum  rotates the variant so the two/weekly sessions differ
 * @returns {Array} session specs (intensity 'moderate', lowerBody false)
 */
export function buildSupport(ctx = {}) {
  const count = Math.max(1, Math.min(2, ctx.count || 2));
  const forSport = ['swim', 'cycle'].includes(ctx.for) ? ctx.for : 'run';
  const deload = !!ctx.deload;
  const access = ctx.access || [];
  const weights = access.includes('full_gym') || access.includes('home_weights') || access.length === 0;
  const base = (ctx.weekNum || 1) - 1;
  const repBump = femaleRepBump(ctx.sex);
  const focusLabels = { run: 'Run-support strength', swim: 'Swim-support strength', cycle: 'Cycle-support strength' };
  const focus = focusLabels[forSport] || 'Run-support strength';
  return Array.from({ length: count }, (_, i) => ({
    discipline: 'gym',
    focus,
    duration: '25–30 min',
    items: supportItems(forSport, base + i, weights, deload).map(it => ({ ...it, sets: bumpReps(it.sets, repBump) })),
    intensity: 'moderate',
    lowerBody: false,
    supplemental: true
  }));
}

export default { buildWeek, buildSupport };
