/**
 * volume — counts weekly SET VOLUME per muscle group for a generated gym week,
 * and grades it against the landmarks in src/data/muscleVolume.js.
 *
 * This is the "measuring stick" for the strength engine. It does NOT change what
 * the engine produces — it reads a week's sessions and answers: how many hard
 * sets is each muscle getting, and is that too little / about right / too much?
 *
 * It works off the exercise NAME on each session item (the same names the engine
 * pulls from src/data/strengthExercises.js). Items whose name isn't a known
 * strength exercise — warm-ups ("5 min"), runs, swims, "Easy walk", supplemental
 * combos like "Pull-up / lat pulldown" — simply don't match and are skipped, so
 * only real lifting volume is counted. countWeeklyVolume reports those skips so
 * we can see coverage and improve the exercise database over time.
 *
 * Pure functions, no side effects — safe to call from the engine, a screen, or
 * a test.
 */

import { EXERCISES } from '../../data/strengthExercises.js';
import { MUSCLE_GROUPS, VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { muscleContribution } from './contributions.js';
import { roundHalf } from '../Utils.js';

// ---- exercise name → muscle contributions, built once from the database ----
// e.g. "bench press" → { chest: 1, triceps: 0.5, shoulders: 0.5 }.
let _index = null;
function muscleIndex() {
  if (_index) return _index;
  _index = new Map();
  for (const ex of EXERCISES) _index.set(ex.name.toLowerCase(), muscleContribution(ex));
  return _index;
}

let _indexById = null;
function muscleIndexById() {
  if (_indexById) return _indexById;
  _indexById = new Map();
  for (const ex of EXERCISES) _indexById.set(ex.id, muscleContribution(ex));
  return _indexById;
}

// Muscle contributions for one item name, or null if it isn't a known lift.
export function exerciseMuscles(name) {
  if (!name) return null;
  return muscleIndex().get(String(name).toLowerCase()) || null;
}

// WP-46 s2: muscle contributions for a plan ITEM, keyed by its stable exId first
// (a rename can't break the tally) and falling back to name for un-stamped items.
export function exerciseMusclesForItem(item) {
  if (!item) return null;
  if (item.exId != null) {
    const byId = muscleIndexById().get(item.exId);
    if (byId) return byId;
  }
  return exerciseMuscles(item.name);
}

// Number of working sets from a "sets" string: the count before the × ("4 × 5",
// "3 × 12 ea.", "2 × 30s" → 4, 3, 2). Returns 0 for time/warm-up rows ("5 min").
export function parseSetCount(sets) {
  const m = /(\d+)\s*[×x]/.exec(sets || '');
  return m ? Number(m[1]) : 0;
}

/**
 * Tally hard sets per muscle group across one week's sessions.
 * @param {Array} sessions  week.sessions ([{ items: [{ name, sets }] }, ...])
 * @returns {{ counts: Object, matched: number, skipped: string[] }}
 *   counts  muscle group → total fractional sets (rounded to 0.5)
 *   matched how many items were counted
 *   skipped names of lifting-looking items we couldn't map (coverage signal)
 */
export function countWeeklyVolume(sessions = []) {
  const counts = {};
  MUSCLE_GROUPS.forEach(m => { counts[m] = 0; });
  let matched = 0;
  const skipped = [];

  for (const s of sessions) {
    for (const it of s.items || []) {
      if (it.tag === 'mobility') continue; // health/activation (factor 0) + warm-up primer
      const sets = parseSetCount(it.sets);
      if (!sets) continue; // warm-ups / time-based rows aren't counted as volume
      const vf = it.volumeFactor == null ? 1 : it.volumeFactor; // stimulus credit (0.5 isoCore, 1 loaded)
      if (vf === 0) continue;
      const contrib = exerciseMusclesForItem(it);
      if (!contrib) { skipped.push(it.name); continue; }
      matched++;
      for (const muscle in contrib) counts[muscle] += sets * contrib[muscle] * vf;
    }
  }

  // Round to the nearest half set so display reads cleanly (12, 12.5, …).
  MUSCLE_GROUPS.forEach(m => { counts[m] = roundHalf(counts[m]); });
  return { counts, matched, skipped };
}

// Where a muscle's weekly volume sits relative to its landmarks.
//   under  — below MEV (not enough to drive adaptation)
//   low    — MEV..MAV, lower half (effective, room to add)
//   ideal  — around MAV (the productive sweet spot)
//   high   — MAV..MRV (hard but recoverable)
//   over   — above MRV (more fatigue than is recoverable)
export function gradeVolume(muscle, sets) {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm) return 'low';
  if (sets < lm.mev) return 'under';
  if (sets > lm.mrv) return 'over';
  if (sets >= lm.mav) return sets > (lm.mav + lm.mrv) / 2 ? 'high' : 'ideal';
  return sets >= (lm.mev + lm.mav) / 2 ? 'ideal' : 'low';
}

/**
 * Full per-muscle report for a week: count, landmarks, and grade. Ready to
 * render or to drive a decision later.
 * @param {Array} sessions  week.sessions
 * @returns {{ rows: Array, skipped: string[] }}
 */
export function volumeReport(sessions = []) {
  const { counts, skipped } = countWeeklyVolume(sessions);
  const rows = MUSCLE_GROUPS.map(muscle => ({
    muscle,
    sets: counts[muscle],
    landmarks: VOLUME_LANDMARKS[muscle],
    grade: gradeVolume(muscle, counts[muscle])
  }));
  return { rows, skipped };
}

export default { exerciseMuscles, parseSetCount, countWeeklyVolume, gradeVolume, volumeReport };
