// roundOutTargets — derive WHAT a sport's off-season round-out session should train, from the
// sport's OWN emphasis vector (the "decide in the background" logic). Season-phased SKB
// programming (docs/superpowers/specs/2026-07-09-season-phased-skb-design.md §5). Pure.
//
// The round-out is NEVER a fixed "add upper" rule: it targets the muscle groups the sport
// UNDER-develops (emphasis below neutral) and the movement patterns that train them — so a
// runner (upper de-emphasised) rounds out with push/pull, a swimmer (legs de-emphasised)
// rounds out with squat/hinge/calf. mode:'explicit' lets the SKB name targets directly.
import { PATTERN_FOR_MUSCLE } from '../../data/movementPatternMap.js';

export const UNDERDEV_THRESHOLD = 0.9; // emphasis strictly below this = the sport under-trains it

/**
 * @param {Object<string,number>} muscleEmphasis  the phase's {muscle: ×} vector
 * @param {{mode?:'derive'|'explicit', targetMuscles?:string[], targetPatterns?:string[]}} roundOut
 * @returns {{muscles:string[], patterns:string[]}} deterministic (sorted, deduped)
 */
export function deriveRoundOutTargets(muscleEmphasis = {}, roundOut = {}) {
  if (roundOut.mode === 'explicit') {
    return {
      muscles: uniqSort(roundOut.targetMuscles || []),
      patterns: uniqSort(roundOut.targetPatterns || []),
    };
  }
  const muscles = Object.keys(muscleEmphasis).filter((m) => muscleEmphasis[m] < UNDERDEV_THRESHOLD);
  const patterns = muscles.flatMap((m) => PATTERN_FOR_MUSCLE[m] || []);
  return { muscles: uniqSort(muscles), patterns: uniqSort(patterns) };
}

function uniqSort(arr) {
  return [...new Set(arr)].sort();
}

export default { deriveRoundOutTargets, UNDERDEV_THRESHOLD };
