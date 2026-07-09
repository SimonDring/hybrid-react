/**
 * sportLoad — the generation-time pullback that keeps the gym plan SUPPORTING a
 * trained sport rather than competing with it. Pure: scalar = season base × goal
 * factor × sport-day factor × sport systemic factor, clamped to a maintenance floor.
 *
 * The reactive wearable ACWR layer (plan/trainingLoad.js) handles total load once
 * data flows; this is the proactive, day-one layer that needs no history.
 * See docs/superpowers/specs/2026-06-28-sport-load-aware-planning-design.md §5.
 */
import { DEFAULT_SEASON_VOLUME } from '../../data/sportGymSupport/_schema.js';

const GOAL_FACTOR = { build_base: 1.0, get_stronger: 0.90, stay_durable: 1.0 };
export const VOLUME_FLOOR = 0.5, VOLUME_CEIL = 1.0;

// More sport sessions a week ⇒ less room for gym. Each day beyond two trims ~0.07.
export function sportDayFactor(n) {
  if (n <= 2) return 1.0;
  if (n === 3) return 0.92;
  if (n === 4) return 0.85;
  return 0.78;             // ≥5
}

export function sportLoadScalar(profile = {}, { season = 'off', mod = null, gymSupport = null } = {}) {
  // P1 (2026-07-09): seasonVolume + systemicFactor come from the SKB gymSupport (relocated verbatim
  // from the legacy module → byte-identical); `|| mod` keeps the legacy fallback until it is deleted.
  const seasonBase = ((gymSupport && gymSupport.seasonVolume) || (mod && mod.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0;
  const goalFactor = profile.sport_intent === 'recreational'
    ? (GOAL_FACTOR[profile.sport_goal] ?? 1.0) : 1.0;
  const dayFactor = sportDayFactor(Array.isArray(profile.sport_days) ? profile.sport_days.length : 0);
  const systemic = (gymSupport && typeof gymSupport.systemicFactor === 'number') ? gymSupport.systemicFactor
    : (mod && typeof mod.systemicFactor === 'number') ? mod.systemicFactor : 1.0;
  // Round to 3 dp so the multiplier is tidy + FP-stable (it propagates into volume
  // targets and the golden-master snapshot), then clamp to the maintenance floor.
  const raw = Math.round(seasonBase * goalFactor * dayFactor * systemic * 1000) / 1000;
  return Math.max(VOLUME_FLOOR, Math.min(VOLUME_CEIL, raw));
}

export default { sportLoadScalar, sportDayFactor };
