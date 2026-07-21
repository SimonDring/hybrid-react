/**
 * team-schedule.js — the coach's schedule as plan constraints (stage 2).
 * Spec: docs/superpowers/specs/2026-07-05-team-schedule-constraints-design.md.
 *
 * Guards:
 *  1. no/invalid schedule → the SAME profile reference (goldens/memos safe);
 *  2. match days leave availability.days (days_per_week follows) with the
 *     ≥2-day floor; sport-load days union into sport_days; inputs not mutated;
 *  3. the peak-event gate: one match ≥21d out becomes event_date; league
 *     weeks (multiple fixtures), near fixtures, and athletes with their own
 *     event never taper;
 *  4. end-to-end: generatePlan with a Sunday-match schedule places no gym
 *     session on Sunday; without a schedule the plan is byte-identical.
 */
import assert from 'node:assert/strict';
import { applyTeamSchedule, parseTeamSchedule, generatePlan } from '@performance-os/engine';
import { BLANK_ANSWERS, answersToProfile } from '../src/lib/onboardingModel.js';

const PATTERN = (types) =>
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({ day, type: types[i] }));

const SCHEDULE = {
  weeklyPattern: PATTERN(['gym', 'pitch', 'rest', 'pitch', 'rest', 'rest', 'match']),
  fixtures: [],
};

const profile = () =>
  answersToProfile({
    ...BLANK_ANSWERS,
    goalType: 'sport', sport: 'gaa', experienceLevel: 'intermediate',
    daysPerWeek: 3, days: ['mon', 'wed', 'sun'], strengthAccess: 'full_gym',
  });

let n = 0;
const ok = (cond, msg) => { n++; assert.ok(cond, msg); console.log('PASS:', msg); };

// ── 1. identity for absent/invalid schedules ────────────────────────────────
{
  const p = profile();
  ok(applyTeamSchedule(p, null) === p, 'null schedule → same reference');
  ok(applyTeamSchedule(p, []) === p, "the column default '[]' → same reference");
  ok(applyTeamSchedule(p, { weeklyPattern: [], fixtures: [] }) === p, 'short pattern → same reference');
  ok(parseTeamSchedule({ weeklyPattern: SCHEDULE.weeklyPattern, fixtures: [] }) !== null, 'valid shape parses');
}

// ── 2. blocking + union + floor + purity ────────────────────────────────────
{
  const p = profile();
  const before = JSON.stringify(p);
  const out = applyTeamSchedule(p, SCHEDULE, '2026-07-06');
  ok(out !== p, 'a real schedule returns a new profile');
  ok(JSON.stringify(p) === before, 'the input profile is not mutated');
  ok(!out.availability.days.includes('sun'), 'the match day left the gym days');
  ok(out.availability.days.join(',') === 'mon,wed', 'the other chosen days stand');
  ok(out.availability.days_per_week === 2, 'days_per_week follows the shrunken list');
  ok(out.sport_days.join(',') === 'tue,thu,sun', 'sport-load days (pitch+match) joined sport_days');

  // Phase 1 — fixture inputs are additively stamped for the fixture-aware microcycle.
  const withFix = applyTeamSchedule(profile(), { ...SCHEDULE, fixtures: [
    { id: 'a', type: 'match', label: 'x', date: '2026-07-25' },
    { id: 'b', type: 'match', label: 'y', date: '2026-07-18' },
    { id: 'c', type: 'pitch', label: 'z', date: '2026-07-20' },
  ] }, '2026-07-13');
  ok(Array.isArray(withFix.team_fixtures) && withFix.team_fixtures.length === 2, 'only match fixtures are stamped');
  ok(withFix.team_fixtures[0].dateISO === '2026-07-18', 'fixtures sorted ascending by date');
  ok(withFix.team_fixtures[0].weekdayIdx === 5, 'Saturday 2026-07-18 → weekday index 5');
  ok(withFix.team_match_weekday === 6, 'the recurring Sunday match weekday (pattern) is stamped (index 6)');

  // Idempotence: re-applying to an already-stamped profile returns the SAME reference (no churn).
  const onceFix = applyTeamSchedule(profile(), { ...SCHEDULE, fixtures: [
    { id: 'a', type: 'match', label: 'x', date: '2026-07-25' },
  ] }, '2026-07-13');
  const twiceFix = applyTeamSchedule(onceFix, { ...SCHEDULE, fixtures: [
    { id: 'a', type: 'match', label: 'x', date: '2026-07-25' },
  ] }, '2026-07-13');
  ok(twiceFix === onceFix, 'applyTeamSchedule is idempotent: re-applying an already-adjusted profile returns the same reference');

  // floor: an athlete with only mon+sun cannot drop below 2 gym days
  const packed = { ...profile(), availability: { days_per_week: 2, days: ['mon', 'sun'] } };
  const kept = applyTeamSchedule(packed, SCHEDULE, '2026-07-06');
  ok(kept.availability.days.join(',') === 'mon,sun', 'the ≥2-day floor keeps the athlete\'s own days');
  ok(kept.sport_days.includes('sun'), 'the floored match day is still soft-avoided via sport_days');
}

// ── 3. the peak-event gate ──────────────────────────────────────────────────
{
  const asOf = '2026-07-06';
  const fix = (date, type = 'match') => ({ id: 'f', type, label: 'x', date });
  const withFixtures = (fixtures) => ({ ...SCHEDULE, fixtures });

  const one = applyTeamSchedule(profile(), withFixtures([fix('2026-08-10')]), asOf);
  ok(one.event_date === '2026-08-10', 'a single match ≥21d out becomes the event');

  const near = applyTeamSchedule(profile(), withFixtures([fix('2026-07-13')]), asOf);
  ok(near.event_date == null, 'a near fixture (<21d) never tapers the plan');

  const league = applyTeamSchedule(
    profile(), withFixtures([fix('2026-08-10'), fix('2026-08-17')]), asOf);
  ok(league.event_date == null, 'league play (multiple fixtures) never becomes the event');

  const own = { ...profile(), event_date: '2026-09-01' };
  const kept = applyTeamSchedule(own, withFixtures([fix('2026-08-10')]), asOf);
  ok(kept.event_date === '2026-09-01', "the athlete's own event is never overridden");

  const noAsOf = applyTeamSchedule(profile(), withFixtures([fix('2026-08-10')]), null);
  ok(noAsOf.event_date == null, 'no asOf (no plan start date) → no taper (deterministic)');
}

// ── 4. end-to-end through generatePlan ──────────────────────────────────────
{
  const base = generatePlan(profile());
  const again = generatePlan(applyTeamSchedule(profile(), null));
  ok(JSON.stringify(base) === JSON.stringify(again), 'schedule-less plans are byte-identical');

  const constrained = generatePlan(applyTeamSchedule(profile(), SCHEDULE, '2026-07-06'));
  const week = constrained.phases[0].weeks[0];
  const dayIdxs = week.sessions.map((s) => s.dayIdx); // 0=mon … 6=sun
  ok(dayIdxs.length >= 2 && dayIdxs.every((d) => Number.isInteger(d)),
    `the constrained week still carries a real plan (days ${dayIdxs.join(',')})`);
  ok(!dayIdxs.includes(6), `no gym session lands on the Sunday match (got ${dayIdxs.join(',')})`);
  // and the baseline DID use Sunday — the assertion above is not vacuous
  ok(base.phases[0].weeks[0].sessions.some((s) => s.dayIdx === 6),
    'the unconstrained baseline trained on Sunday');

  // Phase 1 flip: a fixed-date soccer schedule with a Saturday fixture positions the heavy
  // day away from MD-1. Uses a FIXED plan_start_date so placement is deterministic.
  const fixedSoccer = () => answersToProfile({
    ...BLANK_ANSWERS, goalType: 'sport', sport: 'soccer', skbSport: 'soccer',
    experienceLevel: 'intermediate', daysPerWeek: 3, days: ['tue', 'thu', 'fri'],
    strengthAccess: 'full_gym', sportSeason: 'off_season',
  });
  const fp = { ...fixedSoccer(), plan_start_date: '2026-07-13' };
  const sched = { weeklyPattern: PATTERN(['gym', 'gym', 'gym', 'gym', 'gym', 'rest', 'match']),
    fixtures: [{ id: 'm', type: 'match', label: 'league', date: '2026-07-18' }] };
  const withSched = applyTeamSchedule(fp, sched, '2026-07-13');
  const flipped = generatePlan(withSched, { fixtureMicrocycle: true });
  const wk = flipped.phases[0].weeks[0].sessions;
  const fri = wk.find((s) => s.dayIdx === 4); // Friday = MD-1 (the Sat 2026-07-18 fixture)
  ok(fri, 'flip: a Friday (MD-1) session exists — the assertion below is non-vacuous');
  ok(fri.axialLoad < 3, `flip: no heavy-axial gym work on Friday MD-1 (axial ${fri.axialLoad})`);
  // Teeth: the heaviest session MOVED to a far-from-match day (MD-4 Tue / MD-2 Thu), not just vanished.
  const heaviest = wk.reduce((a, b) => (b.axialLoad > a.axialLoad ? b : a));
  ok(heaviest.axialLoad >= 3 && (heaviest.dayIdx === 1 || heaviest.dayIdx === 3),
    `flip: heavy work landed away from MD-1, on Tue(MD-4)/Thu(MD-2) (idx ${heaviest.dayIdx}, axial ${heaviest.axialLoad})`);
}

console.log(`\nteam-schedule: ${n}/${n} checks passed`);
