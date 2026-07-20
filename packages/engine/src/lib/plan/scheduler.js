/**
 * Scheduler (D13) — places each gym session onto a weekday by brute-force search
 * for the lowest interference/recovery penalty. Pure function → reproducible
 * order → stable completion keys.
 *
 * The science: spacing, not avoidance (Hickson 1980 interference) — don't stack
 * two hard days; keep same-muscle heavy days apart (48 h); recover the spine
 * between heavy-axial days; keep plyo exposures 48–72 h apart (de Villarreal
 * 2009, H9 C7); keep sport-muscle-heavy gym work away from the athlete's sport
 * days, scaled by how much the session loads those muscles.
 *
 * scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles })
 *   → [{ title, duration, items, axialLoad, dayIdx }] in weekday order.
 *
 * (The endurance-era supplemental-strength/doubles/long-run machinery was
 * removed in WP-56 — the gym-only engine made it unreachable: every spec is
 * discipline 'gym', intensity is only ever hard/moderate, and the single
 * caller passes none of those options.)
 */

import { lightenItems } from './constraints.js';
import { HIGH_DAY_THRESHOLD } from './axial.js';
import { REACTIVE_LIMITS } from '../../data/doseSchemes.js';
import { SCHEDULING_PENALTIES as SP } from '../../data/schedulingPolicy.js';

const DAY_IDX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
const IDX_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const isHard = (s) => s.intensity === 'hard';
const isHighAxial = (s) => (s.axialLoad || 0) >= HIGH_DAY_THRESHOLD;
const isPlyoLoaded = (s) => (s.plyoLoad || 0) > 0;
const isHeavy = (s) => isHard(s) && isHighAxial(s);
const isPower = (s) => isPlyoLoaded(s)
  || s._objective?.quality === 'explosiveStrength'
  || s._objective?.quality === 'reactiveStrength';
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

// Penalty for one full assignment (lower is better). `placed` is
// [{idx, spec}] sorted by weekday.
function score(placed, ctx) {
  let pen = 0;
  const n = placed.length;
  for (let i = 0; i < n; i++) {
    const cur = placed[i];
    // Keep gym work that taxes the sport's muscles AWAY from sport days. Each gym
    // session on a day next to (or on) a sport day pays a penalty scaled by how much
    // it loads those muscles — so the permutation pushes the heaviest sport-muscle
    // session onto the day furthest from the athlete's sport.
    if (ctx.busyDays && ctx.busyDays.length) {
      let nearest = 99;
      for (const b of ctx.busyDays) nearest = Math.min(nearest, dayDistance(cur.idx, b));
      const proximity = nearest === 0 ? SP.sportProximity.onDay : nearest === 1 ? SP.sportProximity.adjacent : 0;
      if (proximity) {
        pen += proximity * sportMuscleLoad(cur.spec, ctx.sportMuscles);
        if (isHard(cur.spec)) pen += proximity; // small nudge for any hard day
      }
    }
    // Match-day microcycle shaping (Phase 1). Soft, additive to the same minimised penalty.
    const md = ctx.mdConstraints;
    if (md) {
      const d = cur.idx;
      if (isHeavy(cur.spec) && md.avoidHeavyIdx.has(d)) pen += SP.md.heavyOnAvoidDay;
      if (isHard(cur.spec) && md.recoveryIdx.has(d)) pen += SP.md.hardOnRecoveryDay;
      if (isPower(cur.spec) && md.preferExplosiveIdx.size && !md.preferExplosiveIdx.has(d)) pen += SP.md.powerOffPreferredDay;
      if (isHeavy(cur.spec) && md.heavyTargetIdx.size && !md.heavyTargetIdx.has(d)) {
        let nearest = 7; for (const t of md.heavyTargetIdx) nearest = Math.min(nearest, dayDistance(d, t));
        pen += SP.md.heavyOffTargetDayPerStep * nearest;
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
      pen += SP.adjacent.sameMusclePerGroup * shared;
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += SP.adjacent.hardHard;
      if (isHighAxial(cur.spec) && isHighAxial(nxt.spec)) pen += SP.adjacent.highAxialHighAxial; // recover the spine between heavy axial days
      // Plyometric exposures need 48–72 h (tendon/SSC recovery — de Villarreal 2009,
      // H9 C7): adjacent plyo-loaded days are inside the 48 h floor.
      if (isPlyoLoaded(cur.spec) && isPlyoLoaded(nxt.spec)) pen += REACTIVE_LIMITS.spacing.schedulerPenaltyAdjacent;
    } else if (g === 2) {
      pen += SP.twoApart.sameMusclePerGroup * shared;
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += SP.twoApart.hardHard;
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

// Best session→day assignment as [{ idx, spec }] (weekday index + session spec).
function placeSport(sportSpecs, dayNames, busyDays = [], sportMuscles = [], mdConstraints = null) {
  const days = dayNames.slice(0, sportSpecs.length);
  const order = days.map((d, i) => ({ idx: DAY_IDX[d] ?? i, i })).sort((a, b) => a.idx - b.idx);
  if (!sportSpecs.length) return [];
  const perms = sportSpecs.length <= 7 ? permutations(sportSpecs.length) : [sportSpecs.map((_, i) => i)];
  let best = perms[0], bestPen = Infinity;
  for (const perm of perms) {
    const placed = order.map((slot, k) => ({ idx: slot.idx, spec: sportSpecs[perm[k]] }));
    const pen = score(placed, { busyDays, sportMuscles, mdConstraints });
    if (pen < bestPen) { bestPen = pen; best = perm; if (pen === 0) break; }
  }
  return order.map((slot, k) => ({ idx: slot.idx, spec: sportSpecs[best[k]] }));
}

/**
 * @param {object} opts
 *   sportSpecs   one-per-day gym sessions
 *   dayNames     weekday names for the sessions
 *   busyDays     the athlete's sport-day weekday indices (kept away from / lightened)
 *   sportMuscles the sport's key muscles (drives the proximity penalty)
 *   mdConstraints optional match-day weekday-index sets (Phase 1); null/absent is inert —
 *                 output is byte-identical to today when omitted
 * @returns {Array} sessions { title, duration, items, axialLoad, dayIdx } in weekday order
 */
export function scheduleWeek({ sportSpecs = [], dayNames = [], busyDays = [], sportMuscles = [], mdConstraints = null }) {
  const placedSport = placeSport(sportSpecs, dayNames, busyDays, sportMuscles, mdConstraints);
  const all = placedSport
    .map(p => ({ idx: p.idx, spec: p.spec }))
    .sort((a, b) => a.idx - b.idx);

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
