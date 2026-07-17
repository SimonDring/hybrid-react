/**
 * sportLoad — the generation-time pullback that keeps the gym plan SUPPORTING a
 * trained sport rather than competing with it. Pure: scalar = season base × goal
 * factor × sport-day factor × sport systemic factor, clamped to a maintenance floor.
 *
 * The reactive wearable ACWR layer (plan/trainingLoad.js) handles total load once
 * data flows; this is the proactive, day-one layer that needs no history.
 * See docs/superpowers/specs/2026-06-28-sport-load-aware-planning-design.md §5.
 */
import { DEFAULT_SEASON_VOLUME } from '../../data/periodizationDefaults.js';
// M6(a) governance sweep (closure §3 row 9): the global sport-support load magnitudes are governed
// knowledge now (KA Domain 7); the per-sport systemic factor is already an SKB fact.
import { SPORT_LOAD } from '../../data/sportLoadDefaults.js';

const GOAL_FACTOR = SPORT_LOAD.goalFactor;
export const VOLUME_FLOOR = SPORT_LOAD.volumeFloor, VOLUME_CEIL = SPORT_LOAD.volumeCeil;

// More sport sessions a week ⇒ less room for gym. Each day beyond two trims ~0.07.
export function sportDayFactor(n) {
  if (n <= 2) return SPORT_LOAD.sportDayFactor.upTo2;
  if (n === 3) return SPORT_LOAD.sportDayFactor.three;
  if (n === 4) return SPORT_LOAD.sportDayFactor.four;
  return SPORT_LOAD.sportDayFactor.fivePlus;             // ≥5
}

export function sportLoadScalar(profile = {}, { season = 'off', gymSupport = null } = {}) {
  // seasonVolume + systemicFactor come from the SKB gymSupport section; DEFAULT_SEASON_VOLUME / 1.0
  // are the fallback for an unknown/unauthored sport (2026-07-09, legacy sportGymSupport removed).
  const seasonBase = ((gymSupport && gymSupport.seasonVolume) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0;
  const goalFactor = profile.sport_intent === 'recreational'
    ? (GOAL_FACTOR[profile.sport_goal] ?? 1.0) : 1.0;
  const dayFactor = sportDayFactor(Array.isArray(profile.sport_days) ? profile.sport_days.length : 0);
  const systemic = (gymSupport && typeof gymSupport.systemicFactor === 'number') ? gymSupport.systemicFactor : 1.0;
  // Round to 3 dp so the multiplier is tidy + FP-stable (it propagates into volume
  // targets and the golden-master snapshot), then clamp to the maintenance floor.
  const raw = Math.round(seasonBase * goalFactor * dayFactor * systemic * 1000) / 1000;
  return Math.max(VOLUME_FLOOR, Math.min(VOLUME_CEIL, raw));
}

export default { sportLoadScalar, sportDayFactor };
