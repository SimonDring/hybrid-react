/**
 * Swimming engine — builds a week of swims with CSS-based pace targets and a
 * technique focus that stages with the swimmer's level.
 *
 * The science (see research notes in the rebuild plan):
 *  • CSS (Critical Swim Speed) is the swim equivalent of threshold pace — the
 *    pace sustainable for ~30 min. Tested as (T400 − T200) / 2 over a 100 m, it
 *    anchors every training pace (TrainingPeaks / MyProCoach). Sets are then
 *    prescribed at CSS ± a few seconds per 100 m.
 *  • When the swimmer hasn't tested, we estimate CSS from their level (and their
 *    given 100 m pace if they have one); the AI coach refines it later.
 *  • Technique is taught in stages, because fixing the biggest limiter first
 *    matters most:
 *      beginner     → body position + breathing
 *      intermediate → catch & pull (high elbow)
 *      advanced     → kick, bilateral breathing, stroke rate / rhythm
 *
 * buildWeek(ctx) → array of swim session specs the scheduler places.
 * computeCss(current, level) is exported for the UI.
 */

// Offsets (sec per 100 m) from CSS → training paces.
const CSS_OFFSET = { speed: -5, css: 0, aerobic: 8, easy: 12 };

// Fallback CSS pace (sec / 100 m) by level when there's no test/time.
const LEVEL_CSS = { beginner: 150, returning: 130, intermediate: 110, advanced: 92 };

// Total session metres baseline by level (scaled by phase/week below).
const LEVEL_VOLUME = { beginner: 800, returning: 1200, intermediate: 1800, advanced: 2400 };

// Staged technique drills — the focus shifts as the swimmer progresses.
const DRILLS = {
  beginner: [
    { name: 'Kick on side', cue: 'long body line, head still' },
    { name: 'Push-and-glide', cue: 'streamline, balance' },
    { name: 'Breathe every 3', cue: 'exhale fully underwater' }
  ],
  returning: [
    { name: 'Kick on side', cue: 'long body line, head still' },
    { name: 'Catch-up drill', cue: 'patient front hand' },
    { name: 'Breathe every 3', cue: 'relaxed bilateral' }
  ],
  intermediate: [
    { name: 'Catch-up drill', cue: 'high-elbow catch' },
    { name: 'Single-arm freestyle', cue: 'press water back, not down' },
    { name: 'Sculling', cue: 'feel for the water' }
  ],
  advanced: [
    { name: 'Fingertip-drag', cue: 'high elbow recovery' },
    { name: 'Bilateral breathing every 5', cue: 'symmetry under fatigue' },
    { name: 'Tempo build (DPS)', cue: 'hold distance-per-stroke as rate climbs' }
  ]
};
const TECH_THEME = {
  beginner: 'body position & breathing', returning: 'body position & breathing',
  intermediate: 'catch & pull', advanced: 'kick, rhythm & stroke rate'
};

// ---- helpers ----
function parsePer100(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(isNaN) || !parts.length) return null;
  return parts.reduce((a, p) => a * 60 + p, 0);
}
function fmt100(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const round50 = (m) => Math.round(m / 50) * 50;

// Sum the metres across a session's items so the header total matches the sets.
// Handles 'NNN m' and 'a × b m' distance strings; ignores anything without metres.
function sumMetres(items) {
  let total = 0;
  for (const it of items) {
    const m = /(?:(\d+)\s*[×x]\s*)?(\d+)\s*m\b/.exec(it.distance || '');
    if (m) total += (m[1] ? Number(m[1]) : 1) * Number(m[2]);
  }
  return total;
}

/**
 * Estimate CSS and the pace zones.
 * @param {object|null} current  { css, pace_per_100, distance_m } — any subset
 * @param {string} level
 * @returns {{ cssSec, paces, estimated }}
 *   paces: { speed, css, aerobic, easy } as 'm:ss' per 100 m
 */
export function computeCss(current, level = 'beginner') {
  let cssSec, estimated;
  const tested = current && (parsePer100(current.css) || parsePer100(current.pace_per_100));
  if (tested) {
    cssSec = tested;
    estimated = false;
  } else {
    cssSec = LEVEL_CSS[level] ?? LEVEL_CSS.beginner;
    estimated = true;
  }
  const paces = {};
  for (const k in CSS_OFFSET) paces[k] = fmt100(cssSec + CSS_OFFSET[k]);
  return { cssSec, paces, estimated };
}

function effort(label, paces, key) { return `${label} ${paces[key]}/100`; }

// ---- weekly role pattern ----
function rolePattern(swimDays, intent) {
  const css = intent !== 'base';
  switch (Math.max(1, swimDays)) {
    case 1:  return ['endurance'];
    case 2:  return [css ? 'css' : 'technique', 'endurance'];
    case 3:  return ['technique', css ? 'css' : 'endurance', 'endurance'];
    default: {
      const r = ['technique', css ? 'css' : 'endurance', 'endurance'];
      while (r.length < swimDays) r.push('technique');
      return r.slice(0, swimDays);
    }
  }
}

// ---- session builders ----
function techniqueSession({ level, paces, vol, deload }) {
  const total = round50((deload ? vol * 0.5 : vol * 0.6));
  const drills = DRILLS[level] || DRILLS.beginner;
  const items = [
    { num: 'W1', name: 'Warm-up', stroke: 'Freestyle easy', distance: '200 m', effort: effort('Easy', paces, 'easy'), cue: 'find your rhythm', tag: 'swim' },
    ...drills.map((d, i) => ({ num: `W${i + 2}`, name: d.name, stroke: 'Drill', distance: '4 × 50 m', effort: 'Technique', cue: d.cue, tag: 'swim' })),
    { num: 'WE', name: 'Smooth swim', stroke: 'Freestyle', distance: `${round50(total * 0.3)} m`, effort: effort('Aerobic', paces, 'aerobic'), cue: 'apply the drill focus', tag: 'swim' },
    { num: 'WC', name: 'Cool-down', stroke: 'Easy choice', distance: '100 m', effort: effort('Easy', paces, 'easy'), cue: '', tag: 'swim' }
  ];
  return { discipline: 'swim', focus: `Swim technique — ${TECH_THEME[level] || TECH_THEME.beginner}`, duration: `35–45 min · ~${sumMetres(items)} m`, intensity: 'easy', items };
}

function enduranceSession({ goalDistanceM, level, progress, paces, vol, deload, taperMult }) {
  // Endurance volume ramps across the whole plan toward the goal distance,
  // capped for safety (never more than ~2.2× the level baseline).
  const cap = goalDistanceM ? Math.min(goalDistanceM * 1.1, vol * 2.2) : vol * 1.4;
  let total = vol + (cap - vol) * progress;
  if (deload) total *= 0.6;
  total *= (taperMult || 1);
  total = round50(total);
  // Size the continuous main set so warm-up + main + cool-down ≈ the target total.
  const mainM = round50(Math.max(200, total - 400));
  const items = [
    { num: 'W1', name: 'Warm-up + drills', stroke: 'Mixed', distance: '300 m', effort: effort('Easy', paces, 'easy'), cue: '200 easy + 100 drill', tag: 'swim' },
    { num: 'W2', name: 'Continuous build', stroke: 'Freestyle', distance: `${mainM} m`, effort: effort(deload ? 'Easy' : 'Aerobic', paces, deload ? 'easy' : 'aerobic'), cue: 'smooth, even pacing', tag: 'swim' },
    { num: 'W3', name: 'Cool-down', stroke: 'Easy choice', distance: '100 m', effort: effort('Easy', paces, 'easy'), cue: '', tag: 'swim' }
  ];
  return { discipline: 'swim', focus: 'Swim endurance', duration: `40–55 min · ~${sumMetres(items)} m`, intensity: deload ? 'easy' : 'moderate', items };
}

function cssSession({ intent, winp, paces, vol, deload }) {
  if (deload) return techniqueSession({ level: 'intermediate', paces, vol, deload: true });
  const reps = intent === 'peak' ? 8 : Math.min(4 + winp, 8);
  return {
    discipline: 'swim', focus: 'Swim — CSS intervals', duration: `40–50 min · threshold`, intensity: 'hard',
    items: [
      { num: 'W1', name: 'Warm-up + build', stroke: 'Mixed', distance: '300 m', effort: effort('Easy', paces, 'easy'), cue: 'last 50 brisk', tag: 'swim' },
      { num: 'W2', name: 'Main set', stroke: 'Freestyle', distance: `${reps} × 100 m`, effort: effort('CSS', paces, 'css'), cue: '15s rest — hold the pace', tag: 'swim' },
      { num: 'W3', name: 'Speed finish', stroke: 'Freestyle', distance: '4 × 50 m', effort: effort('Fast', paces, 'speed'), cue: 'strong, controlled', tag: 'swim' },
      { num: 'W4', name: 'Cool-down', stroke: 'Easy choice', distance: '100 m', effort: effort('Easy', paces, 'easy'), cue: '', tag: 'swim' }
    ]
  };
}

/**
 * Build the week's swims.
 * @param {object} ctx
 *   swimDays  number of swim sessions this week
 *   goal      { distance_m, current:{css|pace_per_100|distance_m}|null }
 *   level     experience level
 *   intent    'base' | 'build' | 'peak'
 *   deload    boolean
 * @returns {Array} swim session specs (no day assigned yet)
 */
export function buildWeek(ctx = {}) {
  const swimDays = Math.max(1, Math.min(7, ctx.swimDays || 2));
  const goal = ctx.goal || {};
  const level = ctx.level || 'beginner';
  const intent = ctx.intent || 'base';
  const deload = !!ctx.deload;
  const winp = ctx.winp || 1;
  const progress = ctx.progress != null ? ctx.progress : 0.5; // 0→1 across the whole plan
  const taperMult = ctx.taperMult || 1;
  const { paces } = computeCss(goal.current, level);
  const vol = LEVEL_VOLUME[level] || LEVEL_VOLUME.beginner;
  const goalDistanceM = goal.distance_m || null;

  const roles = rolePattern(swimDays, intent);
  return roles.map(role => {
    if (role === 'technique') return techniqueSession({ level, paces, vol, deload });
    if (role === 'css') return cssSession({ intent, winp, paces, vol, deload });
    return enduranceSession({ goalDistanceM, level, progress, paces, vol, deload, taperMult });
  });
}

export default { buildWeek, computeCss };
