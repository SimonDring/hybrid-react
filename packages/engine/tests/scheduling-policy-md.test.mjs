import assert from 'node:assert/strict';
import { SCHEDULING_PENALTIES as SP } from '../src/data/schedulingPolicy.js';
import { KNOWLEDGE_SET_VERSION } from '../src/lib/knowledge/entries.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
ok(SP.md && typeof SP.md === 'object', 'SCHEDULING_PENALTIES.md exists');
for (const k of ['heavyOnAvoidDay', 'hardOnRecoveryDay', 'powerOffPreferredDay', 'heavyOffTargetDayPerStep'])
  ok(typeof SP.md[k] === 'number', `md.${k} is a number`);
ok(SP.md.heavyOnAvoidDay < SP.adjacent.sameMusclePerGroup, 'MD penalties sit below the muscle-spacing lever (14)');
ok(KNOWLEDGE_SET_VERSION === '1.48.0', 'KSV bumped to 1.48.0 for the new governed weights');
console.log(`\nscheduling-policy-md: ${n}/${n} checks passed`);
