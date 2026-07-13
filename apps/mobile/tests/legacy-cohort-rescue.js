// tests/legacy-cohort-rescue.js — P0-5 (engine audit B1/G6): the last three REAL cohorts
// riding the legacy volume-first deficit fill get rescued onto the diagnosis-first D11 path:
//   1. TRIATHLON (every triathlete)      — 'triathlon' ∉ D11_SPORTS ∉ CATEGORY_LED → legacy fill
//   2. ZERO-GAP RUN/CYCLE                — prioritise() returns [] for an athlete with no
//      capability gap; build got a fallback seed (WP-49 T4c), sports did not → legacy fill
//   3. CODE-LESS LEGACY GAA              — profile.sport 'gaa' with no sport_code resolves to
//      no SKB profile → empty demand → neutral-bodybuilder legacy fill
// After the rescue, each produces a diagnosis-steered plan: session objectives from D9 (never
// the legacy `source:'style'` marker), selection value-ordered (§34 tiers), meta.diagnosis
// shipped whenever the model actually found gaps. The legacy fill itself is NOT deleted here
// (that is M2); this only opens the gate for these cohorts.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

const gymSessions = (plan) => {
  const week = plan.phases[0].weeks[1] || plan.phases[0].weeks[0];
  return week.sessions.filter((s) => !s.discipline || s.discipline === 'gym');
};
const namesOf = (sessions) => sessions.flatMap((s) => (s.items || []).map((it) => (it.name || '').toLowerCase()));

// ── 1 · TRIATHLON — category-led D11 (its library IS its gym need: the swim+bike+run blend) ──
{
  const plan = generatePlan({
    ...answersToProfile(A({ goalType: 'sport', skbSport: 'triathlon', sportIntent: 'recreational', sportGoal: 'build_base', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] })),
    plan_start_date: '2026-07-06',
  });
  const sessions = gymSessions(plan);
  const names = namesOf(sessions);

  assert(plan.meta.diagnosis && (plan.meta.diagnosis.priorityQualities || []).length > 0,
    'triathlon: meta.diagnosis shipped (the model found gaps and the plan used them)');
  assert(sessions.every((s) => s._objective && s._objective.source !== 'style'),
    'triathlon: every session carries a D9/category objective, never the legacy style fallback');

  // The blend that legacy collapse destroyed (SKB audit 08 T1): upper pull + calf/single-leg
  // durability threaded through the WEEK — not a runner's leg-day, not a bodybuilding split.
  assert(names.some((n) => /pull-up|pullup|chin|row|pulldown/.test(n)),
    'triathlon: upper-body pull present (the swim leg is served)');
  assert(names.some((n) => /calf|split squat|lunge|step-up|step up/.test(n)),
    'triathlon: single-leg / calf run-durability work present');
  assert(names.some((n) => /squat|deadlift|rdl|hip thrust|hinge/.test(n)),
    'triathlon: lower-body strength present (the bike/run engine)');

  // No bodybuilding-split artefact: priority (sport) work threads every session — no session
  // is a body-part isolation day (audit 03 quality bar).
  const purposes = new Set(sessions.map((s) => s._objective && s._objective.purpose));
  assert(purposes.size >= 2, `triathlon: days are differentiated (${[...purposes].join(' / ')})`);
  assert(sessions.every((s) => (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0).length >= 3),
    'triathlon: every session ships >=3 working items');
}

// ── 2 · ZERO-GAP RUN/CYCLE — an athlete whose diagnosis finds NO gap still gets the
//        value-ordered D11 week (maxStrength maintenance floor), never the deficit fill.
//        The zero-gap model rides the documented opts.performanceModel override seam —
//        exactly what performanceModelForProfile produces for a fully-capable athlete. ──
for (const sport of ['run', 'cycle']) {
  const profile = {
    ...answersToProfile(A({ goalType: 'sport', sport, runDiscipline: sport === 'run' ? 'middle' : '', sportIntent: 'recreational', experienceLevel: 'advanced', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', bodyweight_kg: 80, lifts: { squat: 220, bench: 150, deadlift: 270, ohp: 100 } })),
    plan_start_date: '2026-07-06',
  };
  const zeroGap = { priorityAdaptations: [], limitingFactors: [] };
  const plan = generatePlan(profile, { performanceModel: zeroGap });
  const sessions = gymSessions(plan);

  assert(sessions.every((s) => s._objective && s._objective.source !== 'style'),
    `${sport} (zero-gap): sessions carry D9 objectives — the D11 path, not the legacy fill`);
  assert(sessions.every((s) => s._objective && s._objective.quality === 'maxStrength'),
    `${sport} (zero-gap): the maintenance floor targets maxStrength (gymTrainableTargets fallback)`);
  // Display honesty (WP-42a): NO gaps found -> NO diagnosis claim shipped.
  assert(!plan.meta.diagnosis,
    `${sport} (zero-gap): no meta.diagnosis invented for an empty diagnosis`);
  assert(sessions.every((s) => (s.items || []).filter((it) => (it.volumeFactor ?? 1) > 0).length >= 3),
    `${sport} (zero-gap): every session ships >=3 working items`);
}

// The diagnosed (non-empty) run cohort must be untouched by the rescue: still steered.
{
  const plan = generatePlan({
    ...answersToProfile(A({ goalType: 'sport', sport: 'run', runDiscipline: 'middle', sportIntent: 'recreational', experienceLevel: 'intermediate', daysPerWeek: 4, days: ['mon', 'tue', 'thu', 'fri'], equipment: FULL, sex: 'male', lifts: {} })),
    plan_start_date: '2026-07-06',
  });
  assert(plan.meta.diagnosis && gymSessions(plan).every((s) => s._objective && s._objective.source !== 'style'),
    'run (diagnosed): still diagnosis-steered — the rescue is additive, not a re-route');
}

// ── 3 · CODE-LESS LEGACY GAA — sport 'gaa', no sport_code (rows saved before sport_code
//        persisted). The generic-GAA prior resolves to gaelic_football (the same deliberate
//        default shape as the discipline-less runner -> running_middle, 2026-07-04): a real
//        invasion-sport diagnosis + category week instead of the neutral bodybuilder ramp. ──
{
  const profile = answersToProfile(A({ goalType: 'sport', sport: 'gaa', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, days: ['mon', 'wed', 'fri'], equipment: FULL, sex: 'male', lifts: {}, sportDays: ['tue', 'sat'] }));
  assert(profile.sport === 'gaa' && !profile.sport_code && !profile.athlete_model,
    'gaa (code-less): the legacy answer seed reproduces the code-less row (no sport_code, no stored model)');
  const plan = generatePlan({ ...profile, plan_start_date: '2026-07-06' });
  const sessions = gymSessions(plan);
  const names = namesOf(sessions);

  assert(plan.meta.diagnosis && (plan.meta.diagnosis.priorityQualities || []).length > 0,
    'gaa (code-less): meta.diagnosis shipped (a real SKB demand now exists)');
  assert(sessions.every((s) => s._objective && s._objective.source !== 'style'),
    'gaa (code-less): every session carries a D9/category objective, never the legacy style fallback');
  // Invasion-sport signature content (the gaelic_football library steers selection).
  assert(names.some((n) => /nordic|leg curl|romanian|rdl|hinge|deadlift|glute/.test(n)),
    'gaa (code-less): posterior-chain / hamstring-prevention work present');
  assert(names.some((n) => /pallof|woodchop|rotation|chop/.test(n)),
    'gaa (code-less): rotational / anti-rotation trunk work present');
  const purposes = new Set(sessions.map((s) => s._objective && s._objective.purpose));
  assert(purposes.size >= 2, `gaa (code-less): days are differentiated (${[...purposes].join(' / ')})`);
}

console.log('legacy-cohort-rescue: done');
