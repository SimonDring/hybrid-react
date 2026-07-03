// tests/reflow-d11-quality.js — WP-05: the reflow keeps run/cycle weeks D11-driven.
//
// Sprint 8 wired the diagnosis (D4/D5 → D9/D10 → D11) into BOTH generatePlan and the
// PlanService reflow (gymCtx). The generator side is pinned by d11-runner-quality.js;
// the reflow side was proven by inspection only. This drives a run profile through
// the real screens' read path — PlanService.getPhases(), which reflows the current
// horizon via adaptedPhases() — and asserts the REFLOWED sessions carry D11 content,
// under an idle runtime and again mid-week with settled state + readiness.

process.env.TZ = 'Europe/London';

// Fixed clock — the reflow horizon is date-relative.
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

// Intermediate distance runner, off-season, 4 gym days — the Sprint 8 archetype.
Database.services.updateProfile({
  plan_start_date: '2026-07-06', plan_weeks: 8,
  goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational',
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80, onboarded: true
});

const OFF_TARGET = /chest fly|pec deck|biceps curl|spider curl|triceps|lateral raise/;
const DURABILITY = /nordic|romanian|rdl|hamstring|glute|calf|squat|deadlift|lunge|step.?up/;

// The reflowed (rendered) in-horizon gym sessions, exactly as SessionDetail reads them.
function horizonGymSessions() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizonEnd = today.getTime() + 10 * 86400000;
  const out = [];
  for (const phase of Plan.getPhases()) {
    for (const week of (phase.weeks || [])) {
      week.sessions.forEach((s, i) => {
        if (Plan.sessionDiscipline(s) !== 'gym') return;
        const d = Plan.dateForSession(week.num, s.title);
        if (!d) return;
        const ms = d.getTime();
        if (ms >= today.getTime() && ms <= horizonEnd) out.push({ phase, week, i, session: s });
      });
    }
  }
  return out;
}

function assertD11(label, sessions) {
  assert(sessions.length > 0, `${label}: found ${sessions.length} in-horizon reflowed gym session(s)`);
  const names = sessions.flatMap(({ session }) => (session.items || []).map((it) => (it.name || '').toLowerCase()));
  assert(names.length > 0, `${label}: reflowed sessions are non-empty`);
  assert(!names.some((n) => OFF_TARGET.test(n)),
    `${label}: reflowed runner sessions exclude chest/arm isolation (got: ${names.join(', ')})`);
  assert(names.some((n) => DURABILITY.test(n)),
    `${label}: reflowed runner sessions include durability / lower-body strength work`);
}

// ── Scenario 1: idle runtime (fresh plan, nothing settled) ──────────────────
Plan.setRuntime({ sessions: {}, recovery: null, load: null });
assertD11('idle', horizonGymSessions());

// ── Scenario 2: mid-week — one completed session + moderate readiness ───────
// The reflow must reshape the REMAINING pending sessions around the done work and
// still select from the D11 brain (this is the path that regressed to the legacy
// fill before gymCtx carried the diagnosis).
const first = horizonGymSessions()[0];
const key = `p${first.phase.id}_wk${first.week.num}_s${first.i}`;
Plan.setRuntime({
  sessions: {
    [key]: { completed: true, createdAt: '2026-07-06T18:00:00.000Z', completedAt: '2026-07-06T18:45:00.000Z', recovery: 3 }
  },
  recovery: { score: 60, readinessLevel: 'moderate', sessionOverride: null },
  load: null
});
const pending = horizonGymSessions().filter(({ phase, week, i }) => `p${phase.id}_wk${week.num}_s${i}` !== key);
assertD11('mid-week', pending);

// KNOWN GAP (not asserted yet): the baseline generator differentiates a runner's
// week (Lower vs Lower Explosive days), but the reflow rebuilds each horizon slot
// independently and collapses them to identical content — the D9 quality rotation
// is lost. That is the WP-24 reflow re-seat's problem to fix; when it lands, add
// an assertion here that a 4-day runner week has ≥2 distinct session contents.

// Determinism: the same runtime state renders the same reflowed content.
const a = JSON.stringify(horizonGymSessions().map(({ session }) => (session.items || []).map((it) => it.name)));
const b = JSON.stringify(horizonGymSessions().map(({ session }) => (session.items || []).map((it) => it.name)));
assert(a === b, 'reflowed content is stable across reads');
