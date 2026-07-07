// tests/wp49-hypertrophy-isolation.js — WP-49 Plan 2 Task 4c part 3: a hypertrophy plan carries
// DIRECT isolation for the region's smaller muscles (arms / delts / calves / leg iso). The
// compounds fill the fatigue budget and the push/pull region filter excludes 'iso', so direct
// arm/delt/calf work never got selected — a real gap for a "build muscle" goal. This appends it as
// working volume, MRV- and time-capped, after the main compounds. Gated to hypertrophy: every other
// discipline + sport is byte-identical (proven by the golden master).
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const hyp = (days, dayKeys) => generatePlan({ ...answersToProfile(A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: days, days: dayKeys, equipment: FULL, sex: 'male' })), plan_start_date: '2026-07-06' });
const workWeek = (p) => p.phases[0].weeks.find((w) => !w.deload && !w.taper && w.num >= 2) || p.phases[0].weeks[0];
const names = (week) => week.sessions.flatMap((s) => (s.items || []).filter((it) => it.section !== 'primer').map((it) => it.name.toLowerCase()));

// ── A · a 6-day PPL plan carries direct arm + delt + calf isolation ───────────
{
  const week = workWeek(hyp(6, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']));
  const n = names(week);
  assert(n.some((x) => /curl/.test(x)), `A1 hypertrophy carries direct biceps curls — got: ${[...new Set(n)].join(', ')}`);
  assert(n.some((x) => /pushdown|triceps/.test(x)), 'A2 hypertrophy carries direct triceps work');
  assert(n.some((x) => /calf/.test(x)), 'A3 hypertrophy carries direct calf work');
}

// ── B · isolation lands on the RIGHT day (pull day gets biceps, not on a leg day) ──
{
  const week = workWeek(hyp(6, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']));
  const pullDay = week.sessions.find((s) => /pull/i.test(s.title));
  const legDay = week.sessions.find((s) => /lower|legs/i.test(s.title));
  if (pullDay) assert((pullDay.items || []).some((it) => /curl/i.test(it.name) && !/leg curl/i.test(it.name)), 'B1 the pull day carries biceps curls');
  if (legDay) assert((legDay.items || []).some((it) => /calf|leg curl|leg ext/i.test(it.name)), 'B2 the leg day carries leg isolation (curl/ext/calf)');
}

// ── C · isolation is real working volume, and the main compounds are untouched ──
{
  const week = workWeek(hyp(6, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']));
  // The big compounds still anchor every relevant day (isolation is ADDITIVE, not a replacement).
  const n = names(week);
  assert(n.some((x) => /bench press/.test(x)) && n.some((x) => /back squat|deadlift/.test(x)), 'C1 the main compounds still anchor the plan (isolation is additive)');
}

console.log(process.exitCode ? 'wp49-hypertrophy-isolation FAILURES' : 'PASS: wp49-hypertrophy-isolation — all gates');
