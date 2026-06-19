import { primaryProvider } from '../src/lib/wearableConnections.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// primaryProvider
assert(
  primaryProvider([{ provider: 'fitbit', role: 'primary' }, { provider: 'garmin', role: 'secondary' }]) === 'fitbit',
  'T1 returns the primary provider'
);
assert(primaryProvider([{ provider: 'garmin', role: 'secondary' }]) === null, 'T2 null when no primary');
assert(primaryProvider([]) === null, 'T3 null for empty list');
assert(primaryProvider([{ provider: 'fitbit' }]) === null, 'T4 missing role treated as not-primary');
