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

const { fitbitReconnectState } = await import('../src/lib/SyncService.js');

const today = new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

// T1: a token-related sync error → reconnect now, regardless of connection age
assert(
  fitbitReconnectState({ connectedAt: today, errorReason: 'Token refresh failed' }) === 'reconnect_now',
  'T1 token error → reconnect_now'
);

// T2: "not connected" also counts as reconnect now (matches /connect/)
assert(
  fitbitReconnectState({ connectedAt: today, errorReason: 'Google Health not connected' }) === 'reconnect_now',
  'T2 not-connected error → reconnect_now'
);

// T3: no error, but consent is old (>= 6 days) → proactive reconnect soon
assert(
  fitbitReconnectState({ connectedAt: daysAgo(7) }) === 'reconnect_soon',
  'T3 old connectedAt → reconnect_soon'
);

// T4: fresh connection, no error → ok
assert(
  fitbitReconnectState({ connectedAt: daysAgo(1) }) === 'ok',
  'T4 fresh connection → ok'
);

// T5: a non-token error on a fresh connection → ok (not a reconnect issue; e.g. a
// transient network/CORS error shows elsewhere, we don't tell them to reconnect)
assert(
  fitbitReconnectState({ connectedAt: daysAgo(1), errorReason: 'Failed to send request to the Edge Function' }) === 'ok',
  'T5 non-token error, fresh → ok'
);

// T6: missing/invalid connectedAt, no error → ok (never nag without evidence)
assert(fitbitReconnectState({}) === 'ok', 'T6 missing connectedAt → ok');
assert(fitbitReconnectState({ connectedAt: 'not-a-date' }) === 'ok', 'T7 invalid connectedAt → ok');
