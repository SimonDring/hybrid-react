/**
 * observers.js — the M4b REPORT-ONLY validator wave (Phase 3 M4b;
 * docs/superpowers/specs/2026-07-15-phase3-m4b-validator-buildout-design.md).
 *
 * Five members of the D14 suite (EDS §35.1) that OBSERVE but never DISPOSE. Unlike
 * the enforcing VALIDATORS (contract.js#VALIDATORS — injury/mrv/duration/equipment/
 * purpose, which speak the trim/veto verdict vocabulary the M4a gate reads), these
 * emit a `'note'` — a verdict that, by CONSTRUCTION, can never trim, veto, or gate:
 * validateWeek stamps every observer finding `verdict:'note'`, which is NOT counted
 * in counts.trim/veto, so `report.pass` (= veto===0 && trim===0) is untouched and no
 * plan ever moves. The report-only law of M4b (spec §2.1): only the M4a SAFETY & LAW
 * tier disposes; every non-safety validator this wave lands is a pure observer.
 *
 * The `reportOnly:true` flag is the STRUCTURAL guarantee — even were an observer to
 * cite a gate-authority knowledge entry, validateWeek forces its verdict to 'note',
 * so a report-only validator cannot gate a plan no matter what it cites (spec §2.4;
 * Art 13 — confidence caps authority, and these never rise above observe).
 *
 * Knowledge, not literals (spec §2.5; Art 17): every magnitude these flag on is READ
 * from an existing governed table — no new coaching magnitude is introduced, so
 * KNOWLEDGE_SET_VERSION is untouched (no golden stamp move):
 *   • sport-protection  → axial.js#HIGH_DAY_THRESHOLD (the established spine-heavy-DAY
 *                         threshold the scheduler + de-spine pass already use).
 *   • MEV-floor         → volume.landmarks#mev (the SAME governed landmark table the
 *                         MRV ceiling reads — this is its mirror).
 *   • dose-coherence    → doseSchemes-derived rep envelopes (delegates to progression.js,
 *                         which builds QUALITY_REP_ENVELOPE from DOSE_SCHEMES).
 *   • progression-sanity→ blockPriors#DELOAD_CADENCE_WEEKS + plan block structure
 *                         (delegates to progression.js's runPlan).
 *   • deload-presence   → blockPriors#BASE_LENGTH_WEEKS.accumulation (the governed
 *                         accumulation-block length).
 *
 * Purity (Art 18): all read plan STRUCTURE only — no clock, no randomness, no I/O.
 */
import { countWeeklyVolume } from '../plan/volume.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { HIGH_DAY_THRESHOLD } from '../plan/axial.js';
import { BASE_LENGTH_WEEKS } from '../../data/blockPriors.js';
import { EXERCISES } from '../../data/strengthExercises.js';
import { availableEquipDetailed, exerciseAvailable } from '../../data/equipmentTaxonomy.js';
import { doseCoherenceValidator, progressionSanityValidator } from './progression.js';

// Resolve a shipped plan item to its catalogue entry (stable exId first, name second) —
// mirrors validators.js#exForItem so the equipment-detail observer keys on identity.
const OBS_EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const OBS_EX_BY_NAME = new Map(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
const obsExForItem = (it) => (it.exId != null && OBS_EX_BY_ID.get(it.exId)) || OBS_EX_BY_NAME.get((it.name || '').toLowerCase());

// Half-set rounding slack (precedent: mrvValidator.js EPSILON) — under a floor by
// ≤ half a set is rounding, not a real shortfall.
const EPSILON = 0.51;

// A gym session that actually ships work (mirrors validators.js#isShipped, minus the
// rehab-appended case — sport-protection judges the athlete's own barbell work).
const isGymSession = (s) => !s.discipline || s.discipline === 'gym';

// Is `week` the LAST week of the whole plan? The plan-scoped observers (progression-
// sanity, deload-presence) are whole-plan checks; validateWeek runs per-week, so they
// emit ONCE — on the plan's terminal week — to avoid N duplicate notes. When the caller
// supplies no plan context (ctx.planPhases absent — e.g. a bare-week validation), they
// no-op. Identity first (generatePlan passes the same objects); num as the fallback.
function isPlanTerminalWeek(week, phases) {
  if (!Array.isArray(phases) || !phases.length) return false;
  const weeks = phases[phases.length - 1].weeks || [];
  const last = weeks[weeks.length - 1];
  if (!last || !week) return false;
  return last === week || last.num === week.num;
}

// ── 1 · SPORT PROTECTION (tier 2) — the gym must not compete with the sport ───────
// Art 2 (the gym serves the sport): a heavy spinal/CNS gym session (axialLoad at/above
// the governed HIGH_DAY_THRESHOLD — back-squat + deadlift territory) stacked into a
// heavy-sport / match week spends recovery the sport needs. Baseline generation is
// sport-blind (no per-week match load) → the caller (reflow/runtime, which knows the
// match schedule) marks the week via ctx.sportWeek/ctx.matchWeek; absent that signal
// this observer is quiet, so it never fires on the injury-blind baseline.
export const sportProtectionObserver = {
  id: 'sport.protection',
  tier: 2,
  reportOnly: true,
  knowledge: 'plan/axial.js#HIGH_DAY_THRESHOLD (spine-heavy-DAY threshold) + Constitution Art 2',
  confidence: 'moderate',
  run(week, ctx = {}) {
    const heavySportWeek = ctx.matchWeek === true || ctx.sportWeek === true || week.matchWeek === true;
    if (!heavySportWeek) return [];
    const findings = [];
    for (const s of week.sessions || []) {
      if (!isGymSession(s)) continue;
      const axial = s.axialLoad || 0;
      if (axial >= HIGH_DAY_THRESHOLD) {
        findings.push({
          reason: `${s.title || 'session'}: heavy spinal/CNS gym work (axial load ${axial} ≥ ${HIGH_DAY_THRESHOLD}) stacked into a match / heavy-sport week — the gym competes with the sport rather than serving it (Art 2)`,
          detail: { session: s.title, axialLoad: axial, threshold: HIGH_DAY_THRESHOLD },
        });
      }
    }
    return findings;
  },
};

// ── 2 · MEV-FLOOR (tier 3) — a priority quality must be dosed to threshold ────────
// The MIRROR of the MRV ceiling (mrvValidator.js): where MRV flags a muscle OVER its
// recoverable ceiling, MEV-floor flags a PRIORITY muscle UNDER its minimum-effective
// volume — named a priority by the diagnosis yet under-stimulated, so the block can't
// drive the adaptation it set out to. Priority muscles come from ctx.priorityMuscles
// (the diagnosis-aware caller supplies them); absent that, quiet (baseline is not
// diagnosis-scoped here, so it never fires on goldens). Reuses volume.landmarks#mev.
export const mevFloorObserver = {
  id: 'volume.mev-floor',
  tier: 3,
  reportOnly: true,
  knowledgeId: 'volume.landmarks',
  knowledge: 'volume.landmarks#mev (the governed minimum-effective volume — mirror of the MRV ceiling)',
  run(week, ctx = {}) {
    const priority = ctx.priorityMuscles;
    if (!Array.isArray(priority) || !priority.length) return [];
    const { counts } = countWeeklyVolume(week.sessions || []);
    const findings = [];
    for (const muscle of priority) {
      const lm = VOLUME_LANDMARKS[muscle];
      if (!lm || !(lm.mev > 0)) continue;   // a muscle with MEV 0 (e.g. core) has no floor to breach
      const delivered = counts[muscle] || 0;
      if (delivered + EPSILON < lm.mev) {
        findings.push({
          reason: `${muscle}: ${delivered} weekly sets is below its minimum-effective volume (MEV ${lm.mev}) though the diagnosis named it a PRIORITY — under-stimulated; add ${Math.ceil((lm.mev - delivered) * 2) / 2} sets`,
          detail: { muscle, delivered, mev: lm.mev, under: lm.mev - delivered },
        });
      }
    }
    return findings;
  },
};

// ── 3 · DOSE-COHERENCE (tier 4) — the scheme must match the named quality ─────────
// The "3×12 for everyone" antipattern (SR-14): a PRIMARY heavy strength/power lift dosed
// in a hypertrophy rep zone contradicts its session objective's target quality. This is
// the SAME check the M2 report-only net already implements (progression.js); M4b PROMOTES
// it into the validateWeek/explainValidation report pipeline at its M4b tier (4 — ATHLETE
// INTENT/OBJECTIVE honesty). Delegation, not duplication — one source of the rule.
export const doseCoherenceObserver = {
  id: 'progression.dose-coherence',
  tier: 4,
  reportOnly: true,
  knowledge: 'data/doseSchemes.js#DOSE_SCHEMES (per-quality rep envelope) — via progression.js',
  confidence: 'low',
  run(week, ctx = {}) {
    return doseCoherenceValidator.run(week, ctx) || [];
  },
};

// ── 4 · PROGRESSION-SANITY (tier 4) — dose movement must be explicable ────────────
// Whole-plan block-over-block movement: an unexplained regression, a flat block for a
// progressing athlete, or a deload cadence outside recoverability bounds (SR-01). Same
// rule as the M2 net (progression.js#progressionSanityValidator.runPlan) — PROMOTED into
// the report pipeline. Whole-plan, so it emits ONCE on the plan's terminal week over the
// full ctx.planPhases the caller threads (quiet when no plan context is supplied).
export const progressionSanityObserver = {
  id: 'progression.sanity',
  tier: 4,
  reportOnly: true,
  knowledge: 'data/blockPriors.js#DELOAD_CADENCE_WEEKS + plan block structure — via progression.js',
  confidence: 'low',
  run(week, ctx = {}) {
    const phases = ctx.planPhases;
    if (!isPlanTerminalWeek(week, phases)) return [];
    return progressionSanityValidator.runPlan({ phases }, ctx) || [];
  },
};

// ── 5 · DELOAD-PRESENCE (tier 3) — an accumulation block must eventually deload ────
// Recoverability (Art 9): a block that runs PAST the governed accumulation window
// (blockPriors#BASE_LENGTH_WEEKS.accumulation) with NO deload/taper week anywhere in it
// accumulates fatigue it never sheds. Distinct from progression-sanity's deload-cadence
// check (a plan-wide over-long working STRETCH): this is per-BLOCK presence. Whole-plan,
// so it too emits once on the terminal week over ctx.planPhases.
export const deloadPresenceObserver = {
  id: 'recoverability.deload-presence',
  tier: 3,
  reportOnly: true,
  knowledge: 'data/blockPriors.js#BASE_LENGTH_WEEKS.accumulation (the governed accumulation-block length)',
  confidence: 'low',
  run(week, ctx = {}) {
    const phases = ctx.planPhases;
    if (!isPlanTerminalWeek(week, phases)) return [];
    const window = BASE_LENGTH_WEEKS.accumulation;   // governed accumulation length (weeks)
    const findings = [];
    for (const phase of phases) {
      const weeks = phase.weeks || [];
      const working = weeks.filter((w) => !w.deload && !w.taper);
      const hasDeload = weeks.some((w) => w.deload || w.taper);
      if (working.length > window && !hasDeload) {
        findings.push({
          reason: `${phase.title || 'block'}: ${working.length} working weeks past the governed accumulation window (${window} wk) with no deload — fatigue is never shed (recoverability, Art 9)`,
          detail: { block: phase.title, workingWeeks: working.length, window },
        });
      }
    }
    return findings;
  },
};

// ── 6 · EQUIPMENT-DETAIL COVERAGE (tier 4) — a base-pool fallback is never silent ──
// Sprint 3 C2. The optional detailed-equipment layer (data/equipmentTaxonomy.js) narrows
// selection WITHIN a base category the athlete detailed — but only while the athlete's
// movement PATTERN keeps ≥1 detailed option. When a detail set empties a pattern the base
// pool covered, selection FALLS BACK to that pattern's base-category candidates (construction —
// selectInterventions.js) so the pattern is still trained. This observer is the VALIDATION half
// of that decision (Art 19 — construction proposes, validation disposes/surfaces): it RECOMPUTES
// the narrowing over the shipped week and NAMES every item that shipped despite the athlete's
// detail excluding it (detail-excluded yet base-included ⇒ it can only have arrived via the
// coverage fallback). Art 15 (no silent truncation): the fallback is reported, never hidden.
// Quiet unless the caller supplies BOTH ctx.access and a non-empty ctx.accessDetail — so every
// athlete who declared no detail (the baseline, every golden archetype) sees NO note (byte-identical).
export const equipmentDetailCoverageObserver = {
  id: 'equipment.detail-coverage',
  tier: 4,
  reportOnly: true,
  knowledge: 'data/equipmentTaxonomy.js (the optional detailed-equipment layer — availableEquipDetailed/exerciseAvailable)',
  confidence: 'moderate',
  run(week, ctx = {}) {
    if (!ctx.access || !ctx.access.length || !ctx.accessDetail || !ctx.accessDetail.length) return [];
    const avail = availableEquipDetailed(ctx.access, ctx.accessDetail);
    if (!avail.detail) return [];   // no usable detail (nothing declared narrowed) ⇒ nothing to surface
    const findings = [];
    for (const s of week.sessions || []) {
      if (!isGymSession(s)) continue;
      for (const it of s.items || []) {
        if (it.section === 'primer' || it.substituted) continue;   // struck / primer items aren't shipped work
        const ex = obsExForItem(it);
        if (!ex) continue;
        // Detail-EXCLUDED yet BASE-included ⇒ it can only have shipped via the base-pool coverage
        // fallback (a pattern the detail set emptied). Name it + its pattern (Art 15).
        if (avail.base.has(ex.equip) && !exerciseAvailable(ex, avail)) {
          findings.push({
            reason: `${s.title || 'session'}: "${it.name}" is not in your detailed equipment, but shipped as a base-pool fallback — the ${ex.pattern} pattern had no detailed option left, so it fell back to the base ${ex.equip} pool to keep the pattern covered`,
            detail: { session: s.title, item: it.name, pattern: ex.pattern, equip: ex.equip, equipDetail: ex.equipDetail || null },
          });
        }
      }
    }
    return findings;
  },
};

// The report-only registry — members of the D14 suite that OBSERVE (verdict 'note'),
// never dispose. validateWeek runs these AFTER the enforcing VALIDATORS and stamps
// every finding 'note'; they can never move a plan (the golden master proves it).
export const REPORT_ONLY_OBSERVERS = [
  sportProtectionObserver,          // tier 2
  mevFloorObserver,                 // tier 3
  deloadPresenceObserver,           // tier 3
  doseCoherenceObserver,            // tier 4
  progressionSanityObserver,        // tier 4
  equipmentDetailCoverageObserver,  // tier 4 — Sprint 3 C2
];

export default {
  sportProtectionObserver,
  mevFloorObserver,
  doseCoherenceObserver,
  progressionSanityObserver,
  deloadPresenceObserver,
  equipmentDetailCoverageObserver,
  REPORT_ONLY_OBSERVERS,
};
