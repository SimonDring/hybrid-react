/**
 * metric-dictionary.test.mjs — Phase 3 · S1 contract for the Metric Dictionary (DAAS §4.1).
 *
 * Proves the governed registry + its validate-on-load discipline + the ingestion-boundary
 * validation seam. Design: docs/superpowers/specs/2026-07-21-phase3-metric-dictionary-v1-design.md.
 *
 * Every check is non-vacuous: the malformed cases are REJECTED and the well-formed cases
 * ACCEPTED, both directions asserted, so a no-op validator cannot pass this file.
 */
import {
  METRIC_DICTIONARY,
  METRIC_DICTIONARY_VERSION,
  PROVENANCE_CLASSES,
  getMetric,
  isKnownMetric,
  privacyClassOf,
  precedenceFor,
  reliabilityFor,
  validateObservation,
  mayCrossToRollUp,
  assertValidRegistry,
} from '@performance-os/engine';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); process.exitCode = 1; } };
const throws = (fn, msg) => { let threw = false; try { fn(); } catch { threw = true; } ok(threw, msg); };

// ── 0. the registry loads and is validly shaped ─────────────────────────────
ok(Array.isArray(METRIC_DICTIONARY) && METRIC_DICTIONARY.length >= 13, 'the v1 registry has ≥13 entries');
ok(/^\d+\.\d+\.\d+$/.test(METRIC_DICTIONARY_VERSION), 'METRIC_DICTIONARY_VERSION is semver');
ok(assertValidRegistry() === true, 'the real registry passes validate-on-load');

// ── 1. validate-on-load is REAL — malformed entries are rejected, loudly ─────
const base = () => ({
  id: 'gps.total_distance.session', family: 'external-load',
  semantics: 'x', unit: 'm', scale: 'ratio', range: { min: 0, max: 30000 },
  sources: [{ class: 'device', reliability: 'high' }], precedence: ['device'],
  commensurability: 'x', privacyClass: 'derived-safe',
  baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
  provenance: { author: 'x', reviewed: null, confidence: 'moderate' },
  storesTo: { table: 'external_load_observations', column: 'distance_m' },
});
ok(assertValidRegistry([base()]) === true, 'a well-formed lone entry validates (the negatives below are non-vacuous)');
throws(() => assertValidRegistry([{ ...base(), id: 'NotDotted' }]), 'rejects a non-dotted / uppercase id');
throws(() => assertValidRegistry([{ ...base(), sources: [{ class: 'wearable-magic', reliability: 'high' }] }]), 'rejects an unknown provenance class');
throws(() => assertValidRegistry([{ ...base(), range: { min: 100, max: 0 } }]), 'rejects a min>max range');
throws(() => assertValidRegistry([{ ...base(), privacyClass: 'kinda-private' }]), 'rejects an unknown privacy class');
throws(() => assertValidRegistry([{ ...base(), precedence: ['third-party'] }]), 'rejects a precedence not ⊆ the entry sources');
throws(() => assertValidRegistry([base(), base()]), 'rejects a duplicate id (one metric per concept)');
throws(() => assertValidRegistry([{ ...base(), storesTo: { table: 'made_up_table', column: 'x' } }]), 'rejects a storesTo pointing at an unknown table');

// ── 2. structural invariants across the whole real registry ─────────────────
const ids = METRIC_DICTIONARY.map((e) => e.id);
ok(new Set(ids).size === ids.length, 'all ids are unique');
ok(ids.every((id) => /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/.test(id)), 'all ids are dotted-lowercase');
ok(METRIC_DICTIONARY.every((e) => e.sources.every((s) => PROVENANCE_CLASSES.includes(s.class))), 'every source class ∈ the closed provenance set');
ok(METRIC_DICTIONARY.every((e) => e.precedence.every((c) => e.sources.some((s) => s.class === c))), 'every precedence ⊆ its own sources');
ok(METRIC_DICTIONARY.every((e) => ['raw-vital', 'derived-safe'].includes(e.privacyClass)), 'every entry has a valid privacy class');

// ── 3. the privacy dimension is NON-VACUOUS (both classes present) ───────────
ok(METRIC_DICTIONARY.some((e) => e.privacyClass === 'raw-vital'), '≥1 raw-vital metric (privacy axis exercised)');
ok(METRIC_DICTIONARY.some((e) => e.privacyClass === 'derived-safe'), '≥1 derived-safe metric');

// ── 4. the v1 sport/match metrics are present + map to real M5 columns ───────
for (const id of [
  'gps.total_distance.session', 'gps.high_speed_distance.session', 'speed.max.session',
  'sprint.count.session', 'rpe.session.pitch', 'srpe.load.session',
  'exposure.minutes.match', 'availability.status.match',
]) ok(isKnownMetric(id), `v1 metric present: ${id}`);
ok(getMetric('gps.total_distance.session').storesTo.table === 'external_load_observations', 'distance maps to external_load_observations');
ok(getMetric('exposure.minutes.match').storesTo.table === 'match_performances', 'minutes maps to match_performances');

// ── 5. the ingestion-boundary seam — §2.1.1 hard rule (1), both directions ───
ok(validateObservation({ metric_id: 'rpe.session.pitch', provenance_class: 'self-report' }).ok, 'accepts a well-formed pitch-RPE observation');
ok(!validateObservation({ metric_id: 'no.such.metric', provenance_class: 'self-report' }).ok, 'rejects an unknown metric_id (no silent guessing)');
ok(!validateObservation({ metric_id: 'rpe.session.pitch', provenance_class: 'device' }).ok, 'rejects a provenance class the metric does not permit (RPE is self-report, not device)');
ok(!validateObservation({ metric_id: 'gps.total_distance.session' }).ok, 'rejects an observation with no provenance class');

// ── 6. the privacy-validator hook (rule 6 of the §4.2 propagation rule) ──────
ok(mayCrossToRollUp('exposure.minutes.match') === true, 'a derived-safe metric may cross to a roll-up');
ok(mayCrossToRollUp('hrv.rmssd.night') === false, 'a raw vital may NEVER cross to a roll-up (Art 11)');
ok(privacyClassOf('hr.resting.daily') === 'raw-vital', 'resting HR is classed raw-vital');
ok(reliabilityFor('gps.total_distance.session', 'device') === 'high', 'GPS distance from a device is high-reliability');
ok(reliabilityFor('gps.total_distance.session', 'self-report') === null, 'a source class the metric does not list has no reliability');
ok(Array.isArray(precedenceFor('gps.total_distance.session')), 'precedenceFor returns an ordering');

console.log(`\nmetric-dictionary: ${pass} passed, ${fail} failed`);
