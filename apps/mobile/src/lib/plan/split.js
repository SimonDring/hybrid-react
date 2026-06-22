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
 * SPORT plans are deliberately NOT forced into a body-part split: the per-muscle
 * emphasis (program.js) already shapes a sport-appropriate dose (a swimmer leans
 * upper-pull, a cyclist lower) and shouldn't be handed two dedicated leg days. Each
 * sport day trains the whole body at an even share and opens on the sport's priority
 * work (the allocator owns that anchor); emphasis + fill-to-time give the texture.
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
 * @param {object} ctx  { gymDays, style }
 * @returns {Array<{ focus, anchors, weights:{ [muscle]:number } }>} one per day
 */
export function resolveSplit({ gymDays = 3, style = 'functional' } = {}) {
  const days = Math.max(1, Math.min(7, gymDays));
  if (style === 'sport') {
    const even = Object.fromEntries(MUSCLE_GROUPS.map(m => [m, 1 / days]));
    return Array.from({ length: days }, () => ({ focus: null, anchors: null, weights: { ...even } }));
  }
  return withWeights(template(days));
}

export default { resolveSplit };
