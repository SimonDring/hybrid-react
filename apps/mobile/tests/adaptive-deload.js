// tests/adaptive-deload.js
// F9: the adaptive-deload decision — promote real fatigue into a deload, or defer a
// planned deload when fresh. (The adaptedPhases wiring is verified in the preview.)
import { deloadRecommendation } from '../src/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// FORCE — sustained high ACWR (the load system's own 'deload' action).
assert(deloadRecommendation({ loadDecision: { action: 'deload', reason: 'Sustained high load' }, readiness: 60, scheduledDeload: false }).action === 'force',
  'T1 sustained high load forces a deload');

// FORCE — low readiness backed by poor recovery feedback.
assert(deloadRecommendation({ readiness: 40, recentRecovery: 2, scheduledDeload: false }).action === 'force',
  'T2 low readiness + poor recovery forces a deload');

// NO FORCE — already on a scheduled deload (don't double up).
assert(deloadRecommendation({ loadDecision: { action: 'deload' }, scheduledDeload: true }).action !== 'force',
  'T3 no force when the week is already a planned deload');

// NO FORCE — low readiness alone with good recovery (conservative; avoid false deloads).
assert(deloadRecommendation({ readiness: 45, recentRecovery: 4, scheduledDeload: false }).action === 'none',
  'T4 low readiness alone (good recovery) does not force');

// DEFER — fresh athlete on a planned deload trains through.
assert(deloadRecommendation({ readiness: 80, recentRecovery: 4.5, loadDecision: { action: 'none' }, scheduledDeload: true }).action === 'defer',
  'T5 fresh + recovered defers a planned deload');

// NO DEFER — high readiness but load is elevated → respect the planned deload.
assert(deloadRecommendation({ readiness: 80, recentRecovery: 4, loadDecision: { action: 'ease' }, scheduledDeload: true }).action !== 'defer',
  'T6 elevated load blocks deferral even when readiness is high');

// NONE — ordinary week, nothing to change.
assert(deloadRecommendation({ readiness: 65, recentRecovery: 3, loadDecision: { action: 'none' }, scheduledDeload: false }).action === 'none',
  'T7 ordinary week → no change');

// Empty/unknown signals → none (no spurious deloads with no data).
assert(deloadRecommendation({}).action === 'none', 'T8 no signals → none');

console.log('adaptive-deload tests done');
