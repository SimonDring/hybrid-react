// tests/knowledge.js
// PHASE 1 — the evidence knowledge base is valid, covers the migrated domains, the
// engine reads its constants FROM the KB (consistency), and contested science is
// honestly tagged. See docs/engine/01-PANEL-REVIEW.md §13.
import kb from '@performance-os/engine/lib/knowledge/kb.js';
import { VOLUME_LANDMARKS } from '@performance-os/engine/data/muscleVolume.js';
import { SWEET_LOW, EASE_FROM, HIGH } from '@performance-os/engine/lib/plan/trainingLoad.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── registry validity ─────────────────────────────────────────────────────────
const v = kb.validate();
assert(v.ok, `registry validates (${v.errors.join(' | ') || 'no errors'})`);

// ── coverage: the migrated domains are present ─────────────────────────────────
assert(kb.byTag('volume').length > 0, 'KB has volume entries');
assert(kb.byTag('load').length > 0, 'KB has load entries');
assert(kb.byTag('recovery').length > 0, 'KB has recovery entries');

// ── consistency: the engine reads its constants FROM the KB ────────────────────
assert(JSON.stringify(VOLUME_LANDMARKS) === JSON.stringify(kb.value('volume.landmarks')),
  'muscleVolume.VOLUME_LANDMARKS is sourced from kb (volume.landmarks)');
const t = kb.value('load.acwr.thresholds');
assert(SWEET_LOW === t.sweetLow && EASE_FROM === t.easeFrom && HIGH === t.high,
  `trainingLoad ACWR thresholds sourced from kb (${SWEET_LOW}/${EASE_FROM}/${HIGH})`);

// ── values unchanged by the migration (lock the exact numbers) ─────────────────
assert(t.sweetLow === 0.8 && t.easeFrom === 1.3 && t.high === 1.5, 'ACWR thresholds still 0.8 / 1.3 / 1.5');
assert(VOLUME_LANDMARKS.back.mrv === 25 && VOLUME_LANDMARKS.chest.mev === 8, 'volume landmarks unchanged (back MRV 25, chest MEV 8)');

// ── honesty: contested science is tagged low-confidence (review's key call) ────
assert(kb.get('load.acwr.thresholds').confidence === 'low', 'ACWR thresholds tagged confidence:low');
assert(kb.get('load.acwr.validity').confidence === 'low', 'ACWR validity tagged confidence:low (Impellizzeri/Lolli)');
assert(kb.get('readiness.subjective_priority').confidence === 'high' && kb.get('readiness.subjective_priority').evidenceLevel === 'L1',
  'subjective-wellness priority tagged L1/high (Saw 2016)');

// ── staleness: report (don't fail) entries due for re-review ───────────────────
const stale = kb.staleEntries(18);
if (stale.length) console.warn(`WARN: ${stale.length} KB entr(y/ies) older than 18 months — due for review:`, stale.map(e => e.id).join(', '));
else console.log('PASS: no KB entries are stale (all reviewed within 18 months)');

console.log('knowledge tests done');
