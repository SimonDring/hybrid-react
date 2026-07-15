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
 * lightening, forgiveness) behind pure reflowPhases(); 24c strips PlanService to an
 * L3 orchestrator. Pure, no IO, no clock — every date is an argument.
 */
import { weeklyMuscleTargets } from '../strength/targets.js';
import { countWeeklyVolume } from './volume.js';
import { WINDOW_DAYS, distributeAcrossSlots } from './rollingVolume.js';
import { resolveSplit } from './split.js';
import { olympicPriorityIds } from '../../data/disciplines/olympic.js';
import { MUSCLE_GROUPS } from '../../data/muscleVolume.js';
import { allocateGym } from './allocator.js';
import { functionalSlotMinutes } from './strength.js';
import { despineWeek } from './despine.js';
import { provenance } from '../../version.js';
import { deriveConstraints, lightenItems } from './constraints.js';
import { combinedMultiplier, deloadRecommendation } from './trainingLoad.js';
import { ruleVolumeAdjustment } from '../sportKnowledge/reflowAdjust.js';
import { contraindicatedPatternsForInjuries, blockedNameRegexesForInjuries } from '../session/movementRequirements.js';
import { categoryPlanFor } from '../session/categoryCoverage.js';
import kb from '../knowledge/kb.js';

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

/** Mean of the athlete's most recent in-epoch session-recovery ratings (1–5). Used
 *  by the deload decision AND the caller's memo key — one implementation, no drift. */
export function recentSessionRecovery(sessions, startISO, n = 4) {
  const vals = Object.values(sessions || {})
    .filter((s) => s.completed && s.recovery != null && withinEpoch(s, startISO))
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, n).map((s) => s.recovery);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/**
 * reflowPhases — the runtime-adaptation POLICY, pure (WP-24b; audit V2/H2).
 *
 * Reshape only the PENDING gym sessions inside the rolling horizon: spread the
 * missed-window shortfall across them (capped; the unrecoverable remainder is
 * FORGIVEN, never crammed), apply the adaptive-deload force/defer decision to the
 * current week, scale volume by recovery×load (travel caps it; SKB rules trim it),
 * carry the readiness/travel RPE offset, lighten sport-day clashes, honour pins and
 * freeze-on-start, and de-spine the rebuilt week exactly as the generator does.
 * Moved VERBATIM from PlanService.adaptedPhases with every impure read as an
 * argument. The caller owns memoisation and IO; `load` arrives already nulled when
 * the athlete reverted to plan.
 *
 * @returns {{ phases: Array, forgiven: object }}
 */
export function reflowPhases({
  phases: basePhases, currentWeek: cw, today, gctx, profile,
  sessions, recovery, load, reverted, overrides, activeInjuries,
  dateFor, totalWeeks, startDate, startISO,
}) {
  const weeksTouched = [cw, cw + 1];               // the horizon spans at most two weeks
  const override = recovery ? recovery.sessionOverride : null;   // illness('rest') / travel('easy')
  const loadAction = load && load.inputs ? load.inputs.action : 'none';

  // Adaptive deload (F9): promote fatigue into a TRUE deload, or DEFER a planned one.
  const recentRecovery = recentSessionRecovery(sessions, startISO);
  const cwWeek = basePhases.flatMap((p) => p.weeks || []).find((w) => w.num === cw) || {};
  const rec = reverted ? { action: 'none', reason: null } : deloadRecommendation({
    loadAction, readiness: recovery ? recovery.score : null, recentRecovery,
    illness: override === 'rest', scheduledDeload: !!cwWeek.deload
  });

  // SKB decision rules (sport-specific) → conservative reflow modifiers.
  const ruleCtx = {
    season: gctx.season || null,
    readiness: recovery ? recovery.score : null,
    illness: override === 'rest',
    travel: override === 'easy',
    acwr: (load && load.inputs && load.inputs.acwr != null) ? load.inputs.acwr : null,
    competitionWithinH: profile.event_date ? Math.max(0, (new Date(profile.event_date).getTime() - today.getTime()) / 3600000) : null
  };
  const ruleAdj = ruleVolumeAdjustment(profile, ruleCtx);

  // Constraints-first injuries (WP-13).
  const contraindicatedPatterns = contraindicatedPatternsForInjuries(activeInjuries);
  const blockedNameRegexes = blockedNameRegexesForInjuries(activeInjuries);

  // Effective deload — the force/defer decision applies to the current week only.
  const effDeload = (week) => {
    if (week.num !== cw) return !!week.deload;
    if (rec.action === 'force' || ruleAdj.forceDeload) return true;
    if (rec.action === 'defer') return false;
    return !!week.deload;
  };

  // Rolling ledger: the missed shortfall, spread across the horizon's pending slots.
  const { busyDays: sportBusy } = deriveConstraints(profile);
  const gymList = gymSessionsWithDates(basePhases, dateFor);
  const deficit = missedWindowVolume(gymList, overrides, today, { sessions, start: startDate, startISO });
  const slots = horizonSlots(gymList, overrides, today, { sessions, startISO });
  const gymCountByWeek = {};
  gymList.forEach((x) => { const k = `${x.phase.id}_${x.week.num}`; gymCountByWeek[k] = (gymCountByWeek[k] || 0) + 1; });
  const slotInputs = slots.map((s) => {
    const wt = weekTarget({ phase: s.phase, week: s.week, gctx, deloadOverride: effDeload(s.week) || !!s.week.taper, totalWeeks });
    const n = gymCountByWeek[`${s.phase.id}_${s.week.num}`] || 1;
    // WP-49 follow-up: pass competedLift so an Olympic athlete's reflowed split keeps the SAME
    // snatch/C&J/squat day sequence as the baseline (a specialist doesn't revert to 'both').
    const day = resolveSplit({ gymDays: n, style: gctx.style, competedLift: gctx.competedLift || 'both' })[s.i] || {};
    const weights = day.weights;
    const normalShare = {};
    for (const m of MUSCLE_GROUPS) normalShare[m] = weights ? (wt[m] || 0) * (weights[m] || 0) : (wt[m] || 0) / n;
    // WP-49 T6: carry the split's REGION LABEL into the reflow so a discipline's split survives
    // reflow (powerlifting Upper/Lower, hypertrophy PPL) — otherwise the reflowed week collapses to
    // full-body and, e.g., squats every day, over-dosing quads past MRV. Sports keep region='full'
    // via the allocator's discipline gate, so this is inert for them (byte-identical).
    // WP-49 follow-up: also carry the olympic per-day lift family + target-quality override (as the
    // baseline strength.js does), so the squat day keeps its maxStrength dose and each lift day its
    // family narrowing under reflow. Absent for every non-olympic day.
    return {
      normalShare, anchors: day.anchors || null,
      focus: gctx.style === 'sport' ? null : (weights || null), focusLabel: day.focus || null,
      ...(day.emphasis ? { priorityIds: olympicPriorityIds(day.emphasis, gctx.exercisePriority || []), targetQualityOverride: day.targetQuality } : {})
    };
  });
  const { perSlot, forgiven } = distributeAcrossSlots({ slots: slotInputs, deficit, windowDays: WINDOW_DAYS });

  // Recovery trims; load (demoted) gently trims/restores; travel caps; rules trim.
  let mult = combinedMultiplier(
    recovery ? recovery.volumeModifier : 1,
    { action: loadAction, multiplier: load ? load.loadModifier : 1 }
  );
  const travelPolicy = kb.value('recovery.travel_policy');
  if (!reverted && override === 'easy') mult = Math.min(mult, travelPolicy.volumeCap);
  mult *= ruleAdj.volumeMult;
  let rpeOffset = recovery ? (recovery.rpeOffset || 0) : 0;
  if (!reverted && override === 'easy') rpeOffset = Math.min(rpeOffset, travelPolicy.rpeOffset);

  // WP-55 — baseline identity. On a NEUTRAL day the reflow must not re-derive the
  // session: re-allocating from scratch produces a different (and de-periodised — it can
  // drop the baseline's power/plyo anchors) session than the plan the rest of the horizon
  // shows, for no coaching reason. So a slot whose inputs are all no-ops KEEPS its baseline
  // session (we simply don't set specByKey[s.key], and the pass below leaves it untouched).
  // Only slots whose inputs ACTUALLY changed are re-allocated. Baseline sessions already
  // carry axialLoad/dayIdx (generatePlan stamps them), so identity is exact.
  const deficitTotal = Object.values(deficit).reduce((a, b) => a + b, 0);
  const neutralGlobals = Math.abs(mult - 1) < 1e-9 && rpeOffset === 0 && deficitTotal === 0
    && !(contraindicatedPatterns && contraindicatedPatterns.length) && !(blockedNameRegexes && blockedNameRegexes.length);

  const specByKey = {};
  slots.forEach((s, idx) => {
    const wd0 = s.date ? (s.date.getDay() === 0 ? 6 : s.date.getDay() - 1) : null;
    const sportBusyDay = wd0 != null && sportBusy.includes(wd0);   // reflow lightens these — not neutral
    const deloadUnchanged = effDeload(s.week) === !!s.week.deload; // no forced/deferred deload change
    if (neutralGlobals && deloadUnchanged && !sportBusyDay) return; // nothing changed → keep baseline session

    const spec = allocateGym({
      targets: perSlot[idx],
      slots: [{ minutes: Math.round(functionalSlotMinutes(gctx.style, gctx.minutes) * mult), equip: gctx.access,
                anchors: slotInputs[idx].anchors, focus: slotInputs[idx].focus, focusLabel: slotInputs[idx].focusLabel,
                priorityIds: slotInputs[idx].priorityIds || null, targetQualityOverride: slotInputs[idx].targetQualityOverride || null }],
      ctx: {
        style: gctx.style, intent: intentOfTitle(s.phase.title), deload: effDeload(s.week), taper: !!s.week.taper,
        weekNum: s.week.num, level: gctx.level, sex: gctx.sex, lifts: gctx.lifts, access: gctx.access,
        bodyweight: gctx.bodyweight, priorityByIntent: gctx.priorityByIntent,
        exercisePriority: gctx.exercisePriority, sport: gctx.sport, power: gctx.power,
        priorityQualities: gctx.priorityQualities, season: gctx.season, skbIds: gctx.skbIds,
        weekGymCount: gymCountByWeek[`${s.phase.id}_${s.week.num}`] || 1, weekSlotIdx: s.i,
        rpeOffset, contraindicatedPatterns, blockedNameRegexes,
        categoryPlan: categoryPlanFor(gctx.skbSportId, gymCountByWeek[`${s.phase.id}_${s.week.num}`] || 1, { levelName: gctx.level, season: gctx.season }),
        discipline: gctx.discipline || null,
        // Phase 3 M2 — reproduce the baseline's block-scoped creep when this slot is
        // re-derived (powerlifting T2 + hypertrophy T3 + olympic T4, gated in the allocator). creepWeeks is the FORWARD
        // PROJECTION over the block's prior working weeks — the SAME rule the pure generator
        // uses for a fresh plan — so a neutral reflow (which anyway keeps the baseline session)
        // and a reshaped one both carry the identical creep; progression never leaks a per-week
        // change into reflow that isn't in baseline. loggedLiftKeys keeps logged compounds untouched.
        creepWeeks: (s.phase.weeks || []).filter((w) => w.num < s.week.num && !w.deload && !w.taper).length,
        loggedLiftKeys: new Set(Object.keys((profile && profile.lift_log) || {}))
      }
    })[0];
    if (spec) {
      let built = spec;   // primer is added later by the caller's decoration
      const wd = s.date ? (s.date.getDay() === 0 ? 6 : s.date.getDay() - 1) : null;
      if (wd != null && sportBusy.includes(wd)) built = { ...built, items: lightenItems(built.items), lightened: true };
      specByKey[s.key] = built;
    }
  });

  // Rebuild in place: horizon specs + pinned snapshots; everything else as-is.
  const phases = basePhases.map((phase) => {
    if (!phase.weeks || !phase.weeks.some((w) => weeksTouched.includes(w.num))) return phase;
    return {
      ...phase,
      weeks: phase.weeks.map((week) => {
        if (!weeksTouched.includes(week.num)) return week;
        let changed = false;
        const newSessions = week.sessions.slice();
        const reshapedIdx = new Set();
        const swap = (i, focus, duration, items, flag) => {
          const dayPrefix = (newSessions[i].title.split('·')[0] || '').trim();
          newSessions[i] = { ...newSessions[i], title: dayPrefix ? `${dayPrefix} · ${focus}` : focus, duration, items, ...flag };
          changed = true;
        };
        week.sessions.forEach((s, i) => {
          const k = sessionKey(phase.id, week.num, i);
          const ov = overrides[k];
          if (ov) { swap(i, ov.focus, ov.duration, ov.items, {}); return; }
          const spec = specByKey[k];
          if (spec) { swap(i, spec.focus, spec.duration, spec.items, { axialLoad: spec.axialLoad || 0 }); reshapedIdx.add(i); }
        });

        if (reshapedIdx.size) {
          const forDespine = newSessions.map((s, i) =>
            reshapedIdx.has(i) ? s : { ...s, items: (s.items || []).map((it) => ({ ...it })) });
          despineWeek(forDespine, {
            priorityByIntent: gctx.priorityByIntent, lifts: gctx.lifts,
            level: gctx.level, bodyweight: gctx.bodyweight, blockedNameRegexes
          });
        }
        const forceDl = week.num === cw && rec.action === 'force';
        const deferDl = week.num === cw && rec.action === 'defer';
        if (!changed && !forceDl && !deferDl) return week;
        const out = { ...week, sessions: newSessions, _adapted: changed };
        if (changed && rpeOffset < 0 && reshapedIdx.size) {
          out._intensityEased = override === 'easy' ? 'travel — eased' : 'low readiness — eased';
        }
        // WP-43: runtime reshaping must be VISIBLE (Art 14/15). Sport-rule trims carry the
        // fired rule ids; a non-trivial catch-up spread names the sets it recovered. Both
        // stamp only reshaped weeks — the annotations describe what the reflow DID here.
        if (changed && reshapedIdx.size && ruleAdj.volumeMult !== 1) {
          out._ruleTrim = { ruleIds: ruleAdj.ruleIds || [], mult: ruleAdj.volumeMult };
        }
        if (changed && reshapedIdx.size && week.num === cw) {
          const owed = Object.values(deficit).reduce((a, b) => a + b, 0);
          const waived = Object.values(forgiven || {}).reduce((a, b) => a + b, 0);
          const recovered = Math.max(0, owed - waived);
          if (recovered >= 1) out._catchUp = { sets: Math.round(recovered) };
        }
        if (forceDl) { out.deload = true; out.autoDeload = true; out.deloadReason = rec.reason; }
        if (deferDl) { out.deload = false; out.deloadDeferred = true; }
        return out;
      })
    };
  });
  return { phases, forgiven, provenance: provenance() };
}

export default { sessionKey, intentOfTitle, localISO, sessionDiscipline, withinEpoch, weekTarget, gymSessionsWithDates, missedWindowVolume, horizonSlots, recentSessionRecovery, reflowPhases };
