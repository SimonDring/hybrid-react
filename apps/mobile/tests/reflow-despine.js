// tests/reflow-despine.js
//
// The baseline generator runs a post-schedule de-spine pass (PlanGenerator →
// despineWeek): after a high-axial day, the NEXT adjacent training day swaps its
// high-axial, intent-tagged lifts for a lower-axial member of the same intent, and
// its `axialLoad` reflects the lifts it actually contains. The adaptive reflow
// (PlanService.adaptedPhases) re-derives the current week with its own allocator
// pass, so it must apply the SAME de-spine over the reshaped week the athlete
// actually trains — otherwise the trained week diverges from the plan.
//
// De-spine reads each session's `axialLoad` (to know which prior day was spine-heavy)
// and `dayIdx` (adjacency). Before this fix the reflow stamped a reshaped session
// with its ORIGINAL baseline slot's `axialLoad`, not the reshaped lifts' — so the
// cross-day signal de-spine depends on was wrong. This test pins:
//   (1) every reshaped current-week gym session carries an `axialLoad` that matches
//       the lifts it actually contains (the input de-spine needs), and
//   (2) the reflowed week honours the de-spine invariant — no high-axial, intent-
//       tagged lift is left on the day after a high-axial day when a lower-axial
//       sibling of the same intent exists.

process.env.TZ = 'Europe/London';

const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }, clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const { resolveProgram } = await import('@performance-os/engine/lib/strength/program.js');
const { EXERCISES } = await import('@performance-os/engine/data/strengthExercises.js');
const { HIGH_DAY_THRESHOLD, axialOf } = await import('@performance-os/engine/lib/plan/axial.js');
const { WINDOW_DAYS } = await import('@performance-os/engine/lib/plan/rollingVolume.js');

const BY_NAME = new Map(EXERCISES.map(e => [e.name.toLowerCase(), e]));
const exOf = (name) => BY_NAME.get(String(name || '').toLowerCase());
// Axial load of a session computed from the lifts it actually contains.
const computedAxial = (s) => (s.items || []).reduce((a, it) => a + axialOf(exOf(it.name)), 0);
const dist = (a, b) => { const g = ((a - b) % 7 + 7) % 7; return Math.min(g, 7 - g); };

// Start the plan on the upcoming Monday so the whole of week 1 is today-or-future:
// every session falls inside the rolling reflow horizon (so it's reshaped) and
// nothing reads as "missed", keeping the comparison about de-spine, not catch-up.
const nextMon = new Date(); nextMon.setHours(0, 0, 0, 0);
nextMon.setDate(nextMon.getDate() + (((8 - nextMon.getDay()) % 7) || 7));

Database.services.updateProfile({
  plan_start_date: localDay(nextMon), plan_weeks: 8,
  goal_type: 'strength', focus: ['gym'], primary: 'gym',
  experience: { gym: 'advanced' },
  availability: { days_per_week: 5, session_minutes: 60, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 85, onboarded: true
});
Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });   // neutral: nothing done, full readiness

const program = resolveProgram(Database.services.getProfile());
const priorityByIntent = program.priorityByIntent || new Map();

const cw = Plan.currentWeekNumber();
assert(cw != null, `plan has a current week (cw=${cw})`);

const phase = Plan.getPhases().find(p => (p.weeks || []).some(w => w.num === cw));
const week = phase.weeks.find(w => w.num === cw);

// The reshaped sessions: current-week gym sessions whose date lands inside the
// reflow horizon [today, today + WINDOW_DAYS]. These are the only ones the reflow
// rebuilds — and the only ones whose stamped axialLoad could go stale.
const today = new Date(); today.setHours(0, 0, 0, 0);
const horizonEnd = today.getTime() + WINDOW_DAYS * 86400000;
const reshaped = [];
week.sessions.forEach((s) => {
  if (Plan.sessionDiscipline(s) !== 'gym') return;
  const d = Plan.dateForSession(week.num, s.title);
  if (!d) return;
  if (d.getTime() >= today.getTime() && d.getTime() <= horizonEnd) reshaped.push(s);
});

assert(reshaped.length > 0, `found ${reshaped.length} reshaped current-week gym session(s) to check`);

// (1) Each reshaped session's stamped axialLoad must match the lifts it contains —
// the cross-day input de-spine relies on. (Pre-fix the reflow stamped the original
// baseline slot's axialLoad, so this mismatched the reshaped lifts.)
for (const s of reshaped) {
  const want = computedAxial(s);
  assert(s.axialLoad === want,
    `[${s.title}] axialLoad matches its lifts (field ${s.axialLoad} vs computed ${want})`);
}

// (2) De-spine invariant over the reshaped week: after a high-axial day, the next
// adjacent training day must not still carry a high-axial, intent-tagged lift that
// has a lower-axial sibling of the same intent — de-spine would have swapped it.
const ordered = [...reshaped].sort((a, b) => (a.dayIdx ?? 0) - (b.dayIdx ?? 0));
let violations = 0;
for (let i = 1; i < ordered.length; i++) {
  const prev = ordered[i - 1], cur = ordered[i];
  if (computedAxial(prev) < HIGH_DAY_THRESHOLD) continue;
  if (dist(cur.dayIdx ?? 0, prev.dayIdx ?? 0) > 1) continue;
  for (const it of (cur.items || [])) {
    const ex = exOf(it.name);
    if (!ex || axialOf(ex) < 2 || !it.intent) continue;
    const cands = priorityByIntent.get(it.intent) || [];
    let minAx = Infinity;
    for (const id of cands) { const c = EXERCISES.find(e => e.id === id); if (c && axialOf(c) < minAx) minAx = axialOf(c); }
    if (minAx < axialOf(ex)) { violations++; console.error(`  ↳ un-de-spined ${it.name} (ax${axialOf(ex)}, ${it.intent}) on ${cur.title} after a high-axial day`); }
  }
}
assert(violations === 0, `reflowed week honours the de-spine invariant (${violations} violation(s))`);

console.log(process.exitCode ? 'reflow-despine FAILURES' : `PASS: reflow-despine — ${pass} assertions`);
