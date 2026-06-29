import { computeReadiness } from '@performance-os/engine/lib/Readiness.js';
import skb from '@performance-os/engine/lib/sportKnowledge/index.js';
function assert(c,m){ if(!c){ console.error('FAIL:',m); process.exitCode=1; } else console.log('PASS:',m); }
// Low sleep (2h) but GOOD hrv/rhr vs baseline → sleep is the low part.
const dm = [
  { date: '2026-06-29', sleep_duration_min: 120, hrv_ms: 80, resting_hr: 48 },
  { date: '2026-06-28', hrv_ms: 60, resting_hr: 55 }
];
const base = computeReadiness(dm, []);                                   // equal weighting (no model)
const weighted = computeReadiness(dm, [], skb.get('swimming').readinessModel); // swimming weights sleep highest (8 > hrv 6 > rhr 5)
assert(typeof base.score === 'number' && typeof weighted.score === 'number', 'both produce a score');
assert(weighted.score < base.score, `weighting sleep highest lowers the score on a low-sleep day (weighted ${weighted.score} < base ${base.score})`);
// no-model path is unchanged vs explicit null
const nullModel = computeReadiness(dm, [], null);
assert(nullModel.score === base.score, 'no model === null model (behavior preserved)');
console.log('readiness-weighting tests done');
