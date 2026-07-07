import { validateDisciplineModule, validateRegistry } from '@performance-os/engine/data/disciplines/_schema.js';
let pass = 0; function assert(c, m){ if(!c){ console.error('FAIL:', m); process.exitCode=1 } else pass++ }

// a minimal valid module
const ok = { id:'x', label:'X', demand:{ maxStrength:1.0 }, priorityLifts:['back_squat'],
  periodization:{ off:{ totalWeeks:12, split:[{intent:'base',weeks:12}], deloads:[] } },
  doseCharacter:{ main:{ reps:'1-5', rpe:'RPE 8', restSec:180 }, accessory:{ reps:'8-12', rpe:'RPE 8', restSec:90 } },
  accessoryPatterns:[], provenance:{ source:'test', evidenceLevel:'L5' } };
assert(validateDisciplineModule(ok).length === 0, 'a well-formed module validates');
assert(validateDisciplineModule({ id:'y' }).length > 0, 'a module missing demand/lifts fails');
assert(validateDisciplineModule({ ...ok, demand:{ notAQuality:1 } }).length > 0, 'an unknown quality id fails');
assert(validateRegistry([ok, ok]).ok === false, 'duplicate ids fail the registry');
console.log(process.exitCode ? 'discipline-schema FAILURES' : `PASS: discipline-schema — ${pass} assertions`);
