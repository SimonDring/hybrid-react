// apps/mobile/tests/diagnose-limiting-factors.js
import { diagnoseLimitingFactors } from '@performance-os/engine/lib/performance/diagnose.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

const caps = [
  { qualityId: 'aerobicCapacity', level: 0.3, source: 'inferred', confidence: 'low' },
  { qualityId: 'maxStrength', level: 0.5, source: 'measured', confidence: 'high' },
];
const demand = [
  { qualityId: 'aerobicCapacity', importance: 0.9, source: 'skb' },
  { qualityId: 'maxStrength', importance: 0.5, source: 'skb' },
];
const lf = diagnoseLimitingFactors(caps, demand);
assert(lf[0].qualityId === 'aerobicCapacity', 'T1 biggest gap ranked first');
assert(lf[0].magnitude === 0.54, 'T2 magnitude = gap(0.6) × importance(0.9)');
assert(lf[0].confidence === 'low', 'T3 confidence = weakest input (capability)');
assert(lf.find(f => f.qualityId === 'maxStrength').magnitude === 0, 'T4 met demand → 0 magnitude');
assert(lf.length === 2, 'T5 diagnosis always includes every demanded quality');
assert(typeof lf[0].rationale === 'string' && lf[0].rationale.length > 0, 'T6 rationale present (explain required)');
assert(lf[0].trainability === 1 && lf[0].injuryRisk === 1, 'T7 neutral seams');
assert(diagnoseLimitingFactors(caps, null).length === 0, 'T8 null demand → [] (non-sport)');
let threw = false; try { diagnoseLimitingFactors(null, demand); } catch { threw = true; }
assert(!threw, 'T9 never throws on null capabilities');
// deterministic tiebreak on equal magnitude (both 0): alphabetical by qualityId
const eq = diagnoseLimitingFactors(
  [{ qualityId: 'stability', level: 0.5, confidence: 'low' }, { qualityId: 'mobility', level: 0.5, confidence: 'low' }],
  [{ qualityId: 'stability', importance: 0.5 }, { qualityId: 'mobility', importance: 0.5 }]);
assert(eq[0].qualityId === 'mobility', 'T10 equal magnitude → deterministic tiebreak by qualityId');
