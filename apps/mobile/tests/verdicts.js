import { readinessVerdict, loadVerdict, confidenceNote, indexBandColor } from '../src/lib/verdicts.js';

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

assert(loadVerdict({ acwr: 1.0, band: 'sweet' }).tone === 'positive', 'T8 sweet → positive');
assert(loadVerdict({ acwr: 1.6, band: 'over' }).tone === 'strain', 'T9 over → strain');
assert(loadVerdict({ acwr: 0.6, band: 'under' }).tone === 'caution', 'T10 under → caution');
assert(loadVerdict({ acwr: 1.45, band: 'high' }).tone === 'caution', 'T11 high → caution');
assert(loadVerdict({ acwr: null, band: null }).tone === 'neutral', 'T12 no data → neutral');
assert(loadVerdict(null).tone === 'neutral', 'T13 null → neutral');
assert(loadVerdict({ acwr: 1.6, band: 'over' }, { reverted: false, reason: 'Easing this week — you ramped fast.' }).note === 'Easing this week — you ramped fast.', 'T14 active adaptation reason wins');
assert(loadVerdict({ acwr: 1.6, band: 'over' }, { reverted: true, reason: 'x' }).note !== 'x', 'T15 reverted adaptation ignored');
assert(loadVerdict({ acwr: 1.6, band: 'over' }, { reverted: true, reason: 'x' }).note === 'Well above baseline — easing off so you can absorb it.', 'T15b reverted adaptation falls back to base note');
assert(loadVerdict({ acwr: 1.0, band: 'taper' }).tone === 'neutral', 'T16 unknown band → neutral');
assert(readinessVerdict({ status: 'strong' }).label === 'Primed', 'T17 strong → label Primed');
assert(readinessVerdict({ status: 'low' }).label === 'Ease in', 'T18 low → label Ease in');

// ── confidenceNote: caveat only when confidence is not high ─────────────────────
assert(confidenceNote(null) === null, 'T19 null confidence → no caveat');
assert(confidenceNote(0.8) === null, 'T20 high confidence (≥70%) → no caveat');
assert(/Moderate/.test(confidenceNote(0.5)), 'T21 mid confidence → moderate caveat');
assert(/Low/.test(confidenceNote(0.2)), 'T22 low confidence → low caveat');
// ── indexBandColor: real theme tokens, muted fallback ──────────────────────────
assert(indexBandColor('green') === 'var(--moss)' && indexBandColor('red') === 'var(--rust)', 'T23 band colours use real tokens');
assert(indexBandColor(null) === 'var(--txt-muted)', 'T24 null band → muted fallback');

console.log('verdicts tests done');
