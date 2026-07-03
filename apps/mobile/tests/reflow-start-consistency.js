// tests/reflow-start-consistency.js
//
// BUG REPRO: "the session changes the moment I press Start."
//
// Scenario (Simon's, from the gym): swim support, off-season, 4 gym days
// (Mon/Tue/Thu/Fri), 45-min sessions, full gym. Open an upcoming gym session at the
// rack to preview it — you see exercise list A. Press Start — the list becomes B.
//
// Root cause: the adaptive reflow (PlanService.adaptedPhases) reshapes only PENDING
// gym sessions inside the rolling horizon. horizonSlots() EXCLUDES a session once
// it's `started`, so a started session drops out of the reflow and silently reverts
// from its reflowed (previewed) items back to the raw baseline generated items.
//
// REQUIREMENT (Simon): the plan must still adapt dynamically while pending, but the
// act of STARTING a session must never change it. Fix: startSession pins the current
// adapted session as a local override (same mechanism Train Now uses) so what's on
// screen is locked the instant you commit to it at the rack.

process.env.TZ = 'Europe/London';

// Freeze the clock BEFORE any module under test loads (Database/PlanService read the
// real clock). The scenario is date-relative — the plan starts "today" — so with a
// live clock the set of in-horizon sessions (and thus what the test exercises) shifted
// with the real calendar, making the test flaky by weekday. All imports below are
// dynamic, so this shim is in place before any app code runs. FAKE_TODAY=YYYY-MM-DD
// lets CI/devs prove the test holds on any weekday.
const FAKE_TODAY = process.env.FAKE_TODAY || '2026-07-06'; // a Monday
const RealDate = Date;
const fixedNow = new RealDate(`${FAKE_TODAY}T10:00:00`).getTime();
globalThis.Date = class extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(fixedNow); }
  static now() { return fixedNow; }
};

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

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');

const todayISO = localDay(new Date());

// Simon's onboarding answers, off-season swim support.
Database.services.updateProfile({
  plan_start_date: todayISO, plan_weeks: 8,
  goal_type: 'sport', sport: 'swim', sport_intent: 'recreational', sport_season: 'off',
  focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: ['monday', 'tuesday', 'thursday', 'friday'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  sex: 'male', bodyweight_kg: 80,
  onboarded: true
});

// The store owns the Start action (and the pin-on-start fix lives there).
const { useTrainingStore } = await import('../src/stores/trainingStore.js');
const store = () => useTrainingStore.getState();

const cw = Plan.currentWeekNumber();
assert(cw != null, `repro.0 plan has a current week (cw=${cw})`);

// The exercise names for a given slot, exactly as SessionDetail renders them.
const itemsFor = (phaseId, weekNum, idx) => {
  const phase = Plan.getPhase(phaseId);
  const week = phase && phase.weeks.find(w => w.num === weekNum);
  const s = week && week.sessions[idx];
  return s ? s.items.filter(it => !it.substituted).map(it => it.name) : null;
};
const badgeFor = (phaseId, weekNum, idx) => {
  const phase = Plan.getPhase(phaseId);
  const week = phase && phase.weeks.find(w => w.num === weekNum);
  const s = week && week.sessions[idx];
  return s ? !!s._trainNow : null;
};

// Gym sessions whose scheduled date is inside the reflow horizon (today ..
// today + WINDOW_DAYS) — the only ones the reflow reshapes, i.e. the only ones whose
// contents could ever change on Start. Scan the WHOLE plan, not just the current
// week: a plan that starts late in its calendar week (e.g. Sunday) has all of week
// 1's gym days in the past, and the in-horizon sessions live in week 2.
const today = new Date(); today.setHours(0, 0, 0, 0);
const horizonEnd = today.getTime() + 10 * 86400000;

const candidates = [];
for (const phase of Plan.getPhases()) {
  for (const week of (phase.weeks || [])) {
    week.sessions.forEach((s, i) => {
      if (Plan.sessionDiscipline(s) !== 'gym') return;
      const d = Plan.dateForSession(week.num, s.title);
      if (!d) return;
      const ms = d.getTime();
      if (ms >= today.getTime() && ms <= horizonEnd) {
        candidates.push({ phase, week, i, title: `wk${week.num} ${s.title}` });
      }
    });
  }
}

assert(candidates.length > 0, `repro.1 found ${candidates.length} in-horizon gym session(s) this week to test`);

// For each candidate: capture what's on screen, press Start through the store, then
// capture again. Pressing Start must not change the exercises — and the frozen
// session must NOT be mislabelled as an "ADAPTED" (Train Now) session.
for (const c of candidates) {
  const preview = itemsFor(c.phase.id, c.week.num, c.i);

  store().startSession(`p${c.phase.id}_wk${c.week.num}_s${c.i}`);

  const started = itemsFor(c.phase.id, c.week.num, c.i);
  const same = JSON.stringify(preview) === JSON.stringify(started);
  if (!same) {
    console.error(`  ↳ ${c.title}`);
    console.error(`    preview: ${JSON.stringify(preview)}`);
    console.error(`    started: ${JSON.stringify(started)}`);
  }
  assert(same, `repro.2 [${c.title}] exercises are identical before vs after Start`);
  assert(store().sessions[`p${c.phase.id}_wk${c.week.num}_s${c.i}`].started === true,
    `repro.3 [${c.title}] is marked started`);
  assert(badgeFor(c.phase.id, c.week.num, c.i) === false,
    `repro.4 [${c.title}] a normal started session is not flagged ADAPTED`);
}
