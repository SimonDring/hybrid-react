/**
 * progressionCreep — the estimator-driven creep the non-logging athlete finally gets
 * (Phase 3 M2; 07-PROGRESSION §2.1/§2.2; SR-01/G9). It is progression's LEVEL 1–2
 * fallback: when the engine cannot see logging, the prescription still advances at a
 * governed, conservative, honestly-labelled rate — a Prediction stated as one
 * (Constitution Arts 12, 16), displaced the moment a logged set arrives.
 *
 * WHAT IT DOES (per working week, applied AFTER applyWeights so the base-rep loads are
 * already stamped):
 *   • Primary compounds on a LOAD-creep adaptation (maxStrength) — the top-set load
 *     advances by the governed minimum-effective rate (progression.estimator_creep)
 *     once per COMPLETED prior working week in the block. Also gets a programmed
 *     warm-up ramp to near-maximal work (progression.warmup_ramp — closes SR-10) and
 *     an `estimated` label + driver.
 *   • Primary compounds on a REPS-FIRST adaptation (hypertrophy — T3) — the SAME
 *     double progression accessories use (below): reps climb toward the top of the
 *     range, load held. No ramp (there is no near-maximal single to ramp toward).
 *   • Accessories (every creep-gated discipline) — DOUBLE PROGRESSION: reps climb
 *     toward the top of the range (progression.double_progression), load held
 *     through the climb, labelled estimated.
 *   • Any LOGGED lift (loggedLiftKeys) is UNTOUCHED — the logged autoregulation path
 *     stays the fast path (07-PROGRESSION §2.1: measured displaces inferred).
 *
 * GATED per discipline (CREEP_DISCIPLINES): powerlifting (M2 T2) + hypertrophy (M2 T3).
 * Olympic / sports are T4–T5 — they extend CREEP_DISCIPLINES + author their own knowledge,
 * no new mechanism. Every ungated cohort is byte-identical (the golden master proves it).
 *
 * MODEL PER ADAPTATION (progression.reps_first_model, T3): maxStrength/explosiveStrength
 * primaries LOAD-creep with a programmed warm-up ramp (T2's model — there IS a near-
 * maximal single to ramp toward). hypertrophy has no such near-maximal single, so its
 * PRIMARY role instead runs the SAME reps-first double-progression path T2 already built
 * for accessories (climb reps toward the top of the range, load held) — no new mechanism,
 * just a second adaptation routed through it.
 *
 * PURITY (Constitution Art 18): a pure deterministic function of completion history ×
 * governed knowledge × the plan's own week index — no clock, no randomness, no I/O.
 * `creepWeeks` (completed prior working weeks in the block) is computed by the caller
 * from plan_start_date-anchored structure, never the wall clock.
 *
 * KNOWLEDGE, NOT CODE (Constitution Art 17): every rate/increment/ramp is READ from the
 * governed knowledge base (entries.js #progression.*); this module hard-codes none.
 */
import kb from '../knowledge/kb.js';
import { DISCIPLINE_DOSE_QUALITY } from '../../data/doseSchemes.js';
import { matchLiftForItem, parseReps } from '../liftProgression.js';

// Disciplines whose non-logging athletes get estimator creep. M2 T2 = powerlifting;
// T3 adds 'hypertrophy'. T4–T5 add 'olympic' and the sport cohorts (each authoring its
// own rate/model).
export const CREEP_DISCIPLINES = new Set(['powerlifting', 'hypertrophy']);

const round2_5 = (x) => Math.round(x / 2.5) * 2.5;

/**
 * The creep configuration for a (discipline, week) — or null when creep does not apply
 * (non-creep discipline, deload/taper recovery week, or an unauthored adaptation).
 * `creepWeeks` = completed prior WORKING weeks in this block (0 for the block's first
 * working week → no load advance yet, but the ramp/label still apply).
 */
export function creepConfig({ discipline, creepWeeks = 0, deload = false, taper = false } = {}) {
  if (!discipline || !CREEP_DISCIPLINES.has(discipline)) return null;
  if (deload || taper) return null;                       // recovery/peaking weeks never creep (🔒 1)
  const adaptation = DISCIPLINE_DOSE_QUALITY[discipline]; // powerlifting → maxStrength, hypertrophy → hypertrophy
  const rates = kb.value('progression.estimator_creep');
  const rate = rates && rates[adaptation] && rates[adaptation].weeklyLoadPct;
  // T3: which adaptations run REPS-FIRST double progression on their PRIMARY role too
  // (governed — progression.reps_first_model), rather than load-creep + ramp (T2's model).
  const repsFirstAdaptations = kb.value('progression.reps_first_model').primaryRoleAdaptations || [];
  const dpPrimary = repsFirstAdaptations.includes(adaptation);
  if (rate == null && !dpPrimary) return null;            // no authored progression path for this adaptation
  const weeks = Math.max(0, Math.floor(creepWeeks));
  const dp = kb.value('progression.double_progression');
  const ramp = kb.value('progression.warmup_ramp');
  return {
    adaptation,
    weeks,
    loadRate: rate == null ? 0 : rate,
    loadFactor: rate == null ? 1 : Math.pow(1 + rate, weeks),
    repStep: dp.repStepPerWeek,
    repTopDelta: dp.rangeTopDelta,
    rampSteps: ramp.steps,
    dpPrimary,
  };
}

// Rescale the leading kg figure of a weight string ("55 kg", "20 kg/hand", "+7.5 kg"),
// preserving its prefix/suffix. Returns the input unchanged when there's no kg figure
// (bodyweight / band work) or the factor is a no-op.
function rescaleWeight(weight, factor) {
  if (!weight || !(factor > 1)) return weight;
  const m = /^(\+?)(\d+(?:\.\d+)?)(\s*kg.*)$/i.exec(weight);
  if (!m) return weight;
  const n = round2_5(Number(m[2]) * factor);
  if (!(n > 0)) return weight;
  return `${m[1]}${n}${m[3]}`;
}

// Add `delta` reps to the rep number(s) in a sets string ("3 × 8" → "3 × 12",
// "3 × 8–10" → "3 × 12–14"). Time/hold rows ("2 × 30s") and per-side markers are left
// intact — only the integer rep count(s) after the × move.
function bumpRepsBy(sets, delta) {
  if (!delta) return sets;
  return String(sets).replace(/×\s*(\d+)(\s*[–-]\s*(\d+))?/, (full, a, _range, b) => {
    const tail = full.slice(full.indexOf(a) + a.length); // keep any suffix after the last number handled below
    const lo = Number(a) + delta;
    if (b != null) {
      const hi = Number(b) + delta;
      return `× ${lo}–${hi}`;
    }
    // preserve a trailing 's'/'m' (time rows never match \d+ then non-suffix, but guard anyway)
    return `× ${lo}${/[sm]/.test(tail) ? tail.replace(/^[–-]?\s*\d+/, '') : ''}`;
  });
}

// A programmed warm-up ramp to the working top set, from the governed ramp scheme.
function buildRamp(weight, steps) {
  const m = /(\d+(?:\.\d+)?)/.exec(weight || '');
  if (!m) return null;
  const top = Number(m[1]);
  if (!(top > 0)) return null;
  const out = steps.map((s) => ({ pct: s.pct, reps: s.reps, weight: `${round2_5(top * s.pct)} kg` }))
    .filter((r) => /(\d+(?:\.\d+)?)/.test(r.weight) && Number(/(\d+(?:\.\d+)?)/.exec(r.weight)[1]) > 0);
  return out.length ? out : null;
}

// A performed working item (mirrors the validators' guard) — a primer / struck sub /
// rehab / factor-0 mobility row is never crept.
const isWorking = (it) =>
  it && it.section !== 'primer' && !it.substituted && it.tag !== 'rehab' &&
  it.volumeFactor !== 0 && !/pain-free/i.test(it.name || '');

// Double progression: climb reps toward the top of the range (load held), labelled
// estimated with `driver` in the trace. Shared by accessories (every creep-gated
// discipline) and PRIMARY items on a reps-first adaptation (hypertrophy — T3): the
// SAME mechanism (and the SAME `.progression` shape T2 shipped), just applied to a
// second role. No-op (leaves the item untouched) when the base reps can't be parsed
// or the block hasn't completed a working week yet.
function applyDoubleProgression(it, cfg, driver) {
  const base = parseReps(it.sets);
  if (base == null) return;
  const bump = Math.min(cfg.weeks * cfg.repStep, cfg.repTopDelta);
  if (bump <= 0) return;
  it.sets = bumpRepsBy(it.sets, bump);
  it.estimated = true;
  it.progression = {
    level: 'exercise', currency: 'reps',
    driver, confidence: 'low', weeks: cfg.weeks, addedReps: bump,
  };
}

/**
 * Apply estimator-driven creep to a finalised session's items, in place. Gated + no-op
 * for every non-creep discipline (returns items untouched → byte-identical goldens).
 *
 * @param {object[]} items          finalised session items (post applyWeights)
 * @param {object}   opts
 *   discipline      the resolved build discipline
 *   creepWeeks      completed prior working weeks in this block
 *   deload / taper  recovery-week flags (no creep)
 *   roleByExId      Map(exId → effectiveRole) — from the slot's picks
 *   loggedLiftKeys  Set of lift keys the athlete has LOGGED (untouched — fast path)
 */
export function applyProgressionCreep(items = [], opts = {}) {
  const cfg = creepConfig(opts);
  if (!cfg) return items;
  const roleByExId = opts.roleByExId instanceof Map ? opts.roleByExId : new Map();
  const logged = opts.loggedLiftKeys instanceof Set ? opts.loggedLiftKeys : new Set();

  for (const it of items) {
    if (!isWorking(it)) continue;
    const role = roleByExId.get(it.exId) || null;

    if (role === 'primary') {
      // Logged compounds keep the fast autoregulation path unchanged (measured displaces
      // inferred) — no creep, no ramp, no estimate label.
      const lift = matchLiftForItem(it);
      if (lift && logged.has(lift.key)) continue;
      if (cfg.dpPrimary) {
        // T3 — hypertrophy: REPS-FIRST double progression on the primary too (no
        // near-maximal single to ramp toward; climb reps toward the top of the range,
        // load held — progression.reps_first_model). Same mechanism as accessories.
        applyDoubleProgression(it, cfg, 'estimated — reps-first double progression (hypertrophy primary; completion-gated)');
        continue;
      }
      // LOAD creep on the compound top set (no-op when creepWeeks === 0).
      it.weight = rescaleWeight(it.weight, cfg.loadFactor);
      // Programmed warm-up ramp to near-maximal work (SR-10) — only when there's a load.
      const ramp = buildRamp(it.weight, cfg.rampSteps);
      if (ramp) it.warmupRamp = ramp;
      // Honest labelling (Art 16): the whole non-logging prescription is an estimate.
      it.estimated = true;
      it.progression = {
        level: 'exercise', currency: 'load',
        driver: 'estimated — governed creep rate (completion-gated forward projection)',
        confidence: 'low', adaptation: cfg.adaptation, weeklyLoadPct: cfg.loadRate, weeks: cfg.weeks,
      };
    } else if (role === 'accessory') {
      applyDoubleProgression(it, cfg, 'estimated — double progression (reps→load, completion-gated)');
    }
  }
  return items;
}

export default { CREEP_DISCIPLINES, creepConfig, applyProgressionCreep };
