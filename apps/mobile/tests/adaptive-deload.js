// tests/adaptive-deload.js
// The adaptive-deload decision — promote real fatigue into a deload, or defer a planned
// one when fresh. ACWR is DEMOTED (Impellizzeri/Lolli): a high-load signal no longer
// forces a deload on its own — it only corroborates a readiness/recovery signal.
import { deloadRecommendation } from '../src/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// DEMOTED — sustained high ACWR ALONE (decent readiness, no recovery signal) no longer forces.
assert(deloadRecommendation({ loadAction: 'deload', readiness: 60, scheduledDeload: false }).action !== 'force',
  'T1 sustained high load ALONE no longer forces a deload (ACWR demoted)');

// CORROBORATED — high load + low readiness → force.
assert(deloadRecommendation({ loadAction: 'deload', readiness: 45, scheduledDeload: false }).action === 'force',
  'T1b high load corroborated by low readiness forces a deload');

// CORROBORATED — high load + poor recovery → force.
assert(deloadRecommendation({ loadAction: 'deload', readiness: 65, recentRecovery: 2, scheduledDeload: false }).action === 'force',
  'T1c high load corroborated by poor recovery forces a deload');

// FORCE — low readiness backed by poor recovery feedback.
assert(deloadRecommendation({ readiness: 40, recentRecovery: 2, scheduledDeload: false }).action === 'force',
  'T2 low readiness + poor recovery forces a deload');

// FORCE — illness always forces (the new override signal).
assert(deloadRecommendation({ illness: true, readiness: 75, recentRecovery: 4, scheduledDeload: false }).action === 'force',
  'T2b illness forces a deload regardless of other signals');

// NO FORCE — already on a scheduled deload (don't double up).
assert(deloadRecommendation({ loadAction: 'deload', readiness: 40, recentRecovery: 2, scheduledDeload: true }).action !== 'force',
  'T3 no force when the week is already a planned deload');

// NO FORCE — low readiness alone with good recovery (conservative; avoid false deloads).
assert(deloadRecommendation({ readiness: 45, recentRecovery: 4, scheduledDeload: false }).action === 'none',
  'T4 low readiness alone (good recovery) does not force');

// DEFER — fresh athlete on a planned deload trains through.
assert(deloadRecommendation({ readiness: 80, recentRecovery: 4.5, loadAction: 'none', scheduledDeload: true }).action === 'defer',
  'T5 fresh + recovered defers a planned deload');

// NO DEFER — high readiness but load is elevated → respect the planned deload.
assert(deloadRecommendation({ readiness: 80, recentRecovery: 4, loadAction: 'ease', scheduledDeload: true }).action !== 'defer',
  'T6 elevated load blocks deferral even when readiness is high');

// NONE — ordinary week, nothing to change.
assert(deloadRecommendation({ readiness: 65, recentRecovery: 3, loadAction: 'none', scheduledDeload: false }).action === 'none',
  'T7 ordinary week → no change');

// Empty/unknown signals → none (no spurious deloads with no data).
assert(deloadRecommendation({}).action === 'none', 'T8 no signals → none');

console.log('adaptive-deload tests done');
