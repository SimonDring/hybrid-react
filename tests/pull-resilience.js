// SyncService transitively imports Database (which boots on import and touches
// localStorage), so install the shim first and dynamically import the module.
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

const { pullTablesToReplace } = await import('../src/lib/SyncService.js');

const results = {
  plans:     { error: null },
  sessions:  { error: { message: 'network blip' } }, // failed
  injuries:  { error: null },
  metrics:   null                                     // treated as fetched-empty (no error)
};

const toReplace = pullTablesToReplace(results);
assert(toReplace.includes('plans'), 'T1 clean table is replaced');
assert(toReplace.includes('injuries'), 'T2 clean injuries table is replaced');
assert(!toReplace.includes('sessions'), 'T3 errored table is NOT replaced (no stale-clear, no crash)');
assert(toReplace.includes('metrics'), 'T4 null-result table is replaced');
