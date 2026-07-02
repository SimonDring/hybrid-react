// apps/mobile/tests/adapter-from-profile.js
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const ASOF = '2026-07-01';

const profile = {
  name: 'Sam', age: 30, sex: 'female', bodyweight_kg: 65,
  goal_type: 'build', strength_style: 'strength',
  experience: { gym: 'advanced' },
  lifts: { squat: 100, bench: 60, deadlift: 120, ohp: 40, pull: 50 },
  availability: { days_per_week: 3, days: ['mon', 'wed', 'fri'] },
  access: ['barbell', 'dumbbell'],
  plan_start_date: '2026-07-06', plan_weeks: 8,
};
const m = profileToAthleteModel(profile, ASOF);
assert(m.identity.age === 30 && m.identity.biologicalSex === 'female', 'T1 identity mapped');
assert(m.goals[0].outcome === 'get_stronger' && m.goals[0].priority === 1, 'T2 legacy goal → outcome');
assert(m.trainingHistory.selfRatedLevel === 'advanced', 'T3 experience → self-rated level (lossless)');
assert(m.constraints.equipment.includes('barbell') && m.constraints.daysPerWeek === 3, 'T4 constraints mapped');
const squat = m.performanceMetrics.find((x) => x.metric === '1rm_squat');
assert(squat && squat.value === 100, 'T5 lifts → 1rm metrics');
assert(m.meta.planStartDate === '2026-07-06' && m.meta.enginePassthrough.plan_weeks === 8,
  'T6 scheduling passthroughs stashed in meta');

const sportP = {
  goal_type: 'sport', sport: 'run', run_discipline: 'long', sport_intent: 'compete',
  sport_season: 'in', event_date: '2026-09-01', sport_days: ['tue', 'thu'],
  experience: { gym: 'intermediate' }, availability: { days_per_week: 3, days: [] }, access: ['full_gym'],
};
const sm = profileToAthleteModel(sportP, ASOF);
assert(sm.goals[0].outcome === 'improve_sport_performance' && sm.sportingContext.primarySport === 'running_long', 'T7 sport mapped (SKB id: run/long → running_long)');
assert(sm.meta.enginePassthrough.run_discipline === 'long' && sm.sportingContext.weeklySportSchedule.length === 2,
  'T8 sport specifics carried (passthrough + weekly schedule)');
