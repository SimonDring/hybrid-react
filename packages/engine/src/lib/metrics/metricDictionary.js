/**
 * The Metric Dictionary (DAAS §4.1 / GA-804) — the platform-owned definition of every
 * captured metric, the single normalisation target every ingestion boundary keys on.
 *
 * This is a GOVERNED REGISTRY (the KA §3.2 pattern): entries are versioned data,
 * validated on load (see ./index.js), consulted by every ingestion boundary. Adding a
 * metric is a DATA change here — never a code edit at a boundary. "One entry per metric,
 * and one metric per concept."
 *
 * DISTINCT from the evidence KB (lib/knowledge/entries.js): it carries its OWN
 * METRIC_DICTIONARY_VERSION and lives OUTSIDE packages/engine/src/data/ deliberately, so
 * it is NOT part of the KNOWLEDGE_SET_VERSION ratchet's hash set — a dictionary change
 * versions here, not there, and never churns the plan golden-master. Nothing reads this
 * into plan output; it is authored knowledge that Phase-3 adapters/surfaces will consume.
 *
 * Design: docs/superpowers/specs/2026-07-21-phase3-metric-dictionary-v1-design.md.
 * Contract per entry (DAAS §4.1): id · semantics(unit/scale/range) · sources(provenance
 * class + per-class reliability) + precedence · commensurability ruling · privacy class ·
 * baseline treatment · definition provenance. Plus storesTo: the concrete M5 landing
 * column, so "source-agnostic from day one" is checkable.
 */

/** The closed provenance set — governed in DAAS §2.1.1, imported (not redefined) here. */
export const PROVENANCE_CLASSES = Object.freeze([
  'measured', 'device', 'self-administered', 'self-report', 'third-party', 'coach-report',
]);

/** Per-source reliability defaults extend the KA Domain 7 device scale to a coarse ordinal. */
export const RELIABILITY_TAGS = Object.freeze(['high', 'moderate', 'low']);

/** The two privacy classes (DAAS §4.1). raw-vital = Art-11 owner-only forever; derived-safe
 *  = may appear in a derived cross-person roll-up (still owner-private at rest via RLS). */
export const PRIVACY_CLASSES = Object.freeze(['raw-vital', 'derived-safe']);

/** The M5 substrate tables an observation may land in (schema.sql, migration 20260713). */
export const M5_TABLES = Object.freeze(['external_load_observations', 'match_performances', 'wearable_readings', 'daily_metrics']);

/** Registry version. Its OWN ratchet, independent of KNOWLEDGE_SET_VERSION. */
export const METRIC_DICTIONARY_VERSION = '1.0.0';

const PROV = (cls, reliability, note) => ({ class: cls, reliability, ...(note ? { note } : {}) });

/** @typedef {{id,family,semantics,unit,scale,range,sources,precedence,commensurability,privacyClass,baseline,provenance,storesTo}} MetricEntry */

/** @type {MetricEntry[]} */
export const METRIC_DICTIONARY = [
  // ── Family: vital ─────────────────────────────────────────────────────────
  // The raw-vital anchor + wearable-boundary reconciliation seed. These make the privacy
  // dimension non-vacuous and settle the honest measured-vs-vendor-derived split that
  // lib/adapters/wearableReading.js already draws. The FULL wearable reconciliation
  // (every metric.* field) is later work — v1 seeds three representative vitals.
  {
    id: 'hr.resting.daily',
    family: 'vital',
    semantics: 'Resting heart rate for the day — beats per minute at true rest.',
    unit: 'bpm', scale: 'ratio', range: { min: 25, max: 120 },
    sources: [PROV('device', 'moderate', 'wrist-optical/chest-strap; reliability by device class (KA Domain 7)'), PROV('self-report', 'low', 'manual palpation count')],
    precedence: ['device', 'self-report'],
    commensurability: 'A device "resting HR" maps here. NOT the same as an average or spot HR during activity (distinct metrics, not defined in v1).',
    privacyClass: 'raw-vital',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'daily_metrics', column: 'resting_hr' },
  },
  {
    id: 'hrv.rmssd.night',
    family: 'vital',
    semantics: 'Overnight heart-rate variability as RMSSD — root-mean-square of successive RR-interval differences, in milliseconds.',
    unit: 'ms', scale: 'ratio', range: { min: 1, max: 300 },
    sources: [PROV('device', 'moderate', 'reliability by sensor: ecg/chest-strap high, finger-ring moderate, wrist-optical low (KA Domain 7)')],
    precedence: ['device'],
    commensurability: 'Device RMSSD maps here. A vendor "recovery"/"readiness" SCORE built on HRV is a DISTINCT vendor-derived metric (not this id) — an opaque composite, never ground truth (Art 16; wearableReading.vendorDerived).',
    privacyClass: 'raw-vital',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'daily_metrics', column: 'hrv_ms' },
  },
  {
    id: 'sleep.duration.night',
    family: 'vital',
    semantics: 'Total sleep time for the night — minutes actually asleep, excluding awake time in bed.',
    unit: 'min', scale: 'ratio', range: { min: 0, max: 960 },
    sources: [PROV('device', 'moderate', 'device sleep staging'), PROV('self-report', 'low', 'self-logged hours')],
    precedence: ['device', 'self-report'],
    commensurability: 'A device "time asleep" maps here. A vendor "sleep SCORE" (0–100 composite) is a DISTINCT vendor-derived metric, NOT this id — a self-reported "8h" and a device reading are also distinct provenances of the same metric, never conflated (§2.1.1).',
    privacyClass: 'raw-vital',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'daily_metrics', column: 'sleep_duration_min' },
  },

  // ── Family: external-load ─────────────────────────────────────────────────
  // GPS/accelerometry + pitch RPE. None is an Art-11 enumerated vital, so all are
  // derived-safe (may appear in a consented derived roll-up); they remain owner-private
  // at rest via RLS regardless (privacy class ≠ storage posture).
  {
    id: 'gps.total_distance.session',
    family: 'external-load',
    semantics: 'Total ground-tracked distance covered during a single training session or match, in metres.',
    unit: 'm', scale: 'ratio', range: { min: 0, max: 30000 },
    sources: [PROV('device', 'high', 'GNSS vest: Catapult/StatSports/Garmin'), PROV('third-party', 'moderate', 'vendor CSV export — trust the vendor QC')],
    precedence: ['device', 'third-party'],
    commensurability: 'A vendor "total distance"/"distance covered" field maps here. NOT the same as high-speed-running distance (gps.high_speed_distance.session).',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: 'distance_m' },
  },
  {
    id: 'gps.high_speed_distance.session',
    family: 'external-load',
    semantics: 'Distance covered above the high-speed-running threshold in a session, in metres (threshold is vendor/protocol-declared, carried in quality_flags).',
    unit: 'm', scale: 'ratio', range: { min: 0, max: 8000 },
    sources: [PROV('device', 'high', 'GNSS vest'), PROV('third-party', 'moderate', 'vendor export')],
    precedence: ['device', 'third-party'],
    commensurability: 'Vendor "high-speed running"/"HSR distance" maps here. The velocity threshold that defines HSR differs by vendor — recorded per observation, never silently assumed equal.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: 'high_speed_m' },
  },
  {
    id: 'speed.max.session',
    family: 'external-load',
    semantics: 'Peak instantaneous velocity reached during a session, in metres per second.',
    unit: 'm/s', scale: 'ratio', range: { min: 0, max: 12.5 },
    sources: [PROV('device', 'high', 'GNSS vest / radar'), PROV('third-party', 'moderate', 'vendor export')],
    precedence: ['device', 'third-party'],
    commensurability: 'Vendor "max velocity"/"top speed" maps here (convert km/h → m/s at ingest). A season-best is a DISTINCT derived metric, not this per-session observation.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: null },
  },
  {
    id: 'sprint.count.session',
    family: 'external-load',
    semantics: 'Number of discrete efforts above the sprint-speed threshold in a session, as a count.',
    unit: 'count', scale: 'ratio', range: { min: 0, max: 200 },
    sources: [PROV('device', 'high', 'GNSS vest'), PROV('third-party', 'moderate', 'vendor export')],
    precedence: ['device', 'third-party'],
    commensurability: 'Vendor "sprint efforts"/"number of sprints" maps here. The sprint threshold is vendor-declared (quality_flags); counts across vendors are not comparable unless thresholds match.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: 'sprint_count' },
  },
  {
    id: 'accel.count.session',
    family: 'external-load',
    semantics: 'Number of high-intensity accelerations above the protocol threshold in a session, as a count.',
    unit: 'count', scale: 'ratio', range: { min: 0, max: 500 },
    sources: [PROV('device', 'moderate', 'accelerometry; threshold-sensitive'), PROV('third-party', 'moderate', 'vendor export')],
    precedence: ['device', 'third-party'],
    commensurability: 'Vendor "high accelerations" maps here. Distinct from decelerations (decel.count.session) and from sprint counts — never summed across.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'low' },
    storesTo: { table: 'external_load_observations', column: null },
  },
  {
    id: 'decel.count.session',
    family: 'external-load',
    semantics: 'Number of high-intensity decelerations above the protocol threshold in a session, as a count.',
    unit: 'count', scale: 'ratio', range: { min: 0, max: 500 },
    sources: [PROV('device', 'moderate', 'accelerometry; threshold-sensitive'), PROV('third-party', 'moderate', 'vendor export')],
    precedence: ['device', 'third-party'],
    commensurability: 'Vendor "high decelerations" maps here. Distinct from accelerations (accel.count.session).',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'low' },
    storesTo: { table: 'external_load_observations', column: null },
  },
  {
    id: 'rpe.session.pitch',
    family: 'external-load',
    semantics: 'Session Rating of Perceived Exertion for a pitch/sport session, on the Borg CR10 scale (0–10).',
    unit: 'CR10', scale: 'ordinal', range: { min: 0, max: 10 },
    sources: [PROV('self-report', 'moderate', 'the athlete\'s own rating — the only honest source')],
    precedence: ['self-report'],
    commensurability: 'A CR10 session-RPE maps here. A 6–20 Borg RPE is a DISTINCT scale (convert or store as its own metric — never silently equated). RPE is subjective by nature, not a sensor reading.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: false, model: null },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: 'pitch_rpe' },
  },
  {
    id: 'srpe.load.session',
    family: 'external-load',
    semantics: 'Session load = session-RPE (CR10) × session duration (min) — Foster session-RPE load, in arbitrary units.',
    unit: 'AU', scale: 'ratio', range: { min: 0, max: 10000 },
    sources: [PROV('self-report', 'moderate', 'derived from rpe.session.pitch × minutes'), PROV('third-party', 'moderate', 'a vendor that logs sRPE directly')],
    precedence: ['third-party', 'self-report'],
    commensurability: 'Foster sRPE (RPE_CR10 × duration_min) maps here. A different multiplier convention (e.g. RPE 6–20) is a DISTINCT metric. This is a captured/loggable load, not the CTL/ATL/TSB form model (that is a §4.2 derivation).',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: true, model: 'rolling-personal-norm' },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'moderate' },
    storesTo: { table: 'external_load_observations', column: null },
  },

  // ── Family: match-performance ─────────────────────────────────────────────
  {
    id: 'exposure.minutes.match',
    family: 'match-performance',
    semantics: 'Minutes played in a fixture — the athlete\'s on-field exposure for one match.',
    unit: 'min', scale: 'ratio', range: { min: 0, max: 200 },
    sources: [PROV('self-report', 'moderate', 'athlete/coach logged'), PROV('coach-report', 'high', 'coach record within consented scope'), PROV('third-party', 'high', 'league/match feed')],
    precedence: ['third-party', 'coach-report', 'self-report'],
    commensurability: 'Minutes on the field maps here. Distinct from total session duration (a training concept) and from availability status.',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: false, model: null },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'high' },
    storesTo: { table: 'match_performances', column: 'minutes' },
  },
  {
    id: 'availability.status.match',
    family: 'match-performance',
    semantics: 'The athlete\'s availability for a fixture as a status fact: available | modified | unavailable — never clinical detail (Ontology Injury rule).',
    unit: 'enum', scale: 'nominal', range: { values: ['available', 'modified', 'unavailable'] },
    sources: [PROV('coach-report', 'high', 'coach/medical availability call within consented scope'), PROV('self-report', 'moderate', 'athlete-declared')],
    precedence: ['coach-report', 'self-report'],
    commensurability: 'A team availability status maps here. It is a STATUS, never a diagnosis, injury site, or clinical note — those never enter this metric (Art 11; the coach-visibility ceiling).',
    privacyClass: 'derived-safe',
    baseline: { individuallyBaselined: false, model: null },
    provenance: { author: 'Phase 3 S1 (2026-07-21)', reviewed: null, confidence: 'high' },
    storesTo: { table: 'match_performances', column: 'availability_status' },
  },
];

export default METRIC_DICTIONARY;
