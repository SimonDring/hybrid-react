// Minimal localStorage shim for Node (must run before importing Storage)
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; }
};

import * as Storage from '../src/lib/Storage.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// T1: writes land under the active namespace and are isolated per namespace
Storage.setNamespace('userA');
Storage.save(Storage.KEYS.injuries, { i1: { id: 'i1' } });
assert(localStorage.getItem('htp_injuries_v4_userA') !== null, 'T1a writes to namespaced key');
assert(localStorage.getItem('htp_injuries_v4') === null, 'T1b does not write the bare key');

Storage.setNamespace('userB');
assert(Object.keys(Storage.load(Storage.KEYS.injuries, {})).length === 0, 'T2 userB sees no userA injuries');

Storage.setNamespace('userA');
assert(Storage.load(Storage.KEYS.injuries, {}).i1?.id === 'i1', 'T3 userA still has its injury');

// T4: clearNamespace wipes only that namespace
Storage.setNamespace('userB');
Storage.save(Storage.KEYS.sessions, { s1: { id: 's1' } });
Storage.clearNamespace('userB');
assert(Object.keys(Storage.load(Storage.KEYS.sessions, {})).length === 0, 'T4a userB sessions cleared');
Storage.setNamespace('userA');
assert(Storage.load(Storage.KEYS.injuries, {}).i1?.id === 'i1', 'T4b userA untouched by clearing userB');

// T5: migrateUnnamespacedKeysOnce moves bare keys into target, once
localStorage.clear();
localStorage.setItem('htp_injuries_v4', JSON.stringify({ old: { id: 'old' } }));
Storage.setNamespace('userC');
Storage.migrateUnnamespacedKeysOnce('userC');
assert(Storage.load(Storage.KEYS.injuries, {}).old?.id === 'old', 'T5a legacy data moved into userC');
assert(localStorage.getItem('htp_injuries_v4') === null, 'T5b bare key removed after migration');
// running again is a no-op (flag set) — seed a new bare key and confirm it is NOT moved
localStorage.setItem('htp_injuries_v4', JSON.stringify({ second: { id: 'second' } }));
Storage.migrateUnnamespacedKeysOnce('userC');
assert(localStorage.getItem('htp_injuries_v4') !== null, 'T5c second run is a no-op');

// T6: adoptAnonDataOnce copies anon table data into an empty target, once
localStorage.clear();
Storage.setNamespace('anon');
Storage.save(Storage.KEYS.injuries, { a1: { id: 'a1' } });
Storage.setNamespace('userD');
Storage.adoptAnonDataOnce('userD');
assert(Storage.load(Storage.KEYS.injuries, {}).a1?.id === 'a1', 'T6a anon data adopted into empty userD');
// does not overwrite a target that already has data
Storage.setNamespace('userE');
Storage.save(Storage.KEYS.injuries, { e1: { id: 'e1' } });
Storage.adoptAnonDataOnce('userE');
assert(Storage.load(Storage.KEYS.injuries, {}).e1?.id === 'e1', 'T6b non-empty target not overwritten');
assert(!Storage.load(Storage.KEYS.injuries, {}).a1, 'T6c userE keeps only its own data');
