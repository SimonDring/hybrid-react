/**
 * rollingVolume — turns the weekly per-muscle target into a ROLLING-WINDOW model
 * so a missed session is recovered smoothly across the next several sessions
 * (this week AND the start of next), instead of being crammed into whatever
 * session is left in the same calendar week.
 *
 * Why rolling, not Mon–Sun: muscle recovers on a ~2–3 day cycle and the science
 * (Renaissance Periodisation / Israetel) prescribes volume *per week as a rate*,
 * not "by Sunday or it's lost". A fixed calendar week is an accounting artefact:
 * miss Mon+Tue and a weekly model dumps the whole week into one session, then
 * discards the overflow. A trailing window treats "are you hitting your sets per
 * muscle over ~10 days" as the real question — exactly how this app already tracks
 * training LOAD (see trainingLoad.js: acute/chronic windows).
 *
 * Pure functions, no IO. PlanService gathers the dated sessions and feeds them in.
 */

import { MUSCLE_GROUPS, VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { roundHalf } from '../Utils.js';

// The trailing window we account volume over. 10 days = absorbs one bad week
// without panic, short enough that fatigue doesn't quietly pile up. Tunable.
export const WINDOW_DAYS = 10;

const zero = () => { const o = {}; MUSCLE_GROUPS.forEach(m => (o[m] = 0)); return o; };

/**
 * The window's per-muscle set target = daily rate (weeklyTarget / 7) × windowDays.
 * Keeps periodisation intact — the weekly target still comes from targets.js, we
 * just express it as a rate over the window.
 */
export function rollingTarget(weeklyTarget = {}, windowDays = WINDOW_DAYS) {
  const out = {};
  for (const m of MUSCLE_GROUPS) out[m] = ((weeklyTarget[m] || 0) / 7) * windowDays;
  return out;
}

/**
 * Spread each upcoming slot's normal share PLUS a capped catch-up for whatever's
 * behind, across the horizon slots in date order. Anything that would push a
 * muscle past its recoverable ceiling over the window (MRV rate × windowDays) is
 * FORGIVEN — returned for visibility, never crammed in and never silently lost.
 *
 * @param {object} args
 *   slots      [{ normalShare: {muscle:sets} }]  upcoming sessions, date order
 *   deficit    {muscle: sets}  how far behind = max(0, rollingTarget − banked)
 *   windowDays
 * @returns {{ perSlot: Array<{muscle:sets}>, forgiven: {muscle:sets} }}
 *   perSlot   the per-muscle set target to hand each slot's allocator call
 *   forgiven  per-muscle sets we chose not to schedule (over the safe ceiling)
 */
export function distributeAcrossSlots({ slots = [], deficit = {}, windowDays = WINDOW_DAYS } = {}) {
  const N = slots.length;
  const perSlot = slots.map(zero);
  const forgiven = zero();
  if (!N) return { perSlot, forgiven };

  for (const m of MUSCLE_GROUPS) {
    const lm = VOLUME_LANDMARKS[m];
    // Don't plan more than the MRV rate across the window — the "don't hammer" line.
    const windowCeiling = lm ? (lm.mrv / 7) * windowDays : Infinity;
    const catchPer = (deficit[m] || 0) / N;   // even spread is the gentlest recovery
    let planned = 0;
    for (let i = 0; i < N; i++) {
      const want = ((slots[i].normalShare && slots[i].normalShare[m]) || 0) + catchPer;
      const allowed = Math.max(0, windowCeiling - planned);
      const give = roundHalf(Math.min(want, allowed));
      perSlot[i][m] = give;
      planned += give;
      forgiven[m] += Math.max(0, want - give);
    }
    forgiven[m] = roundHalf(forgiven[m]);
  }
  return { perSlot, forgiven };
}

export default { WINDOW_DAYS, rollingTarget, distributeAcrossSlots };
