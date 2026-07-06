import { selectableSports, positionsFor } from '@performance-os/engine/lib/sportKnowledge/selectable.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const sel = selectableSports();
const ids = sel.map(s => s.id);
assert(ids.includes('cycling') && ids.includes('swimming') && ids.includes('running_sprint'), 'T1 flagships selectable');
// WP-48: soccer was authored to flagship depth (2026-07-06) and is now selectable;
// rugby remains the last stub (its authoring is in flight) and stays excluded.
assert(!ids.includes('rugby'), 'T2 the remaining stub (rugby) is excluded');
assert(ids.includes('soccer'), 'T2c soccer is selectable (flagship-authored, WP-48)');
assert(ids.includes('gaelic_football') && ids.includes('hurling') && ids.includes('triathlon'), 'T2b flagship GAA/hurling/triathlon are newly selectable (SKB-derived)');
assert(sel.every(s => s.id && s.label), 'T3 each has id + label');

const pos = positionsFor('cycling');
assert(pos.length === 6 && pos[0].name && pos[0].id === pos[0].name, 'T4 cycling positions from SKB (id=name)');
assert(positionsFor('rugby').length === 0, 'T5 stub positions → empty (safe)');
assert(positionsFor('unknown').length === 0, 'T6 unknown → empty (never throws)');
