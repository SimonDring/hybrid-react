import { readinessVerdict } from '../src/lib/verdicts.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(readinessVerdict({ status: 'strong' }).tone === 'positive', 'T1 strong → positive');
assert(readinessVerdict({ status: 'moderate' }).tone === 'caution', 'T2 moderate → caution');
assert(readinessVerdict({ status: 'low' }).tone === 'strain', 'T3 low → strain');
assert(readinessVerdict({ status: 'unknown' }).tone === 'neutral', 'T4 unknown → neutral');
assert(readinessVerdict(null).tone === 'neutral', 'T5 null → neutral');
assert(readinessVerdict({ status: 'strong' }).color === 'var(--status-positive)', 'T6 positive → status-positive token');
assert(typeof readinessVerdict({ status: 'low' }).headline === 'string' && readinessVerdict({ status: 'low' }).headline.length > 0, 'T7 headline present');
