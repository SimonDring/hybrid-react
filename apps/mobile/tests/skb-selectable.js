import { selectableSports, positionsFor } from '@performance-os/engine/lib/sportKnowledge/selectable.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const sel = selectableSports();
const ids = sel.map(s => s.id);
assert(ids.includes('cycling') && ids.includes('swimming') && ids.includes('running_sprint'), 'T1 flagships selectable');
assert(!ids.includes('rugby') && !ids.includes('soccer'), 'T2 stubs (score 0) excluded');
assert(ids.includes('gaelic_football') && ids.includes('hurling') && ids.includes('triathlon'), 'T2b flagship GAA/hurling/triathlon are newly selectable (SKB-derived)');
assert(sel.every(s => s.id && s.label), 'T3 each has id + label');

const pos = positionsFor('cycling');
assert(pos.length === 6 && pos[0].name && pos[0].id === pos[0].name, 'T4 cycling positions from SKB (id=name)');
assert(positionsFor('rugby').length === 0, 'T5 stub positions → empty (safe)');
assert(positionsFor('unknown').length === 0, 'T6 unknown → empty (never throws)');
