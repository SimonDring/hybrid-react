// tests/wp53-rollup.js — WP-53: the engine owns the team roll-up (TAS Appendix A).
//
// rollUp() ports the coach-board derivation (apps/web/lib/liveDerive.ts) into the engine
// as ONE pure source: a coach-safe player_status row → the derived coaching signal (RAG
// status, confidence, normalised load/injury). No presentation copy — that stays in the
// consumer. This test snapshot-locks the ported behaviour (expected values computed from
// the web's severity model) so the engine + web can't drift, and pins the privacy contract
// (rollUp reads only the seven coach-safe fields).

import { rollUp, LOW_ADHERENCE_THRESHOLD } from '@performance-os/engine';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

const NOW = new Date('2026-07-06T12:00:00Z').getTime();   // fixed reference — never the clock
const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();
const up = (o) => rollUp(row(o), { nowMs: NOW });
const row = (o) => ({ user_id: 'u1', display_name: 'A', readiness: 70, load_state: 'balanced', acwr: 1.0, adherence_pct: 95, injury_status: 'available', updated_at: hoursAgo(1), ...o });

// ── RAG status: the severity model, verbatim ─────────────────────────────────
assert(up({ injury_status: 'out', readiness: 90 }).status === 'red', "injury 'out' → red regardless of readiness");
assert(up({ readiness: null }).status === 'grey', 'no readiness → grey');
assert(up({ readiness: 45 }).status === 'amber', 'readiness 45 (+2) alone → amber');
assert(up({ readiness: 45, load_state: 'overreaching' }).status === 'red', 'readiness 45 (+2) + overreaching (+2) = 4 → red');
assert(up({ readiness: 60 }).status === 'amber', 'readiness 60 (+1) → amber');
assert(up({ readiness: 70, load_state: 'balanced' }).status === 'green', 'readiness 70, balanced load → green');
assert(up({ readiness: 70, injury_status: 'modified' }).status === 'amber', 'a niggle (+1) → amber');
assert(up({ readiness: 70, adherence_pct: 40 }).status === 'amber', 'low adherence (+1) → amber');

// ── grey still carries the OTHER real signals (injury/load normalise) ────────
const grey = up({ readiness: null, load_state: 'overreaching', injury_status: 'modified' });
assert(grey.status === 'grey' && grey.loadState === 'overreaching' && grey.injuryFlag === true,
  'grey player still exposes load/injury signal');

// ── confidence: completeness × freshness ─────────────────────────────────────
assert(up({ updated_at: hoursAgo(1), readiness: 70, acwr: 1.0 }).confidence === 'high', 'fresh + readiness + load → high');
assert(up({ updated_at: daysAgo(3), readiness: 70, acwr: 1.0 }).confidence === 'medium', 'not fresh but not stale, has signals → medium');
assert(up({ updated_at: daysAgo(9) }).confidence === 'low', 'stale (>7d) → low');
assert(up({ updated_at: null }).confidence === 'low', 'no timestamp → low');

// ── normalisation ────────────────────────────────────────────────────────────
assert(up({ load_state: 'bogus' }).loadState === 'no-data', 'unknown load_state → no-data');
assert(up({ acwr: 1.23456 }).acwr === 1.23, 'acwr rounds to 2dp');
assert(up({ adherence_pct: 91.6 }).adherencePercent === 92, 'adherence rounds');
assert(LOW_ADHERENCE_THRESHOLD === 60 && up({ adherence_pct: 60 }).lowAdherence === false && up({ adherence_pct: 59 }).lowAdherence === true,
  'low-adherence threshold is <60 (verbatim from the web)');

// ── purity: same row + same now → identical signal (Art 18) ──────────────────
const r = row({ readiness: 55, load_state: 'high' });
assert(JSON.stringify(rollUp(r, { nowMs: NOW })) === JSON.stringify(rollUp(r, { nowMs: NOW })), 'deterministic for a fixed now');

// ── privacy: rollUp never reads a raw vital even if one leaks into the row ────
const withVital = up({ hrv_ms: 20, resting_hr: 90, sleep_score: 30, readiness: 70, load_state: 'balanced', adherence_pct: 95 });
const clean = up({ readiness: 70, load_state: 'balanced', adherence_pct: 95 });
assert(JSON.stringify(withVital) === JSON.stringify(clean), 'a stray raw vital in the row does not change the signal (reads only coach-safe fields)');

console.log(process.exitCode ? 'wp53-rollup FAILURES' : `PASS: wp53-rollup — ${pass} assertions`);
