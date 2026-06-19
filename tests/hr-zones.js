import { estimateHrMax, hrZonesHRR } from '../src/lib/hrZones.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// estimateHrMax
assert(estimateHrMax({ age: 40 }) === Math.round(208 - 0.7 * 40), 'T1 age estimate (Tanaka)');
assert(estimateHrMax({ age: 40, observedPeak: 190 }) === 190, 'T2 observed peak preferred when higher');
assert(estimateHrMax({ age: 40, observedPeak: 150 }) === Math.round(208 - 0.7 * 40), 'T3 age estimate when peak lower');
assert(estimateHrMax({}) === null, 'T4 null when no inputs');

// hrZonesHRR — build 1-minute-spaced samples (epoch ms). hrRest 50, hrMax 200 → reserve 150.
// %HRR thresholds: z1<0.6(140), z2<0.7(155), z3<0.8(170), z4<0.9(185), z5>=0.9
const base = 1_000_000_000_000;
const min = (n) => base + n * 60_000;
const samples = [
  { hr: 110, t: min(0) }, // (110-50)/150 = .40 → z1
  { hr: 150, t: min(1) }, // .667 → z2
  { hr: 165, t: min(2) }, // .767 → z3
  { hr: 180, t: min(3) }, // .867 → z4
  { hr: 195, t: min(4) }  // .967 → z5 (no following sample → 0 duration credited)
];
const z = hrZonesHRR(samples, { hrRest: 50, hrMax: 200 });
assert(z.z1 === 1 && z.z2 === 1 && z.z3 === 1 && z.z4 === 1, 'T5 one minute credited to z1..z4');
assert(z.z5 === 0, 'T6 last sample credits no time (no following sample)');

// guards
assert(hrZonesHRR(samples, { hrRest: 50 }) === null, 'T7 null when hrMax missing');
assert(hrZonesHRR(samples, { hrRest: 200, hrMax: 200 }) === null, 'T8 null when hrMax <= hrRest');
assert(hrZonesHRR([], { hrRest: 50, hrMax: 200 }).z1 === 0, 'T9 empty samples → all-zero zones');
