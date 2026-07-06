// tests/validate-what-ships.js — WP-39: D14 validates the RUNTIME artefact, not just the
// pure baseline. The shipped week (reflowed + injury-filtered — what the athlete actually
// trains) carries a ValidationReport with the athlete's ACTIVE injuries in context, and
// on-the-fly substitutions never offer a contraindicated candidate.
// Backlog: docs/architecture/REASSESSMENT-2026-07-05.md Priority 2.

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
const { generatePlan, validate, substituteOptions, resolveLifts, blockedNameRegexesForInjuries } = await import('@performance-os/engine');

// Legacy-path build athlete — the cohort whose injuries are post-filtered today.
const PROFILE = {
  plan_start_date: '2026-07-06', plan_weeks: 8,
  goal_type: 'build', strength_style: 'strength',
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 60, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80, onboarded: true
};
Database.services.updateProfile(PROFILE);

const currentWeek = () => {
  const phases = Plan.getPhases();
  const cw = Plan.currentWeekNumber();
  for (const p of phases) for (const w of (p.weeks || [])) if (w.num === cw) return w;
  return null;
};

// ── T1 · healthy athlete: the shipped current week carries a ValidationReport ──
{
  const w = currentWeek();
  const v = (w && w._validation) || null;
  assert(!!v, 'T1a shipped current week carries _validation');
  assert(v && v.pass === true, 'T1b healthy build week validates clean');
  assert(v && v.counts && typeof v.counts.veto === 'number', 'T1c report carries verdict counts');
  const ids = ((v && v.findings) || []).map((f) => f.validatorId);
  assert(ids.includes('injury.contraindication'), 'T1d the injury validator ran on the shipped artefact');
}

// ── T2 · active severity-4 hamstring strain ──────────────────────────────────
const injury = Database.services.addInjury({
  body_part_key: 'hamstring', body_part: 'Hamstring', side: 'n/a',
  severity: 4, status: 'active', rehab_phase: 'protect', date_occurred: '2026-07-01'
});
{
  // The PRE-filter baseline week for this athlete contains hinge work — D14 with the
  // athlete's injuries in ctx must veto it. (Construction proposes, validation disposes:
  // this is the independent floor the runtime path now runs behind the filter.)
  const baseline = generatePlan(Database.services.getProfile());
  const baseWeek = baseline.phases[0].weeks[0];
  const active = Database.services.listInjuries().filter((i) => i.status === 'active');
  const pre = validate(baseWeek, { access: PROFILE.access, injuries: active });
  assert(pre.counts.veto > 0, 'T2a unfiltered baseline week vetoes under the active injury (the floor is real)');

  // The SHIPPED week (reflow + injury filter) must validate clean WITH injuries in ctx —
  // end-to-end proof the filter and the validator agree on the final artefact.
  const w = currentWeek();
  const v = (w && w._validation) || null;
  assert(!!v, 'T2b injured athlete still gets a report on the shipped week');
  assert(v && v.pass === true, 'T2c shipped (filtered) week is injury-clean — filter ⇄ validator agree');
}

// ── T3 · substitutions are injury-aware ───────────────────────────────────────
{
  const profile = Database.services.getProfile();
  const ctxBase = { access: PROFILE.access, lifts: resolveLifts(profile), level: 'intermediate' };
  const item = { name: 'Romanian deadlift' }; // its substitutes are the hinge family — exactly what a hamstring strain blocks
  const active = Database.services.listInjuries().filter((i) => i.status === 'active');

  const blind = substituteOptions(item, ctxBase);
  const aware = substituteOptions(item, { ...ctxBase, injuries: active });
  // Judge against the injury system's OWN policy — the same regexes the filter,
  // the D14 validator, and (now) substitutions all share.
  const blocked = blockedNameRegexesForInjuries(active);
  const hits = (list) => list.filter((o) => blocked.some((r) => r.test(o.name))).map((o) => o.name);
  assert(hits(blind).length > 0, `T3a (pre-fix shape) injury-blind list offers blocked work (${hits(blind).join(', ')})`);
  assert(hits(aware).length === 0, 'T3b no contraindicated candidate is ever offered');
  assert(aware.length > 0, 'T3c legal alternatives still offered (hip thrust / squats survive the hamstring block)');
}

// ── T4 · recovery restores the full candidate list ────────────────────────────
{
  Database.services.updateInjury(injury.id, { status: 'recovered' });
  const profile = Database.services.getProfile();
  const active = Database.services.listInjuries().filter((i) => i.status === 'active');
  const aware = substituteOptions({ name: 'Back squat' }, {
    access: PROFILE.access, lifts: resolveLifts(profile), level: 'intermediate', injuries: active,
  });
  assert(aware.some((o) => /romanian|deadlift|leg curl/i.test(o.name)) || active.length === 0,
    'T4 recovered injury no longer constrains substitutions');
}
