/**
 * frequency — the optimal number of gym days for an athlete, derived from the
 * weekly volume their goal + experience prescribes. This is the DEFAULT the
 * onboarding frequency slider lands on; the user can drag 2–7 with over/under
 * feedback. Pure function of the profile.
 *
 * optimalDays ≈ representative weekly set-volume ÷ a comfortable session's worth,
 * clamped to [2,7]. Higher-volume goals (advanced hypertrophy) need more days to
 * stay in the per-session sweet spot; maintenance/in-season sport needs fewer.
 */
import { resolveProgram } from '../strength/program.js';
import { weeklyMuscleTargets } from '../strength/targets.js';
import { getGymLevel } from '../Utils.js';
import { MUSCLE_GROUPS } from '../../data/muscleVolume.js';

// Muscle-sets a comfortable ~50–60 min session delivers (BELOW the 75-min ceiling).
// Calibrated so optimalDays ≈ 3 (beginner strength), ≈ 5–6 (advanced hypertrophy),
// ≈ 2 (in-season sport). See tests/optimal-frequency.js.
const SWEET_SPOT_SETS_PER_SESSION = 32;
export const MIN_DAYS = 2;
export const MAX_DAYS = 7;

export function suggestOptimalFrequency(profile = {}) {
  const program = resolveProgram(profile);
  const level = getGymLevel(profile, 'intermediate');
  // Representative mid-block, non-deload week (blockFrac 0.6) — the volume the plan
  // spends most of its weeks near.
  const targets = weeklyMuscleTargets({
    style: program.style, intent: 'build', level,
    weekInPhase: 1, phaseWeeks: 1, deload: false, blockFrac: 0.6,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar
  });
  const total = MUSCLE_GROUPS.reduce((s, m) => s + (targets[m] || 0), 0);
  const raw = Math.round(total / SWEET_SPOT_SETS_PER_SESSION);
  const optimalDays = Math.max(MIN_DAYS, Math.min(MAX_DAYS, raw));
  return { optimalDays, minDays: MIN_DAYS, maxDays: MAX_DAYS };
}

export default { suggestOptimalFrequency, MIN_DAYS, MAX_DAYS };
