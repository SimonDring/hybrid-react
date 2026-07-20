import assert from 'node:assert/strict';
import { scheduleWeek } from '../src/lib/plan/scheduler.js';

let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); console.log('PASS:', m); };

// Three sessions, all available weekdays Mon/Tue/Wed/Thu/Fri (indices 0-4). One is heavy+high-axial.
const spec = (focus, { hard = false, axial = 0 } = {}) => ({
  focus, discipline: 'gym', duration: 60, items: [], axialLoad: axial,
  intensity: hard ? 'hard' : 'moderate', muscleVol: { quads: axial ? 10 : 2 },
});
const sportSpecs = [spec('Heavy', { hard: true, axial: 4 }), spec('Power'), spec('Accessory')];
const dayNames = ['Tuesday', 'Thursday', 'Friday']; // MD-4, MD-2, MD-1 for a Saturday match

// mdConstraints for a Saturday (idx 5) match: avoid heavy on Fri(4)/Sat(5)/Sun(6); heavy target Tue(1)/Wed(2).
const md = {
  avoidHeavyIdx: new Set([4, 5, 6]), preferExplosiveIdx: new Set([3, 2]),
  heavyTargetIdx: new Set([1, 2]), recoveryIdx: new Set([6]),
};

// Baseline (no mdConstraints) — capture placement.
const base = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [] });
const baseHeavy = base.find((s) => s.title.includes('Heavy')).dayIdx;

// With mdConstraints — the heavy session must NOT land on an avoid-heavy day.
const shaped = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: md });
const shapedHeavy = shaped.find((s) => s.title.includes('Heavy')).dayIdx;
ok(!md.avoidHeavyIdx.has(shapedHeavy), `heavy session avoids MD-1/MD/MD+1 (landed on idx ${shapedHeavy})`);
ok(md.heavyTargetIdx.has(shapedHeavy), `heavy session lands on a heavy-target day (idx ${shapedHeavy})`);

// Null mdConstraints is byte-identical to the no-arg baseline.
const nullMd = scheduleWeek({ sportSpecs, dayNames, busyDays: [], sportMuscles: [], mdConstraints: null });
ok(JSON.stringify(nullMd) === JSON.stringify(base), 'mdConstraints:null is byte-identical to baseline');
console.log(`\nscheduler-md: ${n}/${n} checks passed`);
