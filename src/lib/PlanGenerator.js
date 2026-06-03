/**
 * PlanGenerator — turns a user's onboarding profile into a full training plan,
 * in the exact shape the screens render (see src/data/Plan.js):
 *
 *   generatePlan(profile) → { phases: [ { id, title, range, weeks: [...] } ] }
 *
 * Approach (a science-backed assembler, not a black box):
 *   1. Size the plan to the soonest dated goal (clamped 4–24 weeks; default 12).
 *   2. Split it into 1–3 periodised phases (Base → Build → Peak).
 *   3. Each week, spread `days_per_week` sessions across the chosen sports by
 *      priority, choose a role for each (easy/long/quality, technique/endurance,
 *      push/pull/legs, …), and pull the matching template from planTemplates.
 *   4. Deload every 4th week within a phase.
 *
 * Guardrails live in the templates (sane volumes) + here (clamped length, gentle
 * progression, mandatory deloads). The generator is a pure function of profile,
 * so the same answers always produce the same plan — and the session keys
 * (p{phase}_wk{week}_s{idx}) stay stable, so completion state keeps mapping.
 */

import { buildSession } from '../data/planTemplates.js';

const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
// Sensible rest-spaced defaults when the user didn't pick specific days.
const DEFAULT_DAYS = {
  1: ['mon'], 2: ['mon', 'thu'], 3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'sat'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: [...DAY_ORDER]
};

// Onboarding focus keys → internal template sport keys.
function expandFocus(focus = []) {
  const map = {
    run: ['run'], swim: ['swim'], cycle: ['cycle'],
    triathlon: ['swim', 'cycle', 'run'],
    strength_functional: ['strength_f'], strength_physique: ['strength_p'],
    general_health: ['general']
  };
  const out = [];
  focus.forEach(f => (map[f] || []).forEach(s => out.push(s)));
  return [...new Set(out)];
}

// Experience level for an internal sport, falling back through triathlon → beginner.
function levelFor(sportKey, profile) {
  const e = profile.experience || {};
  const fromTri = e.triathlon;
  const direct = {
    run: e.run, swim: e.swim, cycle: e.cycle,
    strength_f: e.strength_functional, strength_p: e.strength_physique,
    general: e.general_health
  }[sportKey];
  return direct || (['run', 'swim', 'cycle'].includes(sportKey) ? fromTri : null) || 'beginner';
}

function chooseDays(availability, n) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (days.length >= n) days = days.slice(0, n);
  else {
    const def = DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n);
    days = [...new Set([...days, ...def])]
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .slice(0, n);
  }
  return days.map(d => DAY_NAMES[d]);
}

// Round-robin sports across n slots, honouring priority order.
function assignSports(sports, n) {
  if (sports.length === 0) return Array(n).fill('general');
  return Array.from({ length: n }, (_, i) => sports[i % sports.length]);
}

// Role rotation per sport (drives which template variant gets built).
function rolePattern(sportKey, intent) {
  switch (sportKey) {
    case 'run':        return intent === 'base' ? ['long', 'easy', 'quality'] : ['quality', 'long', 'easy'];
    case 'swim':       return ['endurance', 'technique'];
    case 'cycle':      return intent === 'base' ? ['endurance'] : ['endurance', 'intervals'];
    case 'strength_f': return ['full', 'lower', 'upper'];
    case 'strength_p': return ['push', 'pull', 'legs'];
    default:           return ['mixed'];
  }
}
function rolesFor(sportKey, count, intent) {
  const pat = rolePattern(sportKey, intent);
  return Array.from({ length: count }, (_, i) => pat[i % pat.length]);
}

function weeksToGoal(goals) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dates = (goals || [])
    .map(g => g && g.target_date)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()) && d > today);
  if (!dates.length) return 12;
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const wks = Math.ceil((earliest - today) / (7 * 24 * 3600 * 1000));
  return Math.max(4, Math.min(24, wks));
}

// Split total weeks into periodised phases.
function phaseSplit(total) {
  if (total <= 7) return [{ intent: 'build', weeks: total }];
  if (total <= 11) {
    const base = Math.ceil(total / 2);
    return [{ intent: 'base', weeks: base }, { intent: 'build', weeks: total - base }];
  }
  const base = Math.round(total * 0.4);
  const peak = Math.max(2, Math.round(total * 0.2));
  const build = total - base - peak;
  return [{ intent: 'base', weeks: base }, { intent: 'build', weeks: build }, { intent: 'peak', weeks: peak }];
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

function gatesFor(intent, isLast, goals, daysPerWeek) {
  const gates = [];
  if (intent === 'base') {
    gates.push({ label: `Hit ${daysPerWeek} sessions most weeks`, required: true });
    gates.push({ label: 'Movements feel smooth and pain-free', required: false });
  } else if (intent === 'build') {
    gates.push({ label: 'Absorb the added intensity without lingering soreness', required: true });
  } else {
    gates.push({ label: 'Sharp and recovered through the taper', required: true });
  }
  if (isLast) {
    (goals || []).filter(g => g && g.label && g.label.trim())
      .forEach(g => gates.push({ label: g.label.trim() + (g.target_date ? ` (by ${g.target_date})` : ''), required: true }));
  }
  return gates;
}

export function generatePlan(profile = {}) {
  const sports = expandFocus(profile.focus || []);
  const availability = profile.availability || {};
  const daysPerWeek = Math.max(1, Math.min(7, availability.days_per_week || 3));
  const minutes = availability.session_minutes || 60;
  const access = profile.access || [];
  const poolLength = profile.pool_length_m || 25;

  const total = weeksToGoal(profile.goals);
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
      const days = chooseDays(availability, daysPerWeek);
      const slots = assignSports(sports, daysPerWeek);

      // role queue per sport for this week
      const counts = {};
      slots.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
      const roleQueues = {};
      Object.keys(counts).forEach(s => { roleQueues[s] = rolesFor(s, counts[s], seg.intent); });
      const roleIdx = {};

      const sessions = slots.map((sportKey, i) => {
        roleIdx[sportKey] = (roleIdx[sportKey] ?? -1) + 1;
        const role = roleQueues[sportKey][roleIdx[sportKey]];
        return buildSession(sportKey, {
          day: days[i] || DAY_NAMES[DAY_ORDER[i % 7]],
          role, intent: seg.intent, winp, deload,
          level: levelFor(sportKey, profile),
          minutes, access, poolLength
        });
      });

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
      gates: gatesFor(seg.intent, isLast, profile.goals, daysPerWeek),
      weeks
    });
  });

  return { phases, totalWeeks: total };
}

export default { generatePlan };
