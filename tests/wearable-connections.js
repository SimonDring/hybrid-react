import { primaryProvider, computeRoleUpdates } from '../src/lib/wearableConnections.js';

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

// computeRoleUpdates — promote garmin, demote the old fitbit primary
const conns = [{ provider: 'fitbit', role: 'primary' }, { provider: 'garmin', role: 'secondary' }];
const updates = computeRoleUpdates(conns, 'garmin');
assert(updates.length === 2, 'T5 two updates (promote + demote)');
assert(updates.find(u => u.provider === 'garmin').role === 'primary', 'T6 garmin → primary');
assert(updates.find(u => u.provider === 'fitbit').role === 'secondary', 'T7 fitbit → secondary');

// already primary → no-op
assert(computeRoleUpdates(conns, 'fitbit').length === 0, 'T8 choosing the existing primary is a no-op');

// promote when there is no current primary → single update
const conns2 = [{ provider: 'fitbit', role: 'secondary' }];
const updates2 = computeRoleUpdates(conns2, 'fitbit');
assert(updates2.length === 1 && updates2[0].role === 'primary', 'T9 promote with no prior primary');

// input is not mutated
computeRoleUpdates(conns, 'garmin');
assert(conns[0].role === 'primary', 'T10 does not mutate input');
