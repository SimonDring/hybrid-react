// apps/mobile/tests/skb-schema-v2.js
import { validateSportProfile, RULE_SIGNALS, RULE_EFFECTS }
  from '@performance-os/engine/lib/sportKnowledge/schema.js';
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }

assert(RULE_SIGNALS.has('competition_within_h') && RULE_EFFECTS.has('reduce_volume_pct'), 'vocabulary exported');

// a rule with a bad signal is rejected
const base = JSON.parse(JSON.stringify(skb.get('gaelic_football')));
base.decisionRules[0].trigger = { signal: 'made_up', op: '<=', value: 1 };
base.decisionRules[0].effect = { type: 'reduce_volume_pct', params: { pct: 10 } };
assert(validateSportProfile(base).some(e => /trigger.*signal/i.test(e)), 'unknown trigger signal rejected');

// a bad effect type is rejected
const base2 = JSON.parse(JSON.stringify(skb.get('gaelic_football')));
base2.decisionRules[0].trigger = { signal: 'acwr', op: '>', value: 1.5 };
base2.decisionRules[0].effect = { type: 'nuke', params: {} };
assert(validateSportProfile(base2).some(e => /effect.*type/i.test(e)), 'unknown effect type rejected');
console.log('skb-schema-v2 tests done');
