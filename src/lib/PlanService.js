/**
 * PlanService — the single entry point screens use for plan content.
 *
 * It mirrors the public API of src/data/Plan.js (getPhases, getPhase, getWeek,
 * findNextSession) but chooses the source per user:
 *
 *   • Onboarded users (profile.focus set) → a plan generated from their answers
 *     by PlanGenerator. This is what makes plans per-user.
 *   • Everyone else (e.g. the original hand-built plan, pre-onboarding state) →
 *     the legacy static Plan.js ("hybrid_v1"), unchanged.
 *
 * Generation is a pure function of the profile, so we memoise on a signature of
 * the relevant fields and only regenerate when they change. Session keys follow
 * the same p{phase}_wk{week}_s{idx} scheme either way, so completion state maps
 * correctly regardless of source.
 *
 * Screens import THIS instead of data/Plan.js. When the AI coach lands (Stage 5)
 * it edits the generated plan (or a persisted copy) behind this same interface.
 */

import Database from './Database.js';
import * as Legacy from '../data/Plan.js';
import { generatePlan } from './PlanGenerator.js';
import { weeklyMuscleTargets } from './strength/targets.js';
import { allocateGym } from './plan/allocator.js';
import { countWeeklyVolume } from './plan/volume.js';
import { resolveLifts } from './liftProgression.js';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../data/muscleVolume.js';
import { getOverrides } from './sessionOverrides.js';
import { applyInjuryRules, applyPrevention } from './injury/injuryFilter.js';
import { combinedMultiplier } from './plan/trainingLoad.js';

let _cache = { sig: null, plan: null };

// ---------------------------------------------------------------------------
// Adaptive reflow runtime. The plan is a pure projection; the CURRENT week
// reflows around what's actually been done + how recovered the athlete is. The
// store keeps this runtime fresh (setRuntime in trainingStore.buildView) so the
// reflow can read live completion + readiness without changing any screen's
// call signature. Future/past weeks are never touched — only the current week.
// ---------------------------------------------------------------------------
let _runtime = { sessions: {}, readiness: null, loadDecision: null };
let _adaptCache = { key: null, phases: null };

export function setRuntime(rt = {}) {
  _runtime = {
    sessions: rt.sessions || {},
    readiness: rt.readiness ?? null,
    loadDecision: rt.loadDecision ?? null
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
  const d = _runtime.loadDecision;
  if (reverted) {
    return (d && d.action && d.action !== 'none')
      ? { action: 'reverted', reason: 'Following the plan (you reverted this week)', reverted: true, week: cw }
      : null;
  }
  if (!d || !d.action || d.action === 'none') return null;
  return { action: d.action, reason: d.reason, reverted: false, week: cw };
}

// Tired → trim the remaining volume; recovered → fill it in full.
function readinessMult(score) {
  if (score == null) return 1;
  if (score >= 70) return 1;
  if (score >= 50) return 0.9;
  return 0.78;
}

// Gym programming context derived from the profile (mirrors PlanGenerator).
function gymCtx(profile) {
  const style = profile.strength_style
    || ((profile.focus || []).includes('strength_physique') ? 'bodybuilding' : 'functional');
  const e = profile.experience || {};
  const level = e.gym || e.strength_functional || e.strength_physique || 'beginner';
  const minutes = (profile.availability && profile.availability.session_minutes) || 60;
  return { style, level, minutes, access: profile.access || [], sex: profile.sex, lifts: resolveLifts(profile) };
}

const intentOfTitle = (title) => {
  const t = (title || '').toLowerCase();
  return t.includes('peak') ? 'peak' : t.includes('build') ? 'build' : 'base';
};

const sessionKey = (phaseId, weekNum, idx) => `p${phaseId}_wk${weekNum}_s${idx}`;

// This week's per-muscle set target (the "training debt").
function weekTarget(phase, week, gctx) {
  return weeklyMuscleTargets({
    style: gctx.style, intent: intentOfTitle(phase.title), level: gctx.level,
    weekInPhase: week.num - phase.weekStart + 1,
    phaseWeeks: phase.weekEnd - phase.weekStart + 1, deload: !!week.deload
  });
}

/**
 * Reflow ONE week's incomplete gym sessions to fill the volume still owed, scaled
 * by readiness. Completed sessions (and all non-gym sessions) are returned
 * untouched, in place — so completion keys (p{phase}_wk{week}_s{idx}) stay valid.
 */
function reflowWeek(phase, week, sessionsState, readiness, profile, overrides = {}, loadDecision = null) {
  const gym = [];
  week.sessions.forEach((s, i) => { if (sessionDiscipline(s) === 'gym') gym.push({ i, s }); });
  if (!gym.length) return week;

  const stOf = (i) => sessionsState[sessionKey(phase.id, week.num, i)] || {};
  const ovOf = (i) => overrides[sessionKey(phase.id, week.num, i)] || null;

  // A "train now" override pins a session to a fixed snapshot — committed, never
  // reflowed. Otherwise, only genuinely-pending sessions reflow; completed /
  // started / missed are settled and their content is locked.
  const incomplete = gym.filter(g => {
    const st = stOf(g.i);
    return !ovOf(g.i) && !st.completed && !st.skipped && !st.started;
  });
  const hasOverride = gym.some(g => ovOf(g.i));
  if (!incomplete.length && !hasOverride) return week;   // nothing to (re)plan

  const gctx = gymCtx(profile);
  const target = weekTarget(phase, week, gctx);

  // Committed volume = completed + started work + every override snapshot. A
  // MISSED (skipped) session banks nothing — its volume stays "owed" and the
  // pending sessions below recover what they can toward the goal.
  const committed = [];
  gym.forEach(g => {
    const ov = ovOf(g.i); const st = stOf(g.i);
    if (st.skipped) return;                       // missed banks nothing, override or not
    if (ov) committed.push({ items: ov.items });  // a pinned train-now session is committed
    else if (st.completed || st.started) committed.push(g.s);
  });
  const done = countWeeklyVolume(committed).counts;

  const remaining = {};
  for (const m of MUSCLE_GROUPS) remaining[m] = Math.max(0, (target[m] || 0) - (done[m] || 0));

  // Readiness trims remaining sessions; training load (acute:chronic) trims them
  // further (ease/deload) or restores them (nudge_up). Combined conservatively.
  const mult = combinedMultiplier(readinessMult(readiness), loadDecision || { action: 'none', multiplier: 1 });
  let specs = [];
  if (incomplete.length) {
    const slots = incomplete.map(() => ({ minutes: Math.round(gctx.minutes * mult), equip: gctx.access }));
    specs = allocateGym({
      targets: remaining, slots,
      ctx: {
        style: gctx.style, intent: intentOfTitle(phase.title), deload: !!week.deload,
        weekNum: week.num, level: gctx.level, sex: gctx.sex, lifts: gctx.lifts, access: gctx.access
      }
    });
  }

  // Rebuild in place, preserving each session's weekday prefix + array position
  // (= its completion key). Overrides take their snapshot; pending take the reflow.
  const newSessions = week.sessions.slice();
  const swap = (i, focus, duration, items, flag) => {
    const dayPrefix = (newSessions[i].title.split('·')[0] || '').trim();
    newSessions[i] = { ...newSessions[i], title: dayPrefix ? `${dayPrefix} · ${focus}` : focus, duration, items, ...flag };
  };
  gym.forEach(g => { const ov = ovOf(g.i); if (ov) swap(g.i, ov.focus, ov.duration, ov.items, { _trainNow: true }); });
  incomplete.forEach((g, k) => { const spec = specs[k]; if (spec) swap(g.i, spec.focus, spec.duration, spec.items, { _trainNow: false }); });
  return { ...week, sessions: newSessions, _adapted: true };
}

// The plan phases with the current week reflowed (memoised on completion +
// readiness so it only recomputes when those actually change). Returns null when
// there's no generated plan (legacy plans don't reflow).
function adaptedPhases() {
  const g = generated();
  if (!g) return null;
  const cw = currentWeekNumber();
  if (cw == null) return g.phases;               // no start date → no reflow

  // Signature of every current-week session's settled state (completed/skipped/
  // started) — reflow output depends on all three, so recompute when any change.
  const stateSig = Object.keys(_runtime.sessions)
    .filter(k => k.includes(`_wk${cw}_`))
    .map(k => { const s = _runtime.sessions[k] || {}; return `${k}:${s.completed ? 'c' : ''}${s.skipped ? 's' : ''}${s.started ? 'p' : ''}`; })
    .filter(x => !x.endsWith(':'))
    .sort().join(',');
  const band = _runtime.readiness == null ? 'n'
    : _runtime.readiness >= 70 ? 'h' : _runtime.readiness >= 50 ? 'm' : 'l';
  // Train-now overrides also drive the reflow — recompute when one is set/cleared.
  const overrides = getOverrides();
  const ovSig = Object.keys(overrides)
    .filter(k => k.includes(`_wk${cw}_`))
    .map(k => `${k}@${overrides[k].createdAt || 0}`)
    .sort().join(',');
  const profile = Database.services.getProfile() || {};
  const reverted = !!(profile.load_overrides && profile.load_overrides[cw] === 'plan');
  const decision = reverted ? null : _runtime.loadDecision;
  const loadBand = decision && decision.action ? decision.action : 'none';
  const key = `${_cache.sig}|${cw}|${stateSig}|${band}|${ovSig}|${loadBand}|${reverted ? 'r' : ''}`;
  if (_adaptCache.key === key) return _adaptCache.phases;

  const phases = g.phases.map(phase => {
    if (!phase.weeks || !phase.weeks.some(w => w.num === cw)) return phase;
    return {
      ...phase,
      weeks: phase.weeks.map(w =>
        w.num === cw ? reflowWeek(phase, w, _runtime.sessions, _runtime.readiness, profile, overrides, decision) : w)
    };
  });
  _adaptCache = { key, phases };
  return phases;
}

function injuryFilteredPhases() {
  const phases = adaptedPhases();
  if (!phases) return null;

  const allInjuries = Database.services.listInjuries();
  const active = allInjuries.filter(i =>
    (i.status === 'active' || i.status === 'rehabbing') && i.body_part_key
  );
  const history = allInjuries.filter(i => i.body_part_key);

  if (!active.length && !history.length) return phases;

  return phases.map(phase => ({
    ...phase,
    weeks: (phase.weeks || []).map(week => {
      let w = active.length ? applyInjuryRules(week, active) : week;
      w = history.length ? applyPrevention(w, history) : w;
      return w;
    })
  }));
}

function profileSignature(profile) {
  return JSON.stringify({
    f: profile.focus, e: profile.experience, g: profile.goals,
    a: profile.availability, ac: profile.access, p: profile.pool_length_m,
    ss: profile.strength_style, rg: profile.run_goal, sg: profile.swim_goal,
    pr: profile.primary, db: profile.doubles, lrd: profile.long_run_day,
    sup: profile.supplemental_strength, lf: profile.lifts, ll: profile.lift_log,
    bw: profile.bodyweight_kg, sx: profile.sex
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
  const fp = injuryFilteredPhases();
  return fp ? fp : Legacy.getPhases();
}

export function getPhase(id) {
  const fp = injuryFilteredPhases();
  if (fp) return fp.find(p => p.id === id) || null;
  return Legacy.getPhase(id);
}

export function getWeek(pid, wkNum) {
  const phase = getPhase(pid);
  return phase && phase.weeks ? phase.weeks.find(w => w.num === wkNum) : null;
}

/**
 * First not-yet-completed session across the whole plan — the "up next".
 * Same contract as Plan.findNextSession.
 * @returns {{ phase, week, session, sessionIdx, key }|null}
 */
export function findNextSession(sessions = {}) {
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    if (!full || !full.weeks) continue;
    for (const week of full.weeks) {
      for (let i = 0; i < week.sessions.length; i++) {
        const key = `p${phase.id}_wk${week.num}_s${i}`;
        if (!sessions[key] || !sessions[key].completed) {
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
// Weeks are Monday-aligned to the start date's week. Legacy plans (no start
// date) skip all of this and keep the plain "next incomplete" behaviour.
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
  const phases = g ? g.phases : Legacy.getPhases();
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
    const done = (i) => sessions[`p${phase.id}_wk${week.num}_s${i}`] &&
                        sessions[`p${phase.id}_wk${week.num}_s${i}`].completed;
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
    if (st && st.completed) completed.push(s);
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
        if (!st.completed && !st.skipped) {
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

  // Current week's gap (target − banked) when there's a live plan; else a fresh target.
  let target = null, done = {}, intent = 'base';
  const cw = currentWeekNumber();
  if (cw != null) {
    const ap = adaptedPhases();
    let phase = null, week = null;
    for (const p of ap || []) { const w = (p.weeks || []).find(w => w.num === cw); if (w) { phase = p; week = w; break; } }
    if (phase && week) {
      intent = intentOfTitle(phase.title);
      target = weekTarget(phase, week, gctx);
      const banked = [];
      week.sessions.forEach((s, i) => {
        if (sessionDiscipline(s) !== 'gym') return;
        const st = _runtime.sessions[sessionKey(phase.id, week.num, i)] || {};
        if (st.completed || st.started) banked.push(s);
      });
      done = countWeeklyVolume(banked).counts;
    }
  }
  if (!target) target = weeklyMuscleTargets({ style: gctx.style, intent, level: gctx.level, weekInPhase: 1, phaseWeeks: 1 });

  const remaining = {};
  for (const m of MUSCLE_GROUPS) remaining[m] = Math.max(0, (target[m] || 0) - (done[m] || 0));
  // Week basically met → this is a balanced BONUS session rather than nothing.
  const totalRem = Object.values(remaining).reduce((a, b) => a + b, 0);
  const bonus = totalRem <= 5;
  const fillTarget = bonus ? target : remaining;

  const specs = allocateGym({
    targets: fillTarget,
    slots: [{ minutes, equip: equipArr }],
    ctx: { style: gctx.style, intent, deload: false, weekNum: cw || 1, level: gctx.level, sex: gctx.sex, lifts: gctx.lifts, access: equipArr }
  });
  const session = specs[0] || { discipline: 'gym', focus: 'Session', duration: `~${minutes} min`, items: [] };
  return { session, why: buildWhy(session, bonus, minutes), target: nextPendingGymTarget(), minutes, equip: equipArr };
}

// Plain-language rationale shown with an on-demand session.
function buildWhy(session, bonus, minutes) {
  const vol = countWeeklyVolume([session]).counts;
  const top = MUSCLE_GROUPS.filter(m => vol[m] > 0).sort((a, b) => vol[b] - vol[a]).slice(0, 3)
    .map(m => MUSCLE_LABELS[m].toLowerCase());
  const muscles = top.length > 1 ? `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}` : (top[0] || 'full body');
  const lead = bonus
    ? "You're on track for the week, so this is a balanced bonus session"
    : 'Built around the muscle groups furthest behind this week';
  return `${lead} — it leans into ${muscles}. Fitted to ~${Math.round(minutes / 5) * 5} min with the kit you picked, at your usual rep ranges and RPE.`;
}

export default { getPhases, getPhase, getWeek, findNextSession, recommendedSession, currentWeekNumber, dateForSession, getStartDate, buildCalendar, localISO, setRuntime, currentAdaptation, weekVolumeProgressFor, currentWeekVolumeProgress, generateTrainNow, sessionDiscipline };
