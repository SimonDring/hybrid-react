// tests/injury-constraints-first.js — WP-13: constraints before content (EDS L8).
//
// A run athlete with an active hamstring strain must never see a hinge SELECTED —
// the D11 reflow receives the contraindicated-pattern set up front and picks legal
// alternatives, instead of the post-generation injury filter stripping picks and
// leaving holes. Proof: the rendered week shows ZERO filter modifications (the
// filter is a fixed point), stays non-empty, and the WP-12 injury validator (the
// independent backstop) passes.

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
const { validateWeek } = await import('@performance-os/engine/lib/validation/contract.js');
const { contraindicatedPatternsForInjuries } = await import('@performance-os/engine/lib/session/movementRequirements.js');

Database.services.updateProfile({
  plan_start_date: '2026-07-06', plan_weeks: 8,
  goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'recreational',
  focus: ['gym'], primary: 'gym', experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80, onboarded: true
});
Plan.setRuntime({ sessions: {}, recovery: null, load: null });

const HINGE = /romanian|rdl|deadlift|good morning|hip hinge|hip thrust|nordic|leg curl/i;

function horizonMainItems() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizonEnd = today.getTime() + 10 * 86400000;
  const out = [];
  for (const phase of Plan.getPhases()) {
    for (const week of (phase.weeks || [])) {
      week.sessions.forEach((s) => {
        if (Plan.sessionDiscipline(s) !== 'gym') return;
        const d = Plan.dateForSession(week.num, s.title);
        if (!d) return;
        const ms = d.getTime();
        if (ms >= today.getTime() && ms <= horizonEnd) {
          out.push({ title: s.title, session: s, items: (s.items || []).filter((it) => it.section !== 'primer') });
        }
      });
    }
  }
  return out;
}

// ── Baseline (no injury): hinges present — proves the assertions below bite ──
const healthy = horizonMainItems();
assert(healthy.length >= 4, `healthy runner: ${healthy.length} in-horizon sessions`);
assert(healthy.some(({ items }) => items.some((it) => HINGE.test(it.name))),
  'healthy runner: hinge work IS selected (non-vacuity)');

// ── Active hamstring strain (severity 4 → protect blocks) ────────────────────
const injury = Database.services.addInjury({
  body_part_key: 'hamstring', body_part: 'Hamstring', side: 'n/a',
  severity: 4, status: 'active', rehab_phase: 'protect', date_occurred: '2026-07-01'
});
const patterns = contraindicatedPatternsForInjuries([injury]);
assert(patterns.has('hinge'), `hamstring@4 contraindicates the hinge pattern (got: ${[...patterns].join(', ') || 'none'})`);

const JUMPY = /pogo|jump|hop|bound|plyo/i;
const injured = horizonMainItems();
assert(injured.length === healthy.length,
  `injured runner keeps ALL ${healthy.length} in-horizon training days (got ${injured.length}) — no session lost to rehab replacement`);
assert(injured.every(({ items }) => items.length >= 1), 'no session shipped empty — legal alternatives selected');
assert(!injured.some(({ items }) => items.some((it) => HINGE.test(it.name))),
  'no hinge is SELECTED anywhere in the horizon (pattern-level constraint)');
assert(!injured.some(({ items }) => items.some((it) => !/pain-free/i.test(it.name) && JUMPY.test(it.name))),
  'no jump/plyo is SELECTED either (name-level constraint — the pattern vocabulary alone could not say "no jumping")');
assert(!injured.some(({ items }) => items.some((it) => it.substituted)),
  'zero post-filter substitutions — selection was already legal in the horizon');
// D9 constraint gate: when the diagnosed targets' drivers are blocked (hinges for
// robustness, jumps for reactive strength), the session re-targets the trainable
// maxStrength base — the athlete still gets REAL strength work (squat/lunge legal
// for a hamstring strain), not an accessory-only week.
const STRENGTH_COMPOUND = /squat|leg press|lunge|step-up|split squat/i;
assert(injured.every(({ items }) => items.some((it) => STRENGTH_COMPOUND.test(it.name))),
  'every in-horizon session still contains a legal strength compound (constraint re-target)');
assert(!injured.some(({ session }) => /rehab/i.test(session.title || '')),
  'no in-horizon session was replaced by a rehab session');
// Beyond the reflow horizon the baseline stays injury-blind and the post-filter is
// the backstop (a >70%-blocked baseline day still becomes a rehab session there) —
// the horizon rolls over those days as they approach. That division of labour is
// by design: selection where we reshape, filter where we don't.

// ── The independent backstop agrees ──────────────────────────────────────────
const phases = Plan.getPhases();
const cwWeek = phases[0].weeks[0];
const report = validateWeek(cwWeek, { injuries: [injury] });
const injFinding = report.findings.find((f) => f.validatorId === 'injury.contraindication');
assert(injFinding && injFinding.verdict === 'pass',
  `the WP-12 injury validator passes on the rendered week (${injFinding && injFinding.verdict})`);

// ── Recovery: injury resolves → hinges return (memo key includes injuries) ───
Database.services.updateInjury(injury.id, { status: 'recovered' });
const recovered = horizonMainItems();
assert(recovered.some(({ items }) => items.some((it) => HINGE.test(it.name))),
  'after recovery the hinge work returns (reflow cache invalidated by the injury signature)');
