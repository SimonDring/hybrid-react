// tests/gymsupport.js — retire-legacy P1: the SKB gymSupport section + accessor + validator.
import { validateSportProfile } from '@performance-os/engine/lib/sportKnowledge/schema.js';
import { gymSupportFor } from '@performance-os/engine/lib/sportKnowledge/gymSupport.js';
import { sportKnowledge as skb } from '@performance-os/engine';
function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// every selectable sport now carries gymSupport (relocated from the legacy layer)
for (const id of skb.ids()) {
  const gs = (skb.get(id) || {}).gymSupport;
  assert(gs && typeof gs.power === 'boolean' && typeof gs.systemicFactor === 'number' && gs.emphasis && gs.periodization,
    `T1 ${id} has a complete gymSupport block`);
}

// accessor resolves a profile → its gymSupport
const gs = gymSupportFor({ goal_type: 'sport', sport: 'run', run_discipline: 'middle' });
assert(gs && gs.emphasis && Array.isArray(gs.priorityExercises), 'T2 gymSupportFor resolves running_middle');
assert(gymSupportFor({ goal_type: 'build' }) === null, 'T3 build goal → null (never throws)');

// validation rejects malformed gymSupport
const clone = () => JSON.parse(JSON.stringify(skb.get('cycling')));
const errsFor = (mut) => { const p = clone(); mut(p); return validateSportProfile(p); };
assert(validateSportProfile(skb.get('cycling')).length === 0, 'T4 real profile with gymSupport validates');
assert(errsFor((p) => { p.gymSupport.systemicFactor = 2; }).some((e) => /systemicFactor/.test(e)), 'T5 systemicFactor out of range fails');
assert(errsFor((p) => { p.gymSupport.power = 'yes'; }).some((e) => /power/.test(e)), 'T6 non-boolean power fails');
assert(errsFor((p) => { p.gymSupport.emphasis.chest = 5; }).some((e) => /emphasis\.chest/.test(e)), 'T7 emphasis out of range fails');

// registry still valid
assert(skb.validate().ok, 'T8 SKB registry valid with gymSupport');
