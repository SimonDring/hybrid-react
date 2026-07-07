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
import {
  generatePlan, SESSION_CEILING_MIN, resolveProgram, countWeeklyVolume, resolveLifts,
  MUSCLE_GROUPS, MUSCLE_LABELS, applyInjuryRules, applyPrevention, deloadRecommendation,
  ruleVolumeAdjustment, deriveConstraints, buildPrimer, performanceModelForProfile,
  profileToAthleteModel, kb, sportKnowledge as SKB, applyTeamSchedule, validateWeek
} from '@performance-os/engine';
import * as reflowLib from '@performance-os/engine/lib/plan/reflow.js';
import { getOverrides } from './sessionOverrides.js';
import { getTeamSchedule } from './teamScheduleCache.js';

let _cache = { sig: null, plan: null };

// THE profile seam: every read below sees the athlete's profile WITH their
// team's coach-set schedule applied as constraints (matches block, sport days
// soft-avoided, gated fixture taper — engine applyTeamSchedule, pure). With no
// team schedule the SAME object comes back, so signatures/memos are untouched.
// asOf = plan_start_date (never the clock — Art 18).
function activeProfile() {
  const raw = Database.services.getProfile() || {};
  return applyTeamSchedule(raw, getTeamSchedule(), raw.plan_start_date || null);
}

// ---------------------------------------------------------------------------
// Adaptive reflow runtime. The plan is a pure projection; the CURRENT week
// reflows around what's actually been done + how recovered the athlete is. The
// store keeps this runtime fresh (setRuntime in trainingStore.buildView) so the
// reflow can read live completion + readiness without changing any screen's
// call signature. Future/past weeks are never touched — only the current week.
// ---------------------------------------------------------------------------
// recovery = RecoveryOutput (src/lib/recovery), load = LoadOutput (src/lib/load) —
// the store computes both each buildView and the reflow consumes the contracts here.
// L3 contract (TAS §4.1, WP-24c): the orchestrator holds NO mutable coaching state.
// The store supplies an immutable runtime SNAPSHOT — swapped whole on every
// setRuntime, frozen so nothing can mutate it in place. Every read goes through
// runtime(); the external setRuntime signature is unchanged (store + tests).
let _snapshot = Object.freeze({ sessions: Object.freeze({}), recovery: null, load: null });
const runtime = () => _snapshot;
let _adaptCache = { key: null, phases: null };
let _lastForgiven = null;   // per-muscle sets left unscheduled last reflow (over the safe ceiling)

export function setRuntime(rt = {}) {
  _snapshot = Object.freeze({
    sessions: rt.sessions || {},
    recovery: rt.recovery ?? null,
    load: rt.load ?? null
  });
}

// The active load adaptation for the current week, for the UI banner. Returns
// null when there's no live adaptation. `reverted` = the user pinned this week to
// the plan (load ignored; readiness still applies).
export function currentAdaptation() {
  const cw = currentWeekNumber();
  if (cw == null) return null;
  const profile = activeProfile();
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const load = runtime().load;
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
  const skbIds = skbSportId ? new Map((SKB.section(skbSportId, 'exerciseLibrary')?.exercises || []).map((e) => [e.id, e.transferToSportRating])) : new Map();
  return {
    style: program.style, level, minutes,
    access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile),
    bodyweight: profile.bodyweight_kg,
    emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    exercisePriority: program.exercisePriority || [], priorityByIntent: program.priorityByIntent || new Map(),
    sport: profile.sport || null, power: !!program.power,
    priorityQualities: (perf && perf.priorityAdaptations) || [], season: program.season, skbIds,
    skbSportId, discipline: program.discipline || null,
    // WP-49 follow-up: the Olympic athlete's competed lift, so the reflow keeps the SAME day
    // emphasis (snatch/C&J/squat sequence) the baseline built. Ignored off-olympic.
    competedLift: profile.olympic_lift || 'both'
  };
}

// The reflow LEDGER lives in the engine (WP-24a — @performance-os/engine/lib/plan/
// reflow.js); this file binds Database/_runtime state + the calendar onto it.
const intentOfTitle = reflowLib.intentOfTitle;
const sessionKey = reflowLib.sessionKey;
const epochStartISO = () => { const st = getStartDate(); return st ? localISO(st) : null; };

// A settled session (completed/started/skipped) only counts toward the CURRENT
// plan if it was acted on within this plan's epoch — i.e. created on/after the
// plan's start date. Session completion is keyed by POSITION (p1_wk1_s0…), so
// after "clear plan & start over" the old rows survive as history but reuse the
// same keys; without this guard they'd silently mark the new plan's identical
// slots done/missed and trigger a phantom catch-up. A plan with no start date has
// no epoch, so everything counts (defensive fallback).
export function withinEpoch(st) {
  return reflowLib.withinEpoch(st, epochStartISO());
}

// This week's per-muscle set target (the "training debt") — engine-owned.
function weekTarget(phase, week, gctx, deloadOverride) {
  return reflowLib.weekTarget({ phase, week, gctx, deloadOverride, totalWeeks: totalWeeks() });
}

// All gym sessions across the plan, each with its real scheduled date + key. Reads
// BASELINE items — completed/locked sessions are never reflowed, so their baseline
// items equal what was actually done, which is what the rolling ledger counts.
function gymSessionsWithDates(phases) {
  return reflowLib.gymSessionsWithDates(phases, dateForSession);
}

// Per-muscle baseline volume of gym sessions in the trailing window that were
// MISSED — skipped, or past their date and never completed/started — and that
// belong to the current plan (on/after its start date, in-epoch). This concrete
// shortfall is what the upcoming sessions recover (spread + capped); using it
// instead of "window target − banked" avoids double-counting normal forward
// programming (which the per-slot normal share already covers).
function missedWindowVolume(gymList, overrides, today) {
  return reflowLib.missedWindowVolume(gymList, overrides, today,
    { sessions: runtime().sessions, start: getStartDate(), startISO: epochStartISO() });
}

// Pending gym slots whose scheduled date falls in [today, today + WINDOW_DAYS] —
// the sessions we may (re)shape now. Settled (completed/started/skipped in-epoch)
// and pinned slots are excluded; they're locked. Returned in date order.
function horizonSlots(gymList, overrides, today) {
  return reflowLib.horizonSlots(gymList, overrides, today,
    { sessions: runtime().sessions, startISO: epochStartISO() });
}

/**
 * Adaptive plan view. The plan is a pure projection; we reshape only the PENDING
 * gym sessions inside a rolling WINDOW_DAYS horizon (current week + the start of
 * next) so volume you're behind on is spread smoothly across them — capped per
 * session, with anything past the recoverable ceiling forgiven (never crammed,
 * never silently dropped). Completed / started / missed / pinned
 * sessions, all non-gym sessions, and everything outside the horizon are returned
 * untouched, in place — so completion keys (p{phase}_wk{week}_s{idx}) stay valid.
 * Returns null for legacy plans (no start date → no reflow).
 */
function adaptedPhases() {
  const g = generated();
  if (!g) return null;
  const cw = currentWeekNumber();
  if (cw == null) return g.phases;

  const profile = activeProfile();
  const overrides = getOverrides();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weeksTouched = [cw, cw + 1];               // the horizon spans at most two weeks

  // ---- memo key: recompute when settled state, readiness, load, overrides, the
  // generated plan, or the DAY (the rolling window slides) changes ----
  const inWeeks = (k) => weeksTouched.some(w => k.includes(`_wk${w}_`));
  const stateSig = Object.keys(runtime().sessions)
    .filter(inWeeks)
    .map(k => { const s = runtime().sessions[k] || {}; return `${k}:${s.completed ? 'c' : ''}${s.skipped ? 's' : ''}${s.started ? 'p' : ''}${withinEpoch(s) ? '' : 'x'}`; })
    .filter(x => !x.endsWith(':'))
    .sort().join(',');
  const recovery = runtime().recovery;                  // RecoveryOutput (or null)
  const level = recovery ? recovery.readinessLevel : null;
  const band = level === 'high' ? 'h' : level === 'moderate' ? 'm' : level === 'low' ? 'l' : 'n';
  const override = recovery ? recovery.sessionOverride : null;   // illness('rest') / travel('easy')
  const ovSig = Object.keys(overrides).filter(inWeeks).map(k => `${k}@${overrides[k].createdAt || 0}`).sort().join(',');
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const load = reverted ? null : runtime().load;        // LoadOutput (or null when reverted)
  const loadAction = load && load.inputs ? load.inputs.action : 'none';

  // ---- adaptive deload (F9): promote fatigue signals into a TRUE deload on the
  // current week, or DEFER a planned one when the athlete is clearly fresh. ACWR is
  // demoted — it only corroborates (see deloadRecommendation). ----
  const recentRecovery = reflowLib.recentSessionRecovery(runtime().sessions, epochStartISO());
  const cwWeek = g.phases.flatMap(p => p.weeks || []).find(w => w.num === cw) || {};
  const rec = reverted ? { action: 'none', reason: null } : deloadRecommendation({
    loadAction, readiness: recovery ? recovery.score : null, recentRecovery,
    illness: override === 'rest', scheduledDeload: !!cwWeek.deload
  });
  // Memo-key band mirrors deloadRecommendation's cut-points — read from the same
  // KB entry so the mirror can't drift from the decision it caches for.
  const _dt = kb.value('recovery.deload_thresholds');
  const recBand = recentRecovery == null ? 'n' : recentRecovery <= _dt.recoveryPoor ? 'l' : recentRecovery >= _dt.recoveryFresh ? 'h' : 'm';

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

  // Constraints-first injuries (WP-13): D11 selection avoids contraindicated
  // patterns up front, so the reflow's output depends on the athlete's active
  // injuries — they join the memo key and the allocator ctx. The render-time
  // injury filter stays as the backstop on every path.
  const activeInjuries = Database.services.listActiveInjuries().filter(i => i.body_part_key);
  const injSig = activeInjuries.map(i => `${i.body_part_key}.${i.severity || 3}.${i.rehab_phase || ''}`).sort().join(',');

  const key = `${_cache.sig}|${cw}|${localISO(today)}|${stateSig}|${band}|${ovSig}|${loadAction}|${recBand}|${rec.action}|${override || ''}|${reverted ? 'r' : ''}|${ruleAdj.ruleIds.join('.')}|inj:${injSig}`;
  if (_adaptCache.key === key) return _adaptCache.phases;

  // WP-24b: the reflow POLICY is pure engine code (reflowLib.reflowPhases). This
  // orchestrator only gathers state, keys the memo (from the same engine-derived
  // signals the policy uses — rec/ruleAdj above — so key and policy cannot drift),
  // delegates, and caches. `load` is already nulled when the athlete reverted.
  const { phases, forgiven } = reflowLib.reflowPhases({
    phases: g.phases, currentWeek: cw, today, gctx: gymCtx(profile), profile,
    sessions: runtime().sessions, recovery, load, reverted, overrides, activeInjuries,
    dateFor: dateForSession, totalWeeks: totalWeeks(),
    startDate: getStartDate(), startISO: epochStartISO(),
  });
  _lastForgiven = forgiven;
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

// WP-39: D14 runs on the SHIPPED artefact, not just the pure baseline. Every week the
// athlete can read carries a ValidationReport computed over the reflowed + injury-filtered
// content with their ACTIVE injuries in context — report-only (nothing is reshaped here;
// construction proposes, validation proves). Memoised per adapted-week identity: the
// adaptedPhases memo returns stable week objects until runtime state changes, so a
// WeakMap keyed on them re-validates only when the reflow (or the injury set) moved.
const _weekValidation = new WeakMap();
function shippedValidation(adaptedWeek, shippedWeek, access, active) {
  const sig = JSON.stringify([access, active.map(i => [i.body_part_key, i.severity, i.rehab_phase, i.status])]);
  const hit = _weekValidation.get(adaptedWeek);
  if (hit && hit.sig === sig) return hit.report;
  const report = validateWeek(shippedWeek, { access, injuries: active });
  _weekValidation.set(adaptedWeek, { sig, report });
  return report;
}

function injuryFilteredPhases() {
  const phases = adaptedPhases();
  if (!phases) return null;

  const profile = activeProfile();
  const access = profile.access || [];

  const allInjuries = Database.services.listInjuries();
  const active = allInjuries.filter(i =>
    (i.status === 'active' || i.status === 'rehabbing') && i.body_part_key
  );
  const history = allInjuries.filter(i => i.body_part_key);

  const filtered = phases.map(phase => ({
    ...phase,
    weeks: (phase.weeks || []).map(week => {
      let w = active.length ? applyInjuryRules(week, active) : week;
      w = history.length ? applyPrevention(w, history) : w;
      const _validation = shippedValidation(week, w, access, active);
      return w === week ? { ...week, _validation } : { ...w, _validation };
    })
  }));

  // Decorate every gym session with its primer + section tags — done LAST (after
  // injury filtering) so the primer reflects the actual, injury-adjusted main lifts.
  return decoratePhases(filtered, access);
}

function profileSignature(profile) {
  return JSON.stringify({
    f: profile.focus, e: profile.experience, g: profile.goals,
    a: profile.availability, ac: profile.access, p: profile.pool_length_m,
    ss: profile.strength_style, ol: profile.olympic_lift, rg: profile.run_goal, sg: profile.swim_goal,
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
  const profile = activeProfile();
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
  const p = activeProfile();
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
export const localISO = reflowLib.localISO;

// Which discipline a session belongs to, from its item tags (drives the colour).
export const sessionDiscipline = reflowLib.sessionDiscipline;

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
  const profile = activeProfile();
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
  const profile = activeProfile();
  const gctx = gymCtx(profile);
  const target = weekTarget(phase, week, gctx);

  const completed = [], all = [];
  week.sessions.forEach((s, i) => {
    if (sessionDiscipline(s) !== 'gym') return;
    all.push(s);
    const st = runtime().sessions[sessionKey(phase.id, week.num, i)];
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
        const st = runtime().sessions[sessionKey(phase.id, week.num, i)] || {};
        const settled = withinEpoch(st) && (st.completed || st.skipped);
        if (!settled) {
          return { phaseId: phase.id, weekNum: week.num, idx: i, key: sessionKey(phase.id, week.num, i) };
        }
      }
    }
  }
  return null;
}

export default { getPhases, getPhase, getWeek, adaptedSessionByKey, findNextSession, recommendedSession, currentWeekNumber, dateForSession, getStartDate, buildCalendar, localISO, setRuntime, currentAdaptation, weekVolumeProgressFor, currentWeekVolumeProgress, sessionDiscipline, lastForgiven };
