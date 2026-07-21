/**
 * The Metric Dictionary API (DAAS §4.1) — validate-on-load + the lookup/validation seam.
 *
 * VALIDATE-ON-LOAD: importing this module asserts the whole registry at load time and
 * THROWS a precise error on any malformed entry — exactly as lib/knowledge/schema.js
 * disciplines the evidence KB. Malformed capture-semantics must fail fast, never ship
 * silently (DAAS §2.1.1 rule 1: "malformed capture fails fast, exactly as malformed
 * knowledge does").
 *
 * The seam Phase-3 ingestion boundaries call is validateObservation(): a datum without a
 * known dictionary id + a permitted provenance class is REJECTED — no ingestion boundary
 * may reference a metric with no entry, and none may guess one (§4.1 hard rule).
 *
 * Pure: no clock, no I/O (Art 18). Nothing here is read by generatePlan or the reflow.
 */
import {
  METRIC_DICTIONARY,
  METRIC_DICTIONARY_VERSION,
  PROVENANCE_CLASSES,
  RELIABILITY_TAGS,
  PRIVACY_CLASSES,
  M5_TABLES,
} from './metricDictionary.js';

export {
  METRIC_DICTIONARY,
  METRIC_DICTIONARY_VERSION,
  PROVENANCE_CLASSES,
  RELIABILITY_TAGS,
  PRIVACY_CLASSES,
  M5_TABLES,
};

const ID_RE = /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/;
const FAMILIES = ['vital', 'external-load', 'match-performance'];

/**
 * Validate one entry's shape against the DAAS §4.1 contract. Returns a list of problems
 * (empty = valid). Pure; used by assertValidRegistry and available for adapter tests.
 * @returns {string[]}
 */
export function entryProblems(e) {
  const p = [];
  const at = e && e.id ? `[${e.id}]` : '[<no id>]';
  if (!e || typeof e !== 'object') return ['entry is not an object'];
  if (typeof e.id !== 'string' || !ID_RE.test(e.id)) p.push(`${at} id must be a dotted-lowercase string`);
  if (!FAMILIES.includes(e.family)) p.push(`${at} family must be one of ${FAMILIES.join('|')}`);
  if (typeof e.semantics !== 'string' || !e.semantics.trim()) p.push(`${at} semantics (one falsifiable sentence) required`);
  if (typeof e.unit !== 'string' || !e.unit.trim()) p.push(`${at} unit required`);
  if (typeof e.scale !== 'string' || !e.scale.trim()) p.push(`${at} scale required`);
  // range must MATCH the scale: a nominal scale carries {values:[...]}, every other scale
  // carries numeric {min,max} with min<=max. Keying on scale (not just "does values[] exist")
  // stops a numeric metric from smuggling in a value-list and skipping its bound check.
  const r = e.range;
  if (!r || typeof r !== 'object') p.push(`${at} range required`);
  else if (e.scale === 'nominal') {
    if (!Array.isArray(r.values) || !r.values.length) p.push(`${at} a nominal-scale metric needs a non-empty range.values[]`);
  } else if (Array.isArray(r.values)) {
    p.push(`${at} a ${e.scale}-scale metric must use a numeric range {min,max}, not a values[] list`);
  } else if (typeof r.min !== 'number' || typeof r.max !== 'number') {
    p.push(`${at} range needs numeric min/max`);
  } else if (r.min > r.max) {
    p.push(`${at} range min>max (${r.min}>${r.max})`);
  }
  // sources
  if (!Array.isArray(e.sources) || !e.sources.length) p.push(`${at} sources must be a non-empty list`);
  else for (const s of e.sources) {
    if (!s || !PROVENANCE_CLASSES.includes(s.class)) p.push(`${at} source class "${s && s.class}" ∉ the closed provenance set`);
    if (!RELIABILITY_TAGS.includes(s && s.reliability)) p.push(`${at} source ${s && s.class} reliability must be one of ${RELIABILITY_TAGS.join('|')}`);
  }
  // precedence ⊆ the entry's own source classes
  const srcClasses = new Set((e.sources || []).map((s) => s && s.class));
  if (!Array.isArray(e.precedence) || !e.precedence.length) p.push(`${at} precedence must be a non-empty ordering`);
  else for (const c of e.precedence) if (!srcClasses.has(c)) p.push(`${at} precedence "${c}" is not one of the entry's sources`);
  // commensurability, privacy, baseline, provenance, storesTo
  if (typeof e.commensurability !== 'string' || !e.commensurability.trim()) p.push(`${at} commensurability ruling required`);
  if (!PRIVACY_CLASSES.includes(e.privacyClass)) p.push(`${at} privacyClass must be one of ${PRIVACY_CLASSES.join('|')}`);
  if (!e.baseline || typeof e.baseline !== 'object' || typeof e.baseline.individuallyBaselined !== 'boolean') p.push(`${at} baseline treatment required`);
  if (!e.provenance || typeof e.provenance !== 'object' || !RELIABILITY_TAGS.includes(e.provenance.confidence)) p.push(`${at} provenance.confidence must be one of ${RELIABILITY_TAGS.join('|')}`);
  if (!e.storesTo || typeof e.storesTo !== 'object') p.push(`${at} storesTo required`);
  else if (e.storesTo.table !== null && !M5_TABLES.includes(e.storesTo.table)) p.push(`${at} storesTo.table "${e.storesTo.table}" is not a known M5 table`);
  return p;
}

/**
 * Assert an entire registry is well-formed; THROWS on the first malformed set with every
 * problem listed. Defaults to the real METRIC_DICTIONARY (that call runs at load, below).
 * @param {object[]} [entries]
 * @returns {true}
 */
export function assertValidRegistry(entries = METRIC_DICTIONARY) {
  if (!Array.isArray(entries)) throw new TypeError('Metric Dictionary must be an array');
  const problems = [];
  const seen = new Set();
  for (const e of entries) {
    problems.push(...entryProblems(e));
    if (e && e.id) { if (seen.has(e.id)) problems.push(`[${e.id}] duplicate id — one metric per concept`); seen.add(e.id); }
  }
  if (problems.length) throw new Error(`Metric Dictionary is malformed (${problems.length}):\n  - ${problems.join('\n  - ')}`);
  return true;
}

// ── validate-on-load: the real registry is asserted the moment this module is imported ──
assertValidRegistry();

const BY_ID = new Map(METRIC_DICTIONARY.map((e) => [e.id, e]));

/** @returns {object|null} the entry, or null if unknown. */
export function getMetric(id) { return BY_ID.get(id) || null; }

/** @returns {boolean} */
export function isKnownMetric(id) { return BY_ID.has(id); }

/** @returns {'raw-vital'|'derived-safe'|null} */
export function privacyClassOf(id) { const e = BY_ID.get(id); return e ? e.privacyClass : null; }

/** @returns {string[]|null} the source-precedence ordering, or null if unknown. */
export function precedenceFor(id) { const e = BY_ID.get(id); return e ? e.precedence.slice() : null; }

/** @returns {'high'|'moderate'|'low'|null} the default reliability for that source class. */
export function reliabilityFor(id, provenanceClass) {
  const e = BY_ID.get(id);
  if (!e) return null;
  const s = e.sources.find((x) => x.class === provenanceClass);
  return s ? s.reliability : null;
}

/**
 * Privacy-validator hook (rule 6 of the §4.2 propagation rule): may this metric appear in
 * a derived cross-person roll-up? A raw vital may NEVER (Art 11). Unknown → false (safe).
 * @returns {boolean}
 */
export function mayCrossToRollUp(id) { return privacyClassOf(id) === 'derived-safe'; }

/**
 * The ingestion-boundary seam (§2.1.1 hard rule 1). A datum is admitted only if its
 * metric_id is known AND its provenance_class is one the metric's dictionary entry permits.
 * If a `value` is supplied it is also bound-checked against the entry's range — so the
 * authored ranges GATE capture rather than sit decorative (the KV-2 governed-data-as-
 * decoration drift class this repo guards against). `value` stays optional for the pure
 * id+provenance check.
 * @param {{metric_id?:string, provenance_class?:string, value?:number|string}} obs
 * @returns {{ok:boolean, errors:string[]}}
 */
export function validateObservation(obs = {}) {
  const errors = [];
  const { metric_id, provenance_class, value } = obs || {};
  const e = metric_id != null ? BY_ID.get(metric_id) : null;
  if (!metric_id) errors.push('missing metric_id');
  else if (!e) errors.push(`unknown metric_id "${metric_id}" — no dictionary entry (never guessed into an id; queue unmapped and report)`);
  if (!provenance_class) errors.push('missing provenance_class');
  else if (!PROVENANCE_CLASSES.includes(provenance_class)) errors.push(`provenance_class "${provenance_class}" ∉ the closed provenance set`);
  else if (e && !e.sources.some((s) => s.class === provenance_class)) errors.push(`metric "${metric_id}" does not admit provenance class "${provenance_class}" (permitted: ${e.sources.map((s) => s.class).join(', ')})`);
  if (e && value != null) {
    const r = e.range;
    if (Array.isArray(r.values)) {
      if (!r.values.includes(value)) errors.push(`value "${value}" ∉ ${metric_id} allowed values [${r.values.join(', ')}]`);
    } else if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`value for ${metric_id} must be numeric (${e.unit})`);
    } else if (value < r.min || value > r.max) {
      errors.push(`value ${value} out of range for ${metric_id} [${r.min}, ${r.max}] ${e.unit}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export default {
  METRIC_DICTIONARY,
  METRIC_DICTIONARY_VERSION,
  getMetric,
  isKnownMetric,
  privacyClassOf,
  precedenceFor,
  reliabilityFor,
  mayCrossToRollUp,
  validateObservation,
  assertValidRegistry,
  entryProblems,
};
