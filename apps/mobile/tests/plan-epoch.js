// tests/plan-epoch.js
// Session completion is keyed by POSITION (p1_wk1_s0…). When a user builds a new
// plan the old plan's rows survive and reuse those keys. The `withinEpoch` guard
// is meant to stop stale rows from marking the new plan's identical slots
// done/missed — but it was missing from the store view (so the calendar/week strip
// showed phantom "Missed"/"Done") and from the write path (so acting on a slot
// reused the stale row and never re-entered the epoch). This test pins both, plus
// the timezone-safe plan_start_date that the off-by-one "intermittent" bug needs.

// Fix a UTC+9 zone so the local-vs-UTC date assertions are deterministic.
process.env.TZ = 'Asia/Tokyo';

// localStorage shim must exist BEFORE Database.js boots (it writes on import).
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

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------------------------------------------------------------------------
// A3 — plan_start_date is the LOCAL date, never the UTC date.
// ---------------------------------------------------------------------------
const onboarding = await import('../src/lib/onboardingModel.js');
const { localISODate, answersToProfilePatch } = onboarding;

assert(typeof localISODate === 'function', 'A3.0 localISODate is exported');
// 2026-06-21T20:00Z is 2026-06-22 05:00 in Tokyo → local date is the 22nd.
assert(localISODate(new Date('2026-06-21T20:00:00Z')) === '2026-06-22',
  'A3.1 returns the LOCAL date, not the UTC date');
assert(localISODate(new Date('2026-01-05T02:00:00Z')) === '2026-01-05',
  'A3.2 zero-pads month and day');

const patch = answersToProfilePatch({
  goalType: 'build', strengthStyle: 'strength',
  daysPerWeek: 3, sessionMinutes: 60,
  equipment: ['barbell'], lifts: { squat: '', bench: '', deadlift: '' }
});
assert(patch.plan_start_date === localISODate(new Date()),
  'A3.3 plan_start_date is the local today');

// ---------------------------------------------------------------------------
// Seed: a current plan starting today, plus stale rows from a previous plan
// that reuse the new plan's positional keys.
// ---------------------------------------------------------------------------
const Database = (await import('../src/lib/Database.js')).default;
const todayISO = localDay(new Date());

Database.services.updateProfile({
  plan_start_date: todayISO, plan_weeks: 8,
  goal_type: 'build', strength_style: 'strength', focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, session_minutes: 60, days: [] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  onboarded: true
});

const STALE = '2000-01-01T00:00:00.000Z';
// previous-plan rows (out of epoch) at the new plan's identical slots
Database.tables.sessions.create({ template_ref: 'p1_wk1_s0', status: 'skipped',   created_at: STALE, started_at: null,  completed_at: null });
Database.tables.sessions.create({ template_ref: 'p1_wk1_s1', status: 'completed', created_at: STALE, started_at: STALE, completed_at: STALE });
// a current-plan completed row (in epoch) — must still count as done
Database.tables.sessions.create({ template_ref: 'p1_wk1_s2', status: 'completed', created_at: `${todayISO}T12:00:00.000Z`, started_at: `${todayISO}T11:00:00.000Z`, completed_at: `${todayISO}T12:00:00.000Z` });

// ---------------------------------------------------------------------------
// A1 — the store view hides stale settled-state, keeps in-epoch state.
// ---------------------------------------------------------------------------
const { useTrainingStore } = await import('../src/stores/trainingStore.js');
const view = useTrainingStore.getState().sessions;

assert(view['p1_wk1_s0'] && view['p1_wk1_s0'].skipped === false,
  'A1.1 out-of-epoch skipped row is not shown as missed');
assert(view['p1_wk1_s1'] && view['p1_wk1_s1'].completed === false,
  'A1.2 out-of-epoch completed row is not shown as done');
assert(view['p1_wk1_s2'] && view['p1_wk1_s2'].completed === true,
  'A1.3 in-epoch completed row is still shown as done');

// ---------------------------------------------------------------------------
// A2 — starting an out-of-epoch slot reclaims it as a fresh, in-epoch row;
// starting an in-epoch slot keeps the same row.
// ---------------------------------------------------------------------------
const staleId = Database.tables.sessions.find(s => s.template_ref === 'p1_wk1_s0').id;
Database.services.startSession('p1_wk1_s0');
const reclaimed = Database.tables.sessions.find(s => s.template_ref === 'p1_wk1_s0');
assert(reclaimed.id !== staleId, 'A2.1 stale slot is reclaimed as a fresh row');
assert(Database.tables.sessions.get(staleId) === null, 'A2.2 the stale row is soft-deleted');
assert(reclaimed.status === 'in_progress' && !!reclaimed.started_at, 'A2.3 the fresh row is started');
assert(reclaimed.created_at > '2020-01-01', 'A2.4 the fresh row has a current created_at');

Database.tables.sessions.create({ template_ref: 'p1_wk2_s0', status: 'pending', created_at: `${todayISO}T12:00:00.000Z`, started_at: null, completed_at: null });
const inEpochId = Database.tables.sessions.find(s => s.template_ref === 'p1_wk2_s0').id;
Database.services.startSession('p1_wk2_s0');
const started = Database.tables.sessions.find(s => s.template_ref === 'p1_wk2_s0');
assert(started.id === inEpochId, 'A2.5 in-epoch row is started in place (not reclaimed)');
