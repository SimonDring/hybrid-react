// tests/d4-seams.js — WP-36: the D4 trainability + injuryRisk seams are enriched.
// Acceptance (audit): a hamstring-history runner's durability limiter is BOOSTED;
// confidence unchanged. Both seams re-rank magnitudes; neither gates, neither
// touches confidence.

import assert from 'node:assert';
import { diagnoseLimitingFactors } from '@performance-os/engine/lib/performance/diagnose.js';
import { derivePerformanceModel } from '@performance-os/engine';
import { riskBoostFor } from '@performance-os/engine/data/regionQualityRisk.js';

let pass = 0;
function ok(cond, msg) { assert(cond, msg); pass++; console.log('PASS:', msg); }

const caps = [
  { qualityId: 'robustness', level: 0.5, confidence: 'moderate', source: 'inferred' },
  { qualityId: 'maxStrength', level: 0.5, confidence: 'high', source: 'measured' },
  { qualityId: 'aerobicCapacity', level: 0.5, confidence: 'low', source: 'inferred' },
];
const demand = [
  { qualityId: 'robustness', importance: 0.8 },
  { qualityId: 'maxStrength', importance: 0.8 },
  { qualityId: 'aerobicCapacity', importance: 0.8 },
];

// ── the acceptance: hamstring history boosts the durability limiter ──────────
const clean = diagnoseLimitingFactors(caps, demand, {});
const hx = diagnoseLimitingFactors(caps, demand, { injuryHistory: [{ body_part: 'hamstring' }] });
const rClean = clean.find((f) => f.qualityId === 'robustness');
const rHx = hx.find((f) => f.qualityId === 'robustness');
ok(rHx.magnitude > rClean.magnitude && rHx.injuryRisk === 1.25,
  `hamstring history boosts the robustness limiter (${rClean.magnitude} → ${rHx.magnitude}, ×1.25)`);
ok(rHx.confidence === rClean.confidence, 'injury history does NOT touch confidence');
ok(/injury history raises the stakes/.test(rHx.rationale), 'the boost is explained in the emitted rationale');
ok(hx.find((f) => f.qualityId === 'maxStrength').injuryRisk === 1,
  'unrelated qualities keep a neutral injuryRisk');

// history re-ranks: with equal gaps, robustness now outranks the others
ok(hx[0].qualityId === 'robustness', 'the protected quality rises to the top of the ranking');

// ── trainability by training age ─────────────────────────────────────────────
const novice = diagnoseLimitingFactors(caps, demand, { trainingAgeBand: 'novice' });
const veteran = diagnoseLimitingFactors(caps, demand, { trainingAgeBand: 'highlyAdvanced' });
const msNov = novice.find((f) => f.qualityId === 'maxStrength');
const msVet = veteran.find((f) => f.qualityId === 'maxStrength');
ok(msNov.magnitude > msVet.magnitude && msNov.trainability === 1 && msVet.trainability === 0.6,
  `maxStrength counts for less at high training age (${msNov.magnitude} → ${msVet.magnitude})`);
ok(msNov.confidence === msVet.confidence, 'training age does NOT touch confidence');

// neutral when no band is known — identical to the pre-enrichment behaviour
const bandless = diagnoseLimitingFactors(caps, demand, {});
ok(bandless.every((f) => f.trainability === 1), 'no band → neutral trainability (backwards-safe)');

// ── the tolerant history reader ──────────────────────────────────────────────
ok(riskBoostFor('robustness', ['hamstring']) === 1.25, 'string entries read');
ok(riskBoostFor('stability', [{ region: 'lower_back' }]) === 1.25, 'region-keyed objects read');
ok(riskBoostFor('robustness', [{ body_part: 'hamstring' }, { body_part: 'calf' }]) === 1.25,
  'multiple histories take the MAX boost, not a stack');
ok(riskBoostFor('robustness', []) === 1 && riskBoostFor('robustness', null) === 1, 'empty/null history is neutral');

// ── end-to-end through the model ─────────────────────────────────────────────
const model = {
  sportingContext: { primarySport: 'running_middle', position: null },
  trainingHistory: { selfRatedLevel: 'advanced' },
  constraints: { injuryHistory: [{ body_part: 'hamstring' }] },
};
const pm = derivePerformanceModel(model, '2026-07-05');
const rob = pm.limitingFactors.find((f) => f.qualityId === 'robustness');
ok(rob && rob.injuryRisk === 1.25 && rob.trainability < 1,
  `the derived model carries both enrichments (robustness ×${rob.injuryRisk} injury, ×${rob.trainability} trainability)`);

console.log(`\n${pass} d4-seams checks passed.`);
