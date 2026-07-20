// packages/engine/tests/fixture-weeks.test.mjs
import assert from 'node:assert/strict';
import { mdMapForWeek, mdConstraintsFrom } from '@performance-os/engine';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// Plan starts Mon 2026-07-13. Week 1 = 2026-07-13 (Mon) … 2026-07-19 (Sun).
// A Saturday fixture (2026-07-18) is weekday index 5.
{
  const r = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }],
    matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1,
  });
  ok(r.matchesThisWeek === 1, 'one match in week 1');
  ok(r.mdOffsetByWeekday.get(5) === 0, 'Saturday is MD (offset 0)');
  ok(r.mdOffsetByWeekday.get(4) === -1, 'Friday is MD-1');
  ok(r.mdOffsetByWeekday.get(1) === -4, 'Tuesday is MD-4');
  ok(r.mdOffsetByWeekday.get(6) === 1, 'Sunday is MD+1');
}
// No fixture in the week, but a recurring Saturday match weekday → fallback anchor.
{
  const r = mdMapForWeek({ fixtures: [], matchWeekday: 5, planStartDate: '2026-07-13', weekNum: 1 });
  ok(r.matchesThisWeek === 0, 'no dated fixture this week');
  ok(r.mdOffsetByWeekday.get(1) === -4, 'fallback anchor still gives Tue = MD-4');
}
// Neither dated fixtures nor a recurring weekday → no map.
{
  const r = mdMapForWeek({ fixtures: [], matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1 });
  ok(r.matchesThisWeek === null, 'no signal → null density');
  ok(r.mdOffsetByWeekday.size === 0, 'no signal → empty map');
}
// Two matches (Wed + Sat) → nearest-match offset per weekday.
{
  const r = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-15', weekdayIdx: 2 }, { dateISO: '2026-07-18', weekdayIdx: 5 }],
    matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1,
  });
  ok(r.matchesThisWeek === 2, 'two matches in week 1');
  ok(r.mdOffsetByWeekday.get(3) === 1, 'Thursday is MD+1 relative to the Wed match (nearest)');
  ok(r.mdOffsetByWeekday.get(4) === -1, 'Friday is MD-1 relative to the Sat match (nearest)');
}
// oneMatchPerWeek soccer constraints, Saturday match (offsets: Tue -4, Thu -2, Fri -1, Sat 0, Sun +1).
{
  const { mdOffsetByWeekday } = mdMapForWeek({
    fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }], matchWeekday: null,
    planStartDate: '2026-07-13', weekNum: 1,
  });
  const c = mdConstraintsFrom({
    avoidHeavyLiftingDays: ['MD-1', 'MD', 'MD+1'],
    preferExplosiveWorkDays: ['MD-2', 'MD-3'],
    heavyDay: 'MD-4 or MD-3 (lower-body strength)', powerDay: 'MD-2 (power)',
    recoveryDay: 'MD+1 (active recovery)', injuryPreventionDay: null,
  }, mdOffsetByWeekday);
  ok(c.avoidHeavyIdx.has(4) && c.avoidHeavyIdx.has(5) && c.avoidHeavyIdx.has(6), 'avoid-heavy = Fri/Sat/Sun (MD-1/MD/MD+1)');
  ok(c.preferExplosiveIdx.has(3) && c.preferExplosiveIdx.has(2), 'prefer-explosive = Thu/Wed (MD-2/MD-3)');
  ok(c.heavyTargetIdx.has(1) && c.heavyTargetIdx.has(2), 'heavy target = Tue/Wed (MD-4/MD-3)');
  ok(c.recoveryIdx.has(6), 'recovery = Sunday (MD+1)');
}
// Sentinel-only congested constraints → null (byte-safe; sentinel semantics are Simon's call).
{
  const { mdOffsetByWeekday } = mdMapForWeek({ fixtures: [{ dateISO: '2026-07-18', weekdayIdx: 5 }], matchWeekday: null, planStartDate: '2026-07-13', weekNum: 1 });
  const c = mdConstraintsFrom({ avoidHeavyLiftingDays: ['all'], preferExplosiveWorkDays: ['match-day primer only'], heavyDay: 'none', powerDay: 'match-day priming only', recoveryDay: 'every non-match day', injuryPreventionDay: null }, mdOffsetByWeekday);
  ok(c === null, 'unparseable sentinel constraints yield no reshape (null)');
}
console.log(`\nfixture-weeks: ${n}/${n} checks passed`);
