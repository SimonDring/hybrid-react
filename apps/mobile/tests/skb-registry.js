// apps/mobile/tests/skb-registry.js
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
import { normalizeSportId } from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
assert(normalizeSportId('swim') === 'swimming', 'swim → swimming');
assert(normalizeSportId('gaelic_football') === 'gaelic_football', 'canonical passes through');
assert(normalizeSportId('run') === 'running', 'run → running');
assert(normalizeSportId(null) === null, 'null → null');
const sel = skb.selectable().map(p => p.id).sort();
assert(JSON.stringify(sel) === JSON.stringify(['gaelic_football','hurling','swimming']), 'selectable = 3 complete sports');
console.log('skb-registry tests done');
