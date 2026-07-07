// tests/wp49-discipline-selection.js — WP-49 Plan 2 Task 3b: the build-discipline SELECTION
// wiring. Two coaching-correctness gates that the machinery must satisfy:
//   A. Hypertrophy gets a real region SPLIT (upper/lower differentiated days), not N clones.
//   B. The Olympic discipline can actually SELECT the classic lifts (snatch / clean & jerk).
// Powerlifting/Olympic deliberately do NOT get a region split (they are lift-focused). Sport
// byte-identity is the golden-master's job (golden-master.js) — asserted there, not here.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];
const ASOF = '2026-07-06';

const planForDisc = (discipline, days, dayKeys, extra = {}) => {
  // olympic_lift is a profile field (set by onboarding, Task 6), NOT an onboarding answer —
  // answersToProfile would strip it, so spread it onto the profile AFTER, like `discipline`.
  const { olympic_lift, ...answers } = extra;
  return generatePlan({
    ...answersToProfile(A({ goalType: 'build', experienceLevel: 'advanced', daysPerWeek: days, days: dayKeys, equipment: FULL, sex: 'male', bodyweight_kg: 80, ...answers })),
    discipline,
    ...(olympic_lift ? { olympic_lift } : {}),
    plan_start_date: ASOF,
  });
};
const workWeek = (plan) => plan.phases[0].weeks.find((w) => !w.deload && !w.taper && w.num >= 2) || plan.phases[0].weeks[0];
// The scheduled session title carries the honest focus label: "Monday · Upper …".
const regionOfTitle = (t) => {
  const f = String(t).split('·')[1]?.trim().toLowerCase() || '';
  if (f.startsWith('upper') || f.startsWith('push') || f.startsWith('pull')) return 'upper';
  if (f.startsWith('lower') || f.startsWith('legs')) return 'lower';
  return 'full';
};
const workingNames = (week) => week.sessions.flatMap((s) => (s.items || [])
  .filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name.toLowerCase()));

// ── A · hypertrophy gets a real region split (differentiated days) ────────────
{
  const plan = planForDisc('hypertrophy', 5, ['mon', 'tue', 'wed', 'fri', 'sat']);
  const week = workWeek(plan);
  const regions = week.sessions.map((s) => regionOfTitle(s.title));
  const hasUpper = regions.includes('upper');
  const hasLower = regions.includes('lower');
  assert(hasUpper && hasLower,
    `A1 hypertrophy 5-day is region-split — has both an upper and a lower day (got [${regions.join(', ')}])`);
  // Not five identical sessions: the distinct working-exercise sets across days must vary.
  const perDay = week.sessions.map((s) => (s.items || [])
    .filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name).sort().join('|'));
  const distinct = new Set(perDay);
  assert(distinct.size >= 2, `A2 hypertrophy sessions are not all identical (got ${distinct.size} distinct day-shapes of ${perDay.length})`);
}

// ── B · Olympic discipline can select the classic lifts ───────────────────────
{
  const plan = planForDisc('olympic', 4, ['mon', 'tue', 'thu', 'fri']);
  const names = workingNames(plan.phases[0].weeks[0]).concat(workingNames(workWeek(plan)));
  const hasOlympicLift = names.some((n) => /snatch|clean and jerk|clean & jerk|jerk|clean pull|snatch pull/.test(n));
  assert(hasOlympicLift, `B1 Olympic plan features a classic olympic-pattern lift (snatch/clean&jerk/pull) — got names incl: ${[...new Set(names)].slice(0, 12).join(', ')}`);
}

// ── C · powerlifting is an Upper/Lower split (bench-led upper, squat/deadlift-led lower) ──
// WP-49 T6: powerlifting uses the coarse Upper/Lower region split so a 4-day isn't four identical
// full-body days (no muscle spacing) — bench anchors upper days, squat+deadlift anchor lower days.
{
  const plan = planForDisc('powerlifting', 4, ['mon', 'tue', 'thu', 'fri'], { lifts: { squat: 140, bench: 100, deadlift: 180 } });
  const regions = workWeek(plan).sessions.map((s) => regionOfTitle(s.title));
  assert(regions.includes('upper') && regions.includes('lower'),
    `C1 powerlifting 4-day is an upper/lower split (got [${regions.join(', ')}])`);
}

// ── D · powerlifting is BUILT AROUND the competition lifts (squat/bench/deadlift) ──
// The gym IS the sport (Simon 2026-07-07): lead with the three comp lifts, not just
// their variations, with accessories supporting them.
{
  const plan = planForDisc('powerlifting', 4, ['mon', 'tue', 'thu', 'fri'], { lifts: { squat: 140, bench: 100, deadlift: 180 } });
  const names = new Set(workingNames(plan.phases[0].weeks[0]).concat(workingNames(workWeek(plan))));
  const has = (n) => [...names].some((x) => x.includes(n));
  assert(has('back squat') || has('squat'), `D1 powerlifting features a squat (got: ${[...names].slice(0, 14).join(', ')})`);
  assert(has('bench press'), 'D2 powerlifting features the competition bench press (not only board/floor variants)');
  assert(has('deadlift'), 'D3 powerlifting features the deadlift');
}

// ── E · hypertrophy leads with COMPOUNDS, not isolation-only ───────────────────
{
  const plan = planForDisc('hypertrophy', 5, ['mon', 'tue', 'wed', 'fri', 'sat']);
  const names = new Set(workingNames(workWeek(plan)));
  const hasUpperCompound = [...names].some((n) => /bench press|incline bench|overhead press|barbell row|pull-up|pullup/.test(n));
  assert(hasUpperCompound, `E1 hypertrophy features an upper-body compound (press/row/pull-up), not isolation-only (got: ${[...names].join(', ')})`);
}

// ── F · Olympic features BOTH classic lifts (snatch and clean & jerk) ──────────
{
  const plan = planForDisc('olympic', 4, ['mon', 'tue', 'thu', 'fri'], { lifts: { squat: 150 } });
  const names = new Set(workingNames(plan.phases[0].weeks[0]).concat(workingNames(workWeek(plan))));
  const hasSnatch = [...names].some((n) => /snatch/.test(n));
  const hasCJ = [...names].some((n) => /clean and jerk|clean & jerk/.test(n));
  assert(hasSnatch, `F1 Olympic plan features a snatch (got: ${[...names].slice(0, 14).join(', ')})`);
  assert(hasCJ, 'F2 Olympic plan features the clean and jerk');
}

// ── G · hypertrophy Push/Pull/Legs — pull work gets its own day (not crowded out) ──
// Simon 2026-07-07: hypertrophy uses Push/Pull/Legs at 5-6 days so back/biceps get real volume.
const pressRx = /bench press|incline bench|overhead press|dip|db shoulder press/;
const pullRx = /barbell row|pull-up|pullup|lat pulldown|cable row|db row|inverted row/;
{
  const week = workWeek(planForDisc('hypertrophy', 6, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']));
  // Some session must be pull-dominant: it has pulling compounds and NO pressing compounds.
  const hasPullDay = week.sessions.some((s) => {
    const names = (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name.toLowerCase());
    return names.some((n) => pullRx.test(n)) && !names.some((n) => pressRx.test(n));
  });
  assert(hasPullDay, `G1 hypertrophy 6-day has a dedicated pull day (pulling work, no pressing) — sessions: ${week.sessions.map((s) => s.title.split('·')[1]?.trim()).join(', ')}`);
  // And a push-dominant day (pressing, no pulling).
  const hasPushDay = week.sessions.some((s) => {
    const names = (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name.toLowerCase());
    return names.some((n) => pressRx.test(n)) && !names.some((n) => pullRx.test(n));
  });
  assert(hasPushDay, 'G2 hypertrophy 6-day has a dedicated push day (pressing, no pulling)');
}

// ── H · Olympic day-emphasis: snatch day, C&J day, squat day (not 4 identical) ──
const sessionNames = (s) => (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name.toLowerCase());
{
  const week = workWeek(planForDisc('olympic', 3, ['mon', 'wed', 'fri'], { lifts: { squat: 150 } }));
  // A snatch-emphasis day: has a snatch, no clean&jerk.
  const snatchDay = week.sessions.some((s) => { const n = sessionNames(s); return n.some((x) => /snatch/.test(x)) && !n.some((x) => /clean and jerk/.test(x)); });
  // A C&J-emphasis day: has clean&jerk, no snatch.
  const cjDay = week.sessions.some((s) => { const n = sessionNames(s); return n.some((x) => /clean and jerk/.test(x)) && !n.some((x) => /snatch/.test(x)); });
  // A squat strength day: has a barbell squat, no classic olympic lift.
  const squatDay = week.sessions.some((s) => { const n = sessionNames(s); return n.some((x) => /squat/.test(x)) && !n.some((x) => /snatch|clean and jerk|clean & jerk/.test(x)); });
  assert(snatchDay, `H1 olympic (both) has a snatch-emphasis day — sessions: ${week.sessions.map((s) => sessionNames(s).slice(0, 3).join('/')).join(' | ')}`);
  assert(cjDay, 'H2 olympic (both) has a clean & jerk-emphasis day');
  assert(squatDay, 'H3 olympic (both) has a squat strength day');
}

// ── I · Olympic competed-lift SELECTION: snatch specialist skews to snatch ─────
{
  const week = workWeek(planForDisc('olympic', 3, ['mon', 'wed', 'fri'], { lifts: { squat: 150 }, olympic_lift: 'snatch' }));
  const snatchDays = week.sessions.filter((s) => sessionNames(s).some((x) => /snatch/.test(x))).length;
  const cjDays = week.sessions.filter((s) => { const n = sessionNames(s); return n.some((x) => /clean and jerk/.test(x)) && !n.some((x) => /snatch/.test(x)); }).length;
  assert(snatchDays >= 2, `I1 a snatch specialist gets ≥2 snatch days (got ${snatchDays})`);
  assert(cjDays === 0, `I2 a snatch specialist gets no dedicated clean&jerk day (got ${cjDays})`);
}

console.log(process.exitCode ? 'wp49-discipline-selection FAILURES' : 'PASS: wp49-discipline-selection — all gates');
