/**
 * PlanGenerator — turns a user's onboarding profile into a full training plan,
 * in the exact shape the screens render (see src/data/Plan.js):
 *
 *   generatePlan(profile) → { phases: [ { id, title, range, weeks: [...] } ] }
 *
 * Architecture (a science-backed assembler, not a black box):
 *   1. Size the plan to the soonest dated goal (clamped 4–24 weeks; default 12).
 *   2. Split it into 1–3 periodised phases (Base → Build → Peak).
 *   3. Each week, ask each discipline engine to build its sessions:
 *        gym  → src/lib/plan/strength.js   (split by gym-days, ~2×/muscle/week)
 *        run  → src/lib/plan/running.js    (80/20, pace targets from a time)
 *        swim → src/lib/plan/swimming.js   (CSS paces, staged technique)
 *        cycle/general → light inline builders below
 *   4. Hand the week's sessions to the scheduler, which lays them onto weekdays
 *      applying concurrent-training rules (spacing hard days, keeping leg work
 *      away from hard runs).
 *   5. Deload every 4th week within a phase.
 *
 * The generator is a pure function of the profile, so the same answers always
 * produce the same plan — and the session keys (p{phase}_wk{week}_s{idx}) stay
 * stable, so completion state keeps mapping. This fixes the old round-robin's
 * three bugs by construction: every chosen sport is programmed, equipment access
 * gates the content, and the goal date drives the length (surfaced in the UI).
 */

import * as strength from './plan/strength.js';
import * as running from './plan/running.js';
import * as swimming from './plan/swimming.js';
import { scheduleWeek } from './plan/scheduler.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
// Sensible rest-spaced defaults when the user didn't pick specific days.
const DEFAULT_DAYS = {
  1: ['wed'], 2: ['mon', 'thu'], 3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'sat'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: [...DAY_ORDER]
};

// ---------------------------------------------------------------------------
// Profile → disciplines + day allocation
// ---------------------------------------------------------------------------

// Map onboarding focus keys → internal discipline keys. Handles the OLD keys
// (strength_functional / strength_physique) so existing testers don't break.
// Exported so the onboarding wizard can derive disciplines for day-allocation.
export function focusToDisciplines(focus = []) {
  const map = {
    gym: ['gym'], strength_functional: ['gym'], strength_physique: ['gym'],
    run: ['run'], swim: ['swim'], cycle: ['cycle'],
    triathlon: ['swim', 'cycle', 'run'], general_health: ['general']
  };
  const out = [];
  focus.forEach(f => (map[f] || []).forEach(d => { if (!out.includes(d)) out.push(d); }));
  return out;
}

// Gym style: explicit field, or inferred from the old focus keys.
function strengthStyle(profile) {
  if (profile.strength_style) return profile.strength_style;
  if ((profile.focus || []).includes('strength_physique')) return 'bodybuilding';
  return 'functional';
}

// Experience level for a discipline, with sensible fall-backs.
function levelFor(discipline, profile) {
  const e = profile.experience || {};
  const direct = {
    gym: e.gym || e.strength_functional || e.strength_physique,
    run: e.run, swim: e.swim, cycle: e.cycle, general: e.general_health
  }[discipline];
  const tri = e.triathlon;
  return direct || (['run', 'swim', 'cycle'].includes(discipline) ? tri : null) || 'beginner';
}

// How many days each discipline gets this week. Uses the user's saved allocation
// when present; otherwise spreads total days across disciplines by priority.
function dayAllocation(profile, disciplines, totalDays) {
  const saved = profile.availability && profile.availability.allocation;
  if (saved && disciplines.some(d => saved[d] > 0)) {
    const out = {};
    disciplines.forEach(d => { if (saved[d] > 0) out[d] = saved[d]; });
    if (Object.keys(out).length) return out;
  }
  // Even split by priority order, remainder to the highest-priority sports.
  const out = {};
  const n = disciplines.length || 1;
  const base = Math.floor(totalDays / n);
  let rem = totalDays - base * n;
  disciplines.forEach(d => { out[d] = base + (rem-- > 0 ? 1 : 0); });
  // Drop any that landed on 0.
  Object.keys(out).forEach(d => { if (out[d] <= 0) delete out[d]; });
  return out;
}

// Choose the weekday slots for `n` sessions, honouring the user's preferred days.
// When a longRunDay is given (running plans) it's guaranteed to be one of them.
function chooseDays(availability, n, longRunDay) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (days.length >= n) days = days.slice(0, n);
  else {
    const def = DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n);
    days = [...new Set([...days, ...def])].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).slice(0, n);
  }
  // Guarantee the long-run day is in the set (swap the last slot for it).
  if (longRunDay && DAY_ORDER.includes(longRunDay) && !days.includes(longRunDay) && n > 0) {
    days[days.length - 1] = longRunDay;
    days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }
  return days.map(d => DAY_NAMES[d]);
}

// Supplemental strength: short support sessions for an endurance athlete who
// did NOT pick the gym. Skipped when gym is already in focus or opted out.
function wantsSupplemental(profile, disciplines) {
  if (disciplines.includes('gym')) return false;
  if (profile.supplemental_strength === false) return false;
  return disciplines.includes('run') || disciplines.includes('swim');
}
function supplementalSpecs(profile, disciplines, ctx) {
  if (!wantsSupplemental(profile, disciplines)) return [];
  const days = (profile.availability && profile.availability.days_per_week) || 3;
  // Single-sport endurance athletes get up to 2; multi-sport (e.g. triathlon)
  // already carry a lot of load, so cap at 1.
  const sportCount = disciplines.filter(d => d !== 'gym').length;
  const count = sportCount >= 2 ? 1 : (days >= 4 ? 2 : 1);
  return strength.buildSupport({
    count,
    for: disciplines.includes('run') ? 'run' : 'swim',
    deload: ctx.deload, access: profile.access || [], weekNum: ctx.weekNum, intent: ctx.intent
  });
}

// ---------------------------------------------------------------------------
// Light builders for disciplines without a dedicated engine yet
// ---------------------------------------------------------------------------
function buildCycleWeek({ count, level, intent, deload, winp }) {
  const endBase = { beginner: 45, returning: 60, intermediate: 75, advanced: 90 }[level] || 60;
  const roles = [];
  for (let i = 0; i < count; i++) roles.push(intent !== 'base' && i === 0 ? 'intervals' : 'endurance');
  return roles.map(role => {
    if (deload) return { discipline: 'cycle', focus: 'Ride — recovery', duration: `${Math.round(endBase * 0.6 / 5) * 5} min`, intensity: 'easy', lowerBody: false,
      items: [{ num: 'C1', name: 'Easy spin', distance: `${Math.round(endBase * 0.6 / 5) * 5} min`, pace: 'Z1–Z2', note: 'deload — light, high cadence', tag: 'cycle' }] };
    if (role === 'intervals') return { discipline: 'cycle', focus: 'Ride — intervals', duration: '50–60 min', intensity: 'hard', lowerBody: false,
      items: [
        { num: 'C1', name: 'Warm-up', distance: '15 min', pace: 'Z1–Z2', note: 'build cadence', tag: 'cycle' },
        { num: 'C2', name: 'Main set', distance: `${4 + Math.min(winp, 4)} × 4 min hard / 3 min easy`, pace: 'Z4', note: 'threshold effort', tag: 'cycle' },
        { num: 'C3', name: 'Cool-down', distance: '10 min', pace: 'Z1', note: '', tag: 'cycle' }
      ] };
    const dur = Math.round((endBase + (intent === 'build' ? Math.min(winp, 6) * 5 : 0)) / 5) * 5;
    return { discipline: 'cycle', focus: 'Ride — endurance', duration: `${dur} min`, intensity: 'moderate', lowerBody: false,
      items: [{ num: 'C1', name: 'Endurance ride', distance: `${dur} min`, pace: 'Z2', note: 'steady aerobic, smooth cadence', tag: 'cycle' }] };
  });
}

// Triathlon brick — two disciplines back-to-back in race order (swim→bike or
// bike→run) so the body adapts to the transitions. Introduced in build/peak.
// Built on the cycle "channel" so it schedules like a ride (hard day).
function brickSpec(type, profile, ctx) {
  const lvl = levelFor('run', profile);
  const { paces } = running.computePaces((profile.run_goal && profile.run_goal.distance) || '10k', profile.run_goal && profile.run_goal.current, lvl);
  const runPace = ctx.intent === 'peak' ? `Goal · ${paces.goal}/km` : `Easy–goal · ${paces.easy}–${paces.goal}/km`;
  if (type === 'swim_bike') {
    return {
      discipline: 'cycle', focus: 'Brick · swim → bike', duration: '60–75 min', intensity: 'hard', lowerBody: false,
      items: [
        { num: 'S1', name: 'Swim', stroke: 'Freestyle', distance: '1200–1500 m steady', effort: 'Aerobic', cue: 'controlled — then straight onto the bike', tag: 'swim' },
        { num: 'B1', name: 'Bike off the swim', distance: '40–50 min', pace: 'Z2–Z3', note: 'settle the breathing, build to steady', tag: 'cycle' }
      ]
    };
  }
  return {
    discipline: 'cycle', focus: 'Brick · bike → run', duration: '60–80 min', intensity: 'hard', lowerBody: false,
    items: [
      { num: 'B1', name: 'Bike', distance: `${ctx.intent === 'peak' ? '50–60' : '40–50'} min`, pace: 'Z2–Z3 build', note: 'last 10 min near race effort', tag: 'cycle' },
      { num: 'R1', name: 'Transition run (off the bike)', distance: `${ctx.intent === 'peak' ? '20–25' : '15'} min`, pace: runPace, note: 'legs feel heavy — quick cadence, settle into rhythm', tag: 'run' }
    ]
  };
}

function buildGeneralWeek({ count, deload }) {
  const sets = deload ? '2 sets' : '3 sets';
  const session = () => ({ discipline: 'general', focus: 'Movement & strength', duration: '40–50 min', intensity: 'moderate', lowerBody: true,
    items: [
      { num: 'A1', name: 'Goblet squat', sets: `${sets} × 10`, rpe: 'RPE 6', note: 'smooth, full range' },
      { num: 'A2', name: 'Push-up (incline if needed)', sets: `${sets} × 10`, rpe: 'RPE 6', note: '' },
      { num: 'B1', name: 'DB row', sets: `${sets} × 10`, rpe: 'RPE 6', note: '' },
      { num: 'B2', name: 'Glute bridge', sets: `${sets} × 12`, rpe: 'RPE 6', note: '' },
      { num: 'C1', name: 'Easy cardio finisher', sets: '10–15 min', rpe: 'Z2', note: 'walk, bike, or row — keep it easy', tag: 'run' },
      { num: 'C2', name: 'Full-body mobility', sets: '5 min', rpe: 'Easy', tag: 'mobility', note: 'hips, t-spine, ankles' }
    ] });
  return Array.from({ length: count }, session);
}

// ---------------------------------------------------------------------------
// Goal dates, phase split, gates
// ---------------------------------------------------------------------------
function allGoalDates(profile) {
  const dates = [];
  const push = (d) => { if (d) { const t = new Date(d); if (!isNaN(t.getTime())) dates.push(t); } };
  push(profile.run_goal && profile.run_goal.target_date);
  push(profile.swim_goal && profile.swim_goal.target_date);
  (profile.goals || []).forEach(g => push(g && g.target_date));
  return dates;
}

function weeksToGoal(profile) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = allGoalDates(profile).filter(d => d > today);
  if (!future.length) return 12;
  const earliest = new Date(Math.min(...future.map(d => d.getTime())));
  return Math.max(4, Math.min(24, Math.ceil((earliest - today) / (7 * 86400000))));
}

function phaseSplit(total) {
  if (total <= 7) return [{ intent: 'build', weeks: total }];
  if (total <= 11) { const base = Math.ceil(total / 2); return [{ intent: 'base', weeks: base }, { intent: 'build', weeks: total - base }]; }
  const base = Math.round(total * 0.4);
  const peak = Math.max(2, Math.round(total * 0.2));
  return [{ intent: 'base', weeks: base }, { intent: 'build', weeks: total - base - peak }, { intent: 'peak', weeks: peak }];
}

const PHASE_META = {
  base:  { title: 'Base', tagline: 'Build the aerobic engine and movement quality.', tags: ['Base', 'Aerobic'],
           summary: 'Lay the foundation — consistent volume, solid technique, no chasing intensity yet.' },
  build: { title: 'Build', tagline: 'Add intensity and goal-specific work.', tags: ['Build', 'Intensity'],
           summary: 'Progressively harder sessions appear. Hold form and let recovery keep pace.' },
  peak:  { title: 'Peak & Sharpen', tagline: 'Sharpen toward your goal, then taper.', tags: ['Peak', 'Taper'],
           summary: 'Goal-specific work peaks, then volume drops so you arrive fresh.' }
};

function themeFor(intent, deload) {
  if (deload) return 'Deload — volume cut. Recover and absorb the work.';
  return intent === 'base' ? 'Build aerobic base and movement quality.'
    : intent === 'build' ? 'Progress the intensity. Keep form honest.'
    : 'Sharpen and taper toward your goal.';
}

// Human-readable goal targets for the final phase's gates.
function goalGateLabels(profile) {
  const out = [];
  const rg = profile.run_goal;
  if (rg && rg.distance) {
    const { goalPrediction } = running.computePaces(rg.distance, rg.current, levelFor('run', profile));
    const dist = { '5k': '5K', '10k': '10K', 'half': 'Half-marathon', 'marathon': 'Marathon' }[rg.distance] || rg.distance;
    const bits = [];
    if (goalPrediction) bits.push(`~${goalPrediction}`);
    if (rg.target_date) bits.push(`by ${rg.target_date}`);
    out.push({ label: `${dist}${bits.length ? ' (' + bits.join(', ') + ')' : ''}`, required: true });
  }
  const sg = profile.swim_goal;
  if (sg && sg.distance_m) out.push({ label: `Swim ${sg.distance_m} m continuous${sg.target_date ? ` (by ${sg.target_date})` : ''}`, required: true });
  (profile.goals || []).filter(g => g && g.label && g.label.trim())
    .forEach(g => out.push({ label: g.label.trim() + (g.target_date ? ` (by ${g.target_date})` : ''), required: true }));
  return out;
}

function gatesFor(intent, isLast, profile, totalSessions) {
  const gates = [];
  if (intent === 'base') {
    gates.push({ label: `Hit ${totalSessions} sessions most weeks`, required: true });
    gates.push({ label: 'Movements feel smooth and pain-free', required: false });
  } else if (intent === 'build') {
    gates.push({ label: 'Absorb the added intensity without lingering soreness', required: true });
  } else {
    gates.push({ label: 'Sharp and recovered through the taper', required: true });
  }
  if (isLast) goalGateLabels(profile).forEach(g => gates.push(g));
  return gates;
}

// ---------------------------------------------------------------------------
// Per-week assembly
// ---------------------------------------------------------------------------
function buildDisciplineSpecs(discipline, count, ctx, profile) {
  const common = { intent: ctx.intent, deload: ctx.deload, winp: ctx.winp, weekNum: ctx.weekNum, progress: ctx.progress, level: levelFor(discipline, profile), minutes: ctx.minutes, access: profile.access || [] };
  switch (discipline) {
    case 'gym':
      return strength.buildWeek({ ...common, gymDays: count, style: strengthStyle(profile), lifts: profile.lifts });
    case 'run':
      return running.buildWeek({ ...common, runDays: count, goal: profile.run_goal || { distance: '10k', current: null } });
    case 'swim':
      return swimming.buildWeek({ ...common, swimDays: count, goal: profile.swim_goal || { distance_m: 2000, current: null } });
    case 'cycle':
      return buildCycleWeek({ ...common, count });
    default:
      return buildGeneralWeek({ ...common, count });
  }
}

export function generatePlan(profile = {}) {
  const availability = profile.availability || {};
  const totalDays = Math.max(1, Math.min(7, availability.days_per_week || 3));
  const minutes = availability.session_minutes || 60;

  let disciplines = focusToDisciplines(profile.focus || []);
  // The chosen primary sport leads — it gets the spare day in the allocation.
  if (profile.primary && disciplines.includes(profile.primary)) {
    disciplines = [profile.primary, ...disciplines.filter(d => d !== profile.primary)];
  }
  const alloc = dayAllocation(profile, disciplines, totalDays);
  const totalSessions = Object.values(alloc).reduce((a, b) => a + b, 0) || totalDays;

  const allowDoubles = profile.doubles !== false;
  const longRunDay = disciplines.includes('run') ? (profile.long_run_day || 'sat') : null;

  const total = weeksToGoal(profile);
  const split = phaseSplit(total);

  const phases = [];
  let weekNum = 0;
  split.forEach((seg, pi) => {
    const meta = PHASE_META[seg.intent];
    const start = weekNum + 1;
    const isLast = pi === split.length - 1;
    const weeks = [];

    for (let winp = 1; winp <= seg.weeks; winp++) {
      weekNum++;
      const deload = winp % 4 === 0;
      // Global progress (0→1 across the whole plan) ramps endurance volume so
      // long runs / swims build steadily toward the goal rather than resetting
      // each phase. Deload weeks are handled inside the engines.
      const progress = total > 1 ? (weekNum - 1) / (total - 1) : 1;
      const ctx = { intent: seg.intent, deload, winp, weekNum, minutes, progress };

      // Gather every discipline's sport sessions, plus any supplemental strength,
      // then schedule them (supplemental folds in as easy-day doubles / rest days).
      const sportSpecs = [];
      Object.keys(alloc).forEach(d => sportSpecs.push(...buildDisciplineSpecs(d, alloc[d], ctx, profile)));

      // Triathlon: swap one ride for a brick (transition practice) in build/peak.
      if ((profile.focus || []).includes('triathlon') && seg.intent !== 'base' && !deload) {
        const ci = sportSpecs.findIndex(s => s.discipline === 'cycle');
        if (ci >= 0) sportSpecs[ci] = brickSpec(weekNum % 2 === 0 ? 'swim_bike' : 'bike_run', profile, ctx);
      }

      const supSpecs = supplementalSpecs(profile, disciplines, ctx);
      const dayNames = chooseDays(availability, sportSpecs.length, longRunDay);
      const sessions = scheduleWeek({ sportSpecs, supSpecs, dayNames, allowDoubles, longRunDay });

      weeks.push({ num: weekNum, deload, theme: themeFor(seg.intent, deload), sessions, provisional: pi > 0 });
    }

    phases.push({
      id: pi + 1,
      title: meta.title,
      tagline: meta.tagline,
      range: `Wks ${start}–${weekNum}`,
      weekStart: start,
      weekEnd: weekNum,
      status: pi === 0 ? 'current' : 'provisional',
      tags: meta.tags,
      summary: meta.summary,
      gates: gatesFor(seg.intent, isLast, profile, totalSessions),
      weeks
    });
  });

  return { phases, totalWeeks: total };
}

export default { generatePlan };
