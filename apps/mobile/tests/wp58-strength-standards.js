// tests/wp58-strength-standards.js — WP-58: one governed strength-standards source.
//
// The strength band table was duplicated app-side, and the engine's capability
// estimator carries its own per-lift "strong" anchors (STRONG_BW_MULTIPLE) — two
// parallel models that could drift. WP-58 brings the band table into the governed
// knowledge set (the app now re-exports it) and pins the engine↔governed relationship
// so a change to one can't silently diverge from the other.

import { STRENGTH_STANDARDS, STRENGTH_BANDS, strengthBandFor } from '@performance-os/engine';
import { STRONG_BW_MULTIPLE } from '@performance-os/engine/lib/performance/estimation.js';
import appDefault, { BANDS as appBands } from '../src/data/strengthStandards.js';
import { fitnessAge } from '../src/lib/fitnessAge.js';

let pass = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else pass++; }

// ── (1) ONE source: the app re-export IS the governed table ──────────────────
assert(appDefault === STRENGTH_STANDARDS, 'app strengthStandards default re-exports the governed table (identity)');
assert(JSON.stringify(appBands) === JSON.stringify(STRENGTH_BANDS), 'app BANDS === governed STRENGTH_BANDS');
assert(STRENGTH_STANDARDS.male.squat.advanced === 2.0 && STRENGTH_STANDARDS.female.bench.elite === 1.5,
  'governed table holds the expected values');

// ── (2) the band helper places a ratio correctly ────────────────────────────
const b = strengthBandFor('male', 'squat', 1.6); // ≥1.5 (intermediate), <2.0 (advanced)
assert(b && b.band === 'intermediate' && b.next === 'advanced' && b.nextRatio === 2.0,
  `strengthBandFor(male,squat,1.6) = intermediate→advanced@2.0 (got ${b && b.band}→${b && b.next})`);

// ── (3) engine↔governed alignment: NOW single-sourced (WP-58 reconcile) ──────
// STRONG_BW_MULTIPLE anchors "level 1.0" and is DERIVED from the governed `advanced` band
// for EVERY lift × sex — one source, no more divergence. Any drift fails here.
const aligned = [
  ['1rm_squat', 'squat'], ['1rm_bench', 'bench'], ['1rm_deadlift', 'deadlift'], ['1rm_ohp', 'ohp'],
];
for (const [metric, lift] of aligned) {
  for (const sex of ['male', 'female']) {
    const strong = STRONG_BW_MULTIPLE[metric][sex];
    const adv = STRENGTH_STANDARDS[sex][lift].advanced;
    assert(strong === adv, `STRONG_BW_MULTIPLE[${metric}][${sex}] (${strong}) === governed ${lift}.advanced (${adv})`);
  }
}
// The reconcile MOVED these (previously ohp-at-elite / independently-seeded female): confirm.
assert(STRONG_BW_MULTIPLE['1rm_ohp'].male === 0.8, 'ohp male reconciled to advanced (0.8, was 1.0)');
assert(STRONG_BW_MULTIPLE['1rm_deadlift'].female === 1.75 && STRONG_BW_MULTIPLE['1rm_ohp'].female === 0.55,
  'female deadlift/ohp reconciled to advanced (1.75 / 0.55, were 1.9 / 0.7)');
// 'other' = mean of male/female advanced (the governed table has no 'other' band).
assert(STRONG_BW_MULTIPLE['1rm_squat'].other === 1.75 && STRONG_BW_MULTIPLE['1rm_ohp'].other === 0.68,
  "'other' anchor = mean(male,female) advanced");

// ── (4) fitnessAge constant-extraction is byte-identical (guards the refactor) ─
// A 40-yr-old with strong markers (high HRV, low RHR) should read YOUNGER, by the
// same amount as before the FITNESS_AGE_MODEL extraction.
const metrics = Array.from({ length: 14 }, (_, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, hrv_ms: 80, resting_hr: 50 }));
const fa = fitnessAge({ age: 40 }, metrics);
// Recompute the model by hand (pre-extraction coefficients) to catch any drift.
function handOffset(hrv, rhr, age) {
  const expHRV = Math.max(30, Math.min(75, 68 - 0.45 * (age - 20)));
  const s = 0.6 * (-(hrv - expHRV) / 3.5) + 0.4 * ((rhr - 62) / 2.5);
  return Math.max(-15, Math.min(15, s));
}
const expected = Math.max(18, Math.round(40 + handOffset(80, 50, 40)));
assert(fa && fa.fitnessAge === expected, `fitnessAge exact pin (strong markers, age 40): ${fa && fa.fitnessAge} === hand-computed ${expected}`);
assert(fa.fitnessAge < 40, `strong markers read YOUNGER than chronological (${fa.fitnessAge} < 40)`);

console.log(process.exitCode ? 'wp58-strength-standards FAILURES' : `PASS: wp58-strength-standards — ${pass} assertions`);
