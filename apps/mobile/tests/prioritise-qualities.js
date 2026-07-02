import { prioritiseQualities } from '@performance-os/engine/lib/performance/prioritise.js';
import { areIncompatible } from '@performance-os/engine/data/qualityCompatibility.js';
function assert(c,m){ if(!c){console.error('FAIL:',m);process.exitCode=1;} else console.log('PASS:',m); }

assert(areIncompatible('maxStrength', 'aerobicCapacity') && areIncompatible('aerobicCapacity', 'maxStrength'), 'T0 antagonism is symmetric');

const low = [{ qualityId: 'aerobicCapacity', magnitude: 0.5, confidence: 'low' }, { qualityId: 'reactiveStrength', magnitude: 0.3, confidence: 'low' }];
assert(prioritiseQualities(low).length === 1, 'T1 low confidence → k=1');

const high = [
  { qualityId: 'hypertrophy', magnitude: 0.5, confidence: 'high' },
  { qualityId: 'reactiveStrength', magnitude: 0.4, confidence: 'high' },
  { qualityId: 'mobility', magnitude: 0.3, confidence: 'high' },
  { qualityId: 'stability', magnitude: 0.2, confidence: 'high' },
];
const hi = prioritiseQualities(high);
assert(hi.length === 3, 'T2 high confidence → k=3');
assert(hi[0].order === 1 && hi[0].qualityId === 'hypertrophy', 'T3 ordered, top limiter first');
assert(Array.isArray(hi[0].adaptations) && hi[0].adaptations.length > 0, 'T4 mapped to developing adaptations');
assert(hi[0].tracesToLimiter === 'hypertrophy', 'T5 traces to its limiter');

// compatibility: maxStrength (top) + aerobicCapacity → aerobic deferred; mobility fills next
const clash = [
  { qualityId: 'maxStrength', magnitude: 0.6, confidence: 'high' },
  { qualityId: 'aerobicCapacity', magnitude: 0.5, confidence: 'high' },
  { qualityId: 'mobility', magnitude: 0.4, confidence: 'high' },
];
const c = prioritiseQualities(clash).map((s) => s.qualityId);
assert(c.includes('maxStrength') && !c.includes('aerobicCapacity'), 'T6 compatibility guard defers antagonistic aerobic');
assert(c.includes('mobility'), 'T7 fills from the next eligible after a deferral');

assert(prioritiseQualities([{ qualityId: 'x', magnitude: 0, confidence: 'high' }]).length === 0, 'T8 no positive-magnitude limiter → []');
let threw = false; try { prioritiseQualities(null); } catch { threw = true; }
assert(!threw, 'T9 never throws on null');
