// localStorage shim must exist BEFORE Database.js boots (it writes on import).
// `import` is hoisted, so we install the shim then dynamically import the modules.
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

// Seed injuries directly into userX's namespace, then reload and read them back.
Storage.setNamespace('userX');
Storage.save(Storage.KEYS.injuries, { ix: { id: 'ix', body_part: 'knee' } });
Database.services.reloadFromStorage();
assert(Database.tables.injuries.get('ix')?.body_part === 'knee', 'T1 reload picks up userX injuries');

// Switch to a different namespace with no injuries → reload should show none.
Storage.setNamespace('userY');
Database.services.reloadFromStorage();
assert(!Database.tables.injuries.get('ix'), 'T2 reload clears injuries when switching to empty namespace');
