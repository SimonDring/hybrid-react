/**
 * split — turns "how many gym days this week" into a curated training SPLIT: which
 * body regions each day trains and which fundamental pattern it opens on. This is
 * what stops the engine handing back four near-identical "full body" days.
 *
 * It returns, per day, a per-muscle WEIGHT — that day's share of the week's volume
 * for each muscle. Weights for a muscle sum to 1 across the days that train it, so
 * the weekly total (set by targets.js) is preserved and a muscle's training
 * FREQUENCY = the number of days it appears on. The allocator (allocator.js) then
 * fills each day toward its share + the time budget.
 *
 * The templates are standard, defensible coaching:
 *   1 day  → full body
 *   2 days → full body ×2          (frequency beats a 1×/week split at 2 days)
 *   3 days → full body ×3, varied openers
 *   4 days → upper / lower / upper / lower   (each muscle 2×/week)
 *   5 days → upper / lower / upper / lower / full
 *   6 days → push / pull / legs ×2
 *   7 days → PPL ×2 + a full-body day
 *
 * SPORT plans get an EMPHASIS-WEIGHTED split: the number of push / pull / lower days
 * is allocated from the sport's per-muscle emphasis (program.js), so a swimmer leans
 * pull (back 2×/wk) with a press/shoulder day and a single legs day, a cyclist leans
 * lower — varied, sport-appropriate days rather than four full-body clones, while
 * still leading each session with the sport's priority work (the allocator owns that
 * anchor). The de-emphasised regions still get their (small) dose, ~1×/week.
 *
 * Pure function → reproducible splits → stable sessions.
 */

import { MUSCLE_GROUPS } from '../../data/muscleVolume.js';

const UPPER_PUSH = ['chest', 'shoulders', 'triceps'];
const UPPER_PULL = ['back', 'biceps'];
const UPPER = [...UPPER_PUSH, ...UPPER_PULL];
const LOWER = ['quads', 'hamstrings', 'glutes', 'calves'];
const CORE = ['core'];
const ALL = [...UPPER, ...LOWER, ...CORE];

// A day = a focus label, the muscle groups it trains, and the fundamental
// pattern(s) it opens on (the allocator picks the first one equipment allows).
const day = (focus, groups, anchors) => ({ focus, groups, anchors });

function template(days) {
  switch (days) {
    case 1: return [day('Full body', ALL, ['squat', 'hpush', 'hpull'])];
    case 2: return [
      day('Full body', ALL, ['squat', 'hpush', 'hpull']),
      day('Full body', ALL, ['hinge', 'vpull', 'vpush'])
    ];
    case 3: return [
      day('Full body', ALL, ['squat', 'hpush', 'hpull']),
      day('Full body', ALL, ['hinge', 'vpull', 'vpush']),
      day('Full body', ALL, ['lunge', 'hpush', 'hpull'])
    ];
    case 4: return [
      day('Upper', [...UPPER, ...CORE], ['hpush', 'hpull']),
      day('Lower', [...LOWER, ...CORE], ['squat']),
      day('Upper', [...UPPER, ...CORE], ['vpush', 'vpull']),
      day('Lower', [...LOWER, ...CORE], ['hinge'])
    ];
    case 5: return [
      day('Upper', [...UPPER, ...CORE], ['hpush', 'hpull']),
      day('Lower', [...LOWER, ...CORE], ['squat']),
      day('Upper', [...UPPER, ...CORE], ['vpush', 'vpull']),
      day('Lower', [...LOWER, ...CORE], ['hinge']),
      day('Full body', ALL, ['lunge', 'hpull', 'hpush'])
    ];
    case 6: return [
      day('Push', UPPER_PUSH, ['hpush']),
      day('Pull', UPPER_PULL, ['hpull']),
      day('Legs', [...LOWER, ...CORE], ['squat']),
      day('Push', UPPER_PUSH, ['vpush']),
      day('Pull', UPPER_PULL, ['vpull']),
      day('Legs', [...LOWER, ...CORE], ['hinge'])
    ];
    default: return [   // 7
      day('Push', UPPER_PUSH, ['hpush']),
      day('Pull', UPPER_PULL, ['hpull']),
      day('Legs', [...LOWER, ...CORE], ['squat']),
      day('Push', UPPER_PUSH, ['vpush']),
      day('Pull', UPPER_PULL, ['vpull']),
      day('Legs', [...LOWER, ...CORE], ['hinge']),
      day('Full body', ALL, ['lunge', 'hpull'])
    ];
  }
}

// ---- Sport: emphasis-weighted region-day allocation ----
const REGION_DAY = {
  push:  ()  => day('Push',  [...UPPER_PUSH, ...CORE], ['hpush', 'vpush']),
  pull:  ()  => day('Pull',  [...UPPER_PULL, ...CORE], ['vpull', 'hpull']),
  lower: (i) => day('Lower', [...LOWER, ...CORE], (i % 2) ? ['hinge'] : ['squat'])
};

// Split `days` across push/pull/lower. Floors guarantee balance/injury prevention
// (≥1 push & pull at 2+ days; ≥1 lower at 3+ days so legs/posterior aren't dropped);
// the rest go to the highest-emphasis regions, with score/(count+1) giving diminishing
// returns so a second day only goes where the emphasis truly warrants it.
function allocateSportDays(days, score) {
  const regions = ['push', 'pull', 'lower'];
  const counts = { push: 0, pull: 0, lower: 0 };
  let left = days;
  if (days >= 2) { counts.push = 1; counts.pull = 1; left -= 2; }
  if (days >= 3) { counts.lower = 1; left -= 1; }
  while (left > 0) {
    let best = regions[0], bestVal = -Infinity;
    for (const r of regions) { const v = score[r] / (counts[r] + 1); if (v > bestVal) { bestVal = v; best = r; } }
    counts[best]++; left -= 1;
  }
  return counts;
}

function sportTemplate(days, emphasis = {}) {
  if (days <= 1) return [day('Full body', ALL, ['hpull', 'squat', 'hpush'])];
  const mean = (ms) => ms.reduce((a, m) => a + (emphasis[m] ?? 1), 0) / ms.length;
  const score = { push: mean(UPPER_PUSH), pull: mean(UPPER_PULL), lower: mean(LOWER) };
  const counts = allocateSportDays(days, score);
  const pools = { push: [], pull: [], lower: [] };
  for (let i = 0; i < counts.push; i++) pools.push.push(REGION_DAY.push());
  for (let i = 0; i < counts.pull; i++) pools.pull.push(REGION_DAY.pull());
  for (let i = 0; i < counts.lower; i++) pools.lower.push(REGION_DAY.lower(i));
  // Interleave so the same region isn't emitted back-to-back where avoidable (the
  // scheduler then spaces them onto non-adjacent weekdays).
  const regions = ['push', 'pull', 'lower'];
  const out = [];
  let last = null;
  while (out.length < days) {
    const avail = regions.filter(r => pools[r].length)
      .sort((a, b) => pools[b].length - pools[a].length || score[b] - score[a]);
    const pick = avail.find(r => r !== last) || avail[0];
    out.push(pools[pick].shift());
    last = pick;
  }
  return out;
}

// Turn day descriptors into per-day per-muscle weights (sum to 1 per muscle).
function withWeights(tmpl) {
  const freq = {};
  for (const m of MUSCLE_GROUPS) freq[m] = tmpl.filter(d => d.groups.includes(m)).length;
  return tmpl.map(d => {
    const weights = {};
    for (const m of MUSCLE_GROUPS) weights[m] = (d.groups.includes(m) && freq[m]) ? 1 / freq[m] : 0;
    return { focus: d.focus, anchors: d.anchors, weights };
  });
}

/**
 * @param {object} ctx  { gymDays, style, emphasis }
 * @returns {Array<{ focus, anchors, weights:{ [muscle]:number } }>} one per day
 */
export function resolveSplit({ gymDays = 3, style = 'functional', emphasis = {} } = {}) {
  const days = Math.max(1, Math.min(7, gymDays));
  if (style === 'sport') return withWeights(sportTemplate(days, emphasis));
  return withWeights(template(days));
}

export default { resolveSplit };
