// tests/dropped-demands.js — P0-6 (engine audit 04 §B3 / 09 P0-6): the SKB→PM quality
// projection must (1) project strengthEndurance — a Performance-Model quality that was
// missing its identity mapping (a plain bug: rugby authors it at importance 7 and it
// vanished), and (2) DECLARE what it drops. Authored-but-unprojected SKB qualities land
// in a droppedDemands honesty ledger (Art 15) carried on the Performance Model — the
// projection never silently discards sport-defining demand again.
import { mapSkbQuality } from '@performance-os/engine/data/sportQualityMap.js';
import { buildDemandProfile, droppedDemandsFor } from '@performance-os/engine/lib/performance/demandProfile.js';
import { derivePerformanceModel } from '@performance-os/engine';

function assert(c, m) { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('PASS:', m); }

// ── 1. the mapping bug: strengthEndurance is a PM quality → identity mapping ──
assert(mapSkbQuality('strengthEndurance') === 'strengthEndurance',
  'T1 strengthEndurance maps to itself (PM quality, identity mapping)');

const rugby = buildDemandProfile('rugby', null);
const se = rugby.find((d) => d.qualityId === 'strengthEndurance');
assert(se && Math.abs(se.importance - 0.7) < 1e-9,
  'T2 rugby authors strengthEndurance at 7 → projected demand 0.7 (no longer dropped)');

// ── 2. the honesty ledger: authored-but-unprojected qualities are DECLARED ──
const dropped = droppedDemandsFor('rugby', null);
assert(Array.isArray(dropped) && dropped.length > 0, 'T3 rugby has a non-empty droppedDemands ledger');
const names = dropped.map((d) => d.skbQuality);
assert(names.includes('collisionRobustness') && names.includes('aerialAbility') && names.includes('neckStrength'),
  'T4 sport-defining unprojected demand is declared (collisionRobustness, aerialAbility, neckStrength)');
assert(!names.includes('strengthEndurance'),
  'T5 a projected quality never appears in the ledger (strengthEndurance is now projected)');
assert(dropped.every((d) => d.skbQuality && typeof d.importance === 'number'
  && d.importance >= 0 && d.importance <= 1 && typeof d.evidence === 'string' && d.evidence.includes('skb:rugby')),
  'T6 ledger shape: skbQuality + 0..1 importance + skb evidence pointer');
assert(dropped.every((d) => mapSkbQuality(d.skbQuality) === null),
  'T7 everything in the ledger is genuinely unmapped (the ledger never lies)');
const neck = dropped.find((d) => d.skbQuality === 'neckStrength');
assert(neck && Math.abs(neck.importance - 0.8) < 1e-9,
  'T8 the prop\'s neck (authored importance 8) is declared at 0.8 — the audit\'s headline drop');
// deterministic order: importance desc, then name asc — same input, same ledger, byte for byte
const again = droppedDemandsFor('rugby', null);
assert(JSON.stringify(dropped) === JSON.stringify(again), 'T9 the ledger is deterministic');
const sorted = [...dropped].sort((a, b) => (b.importance - a.importance) || a.skbQuality.localeCompare(b.skbQuality));
assert(JSON.stringify(dropped) === JSON.stringify(sorted), 'T10 ledger ordered by importance desc, name asc');

// position primaries mirror the projection's own floor: a dropped quality that is a
// position PRIMARY is declared at least as demanding as the projection would have made it
const frontRow = droppedDemandsFor('rugby', 'Front row (props & hooker)');
const frNeck = frontRow.find((d) => d.skbQuality === 'neckStrength');
assert(frNeck && frNeck.importance >= 0.9,
  'T11 a position-primary drop is floored like a projected primary (front-row neckStrength ≥ 0.9)');

// safety: unknown sport / no sport never throws
assert(Array.isArray(droppedDemandsFor('unknown_sport', null)) && droppedDemandsFor('unknown_sport', null).length === 0,
  'T12 unknown sport → empty ledger (never throws)');

// ── 3. reachable by the UI: the Performance Model carries the ledger ──
const pm = derivePerformanceModel({ sportingContext: { primarySport: 'rugby', position: null } }, '2026-07-13');
assert(Array.isArray(pm.droppedDemands) && pm.droppedDemands.length > 0
  && pm.droppedDemands.some((d) => d.skbQuality === 'collisionRobustness'),
  'T13 derivePerformanceModel exposes droppedDemands for a sport athlete');
assert(pm.demandProfile.some((d) => d.qualityId === 'strengthEndurance'),
  'T14 the model\'s rugby demand profile now carries strengthEndurance');
const buildPm = derivePerformanceModel({ goals: [{ outcome: 'get_stronger' }] }, '2026-07-13');
assert(Array.isArray(buildPm.droppedDemands) && buildPm.droppedDemands.length === 0,
  'T15 build goals (no SKB projection) → empty ledger, same shape');
