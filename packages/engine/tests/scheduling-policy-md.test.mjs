import assert from 'node:assert/strict';
import { SCHEDULING_PENALTIES as SP } from '../src/data/schedulingPolicy.js';
import { KNOWLEDGE_SET_VERSION } from '../src/lib/knowledge/entries.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };
ok(SP.md && typeof SP.md === 'object', 'SCHEDULING_PENALTIES.md exists');
for (const k of ['heavyOnAvoidDay', 'hardOnRecoveryDay', 'powerOffPreferredDay', 'heavyOffTargetDayPerStep'])
  ok(typeof SP.md[k] === 'number', `md.${k} is a number`);
ok(SP.md.heavyOnAvoidDay < SP.adjacent.sameMusclePerGroup, 'MD penalties sit below the muscle-spacing lever (14)');
// Safety invariant (2026-07-21): the heavy→MD-4 pull, at the MAX weekday distance (3, from
// scheduler.js dayDistance), must never exceed the muscle-recovery-spacing lever — so MD-4
// positioning yields to muscle recovery when they conflict ("prefer MD-4 UNLESS an unavoidable
// constraint"). A future weight bump (e.g. the flagged X=6) that breaches this fails here, loudly.
ok(SP.md.heavyOffTargetDayPerStep * 3 <= SP.adjacent.sameMusclePerGroup,
  'heavyOffTargetDayPerStep × max-weekday-distance(3) stays ≤ the muscle-spacing lever (safety cap)');
ok(/^\d+\.\d+\.\d+$/.test(KNOWLEDGE_SET_VERSION), 'KNOWLEDGE_SET_VERSION is valid semver (the md-weights ship with a bump; the exact value is owned by knowledge-set-ratchet.js, never pinned here — a hard pin broke on every later bump)');
console.log(`\nscheduling-policy-md: ${n}/${n} checks passed`);
