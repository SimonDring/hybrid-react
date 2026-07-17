// dose-contract.test.mjs — M6 re-seat extraction 1 (M-DOSE): the dose primitives are
// independently testable behind their contract, with NO allocator/sibling required (10 §2.1).
// This is the fixture proof the 🔒 9 ruling requires for each extraction; byte-identity of
// the whole engine (golden master) is the separate, stronger proof that the MOVE was pure.
import { scheme, roleSetCount, restForRole, makeItem, cnsTier, olympicClassicLift, capReps, floorReps } from '@performance-os/engine/lib/dose/dose.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── scheme: a thin governed lookup returning a dosing object with main/acc rows ──
{
  const s = scheme('powerlifting', 'base', false, false);
  assert(s && typeof s.main === 'string' && typeof s.acc === 'string', 'scheme() returns a dose object with main/acc rows');
  const taper = scheme('powerlifting', 'base', false, true);
  assert(taper && taper !== s, 'scheme() taper branch returns the taper scheme');
}

// ── cnsTier: role/quality → CNS tier (drives rest + supersetting) ──
{
  assert(cnsTier({ role: 'primary' }) === 'high', 'cnsTier: a primary is high-CNS');
  assert(cnsTier({ role: 'iso' }) === 'low', 'cnsTier: an isolation is low-CNS');
  assert(cnsTier({ role: 'accessory', cns: 'moderate' }) === 'moderate', 'cnsTier: explicit cns wins');
  assert(cnsTier(null) === 'low', 'cnsTier: null → low (safe default)');
}

// ── olympicClassicLift: power quality + olympic discipline ──
{
  assert(olympicClassicLift({ quality: 'power', discipline: 'olympic' }) === true, 'olympicClassicLift: power+olympic → true');
  assert(olympicClassicLift({ quality: 'power' }) === false, 'olympicClassicLift: power without olympic → false');
}

// ── roleSetCount: working-set count by role × scheme ──
{
  const s = scheme('hypertrophy', 'base', false, false);
  const n = roleSetCount({ role: 'primary' }, s, 'hypertrophy', null);
  assert(Number.isFinite(n) && n > 0, `roleSetCount: a primary yields a positive set count (${n})`);
  const power = roleSetCount({ quality: 'power' }, s, 'hypertrophy', null);
  assert(Number.isFinite(power) && power > 0, `roleSetCount: power work is dosed by quality (${power})`);
}

// ── restForRole: numeric rest per role/style ──
{
  const r = restForRole({ role: 'primary' }, 'powerlifting', null);
  assert(Number.isFinite(r) && r > 0, `restForRole: a strength primary gets a positive rest (${r}s)`);
}

// ── makeItem: the fully-rendered dosed item ──
{
  const s = scheme('hypertrophy', 'base', false, false);
  const item = makeItem({ id: 'db_bench', name: 'DB bench', role: 'accessory' }, 0, s, 'hypertrophy', false, 0, false);
  assert(item && item.exId === 'db_bench' && item.name === 'DB bench', 'makeItem: carries exId + name');
  assert(typeof item.sets === 'string' && typeof item.num === 'string' && Number.isFinite(item.restSec),
    'makeItem: renders sets string, position label, numeric restSec');
}

// ── capReps / floorReps: rep-math on a "sets" string ──
{
  assert(capReps('3 × 12', 6) === '3 × 6', `capReps clamps reps to the ceiling (${capReps('3 × 12', 6)})`);
  assert(floorReps('3 × 5', 8) === '3 × 8', `floorReps raises reps to the floor (${floorReps('3 × 5', 8)})`);
  // capReps clamps the first rep number it finds (it has no time-row guard — only the
  // per-exercise repCap opts a movement in, and those are never time-based, so it never bites
  // in practice). Pinning the ACTUAL behaviour, not the aspirational comment.
  assert(capReps('2 × 30s', 6) === '2 × 6s', `capReps clamps the number even before a unit (${capReps('2 × 30s', 6)})`);
}

// ── purity: same inputs → same output ──
{
  const a = makeItem({ id: 'x', name: 'X', role: 'iso' }, 1, scheme('functional', 'base', false, false), 'functional', false, 0, false);
  const b = makeItem({ id: 'x', name: 'X', role: 'iso' }, 1, scheme('functional', 'base', false, false), 'functional', false, 0, false);
  assert(JSON.stringify(a) === JSON.stringify(b), 'makeItem is deterministic');
}
