/**
 * planTemplates — the session "building blocks" the plan generator assembles.
 *
 * Each builder takes a context (day, role, level, phase intent, week-in-phase,
 * deload, equipment access, pool length) and returns a session in the SAME
 * shape the screens already render (see src/data/Plan.js):
 *
 *   { title: 'Monday · Easy run', duration: '30 min', items: [ ...exercises ] }
 *
 * Item `tag` drives the column layout via src/data/activityTypes.js:
 *   tag:'run' | 'cycle' | 'swim' | 'mobility' | (none → strength).
 *
 * Titles intentionally start with the day name and contain a sport keyword so
 * WeekDetail's day-strip and type pills pick them up. This is the science-backed
 * repository the AI coach will later draw from — keep prescriptions sane and
 * progressions gentle; the generator clamps volumes, these define the content.
 */

// ---- small helpers ----
const pick = (map, level, fallback) => map[level] ?? fallback;
const mk = (day, focus, duration, items) => ({ title: `${day} · ${focus}`, duration, items });
const cooldown = (num = 'M1') => ({ num, name: 'Cooldown + mobility', sets: '5 min', rpe: 'Easy', tag: 'mobility', note: 'easy stretch — calves, hips, t-spine' });
const round5 = (n) => Math.round(n / 5) * 5;

// =====================================================================
// RUN
// =====================================================================
function buildRun(ctx) {
  const { day, role, level, intent, winp, deload } = ctx;
  const easy = pick({ beginner: 25, returning: 30, intermediate: 35, advanced: 45 }, level, 30);
  const longBase = pick({ beginner: 35, returning: 45, intermediate: 60, advanced: 75 }, level, 45);

  if (deload) {
    return mk(day, 'Easy run', `${round5(easy * 0.6)} min`, [
      { num: 'R1', name: 'Easy run', distance: `${round5(easy * 0.6)} min`, pace: 'Z2', note: 'deload — short and conversational', tag: 'run' }
    ]);
  }
  if (role === 'long') {
    const dur = round5(longBase + (intent === 'build' ? Math.min(winp, 6) * 5 : 0));
    return mk(day, 'Long run', `${dur} min`, [
      { num: 'R1', name: 'Long run', distance: `${dur} min`, pace: 'Z2', note: 'steady, conversational — build aerobic base', tag: 'run' },
      cooldown()
    ]);
  }
  if (role === 'quality') {
    const q = intent === 'peak'
      ? { focus: 'Quality run', set: '6 × 3 min @ goal race pace, 90s easy jog' }
      : intent === 'build'
        ? (winp % 2
            ? { focus: 'Tempo run', set: '2 × 10 min comfortably-hard, 3 min easy between' }
            : { focus: 'Interval run', set: '6 × 2 min @ 5k effort, 2 min easy' })
        : { focus: 'Strides run', set: `${easy} min easy + 6 × 20s relaxed strides` };
    return mk(day, q.focus, '40–50 min', [
      { num: 'R1', name: 'Warm-up jog', distance: '10 min', pace: 'Z1–Z2', note: 'easy build + drills', tag: 'run' },
      { num: 'R2', name: 'Main set', distance: q.set, pace: 'Z3–Z4', note: 'hold form when it bites', tag: 'run' },
      cooldown()
    ]);
  }
  // easy (default)
  return mk(day, 'Easy run', `${easy} min`, [
    { num: 'R1', name: 'Easy run', distance: `${easy} min`, pace: 'Z2', note: 'aerobic base — nose-breathing pace', tag: 'run' },
    cooldown()
  ]);
}

// =====================================================================
// SWIM
// =====================================================================
function buildSwim(ctx) {
  const { day, role, level, deload, poolLength } = ctx;
  const pool = poolLength || 25;
  const endBase = pick({ beginner: 800, returning: 1200, intermediate: 1800, advanced: 2400 }, level, 1200);
  const total = deload ? round5(endBase * 0.6) : endBase;

  if (role === 'technique' && !deload) {
    return mk(day, 'Swim technique', `35–45 min · ~${Math.max(600, round5(endBase * 0.6))} m · ${pool}m pool`, [
      { num: 'W1', name: 'Warm-up', stroke: 'Freestyle easy', distance: '200 m', effort: 'Easy', cue: 'long body line', tag: 'swim' },
      { num: 'W2', name: 'Catch-up drill', stroke: 'Drill', distance: '4 × 50 m', effort: 'Technique', cue: 'high elbow catch', tag: 'swim' },
      { num: 'W3', name: 'Single-arm freestyle', stroke: 'Drill', distance: '4 × 50 m', effort: 'Technique', cue: '3 strokes each side', tag: 'swim' },
      { num: 'W4', name: 'Pull-buoy swim', stroke: 'Pull', distance: '4 × 50 m', effort: 'Easy', cue: 'isolate the upper body', tag: 'swim' },
      { num: 'W5', name: 'Cool-down', stroke: 'Easy choice', distance: '100 m', effort: 'Easy', cue: '', tag: 'swim' }
    ]);
  }
  // endurance (default)
  const main = deload ? `${round5(total * 0.5)} m easy` : `${round5(total * 0.6)} m continuous build`;
  return mk(day, 'Swim endurance', `40–55 min · ~${total} m · ${pool}m pool`, [
    { num: 'W1', name: 'Warm-up + drills', stroke: 'Mixed', distance: '300 m', effort: 'Easy', cue: '200 easy + 100 drill', tag: 'swim' },
    { num: 'W2', name: 'Main set', stroke: 'Freestyle', distance: main, effort: deload ? 'Easy' : 'Mod', cue: 'smooth, even pacing', tag: 'swim' },
    { num: 'W3', name: 'Cool-down', stroke: 'Easy choice', distance: '100 m', effort: 'Easy', cue: '', tag: 'swim' }
  ]);
}

// =====================================================================
// CYCLE
// =====================================================================
function buildCycle(ctx) {
  const { day, role, level, intent, winp, deload } = ctx;
  const endBase = pick({ beginner: 45, returning: 60, intermediate: 75, advanced: 90 }, level, 60);

  if (deload) {
    return mk(day, 'Ride — recovery', `${round5(endBase * 0.6)} min`, [
      { num: 'C1', name: 'Easy spin', distance: `${round5(endBase * 0.6)} min`, pace: 'Z1–Z2', note: 'deload — light, high cadence', tag: 'cycle' }
    ]);
  }
  if (role === 'intervals' && intent !== 'base') {
    return mk(day, 'Ride — intervals', '50–60 min', [
      { num: 'C1', name: 'Warm-up', distance: '15 min', pace: 'Z1–Z2', note: 'build cadence', tag: 'cycle' },
      { num: 'C2', name: 'Main set', distance: `${4 + Math.min(winp, 4)} × 4 min hard / 3 min easy`, pace: 'Z4', note: 'threshold effort', tag: 'cycle' },
      { num: 'C3', name: 'Cool-down', distance: '10 min', pace: 'Z1', note: '', tag: 'cycle' }
    ]);
  }
  const dur = round5(endBase + (intent === 'build' ? Math.min(winp, 6) * 5 : 0));
  return mk(day, 'Ride — endurance', `${dur} min`, [
    { num: 'C1', name: 'Endurance ride', distance: `${dur} min`, pace: 'Z2', note: 'steady aerobic, smooth cadence', tag: 'cycle' }
  ]);
}

// =====================================================================
// STRENGTH — functional
// =====================================================================
function strengthScheme(level, intent) {
  // main lift sets×reps, accessory sets×reps
  const sets = pick({ beginner: 3, returning: 3, intermediate: 4, advanced: 4 }, level, 3);
  if (intent === 'peak') return { main: `${sets} × 3`, acc: '3 × 8', rpe: 'RPE 7' };
  if (intent === 'build') return { main: `${sets} × 5`, acc: '3 × 8', rpe: 'RPE 7→8' };
  return { main: `${sets} × 6`, acc: '3 × 10', rpe: 'RPE 7' };
}

function buildStrengthFunctional(ctx) {
  const { day, role, level, intent, deload } = ctx;
  const s = strengthScheme(level, intent);
  const note = deload ? 'deload — 70% load, leave 3 in the tank' : '+small load when last set ≤ RPE 7';
  const ds = deload ? { main: '2 × 5', acc: '2 × 8', rpe: 'RPE 6' } : s;

  if (role === 'upper') {
    return mk(day, 'Upper strength', '45–55 min', [
      { num: 'A1', name: 'Bench press', sets: ds.main, rpe: ds.rpe, note },
      { num: 'A2', name: 'Chest-supported row', sets: ds.acc, rpe: 'RPE 7', note: 'squeeze 1s' },
      { num: 'B1', name: 'DB shoulder press', sets: ds.acc, rpe: 'RPE 7', note: '' },
      { num: 'B2', name: 'Lat pulldown / pull-up', sets: ds.acc, rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Face pull', sets: '3 × 15', rpe: 'RPE 6', tag: 'mobility', note: 'shoulder health' }
    ]);
  }
  if (role === 'lower') {
    return mk(day, 'Lower strength', '45–55 min', [
      { num: 'A1', name: 'Back squat', sets: ds.main, rpe: ds.rpe, note },
      { num: 'B1', name: 'Romanian deadlift', sets: ds.acc, rpe: 'RPE 7', note: 'controlled hinge' },
      { num: 'B2', name: 'Bulgarian split squat', sets: '3 × 8 ea.', rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Calf raise', sets: '3 × 12', rpe: 'RPE 7', note: '' },
      { num: 'C2', name: 'Pallof press', sets: '3 × 10 ea.', rpe: 'RPE 6', tag: 'mobility', note: 'anti-rotation core' }
    ]);
  }
  // full-body (default)
  return mk(day, 'Full-body strength', '45–55 min', [
    { num: 'A1', name: 'Squat', sets: ds.main, rpe: ds.rpe, note },
    { num: 'A2', name: 'Push-up / bench press', sets: ds.acc, rpe: 'RPE 7', note: '' },
    { num: 'B1', name: 'Hinge (RDL / hip thrust)', sets: ds.acc, rpe: 'RPE 7', note: '' },
    { num: 'B2', name: 'Row / pull-up', sets: ds.acc, rpe: 'RPE 7', note: '' },
    { num: 'C1', name: 'Loaded carry', sets: '3 × 30 m', rpe: 'RPE 7', note: 'brace, tall posture' },
    { num: 'C2', name: 'Plank + mobility', sets: '3 × 30s', rpe: 'Easy', tag: 'mobility', note: '' }
  ]);
}

// =====================================================================
// STRENGTH — physique / bodybuilding
// =====================================================================
function buildStrengthPhysique(ctx) {
  const { day, role, level, deload } = ctx;
  const sets = pick({ beginner: 3, returning: 3, intermediate: 4, advanced: 4 }, level, 3);
  const accSets = deload ? 2 : sets;
  const note = deload ? 'deload — drop a set, keep reps clean' : 'last 1–2 reps should be hard';

  if (role === 'pull') {
    return mk(day, 'Pull (back & biceps)', '50–60 min', [
      { num: 'A1', name: 'Pull-up / lat pulldown', sets: `${accSets} × 8`, rpe: 'RPE 8', note },
      { num: 'A2', name: 'Barbell / DB row', sets: `${accSets} × 10`, rpe: 'RPE 8', note: '' },
      { num: 'B1', name: 'Cable row', sets: '3 × 12', rpe: 'RPE 8', note: '' },
      { num: 'B2', name: 'Face pull', sets: '3 × 15', rpe: 'RPE 7', note: '' },
      { num: 'C1', name: 'Biceps curl', sets: '3 × 12', rpe: 'RPE 9', note: 'control the eccentric' }
    ]);
  }
  if (role === 'legs') {
    return mk(day, 'Legs', '50–60 min', [
      { num: 'A1', name: 'Back / front squat', sets: `${accSets} × 8`, rpe: 'RPE 8', note },
      { num: 'B1', name: 'Romanian deadlift', sets: `${accSets} × 10`, rpe: 'RPE 8', note: '' },
      { num: 'B2', name: 'Leg press / split squat', sets: '3 × 12', rpe: 'RPE 8', note: '' },
      { num: 'C1', name: 'Leg curl', sets: '3 × 12', rpe: 'RPE 9', note: '' },
      { num: 'C2', name: 'Calf raise', sets: '4 × 15', rpe: 'RPE 9', note: '' }
    ]);
  }
  // push (default)
  return mk(day, 'Push (chest, shoulders, triceps)', '50–60 min', [
    { num: 'A1', name: 'Bench press', sets: `${accSets} × 8`, rpe: 'RPE 8', note },
    { num: 'A2', name: 'Incline DB press', sets: `${accSets} × 10`, rpe: 'RPE 8', note: '' },
    { num: 'B1', name: 'Overhead press', sets: '3 × 10', rpe: 'RPE 8', note: '' },
    { num: 'B2', name: 'Lateral raise', sets: '3 × 15', rpe: 'RPE 9', note: '' },
    { num: 'C1', name: 'Triceps pushdown', sets: '3 × 12', rpe: 'RPE 9', note: '' }
  ]);
}

// =====================================================================
// GENERAL HEALTH — one balanced session: strength + cardio + mobility
// =====================================================================
function buildGeneral(ctx) {
  const { day, deload } = ctx;
  const sets = deload ? '2 sets' : '3 sets';
  return mk(day, 'Movement & strength', '40–50 min', [
    { num: 'A1', name: 'Goblet squat', sets: `${sets} × 10`, rpe: 'RPE 6', note: 'smooth, full range' },
    { num: 'A2', name: 'Push-up (incline if needed)', sets: `${sets} × 10`, rpe: 'RPE 6', note: '' },
    { num: 'B1', name: 'DB row', sets: `${sets} × 10`, rpe: 'RPE 6', note: '' },
    { num: 'B2', name: 'Glute bridge', sets: `${sets} × 12`, rpe: 'RPE 6', note: '' },
    { num: 'C1', name: 'Easy cardio finisher', sets: '10–15 min', rpe: 'Z2', note: 'walk, bike, or row — keep it easy', tag: 'run' },
    { num: 'C2', name: 'Full-body mobility', sets: '5 min', rpe: 'Easy', tag: 'mobility', note: 'hips, t-spine, ankles' }
  ]);
}

// ---- dispatch ----
const BUILDERS = {
  run: buildRun,
  swim: buildSwim,
  cycle: buildCycle,
  strength_f: buildStrengthFunctional,
  strength_p: buildStrengthPhysique,
  general: buildGeneral
};

// Build one session for a given internal sport key + context.
export function buildSession(sportKey, ctx) {
  const builder = BUILDERS[sportKey] || buildGeneral;
  return builder(ctx);
}

export default { buildSession };
