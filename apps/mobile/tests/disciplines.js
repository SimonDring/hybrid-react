// apps/mobile/tests/disciplines.js
import { DISCIPLINES, getDiscipline, disciplineErrors } from '@performance-os/engine/data/disciplines/index.js';
import { EXERCISES } from '@performance-os/engine/data/strengthExercises.js';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
const ids = new Set(EXERCISES.map(e=>e.id));
assert(disciplineErrors().length === 0, `all discipline modules validate (${disciplineErrors().join('; ')})`);
for (const d of ['hypertrophy','powerlifting','olympic']) assert(getDiscipline(d), `discipline '${d}' registered`);
// priorityLifts reference real exercises
for (const d of DISCIPLINES) for (const lift of d.priorityLifts) assert(ids.has(lift), `${d.id}: priorityLift '${lift}' is a real exercise id`);
// definitional lead quality present
assert(getDiscipline('powerlifting').demand.maxStrength === 1.0, 'powerlifting leads with maxStrength 1.0');
assert(getDiscipline('hypertrophy').demand.hypertrophy === 1.0, 'hypertrophy leads with hypertrophy 1.0');
assert((getDiscipline('olympic').demand.explosiveStrength || getDiscipline('olympic').demand.power) === 1.0, 'olympic leads with power/explosive 1.0');
console.log(process.exitCode ? 'disciplines FAILURES' : `PASS: disciplines — ${pass} assertions`);
