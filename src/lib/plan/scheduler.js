/**
 * Scheduler — places each discipline's sessions onto the week's training days,
 * applying concurrent-training ("interference effect") rules.
 *
 * The science (see research notes in the rebuild plan):
 *  • Combining strength + endurance can blunt strength gains (Hickson, 1980).
 *    The practical fixes are about *spacing*, not avoidance:
 *      – don't stack two hard sessions back-to-back (recovery never catches up);
 *      – lower-body lifting interferes most with running, so keep heavy legs /
 *        long runs apart so neither lands on trashed legs;
 *      – let easy/rest days buffer the hard ones.
 *
 * In this model there is one session per training day, so "same-day conflict"
 * can't happen — the lever is *which weekday* each session lands on. We score
 * every assignment of sessions→days against the rules above and keep the best.
 * It's a pure function of the inputs, so the schedule is reproducible (stable
 * session order → stable completion keys).
 *
 * schedule(specs, dayNames) → [{ title, duration, items }] in weekday order.
 */

const DAY_IDX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

const isHard = (s) => s.intensity === 'hard';
// Sessions that tax the legs and conflict with each other when too close.
const legStrength = (s) => s.discipline === 'gym' && s.lowerBody;
const legTaxingRun = (s) => s.discipline === 'run' && (s.intensity === 'hard' || /^Long/.test(s.focus || ''));
const isWeekend = (idx) => idx >= 5;

// Cyclic day gap (treat the week as repeating, so Sun→Mon is adjacent).
function gap(a, b) { return ((b - a) % 7 + 7) % 7; }

// Penalty for one full assignment (lower is better). `placed` is [{idx, spec}]
// already sorted by weekday index.
function score(placed) {
  let pen = 0;
  const n = placed.length;
  for (let i = 0; i < n; i++) {
    const cur = placed[i];
    const nxt = placed[(i + 1) % n];
    if (n < 2) break;
    const g = gap(cur.idx, nxt.idx);
    if (g === 0) continue;
    if (g <= 1) {
      if (isHard(cur.spec) && isHard(nxt.spec)) pen += 10;                 // back-to-back hard
      if ((legStrength(cur.spec) && legTaxingRun(nxt.spec)) ||
          (legStrength(nxt.spec) && legTaxingRun(cur.spec))) pen += 8;     // legs ↔ hard/long run
    } else if (g === 2 && isHard(cur.spec) && isHard(nxt.spec)) {
      pen += 2;                                                            // still a little close
    }
    // Small reward for a long run landing on a weekend (more time).
    if (legTaxingRun(cur.spec) && /^Long/.test(cur.spec.focus || '') && isWeekend(cur.idx)) pen -= 2;
  }
  return pen;
}

// All permutations of [0..n-1] (n ≤ 7 here, so this is cheap).
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

/**
 * @param {Array} specs     session specs from the engines (any order)
 * @param {string[]} dayNames  weekday names for this week (already chosen)
 * @returns {Array} sessions { title, duration, items } in weekday order
 */
export function schedule(specs = [], dayNames = []) {
  const days = dayNames.slice(0, specs.length);
  const dayIdx = days.map(d => DAY_IDX[d] ?? 0);
  const order = dayIdx.map((idx, i) => ({ idx, i })).sort((a, b) => a.idx - b.idx);

  // Find the session→day assignment with the lowest interference penalty.
  let best = null, bestPen = Infinity;
  const perms = specs.length <= 7 ? permutations(specs.length) : [specs.map((_, i) => i)];
  for (const perm of perms) {
    // perm[k] = which spec goes into the k-th earliest day slot
    const placed = order.map((slot, k) => ({ idx: slot.idx, spec: specs[perm[k]] }));
    const pen = score(placed);
    if (pen < bestPen) { bestPen = pen; best = perm; if (pen === 0) break; }
  }

  // Materialise sessions in weekday order, prefixing the day into the title.
  return order.map((slot, k) => {
    const spec = specs[best[k]];
    const dayName = days[slot.i];
    return { title: `${dayName} · ${spec.focus}`, duration: spec.duration, items: spec.items };
  });
}

export default { schedule };
