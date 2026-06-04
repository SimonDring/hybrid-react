/**
 * Running engine — builds a week of runs with real per-session pace targets.
 *
 * The science (see research notes in the rebuild plan):
 *  • 80/20 polarised: ~80% of running easy, ~20% hard, almost nothing in the
 *    grey zone between (Seiler). So a week is mostly easy running + one long run
 *    + 1–2 quality sessions.
 *  • Pace targets come from the runner's current fitness via two well-established
 *    formulas:
 *      – Riegel race-time prediction: T₂ = T₁ × (D₂/D₁)^1.06 — turns any recent
 *        time into an equivalent time at the goal distance (and a reference 5k).
 *      – Daniels-style training zones (Easy / Marathon / Threshold / Interval /
 *        Rep) derived as offsets from 5k race pace.
 *  • When the user gives no time we estimate a starting 5k pace from their
 *    experience level — the plan still works, and the AI coach refines it later
 *    by watching actual paces vs these targets.
 *
 * buildWeek(ctx) → array of run session specs the scheduler places.
 * computePaces(goal, current, level) is exported so the UI can show the goal
 * prediction and the pace zones.
 */

// Goal/known distances in metres.
const DIST = { '5k': 5000, '10k': 10000, 'half': 21097, 'marathon': 42195 };
const GOAL_LABEL = { '5k': '5K', '10k': '10K', 'half': 'half-marathon', 'marathon': 'marathon' };

// Offsets (seconds per km) from 5k race pace → Daniels-style training paces.
// Calibrated against published VDOT tables (good fit around VDOT 40–55).
const PACE_OFFSET = { easy: 85, marathon: 42, threshold: 25, interval: 3, rep: -12 };

// Fallback 5k pace (sec/km) by experience level when no time is given.
const LEVEL_5K_PACE = { beginner: 420, returning: 375, intermediate: 315, advanced: 260 };

// ---- small time/pace helpers ----
function parseTime(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(isNaN) || !parts.length) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0); // h:mm:ss or mm:ss → seconds
}
function metresFor(distance) {
  if (typeof distance === 'number') return distance;
  return DIST[distance] || null;
}
function fmtPace(secPerKm) {
  const s = Math.round(secPerKm);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function fmtTime(totalSec) {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
           : `${m}:${String(ss).padStart(2, '0')}`;
}

// Riegel prediction: time at d2 given time t1 (sec) over d1 (m).
function riegel(t1, d1, d2) { return t1 * Math.pow(d2 / d1, 1.06); }

/**
 * Derive training paces and the goal-time prediction from current fitness.
 * @param {string} goalKey  '5k' | '10k' | 'half' | 'marathon'
 * @param {object|null} current  { distance, time } — distance is a key or metres
 * @param {string} level  experience level (used only when current is missing)
 * @returns {{ paces, fivekPaceSec, goalPrediction, estimated }}
 *   paces: { easy, marathon, threshold, interval, rep } as 'm:ss' strings (per km)
 *   goalPrediction: 'h:mm:ss' equivalent time at the goal distance, or null
 *   estimated: true when paces came from the level fallback, not a real time
 */
export function computePaces(goalKey, current, level = 'beginner') {
  let fivekSec, estimated;
  const t = current && parseTime(current.time);
  const dm = current && metresFor(current.distance);
  if (t && dm) {
    fivekSec = riegel(t, dm, 5000);
    estimated = false;
  } else {
    fivekSec = (LEVEL_5K_PACE[level] ?? LEVEL_5K_PACE.beginner) * 5;
    estimated = true;
  }
  const fivekPaceSec = fivekSec / 5;
  const paces = {};
  for (const k in PACE_OFFSET) paces[k] = fmtPace(fivekPaceSec + PACE_OFFSET[k]);

  const goalM = metresFor(goalKey);
  const goalPrediction = goalM ? fmtTime(riegel(fivekSec, 5000, goalM)) : null;

  return { paces, fivekPaceSec, goalPrediction, estimated };
}

// Zone label + actual pace, e.g. "Easy · 5:24/km".
function zone(label, paces, key) { return `${label} · ${paces[key]}/km`; }

// ---- weekly role pattern (which run does what), honouring 80/20 ----
// Returns an array of roles for `runDays` sessions. One long run always; the
// number of hard (quality) sessions grows with the phase, the rest stay easy.
function rolePattern(runDays, intent) {
  const qualityCount = intent === 'base' ? (runDays >= 4 ? 1 : 0)
                     : intent === 'build' ? (runDays >= 3 ? 2 : 1)
                     : (runDays >= 3 ? 2 : 1); // peak
  const roles = [];
  if (runDays >= 2) roles.push('long');
  for (let i = 0; i < qualityCount && roles.length < runDays; i++) roles.push('quality');
  while (roles.length < runDays) roles.push('easy');
  if (runDays === 1) return intent === 'base' ? ['easy'] : ['long'];
  return roles;
}

// ---- session builders ----
function easyRun({ level, minutes, paces, deload }) {
  const base = { beginner: 25, returning: 30, intermediate: 40, advanced: 50 }[level] || 30;
  const dur = Math.round((deload ? base * 0.6 : Math.min(base, minutes)) / 5) * 5;
  return {
    discipline: 'run', focus: 'Easy run', duration: `${dur} min`, intensity: 'easy',
    items: [
      { num: 'R1', name: 'Easy run', distance: `${dur} min`, pace: zone('Easy', paces, 'easy'), note: 'conversational, nose-breathing pace', tag: 'run' },
      { num: 'M1', name: 'Cooldown mobility', sets: '5 min', rpe: 'Easy', tag: 'mobility', note: 'calves, hips' }
    ]
  };
}

function longRun({ goalKey, level, intent, progress, paces, deload }) {
  const base = { '5k': 40, '10k': 50, 'half': 70, 'marathon': 90 }[goalKey] || 60;
  const lvlF = { beginner: 0.7, returning: 0.85, intermediate: 1, advanced: 1.15 }[level] || 0.85;
  // Long run ramps across the whole plan (progress 0→1), not within each phase.
  const peakExtra = { '5k': 15, '10k': 25, 'half': 45, 'marathon': 70 }[goalKey] || 30;
  let dur = base * lvlF + peakExtra * progress;
  if (deload) dur *= 0.6;
  dur = Math.round(dur / 5) * 5;
  // In build/peak for half & marathon, finish the long run at marathon pace.
  const mpFinish = !deload && intent !== 'base' && (goalKey === 'half' || goalKey === 'marathon');
  const items = [
    { num: 'R1', name: 'Long run', distance: `${dur} min`, pace: zone('Easy', paces, 'easy'), note: 'steady aerobic — builds endurance', tag: 'run' }
  ];
  if (mpFinish) items.push({ num: 'R2', name: 'Finish at goal pace', distance: '10–15 min', pace: zone('Marathon', paces, 'marathon'), note: 'controlled, on tired legs', tag: 'run' });
  items.push({ num: 'M1', name: 'Cooldown walk + mobility', sets: '10 min', rpe: 'Easy', tag: 'mobility', note: '' });
  return { discipline: 'run', focus: 'Long run', duration: `${dur}${mpFinish ? '+15' : ''} min`, intensity: deload ? 'easy' : 'moderate', items };
}

// Quality session content by goal distance + phase intent.
function qualitySet(goalKey, intent, paces) {
  const shortGoal = goalKey === '5k' || goalKey === '10k';
  if (intent === 'base') {
    return { focus: 'Strides', set: '6–8 × 20s relaxed strides', zoneStr: zone('Rep', paces, 'rep'), note: 'fast but smooth — form, not effort' };
  }
  if (intent === 'peak') {
    return shortGoal
      ? { focus: 'Intervals', set: '5 × 3 min hard, 2 min jog', zoneStr: zone('Interval', paces, 'interval'), note: 'goal-sharpening VO₂ work' }
      : { focus: 'Race-pace', set: '4 × 6 min at goal pace, 90s jog', zoneStr: zone('Marathon', paces, 'marathon'), note: 'lock in goal rhythm' };
  }
  // build: alternate tempo / intervals by week
  return (winpEven => winpEven
    ? { focus: 'Tempo', set: '2 × 10 min, 3 min easy between', zoneStr: zone('Threshold', paces, 'threshold'), note: 'comfortably hard, controlled' }
    : { focus: 'Intervals', set: shortGoal ? '6 × 2 min at 5k effort, 2 min jog' : '5 × 4 min, 2 min jog', zoneStr: zone('Interval', paces, 'interval'), note: 'hold form when it bites' }
  );
}

function qualityRun({ goalKey, intent, winp, paces, deload }) {
  if (deload) return easyRun({ level: 'intermediate', minutes: 30, paces, deload: true });
  const q = qualitySet(goalKey, intent, paces);
  const sel = typeof q === 'function' ? q(winp % 2 === 0) : q;
  return {
    discipline: 'run', focus: `${sel.focus} run`, duration: '40–55 min', intensity: 'hard',
    items: [
      { num: 'R1', name: 'Warm-up jog', distance: '10 min', pace: zone('Easy', paces, 'easy'), note: 'easy build + drills', tag: 'run' },
      { num: 'R2', name: 'Main set', distance: sel.set, pace: sel.zoneStr, note: sel.note, tag: 'run' },
      { num: 'M1', name: 'Cooldown', distance: '5–10 min', pace: zone('Easy', paces, 'easy'), note: '', tag: 'run' }
    ]
  };
}

/**
 * Build the week's runs.
 * @param {object} ctx
 *   runDays  number of run sessions this week
 *   goal     { distance:'5k'|'10k'|'half'|'marathon', current:{distance,time}|null }
 *   level    experience level
 *   intent   'base' | 'build' | 'peak'
 *   deload   boolean
 *   minutes  typical session length
 * @returns {Array} run session specs (no day assigned yet)
 */
export function buildWeek(ctx = {}) {
  const runDays = Math.max(1, Math.min(7, ctx.runDays || 3));
  const goal = ctx.goal || {};
  const goalKey = DIST[goal.distance] ? goal.distance : '10k';
  const level = ctx.level || 'beginner';
  const intent = ctx.intent || 'base';
  const deload = !!ctx.deload;
  const minutes = ctx.minutes || 60;
  const progress = ctx.progress != null ? ctx.progress : 0.5; // 0→1 across the whole plan
  const { paces } = computePaces(goalKey, goal.current, level);

  const roles = rolePattern(runDays, intent);
  return roles.map((role, i) => {
    if (role === 'long') return longRun({ goalKey, level, intent, progress, paces, deload });
    if (role === 'quality') return qualityRun({ goalKey, intent, winp: (ctx.winp || 1) + i, paces, deload });
    return easyRun({ level, minutes, paces, deload });
  });
}

export default { buildWeek, computePaces };
