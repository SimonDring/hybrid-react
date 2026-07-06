// tests/wp55-reflow-identity.js — WP-55: a neutral-day reflow is baseline-identity.
//
// The runtime reflow re-derives the current week around what's been done + readiness +
// load. On a NEUTRAL day (nothing done, full readiness, on-track load, no injury) it must
// be a NO-OP: the week the athlete trains equals the baseline plan the rest of the horizon
// shows. Before WP-55 it re-allocated every slot from scratch and DIVERGED — changing
// exercises/schemes and DROPPING the baseline's programmed power/plyo work (the evidence
// measured in the reassessment §WP-55). The fix: a slot whose inputs are all no-ops keeps
// its baseline session; only genuinely-changed slots re-allocate.
//
// Test: with a fully-neutral runtime, every current-week horizon gym session's CORE work
// (exId + scheme, primers excluded) must byte-match the baseline generatePlan — UNLESS it
// was legitimately lightened for a sport-busy day (a genuinely changed input). Baseline
// generation is deterministic and future (un-reflowed) weeks already match, so any current-
// week difference is reflow churn.

process.env.TZ = 'Europe/London';
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }, clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};
const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const { generatePlan } = await import('@performance-os/engine');
const { WINDOW_DAYS } = await import('@performance-os/engine/lib/plan/rollingVolume.js');

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

const PROFILES = [
  { label: 'strength / advanced', profile: {
      goal_type: 'strength', experience: { gym: 'advanced' },
      availability: { days_per_week: 5, session_minutes: 60, days: ['monday','tuesday','wednesday','thursday','friday'] } } },
  { label: 'sport=soccer / intermediate', profile: {
      goal_type: 'sport', sport: 'soccer', experience: { gym: 'intermediate' },
      availability: { days_per_week: 4, session_minutes: 60, days: ['monday','tuesday','thursday','saturday'] } } },
];

function nextMonday() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return d; }
const isPrimer = (it) => it.tag === 'mobility' || it.restSec === 0;
const coreSig = (s) => (s.items || []).filter((it) => !isPrimer(it)).map((it) => `${it.name}/${it.exId}/${it.sets}/${it.rpe}/${it.restSec}`).join('|');

let horizonTotal = 0, churned = 0;
for (const { label, profile } of PROFILES) {
  for (const k of Object.keys(_ls)) delete _ls[k];
  const start = nextMonday();
  Database.services.updateProfile({ ...profile, focus: ['gym'], primary: 'gym',
    access: ['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'], sex: 'male', bodyweight_kg: 82,
    plan_start_date: localDay(start), plan_weeks: 8, onboarded: true });
  Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });   // fully neutral

  const prof = Database.services.getProfile();
  const base = generatePlan(prof).phases;
  const adapt = Plan.getPhases();
  const cw = Plan.currentWeekNumber();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizonEnd = today.getTime() + WINDOW_DAYS * 86400000;
  const bw = base.flatMap((p) => p.weeks || []).find((w) => w.num === cw);
  const aw = adapt.flatMap((p) => p.weeks || []).find((w) => w.num === cw);
  assert(bw && aw, `${label}: found current week (cw=${cw})`);

  let horizon = 0;
  bw.sessions.forEach((bs, i) => {
    if (Plan.sessionDiscipline(bs) !== 'gym') return;
    const d = Plan.dateForSession(cw, bs.title);
    if (!d || d.getTime() < today.getTime() || d.getTime() > horizonEnd) return;
    horizon++; horizonTotal++;
    const as = aw.sessions[i];
    if (as && as.lightened) return;   // sport-busy lightening is a legitimate, changed input
    const identical = as && coreSig(bs) === coreSig(as) && bs.title === as.title;
    if (!identical) {
      churned++;
      console.error(`  ✗ ${label} · "${bs.title}"${as && as.title !== bs.title ? ` → "${as.title}"` : ''} diverges from baseline on a neutral day`);
    }
  });
  assert(horizon > 0, `${label}: has horizon gym sessions (${horizon})`);
}

assert(horizonTotal > 0, `walked ${horizonTotal} horizon gym session(s)`);
assert(churned === 0, `every neutral-day horizon session is baseline-identical, bar sport-busy lightening (${churned} churned)`);

console.log(process.exitCode ? 'wp55-reflow-identity FAILURES' : `PASS: wp55-reflow-identity — ${pass} assertions, ${horizonTotal} sessions`);
