// tests/knowledge-authority.js — WP-08: confidence authority tiers (Constitution Art 13).
//
// Evidence confidence caps what a knowledge entry may DO: high → gate (force/veto
// alone), moderate → soft (scale alone), low → reported (floored adjustment +
// corroboration only). The mapping is itself a KB entry; the ACWR demotion is the
// first consumer — previously an ad-hoc convention in two files, now a mechanism.

import kb from '@performance-os/engine/lib/knowledge/kb.js';
import { authorityOf, mayForceAlone, mayScaleAlone } from '@performance-os/engine/lib/knowledge/authority.js';
import { deloadRecommendation } from '@performance-os/engine/lib/plan/trainingLoad.js';
import { assessLoad } from '@performance-os/engine/lib/load/load.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── The mapping entry is governed knowledge ──────────────────────────────────
const mapping = kb.get('knowledge.authority.mapping');
assert(mapping.confidence === 'high' && mapping.evidenceLevel === 'L5',
  'mapping entry exists with provenance');
assert(kb.validate().ok, 'registry (incl. the new entry) passes schema validation');

// ── Tiers per confidence (synthetic entries — the API accepts entry objects) ──
assert(authorityOf({ confidence: 'high' }) === 'gate', 'high confidence → gate');
assert(authorityOf({ confidence: 'moderate' }) === 'soft', 'moderate confidence → soft');
assert(authorityOf({ confidence: 'low' }) === 'reported', 'low confidence → reported');
assert(mayForceAlone({ confidence: 'high' }) === true, 'gate may force alone');
assert(mayForceAlone({ confidence: 'low' }) === false, 'reported may not force alone');
assert(mayScaleAlone({ confidence: 'moderate' }) === true, 'soft may scale alone');
assert(mayScaleAlone({ confidence: 'low' }) === false, 'reported may not scale alone');

let threw = false;
try { authorityOf('no.such.entry'); } catch { threw = true; }
assert(threw, 'unknown entry id throws (fail-fast)');
threw = false;
try { authorityOf({ confidence: 'certain' }); } catch { threw = true; }
assert(threw, 'unmapped confidence throws');

// ── ACWR is formally demoted by mechanism ────────────────────────────────────
assert(authorityOf('load.acwr.thresholds') === 'reported', 'ACWR thresholds → reported');
assert(authorityOf('load.acwr.policy') === 'reported', 'ACWR policy → reported');

// ACWR alone can never force a deload (behaviour unchanged, now by mechanism):
const alone = deloadRecommendation({ loadAction: 'deload' });
assert(alone.action === 'none', 'sustained-high ACWR ALONE does not force a deload');
const corroborated = deloadRecommendation({ loadAction: 'deload', readiness: 40 });
assert(corroborated.action === 'force', 'ACWR + low readiness (corroborated) forces a deload');
const illness = deloadRecommendation({ illness: true });
assert(illness.action === 'force', 'illness alone still forces (it is not ACWR-derived)');

// ACWR alone can never cut volume below the conservative floor:
const heavy = assessLoad({ acwrVal: 2.5, recentAcwr: [2.4, 2.5, 2.6] });
assert(heavy.loadModifier >= 0.85, `ACWR-only volume cut floored at 0.85 (got ${heavy.loadModifier})`);
assert(heavy.confidence === 'low', 'LoadOutput still self-reports low confidence');
