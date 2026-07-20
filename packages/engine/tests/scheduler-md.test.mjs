// scheduler-md.test.mjs — the D13 scheduler honours match-day spacing penalties, inert when null.
// The fixture is deliberately built so the BASELINE (no mdConstraints) places the heavy session on
// an avoid-heavy day — asserted directly as a non-vacuity guard — so the "shaped" assertions genuinely
// prove the MD block runs (they fail if it does nothing).
import assert from 'node:assert/strict';
import { scheduleWeek } from '../src/lib/plan/scheduler.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

const spec = (focus, { hard = false, axial = 0 } = {}) => ({
  focus, discipline: 'gym', duration: 60, items: [], axialLoad: axial,
  intensity: hard ? 'hard' : 'moderate', muscleVol: { quads: axial ? 10 : 2 },
});
// Heavy is the LAST session → identity-permutation tie-break lands it on the last day (Friday idx4).
const sportSpecs = [spec('Power'), spec('Accessory'), spec('Heavy', { hard: true, axial: 4 })];
const dayNames = ['Monday', 'Wednesday', 'Friday']; // idx 0, 2, 4

// Saturday match (idx5): avoid heavy on Fri(4)/Sat(5)/Sun(6); heavy target Tue(1)/Wed(2).
const md = {
  avoidHeavyIdx: new Set([4, 5, 6]), preferExplosiveIdx: new Set([3, 2]),
  heavyTargetIdx: new Set([1, 2]), recoveryIdx: new Set([6]),
};

const base = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [] });
const baseHeavy = base.find((s) => s.title.includes('Heavy')).dayIdx;
// NON-VACUITY: without MD shaping the heavy session lands on an avoid-heavy day (Friday = MD-1).
ok(md.avoidHeavyIdx.has(baseHeavy), `baseline places heavy on an avoid-heavy day (idx ${baseHeavy}) — fixture is a real test`);

const shaped = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: md });
const shapedHeavy = shaped.find((s) => s.title.includes('Heavy')).dayIdx;
ok(!md.avoidHeavyIdx.has(shapedHeavy), `MD shaping moves heavy OFF the avoid day (idx ${shapedHeavy})`);
ok(md.heavyTargetIdx.has(shapedHeavy), `MD shaping lands heavy on a target day (idx ${shapedHeavy})`);

const nullMd = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: null });
ok(JSON.stringify(nullMd) === JSON.stringify(base), 'mdConstraints:null is byte-identical to baseline');
console.log(`\nscheduler-md: ${n}/${n} checks passed`);
