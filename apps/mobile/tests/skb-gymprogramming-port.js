import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const sw = skb.get('swimming').gymProgramming;
assert(sw.emphasis.back === 1.3 && sw.priorityExercises.includes('face_pull'), 'swimming gymProgramming = old swim values');
const run = skb.get('running').gymProgramming;
assert(run.byDiscipline.long.emphasis.calves === 1.4 && run.byDiscipline.sprint.priorityExercises[0] === 'hang_clean', 'running byDiscipline ported (long calves 1.4, sprint opens hang_clean)');
assert(run.emphasis.calves === 1.30 && run.priorityExercises[0] === 'nordic_curl', 'running default ported');
const cy = skb.get('cycling').gymProgramming;
assert(cy.emphasis.quads === 1.3, 'cycling gymProgramming ported (quads 1.3)');
console.log('skb-gymprogramming-port tests done');
