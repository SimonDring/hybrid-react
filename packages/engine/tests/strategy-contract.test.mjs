// strategy-contract.test.mjs — M6(c) phase 1: D6 Training Strategy (M-STRAT) is independently
// testable behind its typed contract (02 §2.1). PARALLEL v0 — it steers nothing, so the whole-
// engine golden master is the separate proof that adding it changed no plan (byte-identical).
import { deriveStrategy, interventionClassFor } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}

// ── Empty diagnosis → template strategy, no commitments ───────────────────────
{
  const s = deriveStrategy({ priorityQualities: [], limitingFactors: [] });
  assert(s.value.concurrencyModel === 'template' && s.value.developMaintainMap.length === 0,
    'no diagnosis → template strategy, empty develop/maintain map');
  assert(s.confidence === 'low' && typeof s.rationale === 'string', 'carries {value, confidence, rationale}');
}

// ── Priority qualities → develop map at intervention-class granularity ─────────
{
  const s = deriveStrategy({
    priorityQualities: [
      { qualityId: 'maxStrength', magnitude: 8, order: 1 },
      { qualityId: 'robustness', magnitude: 5, order: 2 },
    ],
    limitingFactors: [
      { qualityId: 'maxStrength', magnitude: 8 },
      { qualityId: 'robustness', magnitude: 5 },
      { qualityId: 'reactiveStrength', magnitude: 3 }, // deferred — not in the priority set
    ],
  });
  const dm = s.value.developMaintainMap;
  assert(dm.length === 2 && dm[0].quality === 'maxStrength' && dm[0].role === 'develop',
    'each priority quality is a develop target, in D5 order');
  assert(dm[0].interventionClass === 'heavy-compound' && dm[1].interventionClass === 'heavy-slow-resistance',
    'each develop target carries its committed intervention class (maxStrength→heavy-compound, robustness→HSR)');
  assert(s.value.concurrencyModel === 'sequenced-develop-maintain',
    'the concurrency model is managed sequencing (develop one, maintain the rest)');
}

// ── Deferred limiters → sequencing/interference rules ─────────────────────────
{
  const s = deriveStrategy({
    priorityQualities: [{ qualityId: 'maxStrength', magnitude: 8 }],
    limitingFactors: [{ qualityId: 'maxStrength', magnitude: 8 }, { qualityId: 'reactiveStrength', magnitude: 3 }],
  });
  assert(s.value.sequencingRules.length === 1 && s.value.sequencingRules[0].quality === 'reactiveStrength'
    && s.value.sequencingRules[0].action === 'defer',
    'a positive-magnitude limiter outside the priority set becomes a deferred (interference) rule');
}

// ── interventionClassFor: mapped qualities + a safe default ───────────────────
{
  assert(interventionClassFor('reactiveStrength').klass === 'plyometric-ssc', 'reactiveStrength → plyometric-ssc');
  assert(interventionClassFor('explosiveStrength').klass === 'ballistic-power', 'explosiveStrength → ballistic-power');
  assert(interventionClassFor('nonsense').klass === 'general-strength', 'an unmapped quality gets a safe seed default');
}

// ── Purity: same inputs → same strategy ───────────────────────────────────────
{
  const args = { priorityQualities: [{ qualityId: 'hypertrophy', magnitude: 6 }], limitingFactors: [] };
  const a = deriveStrategy(args), b = deriveStrategy(args);
  assert(JSON.stringify(a) === JSON.stringify(b), 'deterministic — identical output for identical input');
}
