/**
 * The Wave-B net — two REPORT-ONLY D14 validators (13-VALIDATION-STRATEGY §4.3),
 * landed BEFORE M2 changes any progression behaviour ("test the property, then
 * change the behaviour"). Their report is the acceptance instrument for M2 itself:
 * the progression redesign is judged done when these go quiet for the right
 * reasons, not by eyeballing plans (spec §3).
 *
 *   • progression-sanity — week-over-week / block-over-block dose movement must be
 *     explicable: a flat block for a progressing athlete is a FAILURE not a default
 *     (SR-01); no unexplained dose regression; deload cadence within recoverability
 *     bounds.
 *   • dose-coherence — every prescription's scheme (rep range / intensity zone) is
 *     coherent with the quality its session objective names; the "3×12 for everyone"
 *     fixed-scheme class is the named counter-case (SR-14).
 *
 * REPORT-ONLY, deliberately (the report → flag → gate ladder is M4 — 13 §8):
 * these validators speak the `severity` vocabulary, NOT the trim/veto verdict
 * vocabulary the D14 gate reads (contract.js applyInjuryVetoes), so by construction
 * they can never trim, veto, or gate a plan. They are NOT wired into
 * generatePlan's `meta.validation` (that promotion is M4) — `validatePlanProgression`
 * is a separate advisory surface. Plans are therefore byte-identical with or
 * without this module (the golden master proves it).
 *
 * Knowledge, not code (Art 17): both validators READ existing governed knowledge —
 * dose-coherence derives its per-quality rep envelope from `data/doseSchemes.js`
 * (the SAME dose model the constructor prescribes from), and the deload-cadence
 * bound comes from `data/blockPriors.js#DELOAD_CADENCE_WEEKS`. No new knowledge
 * entry, so `KNOWLEDGE_SET_VERSION` is untouched and every plan's provenance stamp
 * is unchanged.
 *
 * Purity (Art 18): both read plan STRUCTURE only — no clock, no randomness, no I/O.
 * "Is this athlete progressing?" is answered from the weeks the plan already
 * contains, never the wall clock.
 */
import { DOSE_SCHEMES } from '../../data/doseSchemes.js';
import { DELOAD_CADENCE_WEEKS } from '../../data/blockPriors.js';
import { parseReps } from '../liftProgression.js';

// ── report-only sensitivity knobs (precedent: mrvValidator.js `EPSILON`) ─────────
// A block of ≥ this many WORKING (non-deload/-taper) weeks in which no tracked lift
// ever advances in load or reps is a flat block — a coach overloads well inside this.
const FLAT_MIN_WEEKS = 3;
// A working stretch longer than SLACK × the largest governed deload cadence is beyond
// any recoverability band's rhythm (governed cadence is read, only the multiplier is
// a domain-free tolerance — same class as `EPSILON`).
const CADENCE_SLACK = 2;

// EDS §37 conflict tiers, carried per-finding (the report is sorted by them).
const TIER_FIDELITY = 5;        // OBJECTIVE FIDELITY — the plan serves the overload/coherence objective
const TIER_RECOVERABILITY = 3;  // RECOVERABILITY — deload rhythm

// ── pure parse helpers ───────────────────────────────────────────────────────
/** Numeric load in kg from an item.weight string ("55 kg" → 55); null when bodyweight/absent. */
function parseLoadKg(weight) {
  const m = /(\d+(?:\.\d+)?)\s*kg/i.exec(weight || '');
  return m ? Number(m[1]) : null;
}

// A main WORKING item: not a primer, not a struck substitution, not injury-prescribed
// rehab or pain-free work (mirrors the guards in validators.js / applyInjuryVetoes so
// this net judges exactly the performed work).
const isWorking = (it) =>
  it.section !== 'primer' && !it.substituted && it.tag !== 'rehab' && !/pain-free/i.test(it.name || '');

// ── quality → coherent rep envelope, DERIVED from the governed dose model ─────────
// The union of every rep count DOSE_SCHEMES prescribes for a quality across all
// phases (base/build/peak/deload/taper) and both main + accessory. A prescription
// outside its objective quality's own family (e.g. 12 reps under a maxStrength
// objective) is the incoherence this catches. Built once, at load — pure.
function buildRepEnvelopes() {
  const env = {};
  for (const [quality, block] of Object.entries(DOSE_SCHEMES)) {
    let min = Infinity, max = -Infinity;
    for (const phase of Object.keys(block)) {
      const scheme = block[phase];
      if (!scheme || typeof scheme !== 'object') continue; // skip the `evidence` provenance sibling
      for (const field of ['main', 'acc']) {
        const reps = parseReps(scheme[field]);
        if (reps == null) continue;
        if (reps < min) min = reps;
        if (reps > max) max = reps;
      }
    }
    if (min !== Infinity) env[quality] = { min, max };
  }
  return env;
}
export const QUALITY_REP_ENVELOPE = buildRepEnvelopes();

// The pure barbell strength/power qualities whose PRIMARY compound lift must be
// low-rep by physiology (qualities.js: maxStrength '1–5', explosiveStrength '2–5').
// Deliberately NOT reactiveStrength (its A1 is often high-rep tissue/tendon prep) nor
// hypertrophy (a build discipline legitimately doses a hypertrophy-DIAGNOSIS day in a
// low-rep strength scheme — WP-49 discipline↔objective decoupling; flagging that would
// mischaracterise the engine's own design, so dose-coherence only catches the OTHER
// direction: a heavy strength/power lift given a hypertrophy-or-higher rep count).
const STRENGTH_POWER_QUALITIES = new Set(['maxStrength', 'explosiveStrength']);
// A primary is the session's leading lift (group 'A' / item num "A…"); accessories
// legitimately run higher reps, so they are out of scope.
const isPrimary = (it) => ((it.group || (it.num || '')[0]) === 'A');
// The governed contradiction threshold: reps at or above the hypertrophy scheme's own
// top rep (DOSE_SCHEMES) are unambiguously a hypertrophy/endurance dose — a strength/
// power PRIMARY there is the "3×12 for everyone" fixed-scheme antipattern (SR-14).
const HYPERTROPHY_REP_TOP = (QUALITY_REP_ENVELOPE.hypertrophy && QUALITY_REP_ENVELOPE.hypertrophy.max) || 12;

// ─────────────────────────────────────────────────────────────────────────────
// dose-coherence — per-session (per-week) scheme↔objective coherence.
// Catches the named counter-case (SR-14): a PRIMARY heavy strength/power lift dosed
// in the hypertrophy rep zone — the "3×12 for everyone" fixed scheme applied
// regardless of the strength/power quality the objective names.
// ─────────────────────────────────────────────────────────────────────────────
export const doseCoherenceValidator = {
  id: 'progression.dose-coherence',
  knowledge: 'data/doseSchemes.js#DOSE_SCHEMES (hypertrophy rep-zone top)',
  tier: TIER_FIDELITY,
  reportOnly: true,
  run(week) {
    const findings = [];
    for (const s of week.sessions || []) {
      const quality = s._objective && s._objective.quality;
      if (!STRENGTH_POWER_QUALITIES.has(quality)) continue; // only the low-rep strength/power families are judged
      for (const it of s.items || []) {
        if (!isWorking(it) || !isPrimary(it)) continue;
        const reps = parseReps(it.sets);
        if (reps == null) continue;
        if (reps >= HYPERTROPHY_REP_TOP) {
          findings.push({
            severity: 'warn',
            tier: TIER_FIDELITY,
            reason: `${s.title || 'session'}: primary lift "${it.name}" dosed ${it.sets} (${reps} reps) contradicts its '${quality}' objective — a heavy strength/power lift given a hypertrophy-zone rep count (≥${HYPERTROPHY_REP_TOP}); the "3×12 for everyone" fixed-scheme antipattern (SR-14)`,
            detail: { session: s.title, item: it.name, quality, reps, threshold: HYPERTROPHY_REP_TOP }
          });
        }
      }
    }
    return findings;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// progression-sanity — whole-plan block-over-block dose movement.
// ─────────────────────────────────────────────────────────────────────────────

// Ordered per-exId dose track through a block's working weeks: ONE datapoint per
// (lift, week) — the week's TOP set (max load; ties broken by max reps). Aggregating to
// the week's top set is what makes progression honest against undulating loading: a lift
// trained twice a week (a heavy day + a lighter day) must not read as a within-week
// "regression" — only the week-over-week trend of its top set counts.
function trackLifts(workingWeeks) {
  const byLift = new Map(); // exId → Map(weekNum → { week, loadKg, reps, name })
  workingWeeks.forEach((w) => {
    for (const s of w.sessions || []) {
      for (const it of s.items || []) {
        if (!isWorking(it)) continue;
        const reps = parseReps(it.sets);
        if (reps == null) continue;
        const key = it.exId != null ? it.exId : (it.name || '').toLowerCase();
        if (!key) continue;
        if (!byLift.has(key)) byLift.set(key, new Map());
        const weeks = byLift.get(key);
        const load = parseLoadKg(it.weight);
        const prev = weeks.get(w.num);
        // Keep the week's TOP set: higher load wins; at equal/unknown load, more reps wins.
        const better = !prev
          || (load != null && (prev.loadKg == null || load > prev.loadKg))
          || (load != null && prev.loadKg != null && load === prev.loadKg && reps > prev.reps)
          || (load == null && prev.loadKg == null && reps > prev.reps);
        if (better) weeks.set(w.num, { week: w.num, loadKg: load, reps, name: it.name });
      }
    }
  });
  // Collapse to per-lift arrays ordered by week.
  const track = new Map();
  for (const [key, weeks] of byLift) {
    track.set(key, [...weeks.values()].sort((a, b) => a.week - b.week));
  }
  return track;
}

// A lift ADVANCES if, at any consecutive step in its track, load or reps strictly rise.
function advances(seq) {
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (b.reps > a.reps) return true;
    if (a.loadKg != null && b.loadKg != null && b.loadKg > a.loadKg) return true;
  }
  return false;
}

// A lift REGRESSES if load strictly falls with no rep compensation (a legit scheme
// shift lowers reps as load rises; a true regression drops load AND does not add reps).
function regressionStep(seq) {
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (a.loadKg != null && b.loadKg != null && b.loadKg < a.loadKg && b.reps <= a.reps) {
      return { name: b.name, fromWeek: a.week, toWeek: b.week, from: a.loadKg, to: b.loadKg };
    }
  }
  return null;
}

function checkBlock(phase) {
  const findings = [];
  const workingWeeks = (phase.weeks || []).filter((w) => !w.deload && !w.taper);
  if (workingWeeks.length < FLAT_MIN_WEEKS) return findings;
  const track = trackLifts(workingWeeks);
  // A "tracked" lift recurs in enough of the block to demand progression.
  const tracked = [...track.entries()].filter(([, seq]) => seq.length >= FLAT_MIN_WEEKS);
  if (!tracked.length) return findings;

  // Flat block: not one tracked lift ever advances.
  const anyAdvances = tracked.some(([, seq]) => advances(seq));
  if (!anyAdvances) {
    const stuck = tracked.map(([, seq]) => seq[0].name).filter(Boolean);
    findings.push({
      severity: 'warn',
      tier: TIER_FIDELITY,
      reason: `${phase.title || 'block'}: flat block — no lift advances in load or reps across ${workingWeeks.length} working weeks (a progressing athlete must overload; SR-01). Stuck: ${[...new Set(stuck)].join(', ')}`,
      detail: { block: phase.title, workingWeeks: workingWeeks.length, stuck: [...new Set(stuck)] }
    });
  }

  // Unexplained dose regression inside the block (no deload/taper between working weeks).
  for (const [, seq] of tracked) {
    const reg = regressionStep(seq);
    if (reg) {
      findings.push({
        severity: 'warn',
        tier: TIER_FIDELITY,
        reason: `${phase.title || 'block'}: "${reg.name}" load regresses ${reg.from}→${reg.to} kg (wk ${reg.fromWeek}→${reg.toWeek}) with no deload and no added reps — unexplained regression`,
        detail: { block: phase.title, item: reg.name, ...reg }
      });
    }
  }
  return findings;
}

// Deload cadence across the whole plan: a stretch of consecutive working weeks longer
// than the governed cadence allows is outside recoverability bounds.
function checkDeloadCadence(plan) {
  const findings = [];
  const maxCadence = Math.max(...Object.values(DELOAD_CADENCE_WEEKS));
  const bound = CADENCE_SLACK * maxCadence;
  const weeks = (plan.phases || []).flatMap((p) => p.weeks || []);
  let run = 0, runStart = null;
  const flush = (endNum) => {
    if (run > bound) {
      findings.push({
        severity: 'warn',
        tier: TIER_RECOVERABILITY,
        reason: `deload cadence outside recoverability bounds — ${run} consecutive working weeks (wk ${runStart}–${endNum}) with no deload (governed cadence ${maxCadence} wk)`,
        detail: { consecutiveWorkingWeeks: run, fromWeek: runStart, toWeek: endNum, governedCadence: maxCadence }
      });
    }
  };
  for (const w of weeks) {
    if (w.deload || w.taper) { flush(w.num); run = 0; runStart = null; }
    else { if (run === 0) runStart = w.num; run++; }
  }
  flush(weeks.length ? weeks[weeks.length - 1].num : null);
  return findings;
}

export const progressionSanityValidator = {
  id: 'progression.sanity',
  knowledge: 'data/blockPriors.js#DELOAD_CADENCE_WEEKS + plan block structure',
  tier: TIER_FIDELITY,
  reportOnly: true,
  runPlan(plan) {
    const findings = [];
    for (const phase of plan.phases || []) findings.push(...checkBlock(phase));
    findings.push(...checkDeloadCadence(plan));
    return findings;
  }
};

// The report-only registry (members of the D14 suite; NOT in contract.js's enforcing
// VALIDATORS array — they observe, they never dispose).
export const REPORT_ONLY_VALIDATORS = [progressionSanityValidator, doseCoherenceValidator];

/**
 * Run the report-only progression net over a whole plan. Returns the advisory report:
 *   { reportOnly: true, findings: [{ validator, severity, reason, tier, detail }], counts }
 * Never mutates the plan; never emits a trim/veto verdict. Sorted by EDS §37 tier.
 */
export function validatePlanProgression(plan, ctx = {}) {
  const findings = [];
  for (const f of progressionSanityValidator.runPlan(plan, ctx) || []) {
    findings.push({ validator: progressionSanityValidator.id, severity: f.severity, reason: f.reason, tier: f.tier, detail: f.detail });
  }
  for (const phase of plan.phases || []) {
    for (const week of phase.weeks || []) {
      for (const f of doseCoherenceValidator.run(week, ctx) || []) {
        findings.push({ validator: doseCoherenceValidator.id, severity: f.severity, reason: f.reason, tier: f.tier, detail: { week: week.num, ...f.detail } });
      }
    }
  }
  findings.sort((a, b) => (a.tier - b.tier));
  return { reportOnly: true, findings, counts: { total: findings.length } };
}

export default { progressionSanityValidator, doseCoherenceValidator, REPORT_ONLY_VALIDATORS, validatePlanProgression, QUALITY_REP_ENVELOPE };
