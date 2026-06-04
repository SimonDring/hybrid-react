/**
 * Strength engine — builds a week of gym sessions from the user's profile.
 *
 * The science (see research notes in the rebuild plan):
 *  • Volume is the main driver of hypertrophy: ~10–20 hard sets per muscle group
 *    per week, with diminishing returns past ~20 (Schoenfeld dose-response).
 *  • Each muscle should be trained ≥2×/week — better growth than 1×, and a
 *    clearer strength benefit (Schoenfeld 2016 frequency meta-analysis).
 *  • Linear vs undulating periodisation barely differ when volume is equated, so
 *    we keep it simple: block phases (base→build→peak) shift rep range + RPE.
 *
 * That "≥2× per muscle" rule is what drives the split by gym-days — the only way
 * to hit everything twice on few days is full-body; more days lets us split:
 *    1–3 days → full body         (everything 2–3×)
 *    4 days   → upper / lower ×2   (each half 2×)
 *    5 days   → upper / lower + push / pull / legs   (hybrid, ~2×)
 *    6 days   → push / pull / legs ×2                (each muscle 2×)
 *
 * Goal "flavour" (strength_style) changes rep scheme + exercise emphasis, NOT
 * the split:
 *    strength      → heavy, low reps, big compounds (powerlifting bias)
 *    bodybuilding  → moderate–high reps, more isolation + volume
 *    functional    → mixed reps, compounds + unilateral + carries + core
 *
 * buildWeek(ctx) → array of session specs (no day assigned yet — the scheduler
 * places them). Each spec:
 *    { discipline:'gym', focus, duration, items, intensity, lowerBody }
 * `intensity` ('hard'|'moderate') and `lowerBody` let the scheduler space heavy
 * leg work away from hard runs (the main concurrent-training conflict).
 */

// ---- split selection: which session roles run this week, by gym-days ----
const SPLITS = {
  1: ['full'],
  2: ['full', 'full'],
  3: ['full', 'full', 'full'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['upper', 'lower', 'push', 'pull', 'legs'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs']
};

const LOWER_ROLES = new Set(['lower', 'legs', 'full']);

// ---- rep/intensity scheme by style + phase intent ----
// main = primary compound, acc = accessory. Deload overrides everything.
function scheme(style, intent, deload) {
  if (deload) return { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' };
  const table = {
    strength: {
      base:  { main: '4 × 5', acc: '3 × 8',  mainRpe: 'RPE 7',    accRpe: 'RPE 7' },
      build: { main: '4 × 4', acc: '3 × 6',  mainRpe: 'RPE 8',    accRpe: 'RPE 7→8' },
      peak:  { main: '4 × 3', acc: '3 × 5',  mainRpe: 'RPE 8→9',  accRpe: 'RPE 8' }
    },
    bodybuilding: {
      base:  { main: '3 × 12', acc: '3 × 12', mainRpe: 'RPE 7',   accRpe: 'RPE 8' },
      build: { main: '4 × 10', acc: '3 × 12', mainRpe: 'RPE 8',   accRpe: 'RPE 8→9' },
      peak:  { main: '4 × 8',  acc: '3 × 10', mainRpe: 'RPE 8→9', accRpe: 'RPE 9' }
    },
    functional: {
      base:  { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 6', acc: '3 × 8',  mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
      peak:  { main: '3 × 5', acc: '3 × 6',  mainRpe: 'RPE 8',   accRpe: 'RPE 8' }
    }
  };
  return (table[style] || table.functional)[intent] || table.functional.base;
}

// Progression note shown on the primary lift.
function mainNote(deload) {
  return deload
    ? 'deload — ~65% load, leave 3+ reps in the tank'
    : '+small load when the last set is ≤ target RPE';
}

// ---- exercise picking, with a bodyweight fall-back when no weights ----
// `weights` true when the user has a full gym or home weights.
function lift(weights, barbell, bodyweight) {
  return weights ? barbell : bodyweight;
}

// Build the item list for one session role. Style nudges which accessories and
// finishers appear; the scheme sets the sets×reps. Items use the strength shape
// the screens already render ({ num, name, sets, rpe, note, tag? }).
function itemsForRole(role, { style, weights, s, deload }) {
  const main = (num, name, note) => ({ num, name, sets: s.main, rpe: s.mainRpe, note: note ?? mainNote(deload) });
  const acc  = (num, name, note) => ({ num, name, sets: s.acc, rpe: s.accRpe, note: note || '' });
  const core = (num, name, sets, note) => ({ num, name, sets, rpe: 'RPE 6', tag: 'mobility', note: note || '' });

  const squat  = lift(weights, 'Back squat', 'Bodyweight squat / split squat');
  const hinge  = lift(weights, 'Romanian deadlift', 'Single-leg hip hinge');
  const bench  = lift(weights, 'Bench press', 'Push-up (feet elevated if easy)');
  const row    = lift(weights, 'Barbell / DB row', 'Inverted row / band row');
  const press  = lift(weights, 'Overhead press', 'Pike push-up');
  const pull   = lift(weights, 'Pull-up / lat pulldown', 'Band-assisted pull-up');

  switch (role) {
    case 'upper':
      return [
        main('A1', bench),
        acc('A2', row, 'squeeze 1s'),
        acc('B1', press),
        acc('B2', pull),
        ...(style === 'bodybuilding' ? [acc('C1', 'Lateral raise'), acc('C2', 'Biceps curl + triceps')] : []),
        core('D1', 'Face pull', '3 × 15', 'shoulder health')
      ];
    case 'lower':
      return [
        main('A1', squat),
        acc('B1', hinge, 'controlled hinge'),
        acc('B2', 'Split squat / lunge', 'per leg'),
        ...(style === 'bodybuilding' ? [acc('C1', 'Leg curl'), acc('C2', 'Leg extension')] : []),
        ...(style === 'functional' ? [{ num: 'C1', name: 'Loaded carry', sets: '3 × 30 m', rpe: 'RPE 7', note: 'brace, tall posture' }] : []),
        core('D1', 'Calf raise', '3 × 12'),
        core('D2', 'Pallof press', '3 × 10 ea.', 'anti-rotation core')
      ];
    case 'push':
      return [
        main('A1', bench),
        acc('A2', 'Incline DB press'),
        acc('B1', press),
        acc('B2', 'Lateral raise', 'RPE 9 — leave nothing'),
        acc('C1', 'Triceps pushdown / dip')
      ];
    case 'pull':
      return [
        main('A1', pull),
        acc('A2', row),
        acc('B1', 'Cable / chest-supported row'),
        core('B2', 'Face pull', '3 × 15'),
        acc('C1', 'Biceps curl', 'control the eccentric')
      ];
    case 'legs':
      return [
        main('A1', squat),
        acc('B1', hinge),
        acc('B2', 'Leg press / split squat', 'per leg'),
        ...(style === 'bodybuilding' ? [acc('C1', 'Leg curl'), acc('C2', 'Calf raise')] : [core('C1', 'Calf raise', '3 × 12')]),
        core('D1', 'Hanging knee raise', '3 × 12', 'trunk')
      ];
    // full body (default)
    default:
      return [
        main('A1', squat),
        acc('A2', bench),
        acc('B1', hinge),
        acc('B2', row),
        ...(style === 'functional'
          ? [{ num: 'C1', name: 'Loaded carry', sets: '3 × 30 m', rpe: 'RPE 7', note: 'brace, tall posture' }]
          : [acc('C1', press)]),
        core('C2', 'Plank + hip mobility', '3 × 30s')
      ];
  }
}

const ROLE_FOCUS = {
  full: 'Full-body strength', upper: 'Upper strength', lower: 'Lower strength',
  push: 'Push (chest · shoulders · triceps)', pull: 'Pull (back · biceps)', legs: 'Legs'
};

/**
 * Build the week's gym sessions.
 * @param {object} ctx
 *   gymDays   number 1–6 (how many gym sessions this week)
 *   style     'strength' | 'bodybuilding' | 'functional'
 *   intent    'base' | 'build' | 'peak'
 *   deload    boolean
 *   minutes   typical session length (sets the duration label)
 *   access    array of equipment keys from onboarding
 * @returns {Array} session specs (no day assigned yet)
 */
export function buildWeek(ctx = {}) {
  const gymDays = Math.max(1, Math.min(6, ctx.gymDays || 3));
  const style = ctx.style || 'functional';
  const intent = ctx.intent || 'base';
  const deload = !!ctx.deload;
  const minutes = ctx.minutes || 60;
  const access = ctx.access || [];
  const weights = access.includes('full_gym') || access.includes('home_weights') || access.length === 0;

  const s = scheme(style, intent, deload);
  const roles = SPLITS[gymDays] || SPLITS[3];
  const lo = Math.max(35, minutes - 10);
  const duration = `${lo}–${minutes} min`;

  return roles.map(role => ({
    discipline: 'gym',
    focus: ROLE_FOCUS[role] || ROLE_FOCUS.full,
    duration,
    items: itemsForRole(role, { style, weights, s, deload }),
    intensity: deload ? 'moderate' : 'hard',
    lowerBody: LOWER_ROLES.has(role)
  }));
}

export default { buildWeek };
