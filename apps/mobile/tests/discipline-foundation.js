// apps/mobile/tests/discipline-foundation.js — the foundation is present + inert
import { DISCIPLINES, getDiscipline, SECONDARY_GOALS } from '@performance-os/engine';
let pass=0; function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1} else pass++ }
assert(DISCIPLINES.length === 3 && getDiscipline('powerlifting'), 'disciplines exported from the barrel');
assert(SECONDARY_GOALS.length === 4, 'secondary goals exported from the barrel');
console.log(process.exitCode ? 'discipline-foundation FAILURES' : `PASS: discipline-foundation — ${pass} assertions`);
