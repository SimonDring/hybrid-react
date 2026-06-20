import { fitnessAge, fitnessAgeSeries } from '../src/lib/fitnessAge.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// No age → null.
assert(fitnessAge({}, [{ hrv_ms: 60, resting_hr: 55, date: '2026-06-19' }]) === null, 'T1 no age → null');
// No HRV/RHR → null.
assert(fitnessAge({ age: 40 }, [{ date: '2026-06-19' }]) === null, 'T2 no markers → null');

// Strong markers (high HRV, low RHR) → younger than 40.
const young = fitnessAge({ age: 40 }, [{ hrv_ms: 75, resting_hr: 50, date: '2026-06-19' }]);
assert(young.fitnessAge < 40 && young.status === 'younger' && young.delta > 0, 'T3 high HRV + low RHR → younger');
assert(young.color === 'var(--status-positive)', 'T4 younger → positive color');

// Weak markers (low HRV, high RHR) → older than 30.
const old = fitnessAge({ age: 30 }, [{ hrv_ms: 30, resting_hr: 75, date: '2026-06-19' }]);
assert(old.fitnessAge > 30 && old.status === 'older' && old.delta < 0, 'T5 low HRV + high RHR → older');

// Single marker works (HRV only).
const hrvOnly = fitnessAge({ age: 40 }, [{ hrv_ms: 75, date: '2026-06-19' }]);
assert(hrvOnly && hrvOnly.fitnessAge < 40 && hrvOnly.rhr === null, 'T6 HRV-only still estimates');

// Averages across days; clamps floor at 18.
const youngFloor = fitnessAge({ age: 19 }, [{ hrv_ms: 100, resting_hr: 38, date: '2026-06-19' }]);
assert(youngFloor.fitnessAge >= 18, 'T7 floor at 18');

// Series: one point per day, trends younger as markers improve.
const days = [];
for (let i = 0; i < 20; i++) days.push({ date: `2026-05-${String(i + 1).padStart(2, '0')}`, hrv_ms: 48 + i, resting_hr: 56 - i * 0.3 });
const s = fitnessAgeSeries({ age: 40 }, days);
assert(Array.isArray(s) && s.length === 20, 'T8 series has one point per day');
assert(s[s.length - 1].fitnessAge <= s[0].fitnessAge, 'T9 improving markers → fitness age trends younger');
assert(fitnessAgeSeries({}, days).length === 0, 'T10 no age → empty series');
