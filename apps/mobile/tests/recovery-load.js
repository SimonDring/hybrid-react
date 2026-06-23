// tests/recovery-load.js
// PHASE 3 — the recovery + load contract modules. Recovery blends objective wearable
// readiness with subjective wellness (weighted ≥ objective; Saw 2016) and raises
// illness/travel overrides. Load wraps ACWR but DEMOTES it (soft, gentle floor).
import { assessRecovery, subjectiveScore } from '@performance-os/engine/lib/recovery/recovery.js';
import { assessLoad } from '@performance-os/engine/lib/load/load.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── subjectiveScore: 1–5 → 0–100 (5 = best, incl. soreness/stress) ─────────────
assert(subjectiveScore({ energy: 5, soreness: 5, mood: 5, stress: 5, sleepQuality: 5 }) === 100, 'all 5s → 100');
assert(subjectiveScore({ energy: 1, soreness: 1 }) === 0, 'all 1s → 0');
assert(subjectiveScore({ mood: 3 }) === 50, 'a single 3 → 50');
assert(subjectiveScore({}) === null, 'no subjective items → null');

// ── assessRecovery: objective only reproduces the prior readiness mapping ──────
const o75 = assessRecovery({ objectiveScore: 75 });
assert(o75.readinessLevel === 'high' && o75.volumeModifier === 1 && o75.sessionOverride === null, 'objective 75 → high, ×1.0, no override');
const o60 = assessRecovery({ objectiveScore: 60 });
assert(o60.readinessLevel === 'moderate' && o60.volumeModifier === 0.9, 'objective 60 → moderate, ×0.9');
const o40 = assessRecovery({ objectiveScore: 40 });
assert(o40.readinessLevel === 'low' && o40.volumeModifier === 0.78, 'objective 40 → low, ×0.78');
const none = assessRecovery({});
assert(none.readinessLevel === 'unknown' && none.volumeModifier === 1 && none.score === null, 'no inputs → unknown, ×1.0 (behaviour preserved)');

// ── subjective is weighted ≥ objective (Saw 2016) ──────────────────────────────
// Objective says "great" (80) but the athlete feels wrecked (subjective ~20):
const blended = assessRecovery({ objectiveScore: 80, subjective: { energy: 2, soreness: 1, mood: 2 } });
assert(blended.score < 60 && blended.readinessLevel !== 'high',
  `low subjective overrides high objective (blended score ${blended.score})`);

// ── illness / travel overrides ─────────────────────────────────────────────────
assert(assessRecovery({ objectiveScore: 80, illness: true }).sessionOverride === 'rest', 'illness → rest override');
assert(assessRecovery({ objectiveScore: 80, travel: true }).sessionOverride === 'easy', 'travel → easy override');
assert(assessRecovery({ illness: true, travel: true }).sessionOverride === 'rest', 'illness takes precedence over travel');

// ── assessLoad: ACWR DEMOTED — never cuts below the 0.85 floor on its own ──────
const quiet = assessLoad({ acwrVal: null });
assert(quiet.loadModifier === 1 && quiet.riskLevel === 'low' && quiet.confidence === 'low', 'no load history → ×1.0, low risk, low confidence');
const spike = assessLoad({ acwrVal: 1.7, recentAcwr: [1.7, 1.7, 1.7, 1.7] });
assert(spike.inputs.action === 'deload', 'sustained high ACWR still flags a deload action');
assert(spike.loadModifier >= 0.85, `ACWR alone no longer cuts below 0.85 (got ${spike.loadModifier}, was 0.5)`);
assert(spike.riskLevel === 'high' && spike.corroboratesDeload === true && spike.confidence === 'low', 'high ACWR → high risk, corroborates deload, low confidence');

console.log('recovery-load tests done');
