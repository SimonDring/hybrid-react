/**
 * Scheduler — places each session onto a weekday, applying concurrent-training
 * ("interference effect") rules, and handles supplemental strength + doubles.
 *
 * The science (see research notes in the rebuild plan):
 *  • Combining strength + endurance can blunt strength gains (Hickson, 1980).
 *    The practical fixes are spacing, not avoidance: don't stack two hard
 *    sessions; keep heavy legs / long runs apart; let easy days buffer the hard.
 *  • Supplemental strength for endurance athletes pairs well with an EASY day —
 *    so when the athlete is open to doubles we stack a short strength session on
 *    an easy run/swim day rather than spending a whole extra day on it.
 *
 * scheduleWeek({ sportSpecs, supSpecs, dayNames, allowDoubles, longRunDay })
 *   → [{ title, duration, items }] in weekday order (doubles share a weekday).
 *
 * The sport sessions (one per training day) are laid out by a brute-force search
 * for the lowest interference penalty; supplemental sessions are then placed onto
 * easy days (doubles) or rest days. It's a pure function → reproducible order →
 * stable completion keys.
 */

import { lightenItems } from './constraints.js';
import { HIGH_DAY_THRESHOLD } from './axial.js';

const DAY_IDX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
const IDX_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const KEY_IDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

const isHard = (s) => s.intensity === 'hard';
const legStrength = (s) => s.discipline === 'gym' && s.lowerBody;
const legTaxingRun = (s) => s.discipline === 'run' && (s.intensity === 'hard' || /^Long/.test(s.focus || ''));
const isHighAxial = (s) => (s.axialLoad || 0) >= HIGH_DAY_THRESHOLD;
const isLongRun = (s) => s.discipline === 'run' && /^Long/.test(s.focus || '');
const gap = (a, b) => ((b - a) % 7 + 7) % 7;

// The muscle groups a session works HARD (within half of its biggest) — its
// recovery footprint. Drives the muscle-spacing penalty so we don't program, say,
// chest/shoulders hard two days running.
function heavyMuscles(s) {
  const mv = s.muscleVol;
  if (!mv) return null;
  const rows = Object.entries(mv).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  const cut = rows[0][1] * 0.5;
  return new Set(rows.filter(([, v]) => v >= cut).map(([m]) => m));
}
function sharedHeavyCount(a, b) {
  const A = heavyMuscles(a), B = heavyMuscles(b);
  if (!A || !B) return 0;
  let n = 0;
  for (const m of A) if (B.has(m)) n += 1;
  return n;
}

// Circular distance (0–3) between two weekday indices.
function dayDistance(a, b) { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); }

// How hard a session loads the sport's key muscles — its risk of pre-fatiguing the
// sport. Sum of the session's volume on those muscles.
function sportMuscleLoad(spec, sportMuscles) {
  const mv = spec.muscleVol;
  if (!mv || !sportMuscles || !sportMuscles.length) return 0;
  let v = 0;
  for (const m of sportMuscles) v += mv[m] || 0;
  return v;
}

// Penalty for one full sport assignment (lower is better). `placed` is
// [{idx, spec}] sorted by weekday; ctx.lrIdx is the preferred long-run weekday.
function score(placed, ctx) {
  let pen = 0;
  const n = placed.length;
  for (let i = 0; i < n; i++) {
    const cur = placed[i];
    // Preferred long-run day.
    if (ctx.lrIdx != null && isLongRun(cur.spec) && cur.idx !== ctx.lrIdx) pen += 12;
    // Keep gym work that taxes the sport's muscles AWAY from sport days. Each gym
    // session on a day next to (or on) a sport day pays a penalty scaled by how much
    // it loads those muscles — so the permutation pushes the heaviest sport-muscle
    // session onto the day furthest from the athlete's sport.
    if (ctx.busyDays && ctx.busyDays.length) {
      let nearest = 99;
      for (const b of ctx.busyDays) nearest = Math.min(nearest, dayDistance(cur.idx, b));
      const proximity = nearest === 0 ? 3 : nearest === 1 ? 2 : 0;
      if (proximity) {
        pen += proximity * sportMuscleLoad(cur.spec, ctx.sportMuscles);
        if (isHard(cur.spec)) pen += proximity; // small nudge for any hard day
      }
    }
    if (n < 2) continue;
    const nxt = placed[(i + 1) % n];
    const g = gap(cur.idx, nxt.idx);
    if (g === 0) continue;
    // Muscle recovery: penalise the SAME muscle group worked hard on near-consecutive
    // days (don't bench heavy two days running). This is the lever that arranges a
    // split's same-region days onto non-adjacent weekdays — weighted heavily so it
    // dominates the (constant, all-gym-is-hard) generic spacing term.
    const shared = sharedHeavyCount(cur.spec, nxt.spec);
    if (g <= 1) {
      pen += 14 * shared;
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += 10;
      if ((legStrength(cur.spec) && legTaxingRun(nxt.spec)) ||
          (legStrength(nxt.spec) && legTaxingRun(cur.spec))) pen += 8;
      if (isHighAxial(cur.spec) && isHighAxial(nxt.spec)) pen += 9; // recover the spine between heavy axial days
    } else if (g === 2) {
      pen += 3 * shared;
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += 2;
    }
  }
  return pen;
}

function permutations(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  const out = [];
  const recur = (k) => {
    if (k === arr.length) { out.push(arr.slice()); return; }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      recur(k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  recur(0);
  return out;
}

// Best sport→day assignment as [{ idx, spec }] (weekday index + session spec).
function placeSport(sportSpecs, dayNames, lrIdx, busyDays = [], sportMuscles = []) {
  const days = dayNames.slice(0, sportSpecs.length);
  const order = days.map((d, i) => ({ idx: DAY_IDX[d] ?? i, i })).sort((a, b) => a.idx - b.idx);
  if (!sportSpecs.length) return [];
  const perms = sportSpecs.length <= 7 ? permutations(sportSpecs.length) : [sportSpecs.map((_, i) => i)];
  let best = perms[0], bestPen = Infinity;
  for (const perm of perms) {
    const placed = order.map((slot, k) => ({ idx: slot.idx, spec: sportSpecs[perm[k]] }));
    const pen = score(placed, { lrIdx, busyDays, sportMuscles });
    if (pen < bestPen) { bestPen = pen; best = perm; if (pen === 0) break; }
  }
  return order.map((slot, k) => ({ idx: slot.idx, spec: sportSpecs[best[k]] }));
}

/**
 * @param {object} opts
 *   sportSpecs   one-per-day sport sessions
 *   supSpecs     supplemental strength sessions (0–2) to fit in as doubles/rest
 *   dayNames     weekday names for the sport sessions
 *   allowDoubles whether supplemental work may double up on an easy day
 *   longRunDay   preferred weekday key for the long run ('sat' etc.) or null
 * @returns {Array} sessions { title, duration, items } in weekday order
 */
export function scheduleWeek({ sportSpecs = [], supSpecs = [], dayNames = [], allowDoubles = true, longRunDay = null, busyDays = [], sportMuscles = [] }) {
  const lrIdx = longRunDay != null ? KEY_IDX[longRunDay] : null;
  const placedSport = placeSport(sportSpecs, dayNames, lrIdx, busyDays, sportMuscles);

  // Supplemental placement. NEVER share the long-run day (legs need to be fresh)
  // — it's only used as an absolute last resort. Doubles → prefer easy sport
  // days; else prefer rest days; fall back to the other pool.
  const usedIdx = new Set(placedSport.map(p => p.idx));
  const longRunIdx = (placedSport.find(p => isLongRun(p.spec)) || {}).idx;
  const restIdx = IDX_DAY.map((_, i) => i).filter(i => !usedIdx.has(i));
  const easyIdx = placedSport.filter(p => p.spec.intensity === 'easy' && p.idx !== longRunIdx).map(p => p.idx);
  const primary = allowDoubles ? easyIdx.slice() : restIdx.slice();
  const fallback = allowDoubles ? restIdx.slice() : easyIdx.slice();
  const lastResort = longRunIdx != null ? [longRunIdx] : []; // unavoidable case only

  const placedSup = [];
  for (const spec of supSpecs) {
    const idx = primary.shift() ?? fallback.shift() ?? lastResort.shift();
    if (idx == null) continue; // no room at all this week — drop the extra
    placedSup.push({ idx, spec });
  }

  // Combine; sort by weekday, sport/easy session before its strength double.
  const all = [
    ...placedSport.map(p => ({ idx: p.idx, spec: p.spec, ord: 0 })),
    ...placedSup.map(p => ({ idx: p.idx, spec: p.spec, ord: 1 }))
  ].sort((a, b) => a.idx - b.idx || a.ord - b.ord);

  const busy = new Set(busyDays);
  return all.map(x => {
    const onSportDay = x.spec.discipline === 'gym' && busy.has(x.idx);
    const items = onSportDay ? lightenItems(x.spec.items) : x.spec.items;
    return {
      title: `${IDX_DAY[x.idx]} · ${x.spec.focus}`,
      duration: x.spec.duration,
      items,
      axialLoad: x.spec.axialLoad || 0,
      dayIdx: x.idx,
      ...(onSportDay ? { lightened: true } : {}),
      ...(x.spec._objective ? { _objective: x.spec._objective } : {})
    };
  });
}

export default { scheduleWeek };
