/**
 * reflow — the runtime-adaptation LEDGER, in the engine (WP-24a; audit V2, TAS T7).
 *
 * These are the decision functions the adaptive reflow reasons with: what counts
 * toward THIS plan (epoch), this week's per-muscle target (the training debt), which
 * past sessions were missed (the shortfall to recover), and which upcoming slots may
 * be reshaped (the horizon). They lived in apps/mobile/PlanService.js — runtime
 * coaching policy in the app layer, mirroring generator formulas with "must match"
 * comments (drift-by-design). Extracted VERBATIM here with the app's impure reads
 * (Database, module-singleton runtime) turned into EXPLICIT parameters; PlanService
 * delegates with thin bindings, so behaviour is byte-identical (goldens + the reflow
 * test corpus prove it).
 *
 * 24b moves the adaptedPhases POLICY (deload force/defer application, multipliers,
 * lightening, forgiveness) behind a pure reflowWeek(); 24c strips PlanService to an
 * L3 orchestrator. Pure, no IO, no clock — every date is an argument.
 */
import { weeklyMuscleTargets } from '../strength/targets.js';
import { countWeeklyVolume } from './volume.js';
import { WINDOW_DAYS } from './rollingVolume.js';

export const sessionKey = (phaseId, weekNum, idx) => `p${phaseId}_wk${weekNum}_s${idx}`;

export const intentOfTitle = (title) => {
  const t = (title || '').toLowerCase();
  return t.includes('peak') ? 'peak' : t.includes('build') ? 'build' : 'base';
};

/** Local YYYY-MM-DD (never UTC — the athlete's wall calendar). */
export function localISO(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Which discipline a generated session belongs to (gym-only engine: gym unless
 *  legacy endurance tags say otherwise). Pure — reads only the session's items. */
export function sessionDiscipline(s) {
  const tags = new Set((s.items || []).map((it) => it.tag).filter(Boolean));
  if (tags.has('swim')) return 'swim';
  if (tags.has('cycle')) return tags.has('run') ? 'brick' : 'cycle';
  if (tags.has('run')) return 'run';
  return 'gym';
}

/**
 * A settled session counts toward the CURRENT plan only if acted on within this
 * plan's epoch (created on/after its start). Completion is keyed by POSITION
 * (p1_wk1_s0…), so after "clear plan & start over" old rows survive as history under
 * the same keys — without this guard they'd phantom-complete the new plan.
 * @param {object} st — the session's runtime state row
 * @param {string|null} startISO — the plan's start date (local YYYY-MM-DD), null = no epoch
 */
export function withinEpoch(st, startISO) {
  if (!st) return false;
  if (!startISO) return true;
  return !st.createdAt || st.createdAt >= startISO;
}

/**
 * This week's per-muscle set target (the "training debt"). blockFrac must match the
 * generator's formula — it lives HERE now so there is one implementation, not a
 * mirrored pair (the audit's A3 "must match PlanGenerator" drift-by-design).
 * @param {{phase, week, gctx, deloadOverride?, totalWeeks: number}} args
 */
export function weekTarget({ phase, week, gctx, deloadOverride, totalWeeks }) {
  const tw = totalWeeks;
  const blockFrac = tw > 1 ? (week.num - 1) / (tw - 1) : 0.5;
  const lighten = deloadOverride != null ? deloadOverride : (!!week.deload || !!week.taper);
  return weeklyMuscleTargets({
    style: gctx.style, intent: intentOfTitle(phase.title), level: gctx.level,
    weekInPhase: week.num - phase.weekStart + 1,
    phaseWeeks: phase.weekEnd - phase.weekStart + 1, deload: lighten,
    emphasis: gctx.emphasis, volumeScalar: gctx.volumeScalar, blockFrac
  });
}

/**
 * Every gym session across the plan with its scheduled date + positional key.
 * Reads BASELINE items (completed/locked sessions are never reflowed, so their
 * baseline equals what was done — what the rolling ledger counts).
 * @param {Array} phases — the generated plan's phases
 * @param {(weekNum:number, title:string) => Date|null} dateFor — the caller's calendar
 */
export function gymSessionsWithDates(phases, dateFor) {
  const out = [];
  for (const phase of phases) {
    for (const week of (phase.weeks || [])) {
      week.sessions.forEach((s, i) => {
        if (sessionDiscipline(s) !== 'gym') return;
        out.push({ phase, week, i, s, key: sessionKey(phase.id, week.num, i), date: dateFor(week.num, s.title) });
      });
    }
  }
  return out;
}

/**
 * Per-muscle baseline volume of trailing-window gym sessions that were MISSED —
 * skipped, or past-due and never completed/started — in-epoch. The concrete
 * shortfall the upcoming sessions recover (spread + capped, never crammed).
 * @param {Array} gymList — from gymSessionsWithDates
 * @param {object} overrides — session overrides by key (pins/Train Now)
 * @param {Date} today — the caller's "today" (midnight-local)
 * @param {{sessions: object, start: Date|null, startISO: string|null, windowDays?: number}} state
 */
export function missedWindowVolume(gymList, overrides, today, { sessions, start, startISO, windowDays = WINDOW_DAYS }) {
  const windowStartMs = today.getTime() - windowDays * 86400000;
  const missed = [];
  for (const g of gymList) {
    if (!g.date) continue;
    const ms = g.date.getTime();
    if (ms >= today.getTime() || ms < windowStartMs) continue;   // only past sessions inside the window
    if (start && g.date < start) continue;                       // never "missed" before the plan began
    const st = sessions[g.key];
    if (st && withinEpoch(st, startISO) && (st.completed || st.started)) continue; // did it → banked
    const ov = overrides[g.key];
    missed.push(ov ? { items: ov.items } : g.s);
  }
  return countWeeklyVolume(missed).counts;
}

/**
 * Pending gym slots in [today, today + windowDays] — the sessions the reflow may
 * reshape. Settled (completed/started/skipped in-epoch) and pinned slots are locked.
 * Date order.
 */
export function horizonSlots(gymList, overrides, today, { sessions, startISO, windowDays = WINDOW_DAYS }) {
  const endMs = today.getTime() + windowDays * 86400000;
  const slots = [];
  for (const g of gymList) {
    if (!g.date) continue;
    const ms = g.date.getTime();
    if (ms < today.getTime() || ms > endMs) continue;
    if (overrides[g.key]) continue;
    const st = sessions[g.key];
    if (st && withinEpoch(st, startISO) && (st.completed || st.skipped || st.started)) continue;
    slots.push(g);
  }
  slots.sort((a, b) => a.date - b.date);
  return slots;
}

export default { sessionKey, intentOfTitle, localISO, sessionDiscipline, withinEpoch, weekTarget, gymSessionsWithDates, missedWindowVolume, horizonSlots };
