// apps/mobile/tests/skb-rules.js
import { evaluateRules } from '@performance-os/engine/lib/sportKnowledge/rules.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
const P = { goal_type:'sport', sport:'gaelic_football' };
let r = evaluateRules(P, { matchesThisWeek: 2 });
assert(r.effects.some(e => e.type === 'reduce_volume_pct' && e.params.pct === 45), '2 matches → reduce 45%');
r = evaluateRules(P, { acwr: 1.7 });
assert(r.effects.some(e => e.type === 'force_deload'), 'acwr>1.5 → force_deload');
r = evaluateRules(P, { readiness: 30 });
assert(r.effects.some(e => e.type === 'reduce_one_step'), 'low readiness → reduce_one_step');
r = evaluateRules(P, { illness: true });
assert(r.effects.some(e => e.type === 'withhold'), 'illness → withhold');
r = evaluateRules(P, {});
assert(r.effects.length === 0, 'no triggers → no effects');
r = evaluateRules({ sport:'swimming' }, { season:'in' });
assert(r.effects.some(e => e.type === 'taper'), 'swimming in-season → taper');
r = evaluateRules({ sport:'gaelic_football' }, { travel: true });
assert(r.effects.some(e => e.type === 'reduce_one_step' && e.ruleId === 'long_travel_reduce_intensity'), 'travel → reduce_one_step');
console.log('skb-rules tests done');
