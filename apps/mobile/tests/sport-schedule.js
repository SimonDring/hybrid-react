// tests/sport-schedule.js — scheduler keeps sport-muscle-heavy gym work off the
// days adjacent to sport days, and lightens any session forced onto one.
import { scheduleWeek } from '@performance-os/engine/lib/plan/scheduler.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const dayOf = (title) => (title || '').split(' · ')[0];

// Two gym sessions on Mon + Thu. Sport day Tue (index 1). One session is upper-heavy
// (loads back/shoulders — the swim muscles); the other is lower-heavy. Mon(0) is
// adjacent to Tue(1); Thu(3) is not. The upper (swim-muscle) session should go to Thu.
const upper = { discipline: 'gym', focus: 'Upper', duration: '~45 min', intensity: 'hard', lowerBody: false,
  muscleVol: { back: 10, shoulders: 8, biceps: 4 }, items: [] };
const lower = { discipline: 'gym', focus: 'Lower', duration: '~45 min', intensity: 'hard', lowerBody: true,
  muscleVol: { quads: 10, glutes: 8, hamstrings: 6 }, items: [] };

const out = scheduleWeek({
  sportSpecs: [upper, lower], dayNames: ['Monday', 'Thursday'],
  busyDays: [1], sportMuscles: ['back', 'shoulders', 'core']
});
const upperDay = dayOf(out.find(s => /Upper/.test(s.title)).title);
assert(upperDay === 'Thursday', `SC1 upper (swim-muscle) session avoids the day next to the sport day (got ${upperDay})`);

// Control: with no busyDays the placement is unconstrained (still returns both).
const ctrl = scheduleWeek({ sportSpecs: [upper, lower], dayNames: ['Monday', 'Thursday'] });
assert(ctrl.length === 2, 'SC2 no constraints → both sessions still scheduled');

// A single gym day that is ALSO a sport day (packed week, forced overlap) → the
// session that lands on the sport day is lightened.
const heavy = { discipline: 'gym', focus: 'Full body', duration: '~45 min', intensity: 'hard', lowerBody: false,
  muscleVol: { back: 6 }, items: [{ name: 'Bench press', sets: '3 × 8' }, { name: 'Row', sets: '4 × 10' }] };
const forced = scheduleWeek({ sportSpecs: [heavy], dayNames: ['Tuesday'], busyDays: [1], sportMuscles: ['back'] });
assert(forced[0].lightened === true, 'SC3 session on a sport day is flagged lightened');
assert(forced[0].items[0].sets === '2 × 8' && forced[0].items[1].sets === '3 × 10', 'SC4 working sets dropped by one on the forced day');

// A session NOT on a sport day is untouched.
const offday = scheduleWeek({ sportSpecs: [heavy], dayNames: ['Wednesday'], busyDays: [1], sportMuscles: ['back'] });
assert(!offday[0].lightened && offday[0].items[0].sets === '3 × 8', 'SC5 off-sport-day session is not lightened');
