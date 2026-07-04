// tests/kb-recovery-thresholds.js — WP-09: the deload/recovery cut-points are
// governed knowledge, and relocating them changed nothing.
//
// Before: readiness 50/70, session-recovery ≤2/≥4, and the 1/0.9/0.78 volume bands
// were bare literals in trainingLoad.js / recovery.js — the strongest behavioural
// call in the runtime layer with no provenance. Now they're KB entries
// (recovery.bands / recovery.volume_modifiers / recovery.deload_thresholds) read
// via kb.value(). This pins (a) the entries exist with provenance, (b) behaviour
// at every cut-point is exactly the pre-relocation behaviour.

import kb from '@performance-os/engine/lib/knowledge/kb.js';
import { recoveryFromScore } from '@performance-os/engine/lib/recovery/recovery.js';
import { deloadRecommendation } from '@performance-os/engine/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── Entries exist, validate, and carry the exact pre-relocation values ───────
assert(kb.validate().ok, 'registry passes schema validation');
const bands = kb.value('recovery.bands');
const mods = kb.value('recovery.volume_modifiers');
const dt = kb.value('recovery.deload_thresholds');
assert(bands.greenCut === 70 && bands.moderateCut === 50, 'recovery.bands carries 70/50');
assert(mods.high === 1 && mods.moderate === 0.9 && mods.low === 0.78, 'recovery.volume_modifiers carries 1/0.9/0.78');
assert(dt.readinessLow === 50 && dt.readinessFresh === 70 && dt.recoveryPoor === 2 && dt.recoveryFresh === 4,
  'recovery.deload_thresholds carries 50/70/2/4');

// ── Band + volume behaviour at every cut-point (unchanged) ───────────────────
const cases = [
  [null, 'unknown', 1], [70, 'high', 1], [69, 'moderate', 0.9],
  [50, 'moderate', 0.9], [49, 'low', 0.78], [0, 'low', 0.78]
];
for (const [score, band, vol] of cases) {
  const r = recoveryFromScore(score);
  assert(r.readinessLevel === band && r.volumeModifier === vol,
    `score ${score} → ${band}/${vol} (got ${r.readinessLevel}/${r.volumeModifier})`);
}
// v2 greenCut override still honoured (the store passes 67):
const v2 = recoveryFromScore(68, { greenCut: 67 });
assert(v2.readinessLevel === 'high' && v2.volumeModifier === 1, 'explicit greenCut=67 still wins over the KB default');

// ── Deload cut-points (unchanged, boundary-exact) ────────────────────────────
assert(deloadRecommendation({ readiness: 49, recentRecovery: 2 }).action === 'force',
  'readiness 49 + recovery 2 → force');
assert(deloadRecommendation({ readiness: 50, recentRecovery: 2 }).action === 'none',
  'readiness 50 (not < 50) + recovery 2 → none');
assert(deloadRecommendation({ readiness: 49, recentRecovery: 2.1 }).action === 'none',
  'readiness 49 + recovery 2.1 (not ≤ 2) → none');
assert(deloadRecommendation({ scheduledDeload: true, readiness: 70, recentRecovery: 4 }).action === 'defer',
  'scheduled deload + readiness 70 + recovery 4 → defer');
assert(deloadRecommendation({ scheduledDeload: true, readiness: 69, recentRecovery: 4 }).action === 'none',
  'scheduled deload + readiness 69 (not ≥ 70) → none');
assert(deloadRecommendation({ scheduledDeload: true, readiness: 70, recentRecovery: 3.9 }).action === 'none',
  'scheduled deload + recovery 3.9 (not ≥ 4) → none');
