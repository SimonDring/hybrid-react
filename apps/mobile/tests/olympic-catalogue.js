// apps/mobile/tests/olympic-catalogue.js
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
import { generatePlan } from '@performance-os/engine';
import { answersToProfile, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
let pass = 0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const byId = new Map(EXERCISES.map(e=>[e.id,e]));

// (a) the new lifts exist with a full, valid schema
const REQUIRED = ['snatch','clean_and_jerk','power_snatch','hang_snatch','split_jerk','overhead_squat','push_press','snatch_pull','clean_pull','muscle_snatch'];
for (const id of REQUIRED) {
  const e = byId.get(id);
  assert(e, `exercise '${id}' exists`);
  if (e) assert(typeof e.name==='string' && typeof e.pattern==='string' && typeof e.axialLoad==='number' && e.discipline==='olympic',
    `'${id}' has name/pattern/axialLoad + discipline:'olympic'`);
}
// (b) BYTE-IDENTICAL GUARD: a normal build/sport plan never selects a discipline-gated lift
const FULL=['barbell','dumbbell','machine','cable','band','kettlebell','bodyweight'];
const A=o=>({...BLANK_ANSWERS,...o});
const plan = generatePlan(answersToProfile(A({goalType:'build',strengthStyle:'strength',experienceLevel:'advanced',daysPerWeek:5,days:['mon','tue','wed','fri','sat'],equipment:FULL,sex:'male',lifts:{squat:180,bench:130,deadlift:230}})));
const picked = new Set(plan.phases.flatMap(p=>p.weeks||[]).flatMap(w=>w.sessions||[]).flatMap(s=>s.items||[]).map(it=>it.exId));
assert(![...REQUIRED].some(id=>picked.has(id)), 'no discipline-gated Olympic lift leaks into a current build plan');
console.log(process.exitCode ? 'olympic-catalogue FAILURES' : `PASS: olympic-catalogue — ${pass} assertions`);
