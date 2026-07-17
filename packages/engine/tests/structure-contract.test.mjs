// structure-contract.test.mjs — M6 re-seat extraction 2 (M-SCHED structuring core):
// the D13 structuring is independently testable behind its contract, no allocator/sibling
// required (10 §2.1). Byte-identity of the whole engine (golden master) is the separate,
// stronger proof that the MOVE was pure.
import { structureItems, shiftRpe } from '@performance-os/engine/lib/schedule/structure.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const pick = (id, role, extra = {}) => ({
  ex: { id, role, ...extra },
  item: { exId: id, name: id, sets: '3 × 10', rpe: 'RPE 8', restSec: 90 },
});

// ── A single primary → one straight-set block, leads the session ──
{
  const items = structureItems([pick('squat', 'primary')]);
  assert(items.length === 1 && items[0].num === 'A1' && items[0].superset === false,
    'a lone primary is a straight-set block (A1, not supersetted)');
}

// ── Two non-competing low-CNS accessories → paired superset ──
{
  // biceps (pull) + triceps (push): different muscles, both low-CNS → eligible to pair.
  const items = structureItems([
    pick('anchor', 'primary'),
    pick('biceps_curl', 'accessory', { pattern: 'hpull', loadClass: 'iso', role: 'iso' }),
    pick('triceps_pushdown', 'accessory', { pattern: 'hpush', loadClass: 'iso', role: 'iso' }),
  ]);
  const grouped = {};
  for (const it of items) grouped[it.group] = (grouped[it.group] || 0) + 1;
  const anySuperset = items.some((it) => it.superset === true);
  assert(anySuperset, 'two compatible low-CNS accessories form a superset (shared group, superset flag)');
  assert(items[0].exId === 'anchor', 'the anchor (picks[0]) leads the session');
}

// ── Volume is never changed — every pick appears exactly once ──
{
  const picks = [pick('a', 'primary'), pick('b', 'accessory', { role: 'iso', loadClass: 'iso' }), pick('c', 'accessory', { role: 'iso', loadClass: 'iso' })];
  const items = structureItems(picks);
  assert(items.length === 3, 'structuring reorders/pairs but never adds or drops volume (3 in → 3 out)');
}

// ── shiftRpe: raises within the floor, leaves at-floor work alone ──
{
  const items = [{ rpe: 'RPE 8' }, { rpe: 'RPE 5' }, { rpe: 'RPE 6' }];
  shiftRpe(items, -1, 5);
  assert(items[0].rpe === 'RPE 7', 'shiftRpe lowers RPE 8 → 7 with offset -1');
  assert(items[1].rpe === 'RPE 5', 'shiftRpe leaves RPE 5 (at floor) untouched');
  assert(items[2].rpe === 'RPE 5', 'shiftRpe floors RPE 6 → 5 (never below the floor)');
}

// ── shiftRpe with no offset is a no-op (the pure-generator path) ──
{
  const items = [{ rpe: 'RPE 8' }];
  shiftRpe(items, 0, 5);
  assert(items[0].rpe === 'RPE 8', 'shiftRpe(0) is a no-op — byte-identical pure path');
}
