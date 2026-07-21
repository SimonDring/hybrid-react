/**
 * exerciseMeta — resolves a plan item to its catalogue entry and decides what the
 * runner should collect for it. The catalogue already knows what each movement IS
 * (role/pattern/equip); this is the app-side read of that knowledge. Items that
 * can't be resolved (pre-WP-46 pins, off-catalogue names) keep legacy behaviour.
 */
import { EXERCISES } from '@performance-os/engine';

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));
const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const LOADABLE_EQUIP = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'band']);

export function catalogueEntryFor(item) {
  if (!item) return null;
  return (item.exId != null && BY_ID.get(item.exId))
    || BY_NAME.get(String(item.name || '').toLowerCase())
    || null;
}

export function classifyItem(item) {
  // Rehab/prevention items are protocol work — do it, tick it, no ratings.
  if (item?.rehab || item?.prevention) return { collectRpe: false, collectWeight: false, simpleDone: true };
  const e = catalogueEntryFor(item);
  if (!e) return { collectRpe: true, collectWeight: true, simpleDone: false };  // legacy: unknown = strength-style
  if (e.pattern === 'mobility') return { collectRpe: false, collectWeight: false, simpleDone: true };
  if (e.role === 'plyo') return { collectRpe: false, collectWeight: false, simpleDone: false };
  if (e.role === 'core') {
    const loadable = LOADABLE_EQUIP.has(e.equip);
    return { collectRpe: loadable, collectWeight: loadable, simpleDone: false };
  }
  // primary/accessory/iso: RPE always meaningful; the weight stepper only where the
  // movement is actually loadable (Simon 2026-07-21 — a push-up shouldn't ask for a load).
  return { collectRpe: true, collectWeight: LOADABLE_EQUIP.has(e.equip), simpleDone: false };
}

// Most recent logged weight for this exercise across OTHER sessions (the runner's
// in-session carry already handles the current one). setLogsBySession: { [sessionId]: rows[] }.
export function lastLoggedWeightFor(exerciseName, setLogsBySession = {}, excludeSessionId = null) {
  let best = null;
  for (const [sid, rows] of Object.entries(setLogsBySession)) {
    if (sid === String(excludeSessionId)) continue;
    for (const r of rows || []) {
      if (r.exercise_name !== exerciseName || r.actual_weight == null) continue;
      if (!best || (r.completed_at || '') > (best.completed_at || '')) best = r;
    }
  }
  return best ? Number(best.actual_weight) : null;
}
