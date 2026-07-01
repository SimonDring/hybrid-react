// apps/mobile/tests/adapter-to-engine.js
import { createAthleteModel } from '@performance-os/engine/lib/athlete/schema.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';
import { legacyToOutcome } from '@performance-os/engine/lib/adapters/goalMapping.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// Build goal.
const build = createAthleteModel({
  identity: { age: 28, biologicalSex: 'male', bodyMassKg: 82 },
  goals: [{ id: 'g', outcome: 'build_muscle', priority: 1 }],
  trainingHistory: { selfRatedLevel: 'intermediate' },
  constraints: { equipment: ['barbell', 'dumbbell'], daysPerWeek: 4, availableDays: ['mon', 'wed', 'fri', 'sat'] },
  performanceMetrics: [{ id: 'l', metric: '1rm_squat', value: 140, unit: 'kg', source: 'self', confidence: 'moderate', measuredAt: null }],
  meta: { planStartDate: '2026-07-06' },
});
const eb = athleteModelToEngineInput(build);
assert(eb.goal_type === 'build' && eb.strength_style === 'bodybuilding', 'T1 build_muscle → build/bodybuilding');
assert(eb.experience.gym === 'intermediate', 'T2 self-rated level → experience.gym');
assert(eb.access.includes('barbell') && eb.availability.days_per_week === 4, 'T3 equipment + availability mapped');
assert(eb.lifts.squat === 140, 'T4 1rm metric → lifts.squat');
assert(eb.bodyweight_kg === 82 && eb.sex === 'male', 'T5 biometrics mapped');
assert(eb.plan_start_date === '2026-07-06', 'T6 plan_start_date from meta');
assert(eb.focus[0] === 'gym' && eb.primary === 'gym', 'T7 always a gym plan');

// Sport goal — sport-shape specifics travel on meta.enginePassthrough + weeklySportSchedule.
const sport = createAthleteModel({
  goals: [{ id: 'g', outcome: 'improve_sport_performance', priority: 1, sportRef: 'run' }],
  sportingContext: {
    primarySport: 'run', seasonPhase: 'in',
    competitionCalendar: [{ label: 'race', date: '2026-09-01' }],
    weeklySportSchedule: [{ day: 'tue', type: 'sport' }, { day: 'thu', type: 'sport' }],
  },
  meta: { enginePassthrough: { run_discipline: 'long', sport_intent: 'compete' } },
});
const es = athleteModelToEngineInput(sport);
assert(es.goal_type === 'sport' && es.sport === 'run', 'T8 sport goal → goal_type sport');
assert(es.run_discipline === 'long' && es.sport_intent === 'compete', 'T9 discipline + intent from passthrough');
assert(es.event_date === '2026-09-01' && es.sport_days.length === 2, 'T10 event date + sport days mapped');
assert(legacyToOutcome('build', 'strength') === 'get_stronger', 'T11 legacy→outcome inverse');
