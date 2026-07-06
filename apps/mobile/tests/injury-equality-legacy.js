// tests/injury-equality-legacy.js — WP-40: constraints-first injuries on the LEGACY path.
//
// Before this fix, an injured BUILD athlete's reflowed sessions still selected
// contraindicated exercises, which the injury filter then marked `substituted` and the UI
// silently hid — no redistribution, lost volume, silent debt (Art 8 / Art 15). An injured
// runner (D11 path) already got constraints-first selection (PR #74/#75). This proves the
// legacy fill now honours the same runtime contraindications: blocked movements are never
// SELECTED, so sessions ship full and legal. The pure baseline generator stays injury-blind
// by design (injuries are runtime state) — goldens are untouched.
// Backlog: docs/architecture/REASSESSMENT-2026-07-05.md Priority 3.

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
const { blockedNameRegexesForInjuries } = await import('@performance-os/engine');

Database.services.updateProfile({
  plan_start_date: '2026-07-06', plan_weeks: 8,
  goal_type: 'build', strength_style: 'strength',
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 60, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80, onboarded: true
});

Database.services.addInjury({
  body_part_key: 'hamstring', body_part: 'Hamstring', side: 'n/a',
  severity: 4, status: 'active', rehab_phase: 'protect', date_occurred: '2026-07-01'
});

const active = Database.services.listInjuries().filter((i) => i.status === 'active');
const blocked = blockedNameRegexesForInjuries(active);
assert(blocked.length > 0, 'T0 the hamstring protect phase blocks movements (fixture sane)');

// In-horizon gym sessions exactly as screens read them (reflow re-derives the horizon,
// then the injury filter runs — with constraints-first selection it should be a no-op).
function horizonGymSessions() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizonEnd = today.getTime() + 10 * 86400000;
  const out = [];
  for (const phase of Plan.getPhases()) {
    for (const week of (phase.weeks || [])) {
      for (const s of (week.sessions || [])) {
        if (s.discipline && s.discipline !== 'gym') continue;
        const d = Plan.dateForSession(week.num, s.title);
        if (!d) continue;
        const t = d.getTime();
        if (t >= today.getTime() && t < horizonEnd) out.push({ week: week.num, ...s });
      }
    }
  }
  return out;
}

const sessions = horizonGymSessions();
assert(sessions.length >= 3, `T1 horizon has real gym sessions (got ${sessions.length})`);

// T2 — nothing blocked was SELECTED: no hidden (substituted) items remain after the filter.
{
  const hidden = sessions.flatMap((s) => (s.items || []).filter((it) => it.substituted).map((it) => `${s.title}: ${it.name}`));
  assert(hidden.length === 0, `T2 no silent holes — zero items struck by the filter (${hidden.join('; ') || 'clean'})`);
}

// T3 — no visible working item matches a blocked regex (belt and braces with T2).
{
  const bad = sessions.flatMap((s) => (s.items || [])
    .filter((it) => !it.substituted && it.tag !== 'rehab' && it.section !== 'primer')
    .filter((it) => blocked.some((r) => r.test(it.name || '')))
    .map((it) => `${s.title}: ${it.name}`));
  assert(bad.length === 0, `T3 no contraindicated selection ships (${bad.join('; ') || 'clean'})`);
}

// T4 — sessions ship FULL: every horizon session keeps a real dose (no under-dosed holes).
{
  const thin = sessions.filter((s) => (s.items || []).filter((it) => !it.substituted && it.section !== 'primer').length < 3);
  assert(thin.length === 0, `T4 every session keeps ≥3 working items (thin: ${thin.map((s) => s.title).join(', ') || 'none'})`);
}

// T5 — lower-body work is REDISTRIBUTED, not deleted: some legal lower compound appears
// across the horizon (squat family / lunge / leg press / hip thrust are hamstring-legal).
{
  const LEGAL_LOWER = /squat|lunge|leg press|step-?up|hip thrust|glute bridge|leg extension|calf/i;
  const found = sessions.flatMap((s) => (s.items || []))
    .filter((it) => !it.substituted && LEGAL_LOWER.test(it.name || ''));
  assert(found.length > 0, 'T5 legal lower-body work survives (protect the injury, train everything else)');
}
