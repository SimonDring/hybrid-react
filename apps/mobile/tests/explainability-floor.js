// tests/explainability-floor.js — WP-43: EVERY athlete gets a "why" (Art 14), and runtime
// reshaping is visible (Art 15): style-derived objectives on the legacy path (an honest
// account of how the session was built — never a diagnosis claim), sport-rule trims carry
// their fired rule ids, and a real catch-up spread names the sets it recovered.
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

const { generatePlan } = await import('@performance-os/engine');
const { answersToProfile, BLANK_ANSWERS } = await import('../src/lib/onboardingModel.js');
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const gymSessions = (plan) => plan.phases.flatMap((p) => p.weeks.flatMap((w) => w.sessions.filter((s) => !s.discipline || s.discipline === 'gym')));

// ── E1 · build sessions explain themselves, honestly ──────────────────────────
{
  const plan = generatePlan({ ...answersToProfile(A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })), plan_start_date: '2026-07-06' });
  const objs = gymSessions(plan).map((s) => s._objective);
  assert(objs.length > 0 && objs.every((o) => o && o.purpose && o.rationale), 'E1a every build session carries an objective + rationale');
  // WP-49 T6 (THE FLIP): build now runs off the diagnosis engine, so its objectives are
  // diagnosis-derived (a target quality + an honest rationale), NOT the old style label — exactly
  // like the sport cohorts (E2/E3). Displaying the diagnosis is honest for build now.
  assert(objs.every((o) => o.source !== 'style'), 'E1b build objectives are diagnosis-derived (not a style label)');
  assert(objs.every((o) => o.quality && /diagnosis/i.test(o.rationale)), 'E1c build objectives are grounded in the diagnosis (carry a target quality + say so)');
  assert(new Set(objs.map((o) => o.purpose)).size >= 2, 'E1d split days carry different purposes');
}

// ── E2 · the D11 cohort keeps its D9 objective (not overwritten) ──────────────
{
  const plan = generatePlan({ ...answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL })), plan_start_date: '2026-07-06' });
  const objs = gymSessions(plan).map((s) => s._objective).filter(Boolean);
  assert(objs.length > 0 && objs.every((o) => o.source !== 'style'), 'E2 runner sessions keep the D9 diagnosis-derived objective');
}

// ── E3 · team sports are category-led (WP-48): D9 objectives, not the style fallback ──
{
  const plan = generatePlan({ ...answersToProfile(A({ goalType: 'sport', sport: 'gaa', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL })), sport_code: 'hurling', plan_start_date: '2026-07-06' });
  const objs = gymSessions(plan).map((s) => s._objective);
  assert(objs.every((o) => o && o.source !== 'style' && o.rationale),
    'E3 hurler sessions carry category/D9 objectives (the flip replaced the style fallback)');
}

// ── E4 · a real catch-up spread stamps the week ───────────────────────────────
{
  const Database = (await import('../src/lib/Database.js')).default;
  const Plan = await import('../src/lib/PlanService.js');
  // Plan started last Monday; nothing done → last week's sessions are missed and the
  // current horizon absorbs the recoverable shortfall.
  Database.services.updateProfile({
    plan_start_date: '2026-06-29', plan_weeks: 8,
    goal_type: 'build', strength_style: 'strength',
    focus: ['gym'], primary: 'gym', experience: { gym: 'intermediate' },
    availability: { days_per_week: 4, session_minutes: 60, days: ['monday', 'tuesday', 'thursday', 'friday'] },
    access: FULL, sex: 'male', bodyweight_kg: 80, onboarded: true
  });
  const phases = Plan.getPhases();
  const cw = Plan.currentWeekNumber();
  const week = phases.flatMap((p) => p.weeks || []).find((w) => w.num === cw);
  assert(week && week._adapted, 'E4a the current week is reflowed');
  assert(week._catchUp && week._catchUp.sets >= 1, `E4b the catch-up spread is visible (${week._catchUp ? week._catchUp.sets + ' sets' : 'absent'})`);
}
