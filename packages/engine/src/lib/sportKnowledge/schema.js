/**
 * Sport Knowledge Base (SKB) — the SportProfile contract.
 *
 * A SportProfile is a pure-DATA module (one JSON file per sport in
 * ../../data/sport-knowledge/) describing everything an elite Head of Performance knows
 * about a sport, in a shape a deterministic engine can consume. The engine reads VALUES;
 * the provenance (confidence / evidenceLevel / source) makes every recommendation
 * auditable and lets the science evolve without touching engine logic — the same
 * discipline as the evidence knowledge base (../knowledge/schema.js).
 *
 * Adding a sport = a new JSON file + one line in ./index.js. The validator enforces
 * STRUCTURE (all 21 sections present, correct types, a few hard invariants) and PRIVACY
 * (the binding rule that a coach/team surface never exposes raw vitals — see
 * docs/product/TEAM-ARCHITECTURE.md). It deliberately does NOT force deep content, so a
 * scaffold sport (empty arrays) is still "valid"; ./index.js#completeness() reports how
 * fully each profile is authored.
 *
 * Provenance is required only where content EXISTS: an authored recommendation
 * (a decision rule, an injury, a KPI…) must carry its provenance; an empty array (a stub)
 * passes. This keeps the bar high for real content without blocking scaffolds.
 */

export const SCHEMA_VERSION = '1.0.0';

export const EVIDENCE_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const CONFIDENCE = ['high', 'moderate', 'low'];

// Machine-readable decision-rule vocabulary. A rule MAY carry a structured
// `trigger {signal, op, value}` + `effect {type, params}` (alongside its human if/then) so
// the runtime reflow can act on it (see lib/sportKnowledge/rules.js + reflowAdjust.js).
export const RULE_SIGNALS = new Set([
  'competition_within_h', 'matches_this_week', 'acwr', 'readiness',
  'cmj_drop_pct', 'illness', 'season', 'soreness_region', 'travel'
]);
export const RULE_EFFECTS = new Set([
  // shipped — applied by the reflow
  'reduce_volume_pct', 'priming_only', 'force_deload', 'minimal_effective_volume',
  'reduce_one_step', 'withhold', 'taper',
  // reserved — validated, evaluator no-ops (need exercise-level tagging)
  'exclude_soreness_above', 'reduce_region_eccentric', 'reduce_region_overhead', 'cap_high_speed'
]);

/** The 21 spec sections, in order. Every profile must declare all of them. */
export const SECTIONS = [
  'meta',                    // 1  metadata
  'physicalProfile',         // 2  18 ranked qualities
  'energySystems',           // 3  aerobic/glycolytic/atp-pc split
  'movementProfile',         // 4  patterns, planes, loading
  'injuryProfile',           // 5  common/severe injuries
  'positions',               // 6  per-position demands
  'assessments',             // 7  test battery
  'developmentPriorities',   // 8  youth → masters
  'seasonalModel',           // 9  off/pre/comp/playoffs/recovery
  'microcycles',             // 10 weekly loading patterns
  'gymPhilosophy',           // 11 what transfers / what doesn't
  'exerciseLibrary',         // 12 tagged exercises
  'injuryPreventionLibrary', // 13 prehab per injury
  'decisionRules',           // 14 deterministic IF/THEN
  'loadManagement',          // 15 ACWR, MEV/MAV/MRV, deload
  'readinessModel',          // 16 weighted readiness inputs
  'coachDashboard',          // 17 coach KPIs (privacy-bound)
  'athleteDashboard',        // 18 athlete KPIs
  'validation',              // 19 evidence honesty
  'references',              // 20 citations
  'kpiFramework'             // 21 KPI framework + score + gamification
];

/**
 * RAW_VITALS — metric keys that are private health data. A coach/team surface may NEVER
 * expose these; they roll UP into derived signals (readiness, load_state) which a coach
 * CAN see. This mirrors the player_status boundary in docs/product/TEAM-ARCHITECTURE.md
 * and the repo-root CLAUDE.md "TEAM DATA ISOLATION" rule. Any KPI whose `metric` is in
 * this set must have coachDashboard:false and teamDashboard:false.
 */
export const RAW_VITALS = new Set([
  'hrv', 'sleep', 'sleep_duration', 'sleep_score', 'resting_hr', 'rhr',
  'respiratory_rate', 'spo2', 'blood_oxygen', 'skin_temperature', 'body_temperature'
]);

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const isArr = Array.isArray;
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x) => typeof x === 'string' && x.length > 0;
const inRange = (x, lo, hi) => isNum(x) && x >= lo && x <= hi;

/** Provenance present + well-formed on an authored recommendation. @returns {string[]} */
function provErrors(label, o) {
  const errs = [];
  if (!CONFIDENCE.includes(o.confidence)) errs.push(`${label}: confidence must be one of ${CONFIDENCE.join('/')}`);
  if (o.evidenceLevel != null && !EVIDENCE_LEVELS.includes(o.evidenceLevel)) errs.push(`${label}: evidenceLevel must be one of ${EVIDENCE_LEVELS.join('/')}`);
  if (!isStr(o.source)) errs.push(`${label}: source must be a non-empty string`);
  return errs;
}

/**
 * Validate one SportProfile against the SportProfile contract.
 * @returns {string[]} errors (empty array = structurally valid).
 */
export function validateSportProfile(p) {
  if (!isObj(p)) return ['sport profile is not an object'];
  const errs = [];
  const id = p.id || '(no id)';

  if (!isStr(p.id)) errs.push(`${id}: id must be a non-empty string`);
  if (!isStr(p.schemaVersion)) errs.push(`${id}: schemaVersion required`);

  // ── all 21 sections present ──────────────────────────────────────────────────
  for (const s of SECTIONS) if (!(s in p)) errs.push(`${id}: missing section "${s}"`);

  // ── §2 physical profile — importances in 1..10 ───────────────────────────────
  const qualities = (p.physicalProfile && p.physicalProfile.qualities) || {};
  for (const [k, q] of Object.entries(qualities)) {
    if (!isObj(q)) { errs.push(`${id}.physicalProfile.${k}: must be an object`); continue; }
    if (!inRange(q.importance, 1, 10)) errs.push(`${id}.physicalProfile.${k}: importance must be 1..10`);
  }

  // ── §3 energy systems — the three contributions sum to ~100 ──────────────────
  const es = p.energySystems;
  if (isObj(es)) {
    const sum = (es.aerobicPct || 0) + (es.glycolyticPct || 0) + (es.atpPcPct || 0);
    if (Math.abs(sum - 100) > 2) errs.push(`${id}.energySystems: aerobic+glycolytic+atpPc must sum to ~100 (got ${sum})`);
  } else errs.push(`${id}.energySystems: must be an object`);

  // ── §14 decision rules — well-formed IF/THEN + provenance ────────────────────
  if (isArr(p.decisionRules)) {
    p.decisionRules.forEach((r, i) => {
      const lbl = `${id}.decisionRules[${i}]`;
      if (!isObj(r)) { errs.push(`${lbl}: must be an object`); return; }
      if (!isStr(r.id)) errs.push(`${lbl}: id required`);
      if (!isStr(r.if)) errs.push(`${lbl}: "if" required`);
      if (!isStr(r.then)) errs.push(`${lbl}: "then" required`);
      errs.push(...provErrors(lbl, r));
      // structured trigger/effect are OPTIONAL, but when present must use the vocabulary
      if (r.trigger) {
        if (!RULE_SIGNALS.has(r.trigger.signal)) errs.push(`${lbl}: trigger.signal "${r.trigger.signal}" not in vocabulary`);
        if (typeof r.trigger.op !== 'string') errs.push(`${lbl}: trigger.op required`);
      }
      if (r.effect && !RULE_EFFECTS.has(r.effect.type)) errs.push(`${lbl}: effect.type "${r.effect.type}" not in vocabulary`);
    });
  } else errs.push(`${id}.decisionRules: must be an array`);

  // ── §5 injuries / §16 readiness — provenance where authored ──────────────────
  const injuries = (p.injuryProfile && p.injuryProfile.common) || [];
  if (!isArr(injuries)) errs.push(`${id}.injuryProfile.common: must be an array`);
  else injuries.forEach((inj, i) => {
    const lbl = `${id}.injuryProfile.common[${i}]`;
    if (!isObj(inj)) { errs.push(`${lbl}: must be an object`); return; }
    if (!isStr(inj.name)) errs.push(`${lbl}: name required`);
    errs.push(...provErrors(lbl, inj));
  });

  // ── §21 KPI framework — limits, weights, privacy ─────────────────────────────
  errs.push(...validateKpiFramework(id, p.kpiFramework));

  // ── privacy sweep across every dashboard-bearing surface ─────────────────────
  errs.push(...privacyErrors(id, p));

  return errs;
}

/** §21 — limits (≤8 athlete / ≤15 coach), weights sum to 1, per-KPI provenance. */
function validateKpiFramework(id, kf) {
  const errs = [];
  if (!isObj(kf)) return [`${id}.kpiFramework: must be an object`];

  if (isArr(kf.kpis)) {
    kf.kpis.forEach((k, i) => {
      const lbl = `${id}.kpiFramework.kpis[${i}]`;
      if (!isObj(k)) { errs.push(`${lbl}: must be an object`); return; }
      if (!isStr(k.name)) errs.push(`${lbl}: name required`);
      if (!inRange(k.importance, 1, 10)) errs.push(`${lbl}: importance must be 1..10`);
      errs.push(...provErrors(lbl, k));
    });
  } else errs.push(`${id}.kpiFramework.kpis: must be an array`);

  const ad = kf.athleteDashboardKpis;
  if (isArr(ad)) { if (ad.length > 8) errs.push(`${id}.kpiFramework.athleteDashboardKpis: at most 8 (got ${ad.length})`); }
  else errs.push(`${id}.kpiFramework.athleteDashboardKpis: must be an array`);

  const cd = kf.coachDashboardKpis;
  if (isArr(cd)) { if (cd.length > 15) errs.push(`${id}.kpiFramework.coachDashboardKpis: at most 15 (got ${cd.length})`); }
  else errs.push(`${id}.kpiFramework.coachDashboardKpis: must be an array`);

  // performance score — component weights sum to ~1 (only when authored)
  const ps = kf.performanceScore;
  if (isObj(ps) && isArr(ps.components) && ps.components.length) {
    const sum = ps.components.reduce((a, c) => a + (isNum(c.weight) ? c.weight : 0), 0);
    if (Math.abs(sum - 1) > 0.001) errs.push(`${id}.kpiFramework.performanceScore: component weights must sum to 1 (got ${sum.toFixed(3)})`);
  }

  if (kf.gamification != null && !isArr(kf.gamification)) errs.push(`${id}.kpiFramework.gamification: must be an array`);
  return errs;
}

/** The binding privacy rule: no raw-vitals KPI may be coach- or team-visible. */
function privacyErrors(id, p) {
  const errs = [];
  const kpis = (p.kpiFramework && p.kpiFramework.kpis) || [];
  for (const k of kpis) {
    if (!isObj(k)) continue;
    const metric = (k.metric || k.name || '').toString().toLowerCase().replace(/\s+/g, '_');
    if (RAW_VITALS.has(metric) && (k.coachDashboard === true || k.teamDashboard === true)) {
      errs.push(`${id}.kpiFramework: raw-vital KPI "${k.name}" must NOT be coach/team-visible (privacy rule)`);
    }
  }
  return errs;
}

/** Validate a registry array (every profile valid + ids unique). @returns {{ok, errors}} */
export function validateRegistry(profiles) {
  if (!isArr(profiles)) return { ok: false, errors: ['registry is not an array'] };
  const errors = [];
  const seen = new Set();
  for (const p of profiles) {
    errors.push(...validateSportProfile(p));
    if (p && p.id) { if (seen.has(p.id)) errors.push(`duplicate sport id: ${p.id}`); seen.add(p.id); }
  }
  return { ok: errors.length === 0, errors };
}

export default {
  SCHEMA_VERSION, EVIDENCE_LEVELS, CONFIDENCE, SECTIONS, RAW_VITALS,
  validateSportProfile, validateRegistry
};
