import { PROVIDERS, listProviders } from '../src/data/providers.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

assert(PROVIDERS.fitbit.status === 'live', 'T1 fitbit is live');
assert(PROVIDERS.garmin.status === 'coming_soon', 'T2 garmin is coming_soon');
assert(PROVIDERS.strava.status === 'coming_soon', 'T3 strava is coming_soon');

assert(PROVIDERS.fitbit.capabilities.baseline === true, 'T4 fitbit supplies baseline');
assert(PROVIDERS.garmin.capabilities.workouts === true, 'T5 garmin supplies workouts');
assert(PROVIDERS.strava.capabilities.baseline === false, 'T6 strava has no baseline');
assert(PROVIDERS.strava.capabilities.workouts === true, 'T7 strava supplies workouts');

const list = listProviders();
assert(Array.isArray(list) && list.length === 3, 'T8 listProviders returns all three');
assert(list[0].id === 'fitbit', 'T9 fitbit is first');
