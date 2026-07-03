/**
 * PlanService — the single entry point screens use for plan content
 * (getPhases, getPhase, getWeek, findNextSession).
 *
 * The plan is ALWAYS generated from the user's own profile/goal by PlanGenerator —
 * there is no hand-built fallback. Before a user has onboarded (no profile.focus)
 * there is simply no plan, and the app gates the plan screens behind onboarding.
 *
 * Generation is a pure function of the profile, so we memoise on a signature of
 * the relevant fields and only regenerate when they change. Session keys follow
 * the p{phase}_wk{week}_s{idx} scheme so completion state maps correctly.
 *
 * Screens import THIS for all plan content. When the AI coach lands (Stage 5) it
 * edits the generated plan (or a persisted copy) behind this same interface.
 */

import Database from './Database.js';
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { weeklyMuscleTargets } from '@performance-os/engine/lib/strength/targets.js';
import { allocateGym, SESSION_CEILING_MIN } from '@performance-os/engine/lib/plan/allocator.js';
import { functionalSlotMinutes } from '@performance-os/engine/lib/plan/strength.js';
import { resolveSplit } from '@performance-os/engine/lib/plan/split.js';
import { resolveProgram } from '@performance-os/engine/lib/strength/program.js';
import { countWeeklyVolume } from '@performance-os/engine/lib/plan/volume.js';
import { distributeAcrossSlots, WINDOW_DAYS } from '@performance-os/engine/lib/plan/rollingVolume.js';
import { despineWeek } from '@performance-os/engine/lib/plan/despine.js';
import { resolveLifts } from '@performance-os/engine/lib/liftProgression.js';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@performance-os/engine/data/muscleVolume.js';
import { getOverrides } from './sessionOverrides.js';
import { applyInjuryRules, applyPrevention } from '@performance-os/engine/lib/injury/injuryFilter.js';
import { combinedMultiplier, deloadRecommendation } from '@performance-os/engine/lib/plan/trainingLoad.js';
import { ruleVolumeAdjustment } from '@performance-os/engine/lib/sportKnowledge/reflowAdjust.js';
import { deriveConstraints, lightenItems } from '@performance-os/engine/lib/plan/constraints.js';
import { buildPrimer } from '@performance-os/engine/lib/plan/primers.js';
import { performanceModelForProfile } from '@performance-os/engine';
import * as SKB from '@performance-os/engine/lib/sportKnowledge/index.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';

let _cache = { sig: null, plan: null };

// ---------------------------------------------------------------------------
// Adaptive reflow runtime. The plan is a pure projection; the CURRENT week
// reflows around what's actually been done + how recovered the athlete is. The
// store keeps this runtime fresh (setRuntime in trainingStore.buildView) so the
// reflow can read live completion + readiness without changing any screen's
// call signature. Future/past weeks are never touched — only the current week.
// ---------------------------------------------------------------------------
// recovery = RecoveryOutput (src/lib/recovery), load = LoadOutput (src/lib/load) —
// the store computes both each buildView and the reflow consumes the contracts here.
let _runtime = { sessions: {}, recovery: null, load: null };
let _adaptCache = { key: null, phases: null };
let _lastForgiven = null;   // per-muscle sets left unscheduled last reflow (over the safe ceiling)

export function setRuntime(rt = {}) {
  _runtime = {
    sessions: rt.sessions || {},
    recovery: rt.recovery ?? null,
    load: rt.load ?? null
  };
}

// The active load adaptation for the current week, for the UI banner. Returns
// null when there's no live adaptation. `reverted` = the user pinned this week to
// the plan (load ignored; readiness still applies).
export function currentAdaptation() {
  const cw = currentWeekNumber();
  if (cw == null) return null;
  const profile = Database.services.getProfile() || {};
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const load = _runtime.load;
  const action = load && load.inputs ? load.inputs.action : null;
  if (reverted) {
    return (action && action !== 'none')
      ? { action: 'reverted', reason: 'Following the plan (you reverted this week)', reverted: true, week: cw }
      : null;
  }
  if (!action || action === 'none') return null;
  return { action, reason: load.loadRecommendation, reverted: false, week: cw };
}

// Gym programming context derived from the profile (mirrors PlanGenerator).
function gymCtx(profile) {
  // The goal's full programming (style, per-muscle emphasis, volume scalar,
  // exercise priority) — the SAME source the baseline generator uses, so the
  // reflowed weeks the athlete actually trains carry the goal tuning, not a
  // generic strength session. For sport goals program.style is 'sport'.
  const program = resolveProgram(profile);
  const e = profile.experience || {};
  const level = e.gym || e.strength_functional || e.strength_physique || 'beginner';
  const minutes = SESSION_CEILING_MIN;   // volume-driven; user no longer picks a session length
  // The diagnosis (D4/D5) that steers SPORT selection (D11) — the SAME source the baseline
  // generator uses, so a reflowed run/cycle week stays D11-driven instead of reverting to
  // the legacy fill. asOf comes from the profile's start date (never the clock) for determinism.
  const asOf = profile.plan_start_date || null;
  const perf = performanceModelForProfile(profile, asOf);
  const skbSportId = profile.sport ? (profileToAthleteModel(profile, asOf)?.sportingContext?.primarySport || null) : null;
  const skbIds = skbSportId ? new Set((SKB.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((e) => e.id)) : new Set();
  return {
    style: program.style, level, minutes,
    access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile),
    bodyweight: profile.bodyweight_kg,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map(),
    sport: profile.sport || null, power: !!program.power,
    priorityQualities: (perf && perf.priorityAdaptations) || [], season: program.season, skbIds
  };
}

const intentOfTitle = (title) => {
  const t = (title || '').toLowerCase();
  return t.includes('peak') ? 'peak' : t.includes('build') ? 'build' : 'base';
};

const sessionKey = (phaseId, weekNum, idx) => `p${phaseId}_wk${weekNum}_s${idx}`;

// A settled session (completed/started/skipped) only counts toward the CURRENT
// plan if it was acted on within this plan's epoch — i.e. created on/after the
// plan's start date. Session completion is keyed by POSITION (p1_wk1_s0…), so
// after "clear plan & start over" the old rows survive as history but reuse the
// same keys; without this guard they'd silently mark the new plan's identical
// slots done/missed and trigger a phantom catch-up. A plan with no start date has
// no epoch, so everything counts (defensive fallback).
export function withinEpoch(st) {
  if (!st) return false;
  const start = getStartDate();
  if (!start) return true;
  return !st.createdAt || st.createdAt >= localISO(start);
}

// This week's per-muscle set target (the "training debt").
function weekTarget(phase, week, gctx, deloadOverride) {
  // Block-continuous ramp position — must match PlanGenerator's formula so the
  // reflowed (trained) weeks stay in parity with the baseline plan.
  const tw = totalWeeks();
  const blockFrac = tw > 1 ? (week.num - 1) / (tw - 1) : 0.5;
  const lighten = deloadOverride != null ? deloadOverride : (!!week.deload || !!week.taper);
  return weeklyMuscleTargets({
    style: gctx.style, intent: intentOfTitle(phase.title), level: gctx.level,
    weekInPhase: week.num - phase.weekStart + 1,
    phaseWeeks: phase.weekEnd - phase.weekStart + 1, deload: lighten,
    emphasis: gctx.emphasis, volumeScalar: gctx.volumeScalar, blockFrac
  });
}

// All gym sessions across the plan, each with its real scheduled date + key. Reads
// BASELINE items — completed/locked sessions are never reflowed, so their baseline
// items equal what was actually done, which is what the rolling ledger counts.
function gymSessionsWithDates(phases) {
  const out = [];
  for (const phase of phases) {
    for (const week of (phase.weeks || [])) {
      week.sessions.forEach((s, i) => {
        if (sessionDiscipline(s) !== 'gym') return;
        out.push({ phase, week, i, s, key: sessionKey(phase.id, week.num, i), date: dateForSession(week.num, s.title) });
      });
    }
  }
  return out;
}

// Per-muscle baseline volume of gym sessions in the trailing window that were
// MISSED — skipped, or past their date and never completed/started — and that
// belong to the current plan (on/after its start date, in-epoch). This concrete
// shortfall is what the upcoming sessions recover (spread + capped); using it
// instead of "window target − banked" avoids double-counting normal forward
// programming (which the per-slot normal share already covers).
function missedWindowVolume(gymList, overrides, today) {
  const start = getStartDate();
  const windowStartMs = today.getTime() - WINDOW_DAYS * 86400000;
  const missed = [];
  for (const g of gymList) {
    if (!g.date) continue;
    const ms = g.date.getTime();
    if (ms >= today.getTime() || ms < windowStartMs) continue;   // only past sessions inside the window
    if (start && g.date < start) continue;                       // never "missed" before the plan began
    const st = _runtime.sessions[g.key];
    if (st && withinEpoch(st) && (st.completed || st.started)) continue; // did it → banked, not missed
    const ov = overrides[g.key];
    missed.push(ov ? { items: ov.items } : g.s);
  }
  return countWeeklyVolume(missed).counts;
}

// Pending gym slots whose scheduled date falls in [today, today + WINDOW_DAYS] —
// the sessions we may (re)shape now. Settled (completed/started/skipped in-epoch)
// and train-now-pinned slots are excluded; they're locked. Returned in date order.
function horizonSlots(gymList, overrides, today) {
  const endMs = today.getTime() + WINDOW_DAYS * 86400000;
  const slots = [];
  for (const g of gymList) {
    if (!g.date) continue;
    const ms = g.date.getTime();
    if (ms < today.getTime() || ms > endMs) continue;
    if (overrides[g.key]) continue;
    const st = _runtime.sessions[g.key];
    if (st && withinEpoch(st) && (st.completed || st.skipped || st.started)) continue;
    slots.push(g);
  }
  slots.sort((a, b) => a.date - b.date);
  return slots;
}

/**
 * Adaptive plan view. The plan is a pure projection; we reshape only the PENDING
 * gym sessions inside a rolling WINDOW_DAYS horizon (current week + the start of
 * next) so volume you're behind on is spread smoothly across them — capped per
 * session, with anything past the recoverable ceiling forgiven (never crammed,
 * never silently dropped). Completed / started / missed / train-now-pinned
 * sessions, all non-gym sessions, and everything outside the horizon are returned
 * untouched, in place — so completion keys (p{phase}_wk{week}_s{idx}) stay valid.
 * Returns null for legacy plans (no start date → no reflow).
 */
function adaptedPhases() {
  const g = generated();
  if (!g) return null;
  const cw = currentWeekNumber();
  if (cw == null) return g.phases;

  const profile = Database.services.getProfile() || {};
  const overrides = getOverrides();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weeksTouched = [cw, cw + 1];               // the horizon spans at most two weeks

  // ---- memo key: recompute when settled state, readiness, load, overrides, the
  // generated plan, or the DAY (the rolling window slides) changes ----
  const inWeeks = (k) => weeksTouched.some(w => k.includes(`_wk${w}_`));
  const stateSig = Object.keys(_runtime.sessions)
    .filter(inWeeks)
    .map(k => { const s = _runtime.sessions[k] || {}; return `${k}:${s.completed ? 'c' : ''}${s.skipped ? 's' : ''}${s.started ? 'p' : ''}${withinEpoch(s) ? '' : 'x'}`; })
    .filter(x => !x.endsWith(':'))
    .sort().join(',');
  const recovery = _runtime.recovery;                  // RecoveryOutput (or null)
  const level = recovery ? recovery.readinessLevel : null;
  const band = level === 'high' ? 'h' : level === 'moderate' ? 'm' : level === 'low' ? 'l' : 'n';
  const override = recovery ? recovery.sessionOverride : null;   // illness('rest') / travel('easy')
  const ovSig = Object.keys(overrides).filter(inWeeks).map(k => `${k}@${overrides[k].createdAt || 0}`).sort().join(',');
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const load = reverted ? null : _runtime.load;        // LoadOutput (or null when reverted)
  const loadAction = load && load.inputs ? load.inputs.action : 'none';

  // ---- adaptive deload (F9): promote fatigue signals into a TRUE deload on the
  // current week, or DEFER a planned one when the athlete is clearly fresh. ACWR is
  // demoted — it only corroborates (see deloadRecommendation). ----
  const recVals = Object.values(_runtime.sessions)
    .filter(s => s.completed && s.recovery != null && withinEpoch(s))
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, 4).map(s => s.recovery);
  const recentRecovery = recVals.length ? recVals.reduce((a, b) => a + b, 0) / recVals.length : null;
  const cwWeek = g.phases.flatMap(p => p.weeks || []).find(w => w.num === cw) || {};
  const rec = reverted ? { action: 'none', reason: null } : deloadRecommendation({
    loadAction, readiness: recovery ? recovery.score : null, recentRecovery,
    illness: override === 'rest', scheduledDeload: !!cwWeek.deload
  });
  const recBand = recentRecovery == null ? 'n' : recentRecovery <= 2 ? 'l' : recentRecovery >= 4 ? 'h' : 'm';

  // SKB decision rules (sport-specific) → conservative reflow modifiers for the CURRENT week.
  // Dormant for non-sport profiles and sports whose rules carry no structured trigger/effect.
  const ruleCtx = {
    season: profile.sport ? resolveProgram(profile).season : null,
    readiness: recovery ? recovery.score : null,
    illness: override === 'rest',
    travel: override === 'easy',
    acwr: (load && load.inputs && load.inputs.acwr != null) ? load.inputs.acwr : null,
    competitionWithinH: profile.event_date ? Math.max(0, (new Date(profile.event_date).getTime() - today.getTime()) / 3600000) : null
  };
  const ruleAdj = ruleVolumeAdjustment(profile, ruleCtx);

  const key = `${_cache.sig}|${cw}|${localISO(today)}|${stateSig}|${band}|${ovSig}|${loadAction}|${recBand}|${rec.action}|${override || ''}|${reverted ? 'r' : ''}|${ruleAdj.ruleIds.join('.')}`;
  if (_adaptCache.key === key) return _adaptCache.phases;

  // Effective deload for a week — the force/defer decision applies to the current week only.
  const effDeload = (week) => {
    if (week.num !== cw) return !!week.deload;
    if (rec.action === 'force' || ruleAdj.forceDeload) return true;
    if (rec.action === 'defer') return false;
    return !!week.deload;
  };

  // ---- rolling ledger: the per-muscle volume MISSED in the trailing window
  // (skipped or past-due, never done) — the concrete shortfall to spread forward ----
  const gctx = gymCtx(profile);
  const { busyDays: sportBusy } = deriveConstraints(profile);
  const gymList = gymSessionsWithDates(g.phases);
  const deficit = missedWindowVolume(gymList, overrides, today);

  // ---- spread across the horizon's pending slots, each carrying its week's share ----
  const slots = horizonSlots(gymList, overrides, today);
  const gymCountByWeek = {};
  gymList.forEach(x => { const k = `${x.phase.id}_${x.week.num}`; gymCountByWeek[k] = (gymCountByWeek[k] || 0) + 1; });
  const slotInputs = slots.map(s => {
    const wt = weekTarget(s.phase, s.week, gctx, effDeload(s.week) || !!s.week.taper);
    const n = gymCountByWeek[`${s.phase.id}_${s.week.num}`] || 1;
    // Use the SAME split as the baseline generator so the reflowed current week keeps
    // its curated structure (an Upper day stays Upper). Sport's split is even, so its
    // share stays wt/n and its sessions are unchanged.
    const day = resolveSplit({ gymDays: n, style: gctx.style })[s.i] || {};
    const weights = day.weights;
    const normalShare = {};
    for (const m of MUSCLE_GROUPS) normalShare[m] = weights ? (wt[m] || 0) * (weights[m] || 0) : (wt[m] || 0) / n;
    return { normalShare, anchors: day.anchors || null, focus: gctx.style === 'sport' ? null : (weights || null) };
  });
  const { perSlot, forgiven } = distributeAcrossSlots({ slots: slotInputs, deficit, windowDays: WINDOW_DAYS });
  _lastForgiven = forgiven;

  // Recovery trims session length; load (ACWR, demoted) gently trims/restores; a
  // travel 'easy' override trims further. Conservative — take the smallest sensible cut.
  let mult = combinedMultiplier(
    recovery ? recovery.volumeModifier : 1,
    { action: loadAction, multiplier: load ? load.loadModifier : 1 }
  );
  if (!reverted && override === 'easy') mult = Math.min(mult, 0.7);
  mult *= ruleAdj.volumeMult;   // sport decision-rule reduction (≤1; conservative — only trims)
  const specByKey = {};
  slots.forEach((s, idx) => {
    const spec = allocateGym({
      targets: perSlot[idx],
      slots: [{ minutes: Math.round(functionalSlotMinutes(gctx.style, gctx.minutes) * mult), equip: gctx.access,
                anchors: slotInputs[idx].anchors, focus: slotInputs[idx].focus }],
      ctx: {
        style: gctx.style, intent: intentOfTitle(s.phase.title), deload: effDeload(s.week), taper: !!s.week.taper,
        weekNum: s.week.num, level: gctx.level, sex: gctx.sex, lifts: gctx.lifts, access: gctx.access,
        bodyweight: gctx.bodyweight, priorityByIntent: gctx.priorityByIntent,
        exercisePriority: gctx.exercisePriority, sport: gctx.sport, power: gctx.power,
        priorityQualities: gctx.priorityQualities, season: gctx.season, skbIds: gctx.skbIds,
        // The slot's baseline identity within its week, so the D11 target-quality
        // rotation matches the weekly builder's (same mechanism as resolveSplit[s.i]
        // above) — without it every single-slot rebuild pinned the same top-priority
        // quality and a runner's explosive days collapsed into the durability day.
        weekGymCount: gymCountByWeek[`${s.phase.id}_${s.week.num}`] || 1, weekSlotIdx: s.i
      }
    })[0];
    if (spec) {
      let built = spec;   // primer is added later by decorateSections (buildPrimer)
      // Lighten a reshaped session that lands on a sport day (JS Sun=0 → Mon=0 index).
      const wd = s.date ? (s.date.getDay() === 0 ? 6 : s.date.getDay() - 1) : null;
      if (wd != null && sportBusy.includes(wd)) built = { ...built, items: lightenItems(built.items), lightened: true };
      specByKey[s.key] = built;
    }
  });

  // ---- rebuild in place: horizon specs + train-now snapshots; everything else as-is ----
  const phases = g.phases.map(phase => {
    if (!phase.weeks || !phase.weeks.some(w => weeksTouched.includes(w.num))) return phase;
    return {
      ...phase,
      weeks: phase.weeks.map(week => {
        if (!weeksTouched.includes(week.num)) return week;
        let changed = false;
        const newSessions = week.sessions.slice();
        const reshapedIdx = new Set();           // sessions the reflow freshly rebuilt this pass
        const swap = (i, focus, duration, items, flag) => {
          const dayPrefix = (newSessions[i].title.split('·')[0] || '').trim();
          newSessions[i] = { ...newSessions[i], title: dayPrefix ? `${dayPrefix} · ${focus}` : focus, duration, items, ...flag };
          changed = true;
        };
        week.sessions.forEach((s, i) => {
          const k = sessionKey(phase.id, week.num, i);
          const ov = overrides[k];
          // A Train Now override is a genuinely on-demand session (show the ADAPTED
          // badge); a pin-on-start override is just the normal session frozen at the
          // moment of starting (no badge — nothing was swapped out from under them).
          if (ov) { swap(i, ov.focus, ov.duration, ov.items, { _trainNow: !ov.pinnedAtStart }); return; }
          const spec = specByKey[k];
          // Carry the reshaped lifts' real axialLoad (not the original slot's) so the
          // cross-day de-spine below reads the right "yesterday was spine-heavy" signal.
          if (spec) { swap(i, spec.focus, spec.duration, spec.items, { _trainNow: false, axialLoad: spec.axialLoad || 0 }); reshapedIdx.add(i); }
        });

        // De-spine the reflowed week, exactly as the baseline generator does after
        // scheduling: where a high-axial day is followed (adjacently) by a training
        // day carrying a high-axial intent lift, swap that lift for the lowest-axial
        // member of its intent. Only the freshly RESHAPED sessions may change; started
        // / Train Now / untouched-baseline sessions are passed as read-only context
        // (deep-cloned) so a heavy "yesterday" still registers without recomputing a
        // session the athlete has committed to — honouring freeze-on-start.
        if (reshapedIdx.size) {
          const forDespine = newSessions.map((s, i) =>
            reshapedIdx.has(i) ? s : { ...s, items: (s.items || []).map(it => ({ ...it })) });
          despineWeek(forDespine, {
            priorityByIntent: gctx.priorityByIntent, lifts: gctx.lifts,
            level: gctx.level, bodyweight: gctx.bodyweight
          });
        }
        // Surface an adaptive deload (or its deferral) on the current week.
        const forceDl = week.num === cw && rec.action === 'force';
        const deferDl = week.num === cw && rec.action === 'defer';
        if (!changed && !forceDl && !deferDl) return week;
        const out = { ...week, sessions: newSessions, _adapted: changed };
        if (forceDl) { out.deload = true; out.autoDeload = true; out.deloadReason = rec.reason; }
        if (deferDl) { out.deload = false; out.deloadDeferred = true; }
        return out;
      })
    };
  });
  _adaptCache = { key, phases };
  return phases;
}

// Per-muscle sets left unscheduled in the last reflow (over the recoverable
// ceiling) — exposed for dev tooling so forgiveness is visible, not silent.
export function lastForgiven() { return _lastForgiven; }

// Split a session into a PRIMER (short activation matched to its main lifts) and the
// MAIN work, tagging every item with its `section` ('primer' | 'main'). The new
// movement-specific primer (data/primers.js) REPLACES any legacy engine activation
// block (the functional P1–P4 primer) so the UI reads a single, consistent primer
// source. Gym sessions only; idempotent — a session that already carries a primer is
// returned untouched, so this can never double-prime. Pure: returns a new session.
function decorateSections(session, access) {
  if (!session || sessionDiscipline(session) !== 'gym') return session;
  const items = session.items || [];
  if (items.some(it => it.section === 'primer')) return session;
  const working = items.filter(it => !/^P\d/.test(it.num || ''));   // drop legacy P1–P4
  const { primer, main } = buildPrimer({ items: working }, { access });
  return { ...session, items: [...primer, ...main] };
}

function decoratePhases(phases, access) {
  return phases.map(phase => ({
    ...phase,
    weeks: (phase.weeks || []).map(week => ({
      ...week,
      sessions: (week.sessions || []).map(s => decorateSections(s, access))
    }))
  }));
}

function injuryFilteredPhases() {
  const phases = adaptedPhases();
  if (!phases) return null;

  const profile = Database.services.getProfile() || {};
  const access = profile.access || [];

  const allInjuries = Database.services.listInjuries();
  const active = allInjuries.filter(i =>
    (i.status === 'active' || i.status === 'rehabbing') && i.body_part_key
  );
  const history = allInjuries.filter(i => i.body_part_key);

  const injured = active.length || history.length;
  const filtered = injured ? phases.map(phase => ({
    ...phase,
    weeks: (phase.weeks || []).map(week => {
      let w = active.length ? applyInjuryRules(week, active) : week;
      w = history.length ? applyPrevention(w, history) : w;
      return w;
    })
  })) : phases;

  // Decorate every gym session with its primer + section tags — done LAST (after
  // injury filtering) so the primer reflects the actual, injury-adjusted main lifts.
  return decoratePhases(filtered, access);
}

function profileSignature(profile) {
  return JSON.stringify({
    f: profile.focus, e: profile.experience, g: profile.goals,
    a: profile.availability, ac: profile.access, p: profile.pool_length_m,
    ss: profile.strength_style, rg: profile.run_goal, sg: profile.swim_goal,
    pr: profile.primary, db: profile.doubles, lrd: profile.long_run_day,
    sup: profile.supplemental_strength, lf: profile.lifts, ll: profile.lift_log,
    bw: profile.bodyweight_kg, sx: profile.sex,
    // Goal fields that drive resolveProgram + resolvePeriodization — without these
    // a goal change (build↔sport, run discipline, season/event) wouldn't regenerate.
    gt: profile.goal_type, sp: profile.sport, si: profile.sport_intent,
    rd: profile.run_discipline, ed: profile.event_date, sps: profile.sport_season,
    spd: profile.sport_days
  });
}

// Returns the generated plan for the current user, or null to use the legacy plan.
function generated() {
  const profile = Database.services.getProfile() || {};
  if (!profile.focus || profile.focus.length === 0) return null;
  const sig = profileSignature(profile);
  if (_cache.sig !== sig) {
    _cache = { sig, plan: generatePlan(profile) };
  }
  return _cache.plan;
}

export function getPhases() {
  // The plan is always generated from the user's own profile/goal — no plan until
  // they've onboarded (the app gates the plan screens behind onboarding).
  return injuryFilteredPhases() || [];
}

export function getPhase(id) {
  const fp = injuryFilteredPhases();
  return fp ? (fp.find(p => p.id === id) || null) : null;
}

export function getWeek(pid, wkNum) {
  const phase = getPhase(pid);
  return phase && phase.weeks ? phase.weeks.find(w => w.num === wkNum) : null;
}

// The CURRENT adapted (reflowed) session for a slot key, BEFORE injury filtering —
// or null. Used at Start to snapshot exactly what the athlete is looking at so that
// starting a session never changes it. We read the pre-injury session (like Train
// Now does) so injury rules still re-apply on top at render time. Key format:
// p{phase}_wk{week}_s{idx}.
export function adaptedSessionByKey(key) {
  const m = /^p(\d+)_wk(\d+)_s(\d+)$/.exec(key || '');
  if (!m) return null;
  const phases = adaptedPhases();
  if (!phases) return null;
  const phase = phases.find(p => p.id === Number(m[1]));
  const week = phase && (phase.weeks || []).find(w => w.num === Number(m[2]));
  return week ? (week.sessions[Number(m[3])] || null) : null;
}

/**
 * First not-yet-completed session across the whole plan — the "up next".
 * @returns {{ phase, week, session, sessionIdx, key }|null}
 */
export function findNextSession(sessions = {}) {
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    if (!full || !full.weeks) continue;
    for (const week of full.weeks) {
      for (let i = 0; i < week.sessions.length; i++) {
        const key = `p${phase.id}_wk${week.num}_s${i}`;
        const st = sessions[key];
        if (!st || !st.completed || !withinEpoch(st)) {
          return { phase, week, session: week.sessions[i], sessionIdx: i, key };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calendar anchoring. Generated plans store plan_start_date at onboarding so we
// can map abstract week numbers onto real dates and surface "today's session".
// Weeks are Monday-aligned to the start date's week. A plan with no start date
// skips all of this and keeps the plain "next incomplete" behaviour.
// ---------------------------------------------------------------------------
const DAY_IDX = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };

function parseISO(s) { const d = new Date(s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }
function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));  // back up to Monday
  return x;
}
function weekdayOfTitle(title) {
  const t = (title || '').toLowerCase();
  for (const k in DAY_IDX) if (t.includes(k)) return DAY_IDX[k];
  return null;
}
function todayMondayIndex() { return (new Date().getDay() + 6) % 7; }

export function getStartDate() {
  const p = Database.services.getProfile() || {};
  return p.plan_start_date ? parseISO(p.plan_start_date) : null;
}

function totalWeeks() {
  // Read the BASELINE plan, never the adapted view: week numbers are identical
  // before/after reflow, and going through getPhases()/adaptedPhases() here would
  // recurse (adaptedPhases → currentWeekNumber → totalWeeks → getPhases → …).
  const g = generated();
  const phases = g ? g.phases : [];
  let max = 0;
  phases.forEach(p => (p.weeks || []).forEach(w => { if (w.num > max) max = w.num; }));
  return max;
}

// Absolute week number for today, or null when there's no start date.
export function currentWeekNumber() {
  const start = getStartDate();
  if (!start) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wk = 1 + Math.floor((today - mondayOf(start)) / (7 * 86400000));
  return Math.max(1, Math.min(totalWeeks() || 1, wk));
}

// Calendar date a given session falls on, from its week number + weekday title.
export function dateForSession(weekNum, title) {
  const start = getStartDate();
  const wi = weekdayOfTitle(title);
  if (!start || wi == null) return null;
  const d = mondayOf(start);
  d.setDate(d.getDate() + (weekNum - 1) * 7 + wi);
  return d;
}

/**
 * The session to surface on "Today". For dated (generated) plans: today's
 * scheduled session in the current week if it isn't done, else the first
 * unfinished session this week, else the next unfinished session anywhere.
 * For legacy plans (no start date) this is just findNextSession.
 * Same return shape as findNextSession.
 */
export function recommendedSession(sessions = {}) {
  if (!getStartDate()) return findNextSession(sessions);
  const cw = currentWeekNumber();

  let target = null;
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    const week = full && full.weeks && full.weeks.find(w => w.num === cw);
    if (week) { target = { phase, week }; break; }
  }

  if (target) {
    const { phase, week } = target;
    const done = (i) => {
      const st = sessions[`p${phase.id}_wk${week.num}_s${i}`];
      return !!(st && st.completed && withinEpoch(st));
    };
    const todayIdx = todayMondayIndex();
    let idx = week.sessions.findIndex((s, i) => weekdayOfTitle(s.title) === todayIdx && !done(i));
    if (idx < 0) idx = week.sessions.findIndex((_, i) => !done(i));  // first unfinished this week
    if (idx >= 0) {
      const key = `p${phase.id}_wk${week.num}_s${idx}`;
      return { phase, week, session: week.sessions[idx], sessionIdx: idx, key };
    }
  }
  // Current week complete (or not found) → next unfinished session anywhere.
  return findNextSession(sessions);
}

// ---------------------------------------------------------------------------
// Calendar — map every session onto its real date + a discipline (for colour).
// ---------------------------------------------------------------------------

// Local YYYY-MM-DD (timezone-safe — avoids the UTC shift toISOString can cause).
export function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Which discipline a session belongs to, from its item tags (drives the colour).
export function sessionDiscipline(s) {
  const tags = new Set((s.items || []).map(it => it.tag).filter(Boolean));
  if (tags.has('swim')) return 'swim';
  if (tags.has('cycle')) return tags.has('run') ? 'brick' : 'cycle';
  if (tags.has('run')) return 'run';
  return 'gym';
}

/**
 * Build a calendar view of the plan: every session keyed by its real date, with
 * completion state + discipline. Returns null for legacy plans with no start
 * date (the home screen then falls back to the next-session card).
 * @returns {{ byDate: { [iso]: Array }, start: Date, end: Date }|null}
 */
export function buildCalendar(sessions = {}) {
  const start = getStartDate();
  if (!start) return null;
  const byDate = {};
  let min = null, max = null;
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    (full && full.weeks ? full.weeks : []).forEach(week => {
      week.sessions.forEach((s, i) => {
        const d = dateForSession(week.num, s.title);
        if (!d) return;
        // Weeks are Monday-aligned, but the plan starts on the chosen date — never
        // show sessions that fall before it (e.g. Mon/Tue of a Thursday start).
        if (d < start) return;
        const iso = localISO(d);
        const key = `p${phase.id}_wk${week.num}_s${i}`;
        const st = sessions[key];
        (byDate[iso] = byDate[iso] || []).push({
          phaseId: phase.id, weekNum: week.num, idx: i, key,
          title: s.title, duration: s.duration,
          completed: !!(st && st.completed),
          skipped: !!(st && st.skipped),
          discipline: sessionDiscipline(s)
        });
        if (!min || d < min) min = d;
        if (!max || d > max) max = d;
      });
    });
  }
  // Sport-day markers — non-clickable badges so the week reads correctly (gym-only
  // app: these mark the athlete's own sport sessions, not generated workouts).
  const profile = Database.services.getProfile() || {};
  const { busyDays: sportBusy } = deriveConstraints(profile);
  if (sportBusy.length && min) {
    const sportDisc = profile.sport === 'run' ? 'run' : profile.sport === 'cycle' ? 'cycle' : profile.sport === 'swim' ? 'swim' : 'general';
    const label = profile.sport === 'run' ? 'Run' : profile.sport === 'cycle' ? 'Ride' : profile.sport === 'swim' ? 'Swim' : 'Sport';
    for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay() === 0 ? 6 : d.getDay() - 1;     // Mon=0 index
      if (!sportBusy.includes(wd)) continue;
      const iso = localISO(d);
      (byDate[iso] = byDate[iso] || []).push({ sportMarker: true, discipline: sportDisc, title: label });
    }
  }
  return min ? { byDate, start: min, end: max } : null;
}

// ---------------------------------------------------------------------------
// "This week" volume progress — the ledger surfaced. Shows, per muscle, how much
// has been BANKED by completed sessions (done), how much the week will total if
// you finish it (planned, from the reflowed sessions), and the ideal TARGET.
// ---------------------------------------------------------------------------
export function weekVolumeProgressFor(phase, week) {
  if (!phase || !week) return null;
  const profile = Database.services.getProfile() || {};
  const gctx = gymCtx(profile);
  const target = weekTarget(phase, week, gctx);

  const completed = [], all = [];
  week.sessions.forEach((s, i) => {
    if (sessionDiscipline(s) !== 'gym') return;
    all.push(s);
    const st = _runtime.sessions[sessionKey(phase.id, week.num, i)];
    if (st && st.completed && withinEpoch(st)) completed.push(s);
  });
  if (!all.length) return null;

  const done = countWeeklyVolume(completed).counts;
  const planned = countWeeklyVolume(all).counts;
  const rows = MUSCLE_GROUPS
    .map(m => ({ muscle: m, done: done[m] || 0, planned: planned[m] || 0, target: target[m] || 0 }))
    .filter(r => r.planned > 0 || r.target > 0);
  const sum = (sel) => Math.round(rows.reduce((a, r) => a + sel(r), 0));
  return {
    weekNum: week.num,
    rows,
    totals: { done: sum(r => r.done), planned: sum(r => r.planned), target: sum(r => r.target) },
    sessionsTotal: all.length,
    sessionsDone: completed.length
  };
}

// Volume progress for the CURRENT week — what Home shows. Null for legacy plans
// (no start date) or weeks with no gym work.
export function currentWeekVolumeProgress() {
  const cw = currentWeekNumber();
  if (cw == null) return null;
  const ap = adaptedPhases();
  if (!ap) return null;
  for (const phase of ap) {
    const week = (phase.weeks || []).find(w => w.num === cw);
    if (week) return weekVolumeProgressFor(phase, week);
  }
  return null;
}

// ---------------------------------------------------------------------------
// On-demand "train now" — one optimal session for the time + equipment you have
// RIGHT NOW, aimed at the week's biggest remaining volume gaps. Same allocator as
// the weekly plan, single slot. Reused by the Train Now screen (and later the AI
// coach as a tool). Pure read of the current profile + live week state.
// ---------------------------------------------------------------------------
// The next gym session this on-demand workout should ADAPT (today's, else the
// next pending one in the current/future weeks). Null for legacy/no-gym plans.
function nextPendingGymTarget() {
  const cw = currentWeekNumber();
  if (cw == null) return null;
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    for (const week of (full && full.weeks ? full.weeks : [])) {
      if (week.num < cw) continue;
      for (let i = 0; i < week.sessions.length; i++) {
        if (sessionDiscipline(week.sessions[i]) !== 'gym') continue;
        const st = _runtime.sessions[sessionKey(phase.id, week.num, i)] || {};
        const settled = withinEpoch(st) && (st.completed || st.skipped);
        if (!settled) {
          return { phaseId: phase.id, weekNum: week.num, idx: i, key: sessionKey(phase.id, week.num, i) };
        }
      }
    }
  }
  return null;
}

export function generateTrainNow({ minutes = 45, equip = [] } = {}) {
  const profile = Database.services.getProfile() || {};
  const gctx = gymCtx(profile);
  const equipArr = (equip && equip.length) ? equip : gctx.access;

  // The biggest gaps RIGHT NOW = volume MISSED across the trailing window. If
  // nothing's owed you're on track, so this becomes a balanced bonus session
  // toward the current week's target. Same ledger the weekly reflow uses.
  let weeklyTgt = null, missed = {}, intent = 'base';
  const cw = currentWeekNumber();
  if (cw != null) {
    const g = generated();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let phase = null, week = null;
    for (const p of (g ? g.phases : [])) { const w = (p.weeks || []).find(w => w.num === cw); if (w) { phase = p; week = w; break; } }
    if (phase && week) {
      intent = intentOfTitle(phase.title);
      weeklyTgt = weekTarget(phase, week, gctx);
      missed = missedWindowVolume(gymSessionsWithDates(g.phases), getOverrides(), today);
    }
  }
  if (!weeklyTgt) weeklyTgt = weeklyMuscleTargets({ style: gctx.style, intent, level: gctx.level, weekInPhase: 1, phaseWeeks: 1 });

  // On track (nothing meaningful missed) → balanced bonus toward the week target.
  const totalMissed = Object.values(missed).reduce((a, b) => a + (b || 0), 0);
  const bonus = totalMissed <= 5;
  const fillTarget = bonus ? weeklyTgt : missed;

  const specs = allocateGym({
    targets: fillTarget,
    slots: [{ minutes: functionalSlotMinutes(gctx.style, minutes), equip: equipArr }],
    // Same ctx shape the weekly plan + reflow use (gymCtx) — including the D11 fields
    // (sport/power/priorityQualities/season/skbIds), so a run/cycle athlete's on-demand
    // session is selected by the same diagnosis-driven brain as their plan, not the
    // legacy muscle-deficit fill. Build profiles have no priorityQualities, so the D11
    // gate can't fire for them and their Train Now output is unchanged.
    ctx: { style: gctx.style, intent, deload: false, weekNum: cw || 1, level: gctx.level, sex: gctx.sex, lifts: gctx.lifts, access: equipArr, bodyweight: gctx.bodyweight, exercisePriority: gctx.exercisePriority, priorityByIntent: gctx.priorityByIntent, sport: gctx.sport, power: gctx.power, priorityQualities: gctx.priorityQualities, season: gctx.season, skbIds: gctx.skbIds }
  });
  const session = specs[0] || { discipline: 'gym', focus: 'Session', duration: `~${minutes} min`, items: [] };
  return { session: decorateSections(session, equipArr), why: buildWhy(session, bonus, minutes), target: nextPendingGymTarget(), minutes, equip: equipArr };
}

// Plain-language rationale shown with an on-demand session.
function buildWhy(session, bonus, minutes) {
  const vol = countWeeklyVolume([session]).counts;
  const top = MUSCLE_GROUPS.filter(m => vol[m] > 0).sort((a, b) => vol[b] - vol[a]).slice(0, 3)
    .map(m => MUSCLE_LABELS[m].toLowerCase());
  const muscles = top.length > 1 ? `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}` : (top[0] || 'full body');
  const lead = bonus
    ? "You're on track across the last few days, so this is a balanced bonus session"
    : "Built around the muscle groups you're furthest behind on";
  return `${lead} — it leans into ${muscles}. Fitted to ~${Math.round(minutes / 5) * 5} min with the kit you picked, at your usual rep ranges and RPE.`;
}

export default { getPhases, getPhase, getWeek, adaptedSessionByKey, findNextSession, recommendedSession, currentWeekNumber, dateForSession, getStartDate, buildCalendar, localISO, setRuntime, currentAdaptation, weekVolumeProgressFor, currentWeekVolumeProgress, generateTrainNow, sessionDiscipline, lastForgiven };
