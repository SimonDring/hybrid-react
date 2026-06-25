/**
 * constraints.js — sport-day scheduling constraints for the gym plan.
 *
 * A sport-supporting athlete trains their sport on fixed days (e.g. swim Tue/Thu).
 * These are pure helpers the generator + scheduler + reflow use to (1) suggest gym
 * days around the sport days, (2) arrange heavy gym work away from sport days and
 * lighten any session forced onto one. This is the individual-level version of the
 * Team package's "coach schedule as constraints" (docs/product/TEAM-ARCHITECTURE.md)
 * — same shape, different source. Gym-only: sport days are constraints, not sessions.
 */
import { get as getSportModule } from '../sports/index.js';

export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KEY_IDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

export function weekdayIndex(key) { return KEY_IDX[key]; }

// profile → { busyDays:number[] (sorted weekday indices), sportMuscles:string[] }.
// Non-sport goals and missing sport_days yield empty arrays (callers no-op).
export function deriveConstraints(profile = {}) {
  const busyDays = [...new Set(
    (profile.sport_days || []).map(k => KEY_IDX[k]).filter(i => i != null)
  )].sort((a, b) => a - b);
  const mod = profile.sport ? getSportModule(profile.sport) : null;
  const sportMuscles = (mod && Array.isArray(mod.keyMuscles)) ? mod.keyMuscles.slice() : [];
  return { busyDays, sportMuscles };
}

// Pick k items from arr (preserving order), spread as evenly as possible.
function spreadPick(arr, k) {
  if (k <= 0) return [];
  if (k >= arr.length) return arr.slice();
  const out = [];
  const denom = k - 1 || 1;
  for (let i = 0; i < k; i++) out.push(arr[Math.round(i * (arr.length - 1) / denom)]);
  return [...new Set(out)];
}

// Suggest `gymDays` weekday keys around the sport days: prefer non-sport days
// (spread for recovery); only land on sport days when the week is too packed to
// avoid it. Returned in week order. The onboarding UI pre-fills the gym-day picker
// with this; the user can override.
export function suggestGymDays({ sportDays = [], gymDays = 3 } = {}) {
  const n = Math.max(1, Math.min(7, gymDays || 3));
  const sport = new Set((sportDays || []).filter(d => DAY_ORDER.includes(d)));
  const free = DAY_ORDER.filter(d => !sport.has(d));
  if (free.length >= n) return spreadPick(free, n);
  // Packed: take every free day + the fewest sport days needed, spread.
  const onSport = spreadPick(DAY_ORDER.filter(d => sport.has(d)), n - free.length);
  return [...free, ...onSport].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

export default { DAY_ORDER, weekdayIndex, deriveConstraints, suggestGymDays };
