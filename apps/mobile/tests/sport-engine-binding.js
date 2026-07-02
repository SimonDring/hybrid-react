import { SKB_ENGINE_BINDING, bindingFor } from '@performance-os/engine/data/sportEngineBinding.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(bindingFor('running_sprint').engineSport === 'run' && bindingFor('running_sprint').discipline === 'sprint', 'T1 running_sprint → run/sprint');
assert(bindingFor('running_long').discipline === 'long', 'T2 running_long → long');
assert(bindingFor('cycling').engineSport === 'cycle' && bindingFor('cycling').discipline === null, 'T3 cycling → cycle');
assert(bindingFor('swimming').engineSport === 'swim', 'T4 swimming → swim');
assert(bindingFor('gaelic_football').engineSport === 'gaa' && bindingFor('hurling').engineSport === 'gaa', 'T5 GAA/hurling → gaa');
assert(bindingFor('triathlon').engineSport === 'run', 'T6 triathlon → run (its binding constraint)');
assert(bindingFor('unknown_sport') === null, 'T7 unknown → null');
