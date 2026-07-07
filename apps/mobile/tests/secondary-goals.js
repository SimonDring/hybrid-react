// apps/mobile/tests/secondary-goals.js
import { SECONDARY_GOALS, getSecondaryGoal, SECONDARY_GOAL_IDS } from '@performance-os/engine/data/secondaryGoals.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const ids = new Set(EXERCISES.map(e=>e.id));
for (const g of ['posture','prehab','mobility','conditioning']) assert(getSecondaryGoal(g), `secondary goal '${g}' exists`);
for (const g of SECONDARY_GOALS) {
  assert(Array.isArray(g.correctivePatterns) && Array.isArray(g.accessoryPreferences), `${g.id}: has patterns + preferences`);
  for (const ex of g.accessoryPreferences) assert(ids.has(ex), `${g.id}: accessoryPreference '${ex}' is a real exercise`);
  // emphasisModifier is GENTLE — never a hard override
  for (const m in (g.emphasisModifier||{})) assert(g.emphasisModifier[m] > 0 && g.emphasisModifier[m] <= 1.3, `${g.id}: emphasis ${m} is a gentle ≤1.3 modifier`);
}
console.log(process.exitCode ? 'secondary-goals FAILURES' : `PASS: secondary-goals — ${pass} assertions`);
