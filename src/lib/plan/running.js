/**
 * Running engine — builds a week of runs with real per-session pace targets and
 * a varied, distance-specific workout library (not just easy/long/strides).
 *
 * The science (see research notes in the rebuild plan):
 *  • 80/20 polarised: ~80% easy, 1–2 quality sessions/week spaced ≥48h, one long
 *    run, bulk of volume easy (Seiler; RunnersConnect).
 *  • The quality sessions rotate through a palette and shift emphasis by distance
 *    and phase, so consecutive weeks feel different rather than templated:
 *      fartlek · VO₂max intervals (400/800/1k/3min) · threshold & cruise
 *      intervals · speed reps · goal-pace work · long run ± goal-pace finish.
 *    5K leans VO₂max; 10K balances VO₂max+threshold; half leans threshold +
 *    long intervals; marathon leans marathon-pace + threshold (Daniels, McMillan,
 *    Higdon, Luke Humphrey, TrainingPeaks).
 *  • Pace targets come from current fitness via Riegel (race prediction) +
 *    Daniels-style zones (offsets from 5k pace), plus the true goal-race pace.
 *
 * buildWeek(ctx) → array of run session specs the scheduler places.
 * computePaces(goalKey, current, level) is exported for the UI.
 */

const DIST = { '5k': 5000, '10k': 10000, 'half': 21097, 'marathon': 42195 };

// Offsets (seconds per km) from 5k race pace → Daniels-style training paces.
const PACE_OFFSET = { easy: 85, marathon: 42, threshold: 25, interval: 3, rep: -12 };
// Fallback 5k pace (sec/km) by experience level when no time is given.
const LEVEL_5K_PACE = { beginner: 420, returning: 375, intermediate: 315, advanced: 260 };

// ---- time/pace helpers ----
function parseTime(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(isNaN) || !parts.length) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
function metresFor(distance) {
  if (typeof distance === 'number') return distance;
  return DIST[distance] || null;
}
function fmtPace(secPerKm) {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function fmtTime(totalSec) {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}
function riegel(t1, d1, d2) { return t1 * Math.pow(d2 / d1, 1.06); }

/**
 * Derive training paces, true goal-race pace, and the goal-time prediction.
 * @returns {{ paces, fivekPaceSec, goalPaceSec, goalPrediction, estimated }}
 *   paces: { easy, marathon, threshold, interval, rep, goal } 'm:ss' per km
 */
export function computePaces(goalKey, current, level = 'beginner') {
  let fivekSec, estimated;
  const t = current && parseTime(current.time);
  const dm = current && metresFor(current.distance);
  if (t && dm) { fivekSec = riegel(t, dm, 5000); estimated = false; }
  else { fivekSec = (LEVEL_5K_PACE[level] ?? LEVEL_5K_PACE.beginner) * 5; estimated = true; }

  const fivekPaceSec = fivekSec / 5;
  const paces = {};
  for (const k in PACE_OFFSET) paces[k] = fmtPace(fivekPaceSec + PACE_OFFSET[k]);

  const goalM = metresFor(goalKey) || 10000;
  const goalSec = riegel(fivekSec, 5000, goalM);
  const goalPaceSec = goalSec / (goalM / 1000);
  paces.goal = fmtPace(goalPaceSec);

  return { paces, fivekPaceSec, goalPaceSec, goalPrediction: fmtTime(goalSec), estimated };
}

// Zone label + actual pace, e.g. "Threshold · 4:49/km".
function zone(label, paces, key) { return `${label} · ${paces[key]}/km`; }

// ===========================================================================
// Workout library — each returns { focus, set, zoneStr, note, duration? }.
// `s` is the per-week scaling (rep counts / tempo minutes grow with fitness).
// ===========================================================================
const W = {
  fartlek:  (p, s) => ({ focus: 'Fartlek',            set: `${6 + s.n2}×(2 min surge · 2 min easy)`, zoneStr: zone('Surge', p, 'interval'), note: 'relaxed but quick — vary the terrain' }),
  vo2_400:  (p, s) => ({ focus: 'VO₂max intervals',    set: `${8 + s.n4}×400 m · 90s jog`,            zoneStr: zone('Interval', p, 'interval'), note: '3k–5k effort, smooth and fast' }),
  vo2_800:  (p, s) => ({ focus: 'VO₂max intervals',    set: `${5 + s.n2}×800 m · 2 min jog`,          zoneStr: zone('Interval', p, 'interval'), note: 'controlled, even splits' }),
  vo2_1k:   (p, s) => ({ focus: 'VO₂max intervals',    set: `${4 + s.n2}×1 km · 2–3 min jog`,         zoneStr: zone('Interval', p, 'interval'), note: 'hold form when it bites' }),
  vo2_3min: (p)    => ({ focus: 'VO₂max intervals',    set: '5×3 min hard · 2 min jog',               zoneStr: zone('Interval', p, 'interval'), note: 'strong, even efforts' }),
  tempo:    (p, s) => ({ focus: 'Tempo',               set: `${18 + s.tempo} min continuous`,         zoneStr: zone('Threshold', p, 'threshold'), note: 'comfortably hard, controlled' }),
  cruise:   (p, s) => ({ focus: 'Threshold cruise',    set: `${4 + s.n2}×6 min · 90s jog`,            zoneStr: zone('Threshold', p, 'threshold'), note: 'just below hour-race effort' }),
  cruise10: (p)    => ({ focus: 'Threshold',           set: '3×10 min · 2 min jog',                   zoneStr: zone('Threshold', p, 'threshold'), note: 'sustained, relaxed power' }),
  reps400:  (p)    => ({ focus: 'Speed reps',          set: '10×400 m · full recovery',               zoneStr: zone('Rep', p, 'rep'), note: 'fast and mechanically clean' }),
  gp_2k:    (p)    => ({ focus: 'Goal-pace',           set: '5×2 km @ goal · 2 min float',            zoneStr: zone('Goal', p, 'goal'), note: 'lock in race rhythm', duration: '55–70 min' }),
  gp_3k:    (p)    => ({ focus: 'Goal-pace',           set: '3×3 km @ goal · 3 min jog',              zoneStr: zone('Goal', p, 'goal'), note: 'sustained race effort', duration: '55–70 min' }),
  gp_5k:    (p)    => ({ focus: 'Goal-pace',           set: '2×5 km @ goal · 5 min jog',              zoneStr: zone('Goal', p, 'goal'), note: 'big race-effort blocks', duration: '70–85 min' })
};

// Which quality workouts each distance rotates through, per phase.
const QUALITY = {
  '5k':       { base: ['fartlek', 'tempo'],            build: ['vo2_400', 'vo2_1k', 'vo2_800', 'cruise', 'tempo'], peak: ['vo2_1k', 'reps400', 'gp_2k'] },
  '10k':      { base: ['fartlek', 'tempo'],            build: ['vo2_1k', 'vo2_800', 'cruise', 'cruise10', 'gp_2k'], peak: ['vo2_1k', 'gp_2k', 'reps400'] },
  'half':     { base: ['fartlek', 'tempo', 'cruise'],  build: ['cruise', 'cruise10', 'vo2_1k', 'gp_2k', 'gp_3k'],   peak: ['gp_3k', 'cruise10', 'gp_2k'] },
  'marathon': { base: ['fartlek', 'tempo', 'cruise'],  build: ['cruise10', 'vo2_1k', 'gp_2k', 'gp_5k', 'cruise'],   peak: ['gp_5k', 'gp_3k', 'cruise10'] }
};

// ---- weekly role pattern ----
function rolePattern(runDays, intent) {
  const qualityCount = intent === 'base' ? (runDays >= 3 ? 1 : 0) : (runDays >= 3 ? 2 : 1);
  const roles = [];
  if (runDays >= 2) roles.push('long');
  for (let i = 0; i < qualityCount && roles.length < runDays; i++) roles.push('quality');
  while (roles.length < runDays) roles.push('easy');
  if (runDays === 1) return [intent === 'base' ? 'easy' : 'long'];
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
  const peakExtra = { '5k': 15, '10k': 25, 'half': 45, 'marathon': 70 }[goalKey] || 30;
  let dur = base * lvlF + peakExtra * progress;
  if (deload) dur *= 0.6;
  dur = Math.round(dur / 5) * 5;
  // Build/peak long runs for half & marathon finish at goal race pace.
  const gpFinish = !deload && intent !== 'base' && (goalKey === 'half' || goalKey === 'marathon');
  const items = [
    { num: 'R1', name: 'Long run', distance: `${dur} min`, pace: zone('Easy', paces, 'easy'), note: 'steady aerobic — builds endurance', tag: 'run' }
  ];
  if (gpFinish) items.push({ num: 'R2', name: 'Finish at goal pace', distance: '10–15 min', pace: zone('Goal', paces, 'goal'), note: 'controlled, on tired legs', tag: 'run' });
  items.push({ num: 'M1', name: 'Cooldown walk + mobility', sets: '10 min', rpe: 'Easy', tag: 'mobility', note: '' });
  return { discipline: 'run', focus: 'Long run', duration: `${dur}${gpFinish ? '+15' : ''} min`, intensity: deload ? 'easy' : 'moderate', items };
}

function qualityRun({ goalKey, intent, weekNum, slot, paces, s, deload }) {
  if (deload) return easyRun({ level: 'intermediate', minutes: 30, paces, deload: true });
  const menu = (QUALITY[goalKey] || QUALITY['10k'])[intent] || ['tempo'];
  const key = menu[(weekNum - 1 + slot) % menu.length];
  const sel = (W[key] || W.tempo)(paces, s);
  return {
    discipline: 'run', focus: `${sel.focus} run`, duration: sel.duration || '45–60 min', intensity: 'hard',
    items: [
      { num: 'R1', name: 'Warm-up jog', distance: '10–15 min', pace: zone('Easy', paces, 'easy'), note: 'easy build + drills', tag: 'run' },
      { num: 'R2', name: 'Main set', distance: sel.set, pace: sel.zoneStr, note: sel.note, tag: 'run' },
      { num: 'M1', name: 'Cooldown', distance: '10 min', pace: zone('Easy', paces, 'easy'), note: '', tag: 'run' }
    ]
  };
}

/**
 * Build the week's runs.
 * @param {object} ctx
 *   runDays, goal{distance,current}, level, intent, deload, minutes, winp,
 *   weekNum (1-based, for rotating the workout menu), progress (0→1)
 */
export function buildWeek(ctx = {}) {
  const runDays = Math.max(1, Math.min(7, ctx.runDays || 3));
  const goal = ctx.goal || {};
  const goalKey = DIST[goal.distance] ? goal.distance : '10k';
  const level = ctx.level || 'beginner';
  const intent = ctx.intent || 'base';
  const deload = !!ctx.deload;
  const minutes = ctx.minutes || 60;
  const weekNum = ctx.weekNum || 1;
  const progress = ctx.progress != null ? ctx.progress : 0.5;
  const { paces } = computePaces(goalKey, goal.current, level);

  // Per-week scaling of rep counts / tempo length (grows with fitness + level).
  const lf = { beginner: -1, returning: 0, intermediate: 0, advanced: 1 }[level] ?? 0;
  const s = {
    n2: Math.max(0, Math.round(progress * 2) + Math.max(0, lf)),
    n4: Math.max(0, Math.round(progress * 4) + lf),
    tempo: Math.round(progress * 22)
  };

  const roles = rolePattern(runDays, intent);
  let slot = 0;
  const sessions = roles.map(role => {
    if (role === 'long') return longRun({ goalKey, level, intent, progress, paces, deload });
    if (role === 'quality') return qualityRun({ goalKey, intent, weekNum, slot: slot++, paces, s, deload });
    return easyRun({ level, minutes, paces, deload });
  });

  // Sprinkle strides onto one easy run in base/build to keep turnover sharp.
  if (!deload && intent !== 'peak') {
    const e = sessions.find(x => x.focus === 'Easy run');
    if (e) e.items.splice(1, 0, { num: 'R2', name: 'Strides', distance: '6×20s', pace: zone('Rep', paces, 'rep'), note: 'relaxed, fast leg turnover', tag: 'run' });
  }

  return sessions;
}

export default { buildWeek, computePaces };
