import { mapSkbQuality, SKB_TO_PM_QUALITY } from '@performance-os/engine/data/sportQualityMap.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(mapSkbQuality('explosivePower') === 'explosiveStrength', 'T1 explosivePower → explosiveStrength');
assert(mapSkbQuality('aerobicEndurance') === 'aerobicCapacity', 'T2 aerobicEndurance → aerobicCapacity');
assert(mapSkbQuality('relativeStrength') === 'maxStrength' && mapSkbQuality('maxStrength') === 'maxStrength', 'T3 rel/max strength → maxStrength');
assert(mapSkbQuality('reactiveStrength') === 'reactiveStrength', 'T4 reactiveStrength kept');
assert(mapSkbQuality('durability') === 'robustness', 'T5 durability → robustness');
assert(mapSkbQuality('sprintSpeed') === null && mapSkbQuality('coordination') === null, 'T6 unmapped sport-skill qualities → null');
assert(mapSkbQuality('nonsense') === null, 'T7 unknown → null');
