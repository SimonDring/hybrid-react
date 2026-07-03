// tests/determinism-clock.js
//
// Constitution Art 18: the same profile must produce the same plan whatever day
// it is generated on. This pins the fix for the three clock leaks the Phase 3
// audit named (V4 / WP-03):
//   PlanGenerator.js  — race-taper anchor fell back to new Date() for undated profiles
//   periodization.js  — deriveSeason measured the event window from the real clock
//   periodization.js  — continueBlock stamped the real clock into the profile patch
//
// Method: a mutable fixed-clock Date shim; generate the same profile under two
// clock days far enough apart to cross every season window (56/120 days) and
// assert byte-identical output.

process.env.TZ = 'Europe/London';

const RealDate = Date;
let NOW = new RealDate('2026-07-06T10:00:00').getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(NOW); }
  static now() { return NOW; }
};
const setClock = (iso) => { NOW = new RealDate(`${iso}T10:00:00`).getTime(); };

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const { generatePlan } = await import('@performance-os/engine/lib/PlanGenerator.js');
const { deriveSeason, continueBlock } = await import('@performance-os/engine/lib/plan/periodization.js');

// Clock days chosen so a clock-derived "days until event" would cross the
// in-season (≤56d) / pre-season (≤120d) / off-season boundaries between runs.
const DAY_A = '2026-07-06';
const DAY_B = '2026-11-20';

const PROFILES = {
  'dated sport + event': {
    plan_start_date: '2026-07-06', plan_weeks: 8,
    goal_type: 'sport', sport: 'run', run_discipline: 'long',
    sport_intent: 'compete', event_date: '2026-10-04',
    experience: { gym: 'intermediate' },
    availability: { days_per_week: 3, days: ['monday', 'wednesday', 'friday'] },
    access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
    sex: 'male', bodyweight_kg: 80
  },
  'UNDATED sport + event (the leak)': {
    plan_weeks: 8,
    goal_type: 'sport', sport: 'run', run_discipline: 'long',
    sport_intent: 'compete', event_date: '2026-10-04',
    experience: { gym: 'intermediate' },
    availability: { days_per_week: 3, days: ['monday', 'wednesday', 'friday'] },
    access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
    sex: 'male', bodyweight_kg: 80
  },
  'UNDATED build': {
    goal_type: 'build', strength_style: 'strength',
    experience: { gym: 'beginner' },
    availability: { days_per_week: 3, days: ['monday', 'wednesday', 'friday'] },
    access: ['barbell', 'dumbbell', 'bodyweight'],
    sex: 'female', bodyweight_kg: 65
  }
};

for (const [label, profile] of Object.entries(PROFILES)) {
  setClock(DAY_A);
  const a = JSON.stringify(generatePlan(profile));
  setClock(DAY_B);
  const b = JSON.stringify(generatePlan(profile));
  assert(a === b, `generatePlan [${label}] is byte-identical across clock days ${DAY_A} vs ${DAY_B}`);
}

// deriveSeason: anchored to plan_start_date, immune to the clock; and the dated
// anchor actually drives the window (event 90 days after the anchor = 'pre').
setClock(DAY_A);
const seasonA = deriveSeason(PROFILES['dated sport + event']);
setClock(DAY_B);
const seasonB = deriveSeason(PROFILES['dated sport + event']);
assert(seasonA === seasonB, `deriveSeason is clock-independent (${seasonA} === ${seasonB})`);
assert(seasonA === 'pre', `deriveSeason measures the event window from plan_start_date (90 days out => 'pre', got '${seasonA}')`);

// An undated profile with an event falls through to the intent branch — it never
// guesses from the real calendar.
setClock(DAY_A);
const undatedA = deriveSeason(PROFILES['UNDATED sport + event (the leak)']);
setClock(DAY_B);
const undatedB = deriveSeason(PROFILES['UNDATED sport + event (the leak)']);
assert(undatedA === undatedB && undatedA === 'in',
  `undated profile season is deterministic via the intent branch (got '${undatedA}'/'${undatedB}')`);

// continueBlock: "today" is caller-supplied input, never the clock.
const patch = continueBlock(
  { plan_start_date: '2026-05-01', plan_weeks: 8, goal_type: 'build', strength_style: 'strength' },
  { feel: 'just_right', changed: false, sameGoal: true, hitSessions: true },
  '2026-06-26'
);
assert(patch.progress === true, 'continueBlock: normal progress advances the block');
assert(patch.profilePatch.plan_start_date === '2026-06-26',
  `continueBlock stamps the supplied date, not the clock (got ${patch.profilePatch.plan_start_date})`);
const hist = patch.profilePatch.block_history;
assert(hist[hist.length - 1].completed_date === '2026-06-26',
  `block_history stamps the supplied date (got ${hist[hist.length - 1].completed_date})`);

let threw = false;
try { continueBlock({}, {}); } catch { threw = true; }
assert(threw, 'continueBlock without todayISO throws (the engine never reads the clock)');
