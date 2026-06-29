// tests/physiology-knowledge.js
// Universal Physiological Metrics Framework — Phase 6 lives in the evidence KB.
// Verifies the new physiology entries validate, are present with the right
// evidence/confidence tags, are tagged onto the consuming domains, and that the
// honest-confidence calls (HRV/RHR moderate, ACWR low) hold.
// Full design: docs/engine/03-PHYSIOLOGICAL-FRAMEWORK.md.
import kb from '@performance-os/engine/lib/knowledge/kb.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── registry still valid after the migration (no dup ids, schema holds) ────────
const v = kb.validate();
assert(v.ok, `registry validates (${v.errors.join(' | ') || 'no errors'})`);

// ── every new framework entry exists ───────────────────────────────────────────
const NEW_IDS = [
  'physio.hrv.metric',
  'physio.hrv.guided_training',
  'physio.rhr.role',
  'physio.sleep.targets',
  'physio.normalization.personal_baseline',
  'physio.source.reliability',
  'load.internal.method',
  'load.external.volume_load',
  'index.readiness.weights',
  'index.fatigue.markers',
  'index.confidence.model',
  'index.recovery_capacity',
  'index.consistency'
];
for (const id of NEW_IDS) assert(kb.has(id), `KB has entry: ${id}`);

// ── the two slow-moving indices are honest L4 heuristics ───────────────────────
assert(kb.get('index.recovery_capacity').evidenceLevel === 'L4', 'recovery_capacity is an L4 heuristic');
assert(kb.get('index.consistency').evidenceLevel === 'L4', 'consistency is an L4 heuristic');

// ── the new 'normalization' domain is covered ──────────────────────────────────
assert(kb.byTag('normalization').length >= 2, 'KB has normalization entries (≥2)');
assert(kb.byTag('readiness').length >= 3, 'KB has readiness entries (≥3)');

// ── evidence levels: meta/systematic-review-backed claims are L1, heuristics L4/L5 ─
assert(kb.get('physio.hrv.guided_training').evidenceLevel === 'L1', 'HRV-guided training is L1 (meta-analysis)');
assert(kb.get('physio.sleep.targets').evidenceLevel === 'L1' && kb.get('physio.sleep.targets').confidence === 'high',
  'sleep targets L1/high (Walsh 2021 consensus)');
assert(kb.get('load.internal.method').evidenceLevel === 'L1', 'internal-load method is L1 (Foster/Haddad)');
assert(kb.get('index.readiness.weights').evidenceLevel === 'L4', 'readiness weights are an L4 heuristic (honest)');
assert(kb.get('index.confidence.model').evidenceLevel === 'L5', 'confidence model is an L5 design principle (honest)');

// ── honesty: HRV/RHR are moderate-confidence markers, not certainties ───────────
assert(kb.get('physio.hrv.metric').confidence === 'moderate', 'HRV metric tagged moderate confidence');
assert(kb.get('physio.rhr.role').confidence === 'moderate' && kb.get('physio.rhr.role').value.role === 'corroborating',
  'RHR is corroborating / moderate (Bosquet 2008)');

// ── manufacturer-independence: per-source reliability weights are ordered + bounded ─
const w = kb.value('physio.source.reliability');
assert(w.ecg === 1.0 && w.finger_ring === 0.95 && w.wrist_optical === 0.8 && w.manual === 0.7,
  'source reliability weights locked (ecg 1.0 / ring 0.95 / wrist 0.8 / manual 0.7)');
assert(w.ecg >= w.finger_ring && w.finger_ring >= w.wrist_optical && w.wrist_optical >= w.manual,
  'source reliability monotonic: ecg ≥ ring ≥ wrist ≥ manual');

// ── normalization principle: personal baseline, never vendor absolutes ──────────
assert(kb.value('physio.normalization.personal_baseline').method === 'personal-rolling-baseline',
  'objective metrics normalised to a personal rolling baseline');

// ── graceful degradation: missing data lowers confidence, never blocks ──────────
assert(kb.value('index.confidence.model').missingBlocks === false,
  'missing data lowers confidence but never blocks a recommendation');

// ── staleness: report (don't fail) entries due for re-review ───────────────────
const stale = kb.staleEntries(18);
if (stale.length) console.warn(`WARN: ${stale.length} KB entr(y/ies) older than 18 months — due for review:`, stale.map(e => e.id).join(', '));
else console.log('PASS: no KB entries are stale (all reviewed within 18 months)');

console.log('physiology-knowledge tests done');
