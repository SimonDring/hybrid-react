// tests/sport-planservice.js — sport_days regenerate the plan + show as calendar markers.
process.env.TZ = 'Europe/London';
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; }, clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('PASS:', msg); }

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const Database = (await import('../src/lib/Database.js')).default;
const Plan = await import('../src/lib/PlanService.js');
const todayISO = localDay(new Date());

Database.services.updateProfile({
  plan_start_date: todayISO, plan_weeks: 12,
  goal_type: 'sport', sport: 'swim', sport_season: 'off', focus: ['gym'], primary: 'gym',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: [] },
  sport_days: ['tue', 'thu'],
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'],
  onboarded: true
});
Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });

// Calendar markers: Tue/Thu within the plan show a swim marker.
const cal = Plan.buildCalendar({});
const markers = Object.values(cal.byDate).flat().filter(e => e.sportMarker);
assert(markers.length > 0, 'P1 calendar has sport markers');
assert(markers.every(m => m.discipline === 'swim'), 'P2 markers carry the sport discipline');
const someTue = Object.entries(cal.byDate).find(([iso]) => new Date(iso + 'T00:00:00').getDay() === 2);
assert(someTue && someTue[1].some(e => e.sportMarker), 'P3 a Tuesday in range carries a marker');

// Signature: changing sport_days produces a different plan (regenerates).
const before = JSON.stringify(Plan.getPhases().map(p => p.weeks[0].sessions.map(s => s.title)));
Database.services.updateProfile({ sport_days: ['mon', 'fri'] });
Plan.default.setRuntime({ sessions: {}, recovery: null, load: null });
const after = JSON.stringify(Plan.getPhases().map(p => p.weeks[0].sessions.map(s => s.title)));
assert(before !== after, 'P4 changing sport_days regenerates the plan');
