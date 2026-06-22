// localStorage shim must exist before Database/Storage boot (import is hoisted).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const Database = (await import('../src/lib/Database.js')).default;
const Storage = await import('../src/lib/Storage.js');

// T1: workouts has a namespaced Storage key and a Database table
Storage.setNamespace('userW');
Storage.save(Storage.KEYS.workouts, { w1: { id: 'w1', type: 'run', provider: 'strava' } });
assert(localStorage.getItem('htp_workouts_v4_userW') !== null, 'T1 writes to namespaced workouts key');

Database.services.reloadFromStorage();
assert(Database.tables.workouts.get('w1')?.type === 'run', 'T2 reload picks up workouts for userW');

// T3: switching namespace isolates workouts
Storage.setNamespace('userZ');
Database.services.reloadFromStorage();
assert(!Database.tables.workouts.get('w1'), 'T3 workouts isolated per namespace');

// T4: clearNamespace removes workouts for that namespace only
Storage.setNamespace('userW');
Storage.clearNamespace('userW');
assert(localStorage.getItem('htp_workouts_v4_userW') === null, 'T4 clearNamespace clears workouts');
