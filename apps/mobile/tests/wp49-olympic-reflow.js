// tests/wp49-olympic-reflow.js — WP-49 follow-up (flip final-review flag): the Olympic
// per-day emphasis (competed-lift day sequence + the maxStrength squat day) must survive the
// adaptive REFLOW, not just the baseline plan. Before the fix, the reflow called resolveSplit
// without competedLift (a snatch specialist reverted to the 'both' cycle → a clean & jerk day
// appeared) and dropped the squat day's targetQualityOverride. This drives a real reflow (plan
// started last week, nothing done → the current week reflows to absorb the shortfall) through
// PlanService.getPhases() — the exact read path the screens use.
process.env.TZ = 'Europe/London';

const RealDate = Date;
const NOW = new RealDate('2026-07-06T10:00:00').getTime(); // a Monday
globalThis.Date = class extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(NOW); }
  static now() { return NOW; }
};
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Plan started LAST Monday, nothing logged → the current week reflows (catch-up) — so we read a
// genuinely RE-DERIVED week, where a dropped emphasis would show.
const profileFor = (olympic_lift) => ({
  plan_start_date: '2026-06-29', plan_weeks: 8,
  goal_type: 'build', strength_style: 'olympic', olympic_lift,
  focus: ['gym'], primary: 'gym', experience: { gym: 'advanced' },
  availability: { days_per_week: 4, session_minutes: 60, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: FULL, sex: 'male', bodyweight_kg: 80, lifts: { squat: 150 }, onboarded: true
});
const currentWeek = () => {
  const cw = Plan.currentWeekNumber();
  for (const p of Plan.getPhases()) for (const w of (p.weeks || [])) if (w.num === cw) return w;
  return null;
};
const working = (week) => week.sessions.map((s) => (s.items || [])
  .filter((it) => (it.volumeFactor ?? 1) > 0 && it.section !== 'primer').map((it) => it.name.toLowerCase()));

// ── snatch specialist: the reflowed week stays snatch-focused (no clean & jerk day) ──
{
  Database.services.updateProfile(profileFor('snatch'));
  const week = currentWeek();
  assert(week && week._adapted, 'A1 the current Olympic week actually reflowed (re-derived, not baseline)');
  const names = working(week);
  const flat = names.flat();
  assert(flat.some((n) => /snatch/.test(n)), 'A2 the reflowed week still features the snatch');
  assert(!flat.some((n) => /clean and jerk|clean & jerk/.test(n)),
    `A3 a snatch specialist's reflowed week has NO clean & jerk (competed-lift emphasis survived reflow) — got: ${[...new Set(flat)].slice(0, 12).join(', ')}`);
  // The squat strength day survives: a session with a barbell squat and no classic olympic lift.
  const squatDay = names.some((n) => n.some((x) => /squat/.test(x)) && !n.some((x) => /snatch|clean/.test(x)));
  assert(squatDay, 'A4 the reflowed week keeps a squat strength day (the maxStrength override survived)');
}

// ── clean & jerk specialist: the mirror — reflowed week stays C&J-focused (no snatch day) ──
{
  Database.services.clear ? Database.services.clear() : null;
  Database.services.updateProfile(profileFor('cj'));
  const flat = working(currentWeek()).flat();
  assert(flat.some((n) => /clean and jerk|hang clean|power clean|clean pull/.test(n)), 'B1 the reflowed week features a clean/jerk lift');
  assert(!flat.some((n) => /snatch/.test(n)),
    `B2 a clean & jerk specialist's reflowed week has NO snatch (emphasis survived reflow) — got: ${[...new Set(flat)].slice(0, 12).join(', ')}`);
}

console.log(process.exitCode ? 'wp49-olympic-reflow FAILURES' : 'PASS: wp49-olympic-reflow — all gates');
