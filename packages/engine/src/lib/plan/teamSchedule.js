/**
 * teamSchedule.js — the TEAM package's "coach schedule as constraints", mapped
 * onto the fields the engine already honours (deriveConstraints/scheduler for
 * sport-day avoidance, availability.days for gym placement, event_date for the
 * taper). Spec: docs/superpowers/specs/2026-07-05-team-schedule-constraints-design.md
 * (Simon 2026-07-05: matches block + fixtures taper; other sport days soft-avoided).
 *
 * PURE. applyTeamSchedule returns the SAME profile reference when there is no
 * valid schedule or nothing changes — memo signatures and golden masters are
 * untouched by construction for schedule-less athletes. `asOf` is the plan's
 * start date (never the clock — Art 18): fixture recency is judged against it.
 */
import { DAY_ORDER } from './constraints.js';

// teams.schedule day labels ("Mon") → engine weekday keys ('mon').
const DAY_KEY = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };

// Pattern types that put SPORT LOAD on the day (gym work should keep away).
// Team 'gym' days and 'rest' days carry no sport load.
const SPORT_LOAD_TYPES = new Set(['match', 'pitch', 'pool', 'track', 'conditioning']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Weekday key → Monday-anchored index (Mon=0 … Sun=6), matching fixtureWeeks/scheduler.
const DAY_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const weekdayIdxOfISO = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : (d.getDay() + 6) % 7; };

// Upcoming match fixtures (date >= asOf), normalised + sorted, for the fixture-aware microcycle.
function upcomingMatchFixtures(fixtures, asOf) {
  if (!asOf || !ISO_DATE.test(asOf)) return [];
  return fixtures
    .filter(f => f && f.type === 'match' && typeof f.date === 'string' && ISO_DATE.test(f.date) && f.date >= asOf)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(f => ({ dateISO: f.date, weekdayIdx: weekdayIdxOfISO(f.date) }))
    .filter(f => f.weekdayIdx != null);
}

// Structural equality for the normalised fixture list (dateISO + weekdayIdx, in order).
function sameFixtures(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((f, i) => f.dateISO === b[i].dateISO && f.weekdayIdx === b[i].weekdayIdx);
}

/**
 * Defensive parse of a raw `teams.schedule` jsonb value (the cross-app
 * contract; the column DEFAULTS to '[]'::jsonb, an array). Anything that is
 * not an object carrying a 7-entry weeklyPattern and a fixtures array means
 * "no schedule" → null. Mirrors apps/web/lib/constraints.ts parseTeamSchedule.
 */
export function parseTeamSchedule(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { weeklyPattern, fixtures } = raw;
  if (!Array.isArray(weeklyPattern) || weeklyPattern.length !== 7) return null;
  if (!Array.isArray(fixtures)) return null;
  return { weeklyPattern, fixtures };
}

// Weekday keys from the pattern whose type passes `pred`, deduped, week order.
function daysWhere(weeklyPattern, pred) {
  const keys = new Set();
  for (const d of weeklyPattern) {
    const key = DAY_KEY[d && d.day];
    if (key && pred(d.type)) keys.add(key);
  }
  return DAY_ORDER.filter(k => keys.has(k));
}

/**
 * The peak-event gate. `event_date` shapes the WHOLE periodization, so a
 * league team's weekly fixture must never become "the event" (it would
 * collapse every player's plan into a permanent taper). A fixture qualifies
 * only when: the athlete has no event of their own, there is exactly ONE
 * upcoming match fixture, and it is ≥ 21 days past `asOf`. Routine weekly
 * congestion stays the reflow/SKB rules' job.
 */
function gatedEventDate(fixtures, asOf) {
  if (!asOf || !ISO_DATE.test(asOf)) return null;
  const upcoming = fixtures
    .filter(f => f && f.type === 'match' && typeof f.date === 'string' && ISO_DATE.test(f.date) && f.date >= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length !== 1) return null;
  const days = (new Date(upcoming[0].date + 'T00:00:00') - new Date(asOf + 'T00:00:00')) / 86_400_000;
  return days >= 21 ? upcoming[0].date : null;
}

/**
 * Apply a team schedule to an athlete's profile as INPUT (the generator stays
 * pure). Returns a new profile only when something actually changes.
 *
 *  - match weekdays leave availability.days (days_per_week follows), unless
 *    that would leave fewer than 2 gym days — then the athlete's own days
 *    stand and matches are only soft-avoided;
 *  - every sport-load day joins sport_days (the scheduler's existing
 *    keep-away + clash-lightening machinery — soft, never a block);
 *  - one gated fixture may become event_date (see gatedEventDate).
 */
export function applyTeamSchedule(profile, rawSchedule, asOf = null) {
  const schedule = parseTeamSchedule(rawSchedule);
  if (!profile || !schedule) return profile;

  const matchDays = daysWhere(schedule.weeklyPattern, t => t === 'match');
  const loadDays = daysWhere(schedule.weeklyPattern, t => SPORT_LOAD_TYPES.has(t));
  const eventDate = profile.event_date ? null : gatedEventDate(schedule.fixtures, asOf);
  const matchWeekdays = daysWhere(schedule.weeklyPattern, t => t === 'match').map(k => DAY_INDEX[k]);
  const teamFixtures = upcomingMatchFixtures(schedule.fixtures, asOf);
  // widen the "nothing to do" guard so fixture stamping alone still produces a new profile
  if (!matchDays.length && !loadDays.length && !eventDate && !teamFixtures.length && !matchWeekdays.length) return profile;

  const next = { ...profile };
  let changed = false;

  // Soft-avoid: union the team's sport-load days into sport_days.
  if (loadDays.length) {
    const own = Array.isArray(profile.sport_days) ? profile.sport_days : [];
    const union = DAY_ORDER.filter(k => own.includes(k) || loadDays.includes(k));
    if (union.length !== own.length || union.some((k, i) => k !== own[i])) {
      next.sport_days = union;
      changed = true;
    }
  }

  // Block: match days leave the explicit gym days (floor: never below 2).
  const av = profile.availability;
  if (matchDays.length && av && Array.isArray(av.days) && av.days.length) {
    const kept = av.days.filter(d => !matchDays.includes(d));
    if (kept.length !== av.days.length && kept.length >= 2) {
      next.availability = {
        ...av,
        days: kept,
        days_per_week: Math.min(av.days_per_week || kept.length, kept.length)
      };
      changed = true;
    }
  }

  if (eventDate) {
    next.event_date = eventDate;
    changed = true;
  }

  if (teamFixtures.length && !sameFixtures(teamFixtures, profile.team_fixtures)) {
    next.team_fixtures = teamFixtures;
    changed = true;
  }
  if (matchWeekdays.length && matchWeekdays[0] !== profile.team_match_weekday) {
    next.team_match_weekday = matchWeekdays[0];
    changed = true;
  }

  return changed ? next : profile;
}

export default { parseTeamSchedule, applyTeamSchedule };
