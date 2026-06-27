/**
 * PlanGenerator — turns a user's onboarding profile into a full GYM training plan,
 * in the exact shape the screens render (see src/data/Plan.js):
 *
 *   generatePlan(profile) → { phases: [ { id, title, range, weeks: [...] } ], totalWeeks }
 *
 * The app is strength/gym focused: every training day is a gym day. A supported
 * sport biases the gym programming via resolveProgram (style · per-muscle emphasis
 * · volume scalar · exercise priority) and via the periodisation profile — there
 * are NO separate endurance sessions (wearables track the actual sport). The old
 * run/swim/cycle/triathlon builders + supplemental-strength + interference
 * scheduling were removed in the gym-only cleanup.
 *
 * Architecture:
 *   1. resolvePeriodization(profile) sizes the block + its phase split + deloads.
 *   2. Each week, the strength engine (src/lib/plan/strength.js) builds the gym
 *      sessions from the resolved per-muscle volume target.
 *   3. The scheduler lays them onto the chosen weekdays.
 *
 * Pure function of the profile → the same answers always produce the same plan,
 * and session keys (p{phase}_wk{week}_s{idx}) stay stable so completion maps.
 */

import * as strength from './plan/strength.js';
import { scheduleWeek } from './plan/scheduler.js';
import { resolveLifts } from './liftProgression.js';
import { resolveProgram } from './strength/program.js';
import { resolvePeriodization } from './plan/periodization.js';
import { getGymLevel } from './Utils.js';
import { deriveConstraints, suggestGymDays } from './plan/constraints.js';
import { SESSION_CEILING_MIN } from './plan/allocator.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
// Sensible rest-spaced defaults when the user didn't pick specific days.
const DEFAULT_DAYS = {
  1: ['wed'], 2: ['mon', 'thu'], 3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'sat'], 5: ['mon', 'tue', 'wed', 'fri', 'sat'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 7: [...DAY_ORDER]
};

// Choose the weekday slots for `n` sessions, honouring the user's preferred days and
// keeping gym off the athlete's sport days when there's room (suggestGymDays). If the
// user explicitly picked gym days we respect them; otherwise we suggest around sport.
function chooseDays(availability, n, sportDays = []) {
  let days = (availability?.days || []).filter(d => DAY_ORDER.includes(d));
  days = [...new Set(days)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (days.length >= n) days = days.slice(0, n);
  else if (days.length === 0 && sportDays.length) {
    days = suggestGymDays({ sportDays, gymDays: n });   // no explicit picks → suggest around sport
  } else {
    // Fill from rest-spaced defaults, preferring non-sport days first.
    const sport = new Set(sportDays);
    const def = (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n)).filter(d => !sport.has(d));
    const defSport = (DEFAULT_DAYS[n] || DAY_ORDER.slice(0, n)).filter(d => sport.has(d));
    days = [...new Set([...days, ...def, ...defSport])]
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).slice(0, n);
  }
  return days.map(d => DAY_NAMES[d]);
}

const PHASE_META = {
  base:  { title: 'Base', tagline: 'Build the foundation — volume, technique and work capacity.', tags: ['Base', 'Foundation'],
           summary: 'Lay the foundation — consistent volume, solid technique, no chasing intensity yet.' },
  build: { title: 'Build', tagline: 'Add intensity and goal-specific work.', tags: ['Build', 'Intensity'],
           summary: 'Progressively harder sessions appear. Hold form and let recovery keep pace.' },
  peak:  { title: 'Peak & Sharpen', tagline: 'Sharpen toward your goal, then taper.', tags: ['Peak', 'Taper'],
           summary: 'Goal-specific work peaks, then volume drops so you arrive fresh.' }
};

function themeFor(intent, deload, taper, isRaceWeek) {
  if (isRaceWeek) return 'Race week — taper hard, stay sharp, arrive fresh.';
  if (taper) return 'Taper — volume drops, a little sharpness stays. Bank the rest.';
  if (deload) return 'Deload — volume cut. Recover and absorb the work.';
  return intent === 'base' ? 'Build base volume and movement quality.'
    : intent === 'build' ? 'Progress the intensity. Keep form honest.'
    : 'Sharpen and taper toward your goal.';
}

function gatesFor(intent, totalSessions) {
  if (intent === 'base') return [
    { label: `Hit ${totalSessions} sessions most weeks`, required: true },
    { label: 'Movements feel smooth and pain-free', required: false }
  ];
  if (intent === 'build') return [{ label: 'Absorb the added intensity without lingering soreness', required: true }];
  return [{ label: 'Sharp and recovered through the taper', required: true }];
}

// Build the week's gym sessions from the resolved program. Deload and taper are
// passed SEPARATELY: both cut volume, but a taper keeps intensity high (peaking)
// whereas a deload drops it (recovery). Goal tuning comes from program.
function buildGymWeek(count, ctx, profile, program) {
  return strength.buildWeek({
    intent: ctx.intent, deload: ctx.deload, taper: ctx.taper, winp: ctx.winp, weekNum: ctx.weekNum,
    phaseWeeks: ctx.phaseWeeks, blockFrac: ctx.blockFrac, minutes: ctx.minutes,
    level: getGymLevel(profile), access: profile.access || [], sex: profile.sex,
    bodyweight: profile.bodyweight_kg,
    gymDays: count, lifts: resolveLifts(profile),
    style: program.style, emphasis: program.emphasis, volumeScalar: program.volumeScalar,
    power: program.power, sport: program.sport, exercisePriority: program.exercisePriority || [],
    priorityByIntent: program.priorityByIntent || new Map()
  });
}

export function generatePlan(profile = {}) {
  const program = resolveProgram(profile);
  const { busyDays, sportMuscles } = deriveConstraints(profile);
  const availability = profile.availability || {};
  const totalDays = Math.max(1, Math.min(7, availability.days_per_week || 3));
  const minutes = SESSION_CEILING_MIN;   // session length is volume-driven; this is only the ceiling
  const totalSessions = totalDays;

  const { totalWeeks: total, split, deloads } = resolvePeriodization(profile);
  const deloadSet = new Set(deloads || []);

  // Race taper: a dated event that lands within this block cuts volume in the final
  // 1–2 weeks (keeping some sharpness) so the athlete arrives fresh. An event months
  // out shapes the season/length via deriveSeason — not a taper now.
  const start = profile.plan_start_date ? new Date(profile.plan_start_date + 'T00:00:00') : new Date();
  start.setHours(0, 0, 0, 0);
  const eventDate = profile.event_date ? new Date(profile.event_date + 'T00:00:00') : null;
  const planEnd = new Date(start.getTime() + total * 7 * 86400000);
  const isRace = !!(eventDate && !isNaN(eventDate.getTime()) && eventDate > start && eventDate <= new Date(planEnd.getTime() + 7 * 86400000));
  const taperWeeks = isRace ? (total >= 12 ? 2 : 1) : 0;
  const lastBuildWeek = total - taperWeeks;

  const phases = [];
  let weekNum = 0;
  split.forEach((seg, pi) => {
    const meta = PHASE_META[seg.intent];
    const startWk = weekNum + 1;
    const weeks = [];

    for (let winp = 1; winp <= seg.weeks; winp++) {
      weekNum++;
      const deload = deloadSet.has(weekNum);                 // periodisation-defined (periodization.js PROFILES)
      const taper = isRace && weekNum > lastBuildWeek;
      // Block-continuous volume ramp position (0→1 across the whole plan). Deload
      // weeks still drop to MEV in targets.js; this just stops the per-phase reset.
      const blockFrac = total > 1 ? (weekNum - 1) / (total - 1) : 0.5;
      const ctx = { intent: seg.intent, deload, taper, winp, weekNum, minutes, phaseWeeks: seg.weeks, blockFrac };

      const sportSpecs = buildGymWeek(totalDays, ctx, profile, program);
      const dayNames = chooseDays(availability, sportSpecs.length, profile.sport_days || []);
      const sessions = scheduleWeek({ sportSpecs, dayNames, busyDays, sportMuscles });

      weeks.push({ num: weekNum, deload, taper, theme: themeFor(seg.intent, deload, taper, isRace && weekNum === total), sessions, provisional: pi > 0 });
    }

    phases.push({
      id: pi + 1,
      title: meta.title,
      tagline: meta.tagline,
      range: `Wks ${startWk}–${weekNum}`,
      weekStart: startWk,
      weekEnd: weekNum,
      status: pi === 0 ? 'current' : 'provisional',
      tags: meta.tags,
      summary: meta.summary,
      gates: gatesFor(seg.intent, totalSessions),
      weeks
    });
  });

  return { phases, totalWeeks: total };
}

export default { generatePlan };
