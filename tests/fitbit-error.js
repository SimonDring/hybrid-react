// SyncService transitively imports Database (boots on import, touches
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

const { pickFitbitErrorReason } = await import('../src/lib/SyncService.js');

// T1: prefer detail (the specific cause) over the generic error label
assert(
  pickFitbitErrorReason({ error: 'Token refresh failed', detail: 'invalid_grant' }, 'generic') === 'invalid_grant',
  'T1 detail wins over error + fallback'
);

// T2: fall back to error label when no detail
assert(
  pickFitbitErrorReason({ error: 'Google Health not connected' }, 'generic') === 'Google Health not connected',
  'T2 error label used when no detail'
);

// T3: null/empty body → fallback
assert(pickFitbitErrorReason(null, 'fallback') === 'fallback', 'T3 null body → fallback');
assert(pickFitbitErrorReason({}, 'fallback') === 'fallback', 'T4 empty body → fallback');
