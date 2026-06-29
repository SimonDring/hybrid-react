// tests/indices.js
// Physiological index layer (framework Phase 3). Verifies the uniform contract, the
// confidence model, graceful degradation, and — the cut-over gate — that the index
// values reproduce the existing engine maths exactly (parity with assessRecovery /
// sleepScoreFor). See docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md.
import {
  readinessIndex, recoveryIndex, wellnessIndex, sleepIndex,
  cardiovascularRecoveryIndex, trainingLoadIndex, subjectiveScore,
  recoveryCapacityIndex, consistencyIndex, bandFromValue
} from '@performance-os/engine/lib/indices/index.js';
import { assessRecovery, recoveryFromScore } from '@performance-os/engine/lib/recovery/recovery.js';
import { sleepScoreFor } from '@performance-os/engine/lib/Readiness.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

const today = '2026-06-28';
const DAY = 86400000;

// ── PARITY (the cut-over gate): recoveryIndex value === assessRecovery score ────
const subj = { energy: 2, soreness: 1, mood: 2 };
const ri = recoveryIndex({ objectiveScore: 80, subjective: subj });
const ar = assessRecovery({ objectiveScore: 80, subjective: subj });
assert(ri.value === ar.score, `recoveryIndex.value === assessRecovery.score (${ri.value} === ${ar.score})`);
assert(ri.value === 42, 'blend = round(0.6·17 + 0.4·80) = 42');
assert(recoveryIndex({ objectiveScore: 75 }).value === 75, 'objective-only → 75 (unchanged)');
assert(recoveryIndex({ subjective: { energy: 3 } }).value === 50, 'subjective single 3 → 50');
const none = recoveryIndex({});
assert(none.value === null && none.band === null && none.confidence === 0, 'no inputs → null value/band, 0 confidence (no throw)');

// ── subjectiveScore re-export is the same function ─────────────────────────────
assert(subjectiveScore({ energy: 5, soreness: 5, mood: 5, stress: 5, sleepQuality: 5 }) === 100, 'subjectiveScore all 5s → 100');

// ── sleepIndex === sleepScoreFor ───────────────────────────────────────────────
const m480 = { sleep_duration_min: 480 };
assert(sleepIndex(m480).value === sleepScoreFor(m480).score && sleepIndex(m480).value === 100, 'sleepIndex value === sleepScoreFor (480 min → 100)');

// ── band cut-points (70 / 50, parity with the readiness mapping) ───────────────
assert(bandFromValue(70) === 'green' && bandFromValue(69) === 'amber' && bandFromValue(50) === 'amber' && bandFromValue(49) === 'red' && bandFromValue(null) === null,
  'band cut-points: ≥70 green, ≥50 amber, <50 red, null → null');

// ── confidence model: monotonic with completeness + source quality ─────────────
const full = recoveryIndex({ objectiveScore: 70, subjective: { energy: 4, mood: 4, soreness: 4, stress: 4, sleepQuality: 4 }, source: 'fitbit' });
const objOnly = recoveryIndex({ objectiveScore: 70, source: 'fitbit' });
assert(full.confidence > objOnly.confidence, `more inputs → higher confidence (${full.confidence} > ${objOnly.confidence})`);
const prior = [{ hrv_ms: 60 }, { hrv_ms: 60 }];
const wrist = cardiovascularRecoveryIndex({ hrv_ms: 60, resting_hr: 50, source: 'fitbit' }, prior);
const ring = cardiovascularRecoveryIndex({ hrv_ms: 60, resting_hr: 50, source: 'oura' }, prior);
assert(ring.confidence > wrist.confidence, `better source (ring 0.95 > wrist 0.8) → higher confidence (${ring.confidence} > ${wrist.confidence})`);

// ── graceful degradation: missing input lowers confidence, never blocks ────────
const noHrv = cardiovascularRecoveryIndex({ resting_hr: 50, source: 'fitbit' }, [{ resting_hr: 55 }, { resting_hr: 55 }]);
assert(noHrv.value != null, 'cardio with no HRV still yields a value (from RHR)');
assert(noHrv.missingInputs.includes('hrv'), 'missing HRV is listed in missingInputs');
assert(noHrv.confidence > 0 && noHrv.confidence < 1, `partial inputs → reduced, non-zero confidence (${noHrv.confidence})`);

// ── Training Load Index: volume-load from set logs + ACWR balance ──────────────
const setLogs = [
  { actual_weight: 100, actual_reps: 5, completed_at: today + 'T10:00:00Z' },
  { actual_weight: 100, actual_reps: 5, completed_at: today }
];
const tliEmpty = trainingLoadIndex({ dl: [], asOf: today, setLogs });
assert(tliEmpty.volumeLoad === 1000, `volume-load = Σ weight·reps over 7d = 1000 (got ${tliEmpty.volumeLoad})`);
assert(tliEmpty.acwr === null && tliEmpty.value === null, 'no load history → ACWR null, value null');
const dl28 = [];
for (let i = 27; i >= 0; i--) dl28.push({ date: new Date(Date.parse(today) - i * DAY).toISOString().split('T')[0], load: 50 });
const tli = trainingLoadIndex({ dl: dl28, asOf: today, setLogs: [] });
assert(tli.acwr != null && Math.abs(tli.acwr - 1.0) < 0.05, `constant load → ACWR ≈ 1.0 (got ${tli.acwr})`);
assert(tli.band === 'green', 'balanced load (ACWR ~1.0) → green');
assert(tli.missingInputs.includes('volume_load'), 'no set logs → volume_load flagged missing (graceful)');

// ── Readiness integrator: value parity + exposes the sub-indices ───────────────
const metric = { source: 'fitbit', energy: 4, mood: 4, soreness: 4, stress: 4, sleep_quality: 4, sleep_duration_min: 480, hrv_ms: 60, resting_hr: 50 };
const rdx = readinessIndex({ metric, prior: [{ hrv_ms: 58 }, { hrv_ms: 59 }], objectiveScore: 72, recentRecovery: 4 });
const expected = recoveryIndex({ objectiveScore: 72, subjective: { sleepQuality: 4, soreness: 4, mood: 4, stress: 4, energy: 4 } }).value;
assert(rdx.value === expected, `readinessIndex.value === recoveryIndex.value (${rdx.value} === ${expected})`);
assert(rdx.indices.sleep && rdx.indices.cardio && rdx.indices.wellness && rdx.indices.recovery && rdx.indices.fatigue, 'integrator exposes sleep/cardio/wellness/recovery/fatigue');
assert(rdx.contributors.length >= 5 && rdx.contributors.every(c => 'confidence' in c && 'band' in c), 'contributors carry value + confidence + band');

// ── assessRecovery: score/volume unchanged, confidence now surfaced (additive) ─
const arc = assessRecovery({ objectiveScore: 60 });
assert(arc.score === 60 && arc.volumeModifier === 0.9 && typeof arc.confidence === 'number', 'assessRecovery score/volume preserved + confidence added');

// ── Recovery Capacity Index (trait) ────────────────────────────────────────────
const cap = recoveryCapacityIndex({ history: [{ hrv_ms: 60, sleep_duration_min: 470 }, { hrv_ms: 62, sleep_duration_min: 455 }, { hrv_ms: 59, sleep_duration_min: 480 }], profile: { age: 30 }, fitnessScore: 70 });
assert(cap.value != null && cap.value >= 0 && cap.value <= 100, `recoveryCapacity → 0–100 (got ${cap.value})`);
assert(cap.contributors.some(c => c.name === 'hrv_stability'), 'capacity reports hrv_stability contributor');
const capThin = recoveryCapacityIndex({ history: [], profile: {} });
assert(capThin.value === null && capThin.confidence === 0, 'capacity with no inputs → null value, 0 conf (no throw)');

// ── Consistency Index ──────────────────────────────────────────────────────────
const con = consistencyIndex({ completed: 8, planned: 10, loggedDays: 12, windowDays: 14 });
assert(con.value === 82, `consistency blend = round((80·3 + 85.7·2)/5) = 82 (got ${con.value})`);
assert(con.missingInputs.includes('routine_regularity'), 'routine_regularity flagged missing (future input)');
assert(consistencyIndex({ windowDays: 0 }).value === null, 'consistency with no window/inputs → null');

// ── integrator parity holds with capacity + consistency present ────────────────
const rdx2 = readinessIndex({
  metric, prior: [{ hrv_ms: 58 }, { hrv_ms: 59 }], objectiveScore: 72, recentRecovery: 4,
  capacity: { history: [{ hrv_ms: 60, sleep_duration_min: 470 }], profile: { age: 30 }, fitnessScore: 70 },
  consistency: { completed: 8, planned: 10, loggedDays: 12, windowDays: 14 }
});
assert(rdx2.value === expected, 'readinessIndex.value unchanged with capacity + consistency present (parity preserved)');
assert(rdx2.indices.recoveryCapacity && rdx2.indices.consistency, 'integrator includes capacity + consistency when supplied');

// ── Spec B: v2 re-weighting (flag-gated; v1 stays exact parity) ────────────────
// Strong subjective + sleep but a sharp HRV drop vs baseline: v2 (HRV-primary)
// scores LOWER than v1 (which is the flat objective+subjective blend).
const mB = { source: 'fitbit', energy: 5, mood: 5, soreness: 5, stress: 5, sleep_quality: 5, sleep_duration_min: 480, hrv_ms: 40, resting_hr: 60 };
const priorB = [{ hrv_ms: 70 }, { hrv_ms: 72 }];
const v1 = readinessIndex({ metric: mB, prior: priorB, objectiveScore: 60 });
const v2 = readinessIndex({ metric: mB, prior: priorB, objectiveScore: 60, v2: true });
assert(v1.value === 84, `v1 value = round(0.6·100 + 0.4·60) = 84 (got ${v1.value})`);
assert(v2.value < v1.value, `v2 (HRV-weighted) scores lower on a poor-HRV day (${v2.value} < ${v1.value})`);
// flag OFF leaves the value identical to the legacy blend (parity preserved)
assert(readinessIndex({ metric: mB, prior: priorB, objectiveScore: 60, v2: false }).value === v1.value, 'v2:false → identical to v1 (no behaviour change when flag off)');
// the ≥67 green cut only applies under v2
assert(bandFromValue(68, 67) === 'green' && bandFromValue(68) === 'amber', 'greenCut 67 → green; default 70 → amber');
// recoveryFromScore (the v2 runtime hand-off) honours the green cut
assert(recoveryFromScore(68, { greenCut: 67 }).volumeModifier === 1 && recoveryFromScore(68, { greenCut: 67 }).readinessLevel === 'high', 'recoveryFromScore 68 @67 → full volume, high');
assert(recoveryFromScore(68).volumeModifier === 0.9, 'recoveryFromScore 68 @ default 70 → 0.9 (legacy)');

console.log('indices tests done');
