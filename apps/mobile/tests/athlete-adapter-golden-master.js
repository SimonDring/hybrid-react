// apps/mobile/tests/athlete-adapter-golden-master.js
// Round-trip equivalence: the Athlete Model must be able to drive the engine to the SAME plan
// the legacy profile produces. Deterministic — profiles anchor plan_start_date to today and
// generatePlan output contains no absolute dates.
import { generatePlan } from '@performance-os/engine/lib/PlanGenerator.js';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
import { profileToAthleteModel } from '@performance-os/engine/lib/adapters/profileToAthleteModel.js';
import { athleteModelToEngineInput } from '@performance-os/engine/lib/adapters/athleteModelToEngineInput.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const ASOF = '2026-07-01';
const A = (o) => ({ ...BLANK_ANSWERS, ...o });
const inDays = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const FULL = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Archetype matrix — decision-bearing branches (Sprint 3 spec Part 7 scenarios).
const ARCHETYPES = {
  build_strength_int: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'intermediate',
    daysPerWeek: 4, equipment: FULL, lifts: { squat: 140, bench: 100, deadlift: 180, ohp: 60, pull: 12 }, sex: 'male', bodyweight_kg: 82 }),
  build_bb_adv: A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'advanced', daysPerWeek: 5, equipment: FULL }),
  build_functional_beg: A({ goalType: 'build', strengthStyle: 'functional', experienceLevel: 'beginner', daysPerWeek: 3, equipment: ['dumbbell', 'bodyweight'] }),
  build_min_avail: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'returning', daysPerWeek: 2, equipment: ['bodyweight'] }),
  build_female: A({ goalType: 'build', strengthStyle: 'bodybuilding', experienceLevel: 'intermediate', daysPerWeek: 4, equipment: FULL, sex: 'female', bodyweight_kg: 62 }),
  run_sprint_compete: A({ goalType: 'sport', sport: 'run', runDiscipline: 'sprint', sportIntent: 'compete', sportSeason: 'off_season', experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL, sportDays: ['tue', 'thu'] }),
  run_long_event: A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', sportIntent: 'compete', eventDate: inDays(30), experienceLevel: 'intermediate', daysPerWeek: 3, equipment: FULL }),
  cycle_rec: A({ goalType: 'sport', sport: 'cycle', sportIntent: 'recreational', sportGoal: 'get_stronger', experienceLevel: 'advanced', daysPerWeek: 3, equipment: FULL }),
  swim_rec: A({ goalType: 'sport', sport: 'swim', sportIntent: 'recreational', sportGoal: 'build_base', experienceLevel: 'intermediate', daysPerWeek: 4, equipment: FULL }),
  no_lifts: A({ goalType: 'build', strengthStyle: 'strength', experienceLevel: 'beginner', daysPerWeek: 3, equipment: FULL }),
};

for (const [name, ans] of Object.entries(ARCHETYPES)) {
  const profile = answersToProfile(ans);
  const roundTrip = athleteModelToEngineInput(profileToAthleteModel(profile, ASOF));
  const a = JSON.stringify(generatePlan(profile));
  const b = JSON.stringify(generatePlan(roundTrip));
  assert(a === b, `GM ${name}: model-driven plan identical to legacy plan`);
}
