// tests/sport-generate.js — sport_days shape the generated gym week.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const dayOf = (title) => (title || '').split(' · ')[0];

const profile = {
  goal_type: 'sport', sport: 'swim', sport_season: 'off',
  experience: { gym: 'intermediate' },
  availability: { days_per_week: 4, session_minutes: 45, days: [] }, // no explicit gym days
  sport_days: ['tue', 'thu'],
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight']
};
const plan = generatePlan(profile);
const wk1 = plan.phases[0].weeks[0];
const gymDays = wk1.sessions.map(s => dayOf(s.title));
assert(!gymDays.includes('Tuesday') && !gymDays.includes('Thursday'),
  `G1 gym days avoid sport days when there is room (got ${gymDays.join(',')})`);
assert(wk1.sessions.length === 4, 'G2 still four gym sessions');

// Regression: a non-sport plan is unchanged by the new code path.
const build = generatePlan({
  goal_type: 'build', strength_style: 'strength', experience: { gym: 'intermediate' },
  availability: { days_per_week: 3, session_minutes: 60, days: ['mon', 'wed', 'fri'] },
  access: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']
});
const bDays = build.phases[0].weeks[0].sessions.map(s => dayOf(s.title));
assert(JSON.stringify(bDays) === JSON.stringify(['Monday', 'Wednesday', 'Friday']),
  'G3 non-sport plan keeps the user-picked gym days exactly');
