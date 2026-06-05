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

let _cache = { sig: null, plan: null };

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
  const g = generated();
  return g ? g.phases : Legacy.getPhases();
}

export function getPhase(id) {
  const g = generated();
  if (g) return g.phases.find(p => p.id === id) || null;
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
  let max = 0;
  getPhases().forEach(p => (p.weeks || []).forEach(w => { if (w.num > max) max = w.num; }));
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
function sessionDiscipline(s) {
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
  if (!getStartDate()) return null;
  const byDate = {};
  let min = null, max = null;
  for (const phase of getPhases()) {
    const full = getPhase(phase.id);
    (full && full.weeks ? full.weeks : []).forEach(week => {
      week.sessions.forEach((s, i) => {
        const d = dateForSession(week.num, s.title);
        if (!d) return;
        const iso = localISO(d);
        const key = `p${phase.id}_wk${week.num}_s${i}`;
        const st = sessions[key];
        (byDate[iso] = byDate[iso] || []).push({
          phaseId: phase.id, weekNum: week.num, idx: i, key,
          title: s.title, duration: s.duration,
          completed: !!(st && st.completed),
          discipline: sessionDiscipline(s)
        });
        if (!min || d < min) min = d;
        if (!max || d > max) max = d;
      });
    });
  }
  return min ? { byDate, start: min, end: max } : null;
}

export default { getPhases, getPhase, getWeek, findNextSession, recommendedSession, currentWeekNumber, dateForSession, getStartDate, buildCalendar, localISO };
