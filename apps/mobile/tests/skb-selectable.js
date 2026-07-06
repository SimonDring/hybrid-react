import { selectableSports, positionsFor } from '@performance-os/engine/lib/sportKnowledge/selectable.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const sel = selectableSports();
const ids = sel.map(s => s.id);
assert(ids.includes('cycling') && ids.includes('swimming') && ids.includes('running_sprint'), 'T1 flagships selectable');
// WP-48 (2026-07-06): ALL ten authored sports are flagship — no stubs remain. Every
// profile with a binding is selectable; a future stub is caught by T2's shape rule.
assert(ids.includes('rugby') && ids.includes('soccer'), 'T2 rugby + soccer are selectable (flagship-authored, WP-48)');
assert(ids.includes('gaelic_football') && ids.includes('hurling') && ids.includes('triathlon') && ids.includes('field_hockey'), 'T2b the team-sport flagships are selectable (SKB-derived)');
assert(sel.every(s => s.id && s.label), 'T3 each has id + label');

const pos = positionsFor('cycling');
assert(pos.length === 6 && pos[0].name && pos[0].id === pos[0].name, 'T4 cycling positions from SKB (id=name)');
assert(positionsFor('soccer').length >= 4, 'T5 soccer positions from SKB (flagship)');
assert(positionsFor('rugby').length >= 4, 'T5b rugby positions from SKB (flagship)');
assert(positionsFor('unknown').length === 0, 'T6 unknown → empty (never throws)');
