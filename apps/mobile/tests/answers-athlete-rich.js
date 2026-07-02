// apps/mobile/tests/answers-athlete-rich.js
import { answersToProfilePatch, BLANK_ANSWERS } from '../src/lib/onboardingModel.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }
const A = (o) => ({ ...BLANK_ANSWERS, ...o });

// New SKB sport selection derives the legacy engine sport/discipline.
const p = answersToProfilePatch(A({ goalType: 'sport', skbSport: 'running_sprint', position: '100 m (pure speed / ATP-PC)', daysPerWeek: 3, equipment: ['barbell'] }));
assert(p.sport === 'run' && p.run_discipline === 'sprint', 'T1 skbSport running_sprint → legacy run/sprint');

const pc = answersToProfilePatch(A({ goalType: 'sport', skbSport: 'cycling', daysPerWeek: 3, equipment: ['barbell'] }));
assert(pc.sport === 'cycle' && pc.run_discipline === null, 'T2 skbSport cycling → legacy cycle');

// Backward-compat: OLD fields still work unchanged (this is what the golden-master uses).
const old = answersToProfilePatch(A({ goalType: 'sport', sport: 'run', runDiscipline: 'long', daysPerWeek: 4, equipment: ['barbell'] }));
assert(old.sport === 'run' && old.run_discipline === 'long', 'T3 legacy sport/runDiscipline fields unchanged');

assert('skbSport' in BLANK_ANSWERS && 'position' in BLANK_ANSWERS && 'sessionDurationMin' in BLANK_ANSWERS && 'resistanceTrainingYears' in BLANK_ANSWERS, 'T4 BLANK_ANSWERS has the new fields');
