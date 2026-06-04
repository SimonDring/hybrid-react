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

const DAY_IDX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
const IDX_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const KEY_IDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

const isHard = (s) => s.intensity === 'hard';
const legStrength = (s) => s.discipline === 'gym' && s.lowerBody;
const legTaxingRun = (s) => s.discipline === 'run' && (s.intensity === 'hard' || /^Long/.test(s.focus || ''));
const isLongRun = (s) => s.discipline === 'run' && /^Long/.test(s.focus || '');
const gap = (a, b) => ((b - a) % 7 + 7) % 7;

// Penalty for one full sport assignment (lower is better). `placed` is
// [{idx, spec}] sorted by weekday; ctx.lrIdx is the preferred long-run weekday.
function score(placed, ctx) {
  let pen = 0;
  const n = placed.length;
  for (let i = 0; i < n; i++) {
    const cur = placed[i];
    // Preferred long-run day.
    if (ctx.lrIdx != null && isLongRun(cur.spec) && cur.idx !== ctx.lrIdx) pen += 12;
    if (n < 2) continue;
    const nxt = placed[(i + 1) % n];
    const g = gap(cur.idx, nxt.idx);
    if (g === 0) continue;
    if (g <= 1) {
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += 10;
      if ((legStrength(cur.spec) && legTaxingRun(nxt.spec)) ||
          (legStrength(nxt.spec) && legTaxingRun(cur.spec))) pen += 8;
    } else if (g === 2 && isHard(cur.spec) && isHard(nxt.spec)) {
      pen += 2;
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
function placeSport(sportSpecs, dayNames, lrIdx) {
  const days = dayNames.slice(0, sportSpecs.length);
  const order = days.map((d, i) => ({ idx: DAY_IDX[d] ?? i, i })).sort((a, b) => a.idx - b.idx);
  if (!sportSpecs.length) return [];
  const perms = sportSpecs.length <= 7 ? permutations(sportSpecs.length) : [sportSpecs.map((_, i) => i)];
  let best = perms[0], bestPen = Infinity;
  for (const perm of perms) {
    const placed = order.map((slot, k) => ({ idx: slot.idx, spec: sportSpecs[perm[k]] }));
    const pen = score(placed, { lrIdx });
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
export function scheduleWeek({ sportSpecs = [], supSpecs = [], dayNames = [], allowDoubles = true, longRunDay = null }) {
  const lrIdx = longRunDay != null ? KEY_IDX[longRunDay] : null;
  const placedSport = placeSport(sportSpecs, dayNames, lrIdx);

  // Supplemental placement. Doubles → prefer easy sport days; else prefer rest
  // days. Fall back to the other when the preferred pool is exhausted.
  const usedIdx = new Set(placedSport.map(p => p.idx));
  const restIdx = IDX_DAY.map((_, i) => i).filter(i => !usedIdx.has(i));
  const easyIdx = placedSport.filter(p => p.spec.intensity === 'easy').map(p => p.idx);
  const primary = allowDoubles ? easyIdx.slice() : restIdx.slice();
  const fallback = allowDoubles ? restIdx.slice() : easyIdx.slice();

  const placedSup = [];
  for (const spec of supSpecs) {
    let idx = primary.shift();
    if (idx == null) idx = fallback.shift();
    if (idx == null) continue; // no room this week — drop the extra
    placedSup.push({ idx, spec });
  }

  // Combine; sort by weekday, sport/easy session before its strength double.
  const all = [
    ...placedSport.map(p => ({ idx: p.idx, spec: p.spec, ord: 0 })),
    ...placedSup.map(p => ({ idx: p.idx, spec: p.spec, ord: 1 }))
  ].sort((a, b) => a.idx - b.idx || a.ord - b.ord);

  return all.map(x => ({ title: `${IDX_DAY[x.idx]} · ${x.spec.focus}`, duration: x.spec.duration, items: x.spec.items }));
}

export default { scheduleWeek };
