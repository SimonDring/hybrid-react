// tests/team-status-rollup.js — the player-side status roll-up (the Team package).
// deriveStatus() is the SECOND enforcement of the data-isolation rule (RLS is the
// first, proven by supabase/tests/rls-harness.mjs): the coach-readable row is built
// against an explicit allowlist — the vitals that FEED readiness never appear.

// localStorage shim must exist BEFORE Database.js boots (teamStatus → SyncService → Database).
const _ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: (k) => { delete _ls[k]; },
  clear: () => { for (const k of Object.keys(_ls)) delete _ls[k]; },
};

import assert from 'node:assert';
const { deriveStatus } = await import('../src/lib/teamStatus.js');

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

// ── THE PRIVACY GUARD: derived fields only, never a vital ────────────────────
const row = deriveStatus({
  readiness: { score: 71, vitals: { hrv: 68, rhr: 52, sleepMin: 431 } },  // vitals present on the INPUT
  load: { acwr: 1.05, acute: 300, chronic: 290 },
  injuries: [],
  consistencyPct: 88,
});
const FORBIDDEN = ['hrv', 'hrv_ms', 'rhr', 'resting_hr', 'sleep', 'sleepMin', 'sleep_duration_min', 'vitals', 'acute', 'chronic'];
ok(FORBIDDEN.every((k) => !(k in row)), 'NO vital or raw-load key survives into the pushed row');
ok(Object.keys(row).sort().join(',') === 'acwr,adherence_pct,injury_status,load_state,readiness',
  `the row is EXACTLY the allowed five columns (${Object.keys(row).sort().join(',')})`);
ok(row.readiness === 71 && row.acwr === 1.05 && row.adherence_pct === 88, 'derived values carry through');

// ── load_state: the plain-English coach band from the athlete's own ACWR ─────
const stateAt = (acwr) => deriveStatus({ load: { acwr } }).load_state;
ok(stateAt(null) === 'no-data' && stateAt(0.6) === 'ramping' && stateAt(1.0) === 'balanced'
  && stateAt(1.4) === 'high' && stateAt(1.7) === 'overreaching',
  'load_state bands: no-data / ramping / balanced / high / overreaching');

// ── injury_status: availability only, never the detail ───────────────────────
ok(deriveStatus({ injuries: [] }).injury_status === 'available', 'no injuries → available');
ok(deriveStatus({ injuries: [{ status: 'active', title: 'Hamstring' }] }).injury_status === 'modified',
  'an active injury → modified (the plan is being filtered)');
ok(deriveStatus({ injuries: [{ status: 'active', red_flag_triggered: true }] }).injury_status === 'out',
  'a red-flagged injury → out');
ok(deriveStatus({ injuries: [{ status: 'recovered' }] }).injury_status === 'available',
  'resolved injuries do not affect availability');
const modRow = deriveStatus({ injuries: [{ status: 'active', description: 'PRIVATE NOTES', rehab_plan: 'PRIVATE' }] });
ok(!JSON.stringify(modRow).includes('PRIVATE'), 'injury free-text NEVER leaks into the row');

// ── honest nulls when there is nothing to derive ─────────────────────────────
const empty = deriveStatus({});
ok(empty.readiness === null && empty.acwr === null && empty.adherence_pct === null
  && empty.load_state === 'no-data' && empty.injury_status === 'available',
  'no data → honest nulls, never invented numbers');

console.log(`\n${pass} team-status-rollup checks passed.`);
