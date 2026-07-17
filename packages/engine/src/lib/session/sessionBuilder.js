/**
 * session/sessionBuilder — the D9/D10/D11 session builder (M-SESS), the value-ordered
 * selection engine at the heart of the adaptive gym engine. This is the M6 re-seat's final
 * extraction (🔒 9): it was `plan/allocator.js` — the 1,052-line concentration — until the
 * D12 dose primitives (→ M-DOSE, `dose/dose.js`) and the D13 structuring core (→ M-SCHED,
 * `schedule/structure.js`) were extracted; what remained IS M-SESS, renamed here. The
 * "allocator" concentration no longer exists.
 *
 * It takes a weekly per-muscle SET-VOLUME target (from strength/targets.js) and a set of
 * session "slots" — each with a time budget and available equipment — and produces concrete
 * gym sessions that spend the available time on the volume that matters most, progressing
 * toward the target. A transparent greedy search: track a per-muscle DEFICIT, go round-robin
 * across slots, each round each slot picks the ONE exercise paying down the biggest remaining
 * deficits per set (favouring compounds + frequency), gated by equipment/experience, ties
 * broken by variety + a posture-friendly pull lean + weekly rotation. Stop a slot at its time
 * budget; whatever deficit remains is the honest gap the UI surfaces rather than hides.
 *
 * Session assembly (addHypertrophyIsolation / addSupportiveFinishers / injectSecondaryGoals /
 * styleObjective / finaliseSlot) lives here too: it depends on this module's selection helpers
 * (perSetMin / finisherPool / focusLabel), so it belongs with M-SESS — moving it to M-SCHED
 * would cycle (M-SESS already imports M-SCHED). It calls the stable M-DOSE + M-SCHED contracts.
 *
 * Pure function → reproducible sessions → stable completion keys.
 * NOTE: no circular import. strength.js + reflow.js call THIS; this imports only data + the
 * dose/structure/session leaf modules, never strength.js.
 */

import { EXERCISES, LEVELS, availableEquip } from '../../data/strengthExercises.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { muscleContribution } from '../plan/contributions.js';
import { parseSetCount } from '../plan/volume.js';
import { applyWeights } from '../liftProgression.js';
import { stimulusFactor } from '../strength/stimulus.js';
import { AXIAL_SESSION_CAP, axialOf } from '../plan/axial.js';
import { selectInterventions, tierOf } from '../plan/selectInterventions.js';
// NOTE (M2b): SELECTION_SCORING (SS) was the legacy deficit-fill's greedy scoring economy —
// deleted with the fill (one construction path now); no import needed here any more.
import { deriveSessionObjective, assignTargetQualities, competencyAdjustedTarget, constraintAdjustedTarget } from './sessionObjective.js';
import { getSecondaryGoal } from '../../data/secondaryGoals.js';
import { getDiscipline } from '../../data/disciplines/index.js';
import { styleFamily } from '../strength/styleFamily.js';
import { DISCIPLINE_DOSE_QUALITY, POWER_DOSE, REACTIVE_LIMITS, doseForQuality } from '../../data/doseSchemes.js';
import { deriveMovementRequirements } from './movementRequirements.js';
import { applyProgressionCreep } from '../strength/progressionCreep.js';
import { regionOf, hypertrophyRegionOf } from './sessionSpecs.js';
import { exerciseMatchesToken } from '../../data/movementPatternMap.js';
// M-DOSE (M6 re-seat, 🔒 9): the D12 dose primitives (dose/dose.js).
import { scheme, olympicClassicLift, roleSetCount, makeItem } from '../dose/dose.js';
// M-SCHED (M6 re-seat, 🔒 9): the D13 structuring core (supersets/ordering + RPE post-pass).
import { structureItems, shiftRpe } from '../schedule/structure.js';

// The internal per-session ceiling — replaces any user-picked session length.
// ~6–10 hard sets/muscle (the within-session stimulus cap) ≈ 75 min of productive
// work. The allocator stops a slot here; volume ÷ day count sizes the rest.
export const SESSION_CEILING_MIN = 75;

// AXIAL_SESSION_CAP (the within-session spinal-load budget) + axialOf live in
// ./axial.js, shared with the scheduler + de-spine pass so they can't diverge.

const EX_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

// Which cohorts the diagnosis actually STEERS (the D11/category-led gate) — the ONE
// predicate shared by the allocator's branch and PlanGenerator's meta.diagnosis emission
// (WP-42a display honesty: a plan never ships a diagnosis it ignored). Extend the sets
// here when a cohort flips (WP-48 team sports, WP-49 build) and both stay in lockstep.
const D11_SPORTS = new Set(['run', 'cycle']);
export function diagnosisSteers({ style, sport, categoryPlan = null, discipline = null } = {}) {
  // WP-49 (Plan 2 T3/T4c): a build-discipline profile (powerlifting/hypertrophy/olympic) ALWAYS
  // steers — the discipline IS the athlete's chosen path, so it uses the diagnosis-first engine
  // (its own priority lifts + in-character dose) whether or not the diagnosis found a capability
  // gap. Without this, an already-strong athlete (empty diagnosis) fell to the legacy fill and got
  // the default scheme. The empty-diagnosis case seeds the discipline's canonical quality below.
  if (discipline) return true;
  // Rating-based (run/cycle) always steers — P0-5 (audit B1): a ZERO-GAP runner/cyclist (an
  // experienced athlete whose diagnosis finds nothing to fix) previously fell to the legacy
  // deficit fill; now they keep the value-ordered D11 week on its maintenance floor
  // (gymTrainableTargets' maxStrength fallback — the sport mirror of the build seed above).
  // meta.diagnosis stays gated on a NON-EMPTY diagnosis in PlanGenerator (display honesty:
  // no diagnosis claim is invented for an athlete without gaps). Category-led needs a plan —
  // categoryPlanFor() is itself gated by CATEGORY_LED (swim + the team sports + soccer +
  // triathlon, WP-48/P0-5), so a present categoryPlan IS the flip decision for that sport.
  return style === 'sport' && (D11_SPORTS.has(sport) || !!categoryPlan);
}

// Supportive finisher: round a short session out toward FINISHER_TARGET_MIN with
// sport/goal-appropriate factor-0 work (prehab/mobility/core-activation), but never
// add more than FINISHER_CAP_MIN — a session is never mostly prehab.
const FINISHER_TARGET_MIN = 30;
const FINISHER_CAP_MIN = 15;

// Map the build style to its goalTag value (the exercise goalTags vocabulary is
// strength/hypertrophy/functional — the bodybuilding FAMILY is tagged 'hypertrophy').
const styleGoalTag = (style) => {
  const fam = styleFamily(style);
  return fam === 'bodybuilding' ? 'hypertrophy' : fam;
};
// Hard gate: a power-quality exercise is allowed only when the goal wants power AND
// it's contextually relevant (in the resolved priority list, or goal-tagged).
function powerAllowed(ex, power, prioritySet, style) {
  if ((ex.quality || 'general') !== 'power') return true;
  if (!power) return false;
  return (prioritySet && prioritySet.has(ex.id)) || (ex.goalTags || []).includes(styleGoalTag(style));
}
// Subtle, evidence-based sex tuning: women recover faster between sets and can
// absorb a little more rep volume on supporting work — nudge accessory/iso reps
// up a touch (heavy mains, holds, carries untouched). Mirrors strength.js.
const femaleRepBump = (sex) => (sex === 'female' ? 2 : 0);

// Effective role of an exercise in a slot. A complex primary demotes to accessory
// below its minLevelForPrimary; and for endurance sports (run/cycle) a horizontal-
// press primary (bench) demotes to accessory — heavy pressing is low-transfer
// deadweight there, so it's programmed light if at all, never as a heavy 4×4 main.
function effectiveRoleOf(ex, slotLevel, demotePress) {
  let role = ex.role;
  if (demotePress && role === 'primary' && ex.pattern === 'hpush') role = 'accessory';
  if (ex.minLevelForPrimary && role === 'primary' && slotLevel < (LEVELS[ex.minLevelForPrimary] ?? 0)) role = 'accessory';
  return role;
}

// Deterministic small jitter so equally-good choices rotate week to week / slot
// to slot, instead of always picking the same exercise.
function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

// Wall-clock minutes a set roughly costs, by role. Supersetting compresses the
// non-primary work (it's performed in another exercise's rest period), so paired
// accessory / filler sets are cheap — this is exactly what lets a short session
// still hit real volume instead of "3×8 squats and done" (Iversen et al. 2021).
function perSetMin(ex, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (role === 'primary') return 2.8;                                    // heavy main, fuller rest
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return 1.2; // light filler
  return 1.5;                                                               // accessory, supersetted
}
// Usable minutes after a brief warm-up (time-efficient training skips long warm-ups).
function slotBudget(minutes) { return Math.max(8, (minutes || 60) - 4); }

// The member of an intent's available chain to boost given the slot's spent axial
// budget: the head (equipment-best) when it still fits, else the lowest-axial member.
export function preferredMember(candidates = [], slotAxial = 0, cap = AXIAL_SESSION_CAP) {
  if (!candidates.length) return null;
  const ax = (id) => axialOf(EX_BY_ID.get(id));
  const head = candidates[0];
  if (slotAxial + ax(head) <= cap) return head;
  let best = head, bestAx = ax(head);
  for (const id of candidates) { const a = ax(id); if (a < bestAx) { best = id; bestAx = a; } }
  return best;
}

// Muscles that make up each region — used to label sessions.
const REGION = {
  lower: ['quads', 'hamstrings', 'glutes', 'calves'],
  push:  ['chest', 'shoulders', 'triceps'],
  pull:  ['back', 'biceps'],
  core:  ['core']
};

// Sport/goal-appropriate supportive work for the finisher: factor-0 (health) or
// mobility-pattern exercises the athlete can do, ranked by relevance (priority-list
// membership / sport tag / build goal) then variety. Returns ordered candidates.
function finisherPool(slot, ctx, levelName) {
  const sport = ctx.sport || null;
  const goal = styleGoalTag(ctx.style);          // goalTags vocabulary (strength/hypertrophy/functional) — discipline ids map through their family (P0-1)
  const prio = new Set(ctx.exercisePriority || []);
  const blockedRx = ctx.blockedNameRegexes || [];
  const cands = EXERCISES.filter(ex => {
    // WP-49 Plan 1: discipline-tagged lifts are only selectable when their discipline is active.
    if (ex.discipline && ex.discipline !== ctx.discipline) return false;
    if (!slot.equip.has(ex.equip)) return false;
    if (ex.level > slot.level) return false;
    if (slot.exUsed.has(ex.id)) return false;
    if (blockedRx.length && blockedRx.some(r => r.test(ex.name))) return false;  // injury-contraindicated (WP-40)
    return stimulusFactor(ex, levelName) === 0 || ex.pattern === 'mobility';  // health (0) or mobility
  });
  const relevance = (ex) => {
    let r = 0;
    if (prio.has(ex.id)) r += 3;
    if (sport && (ex.sportTags || []).includes(sport)) r += 2;
    if (!sport && (ex.goalTags || []).includes(goal)) r += 1;
    if (ex.pattern === 'mobility') r += 0.5;     // general mobility is a safe fallback
    return r;
  };
  const ranked = cands.sort((a, b) => relevance(b) - relevance(a) || (hash(a.id) % 5) - (hash(b.id) % 5));
  // De-duplicate near-identical supportive work so a finisher doesn't stack three
  // almost-identical drills (e.g. the prone Y/T/W raise trio). Keep at most one per
  // family — distinct mobility drills (each its own id) are all kept, but the
  // health-class prone-raise / pull-apart family collapses to a single pick.
  const seen = new Set();
  return ranked.filter(ex => {
    const fam = ex.pattern === 'mobility' ? ex.id : (ex.muscle || ex.pattern);
    if (seen.has(fam)) return false;
    seen.add(fam);
    return true;
  });
}

// A SIMPLE focus label from a slot's realised volume — the plain name of what the
// session actually trains: Upper / Lower / Push / Pull / Full body / Core. Kept
// honest (read from delivered volume, not assumed) but deliberately jargon-free so
// it's obvious at a glance. An upper session that does both pressing and pulling is
// "Upper"; a dedicated press day is "Push", a dedicated row/pull day is "Pull".
export function focusLabel(mv) {
  const total = Object.values(mv).reduce((a, b) => a + b, 0);
  if (!total) return 'Full body';
  const sum = (ms) => ms.reduce((a, m) => a + (mv[m] || 0), 0);
  const lower = sum(REGION.lower), push = sum(REGION.push), pull = sum(REGION.pull), core = sum(REGION.core);
  const upper = push + pull;
  const meaningful = 0.25 * total;
  // Meaningful work in BOTH halves of the body → Full body.
  if (lower >= meaningful && upper >= meaningful) return 'Full body';
  if (core >= 0.5 * total) return 'Core';
  if (lower >= upper) return lower >= meaningful ? 'Lower' : 'Full body';
  // Upper-dominant: name the actual movement focus — but only when that axis truly
  // dominates. A day that's mostly core with a token press isn't a "Push" day.
  if (push >= meaningful && pull >= meaningful) return 'Upper';
  const top = pull > push ? 'Pull' : 'Push';
  return Math.max(push, pull) >= meaningful ? top : 'Full body';
}

// An optional QUALITY tag appended to the region label (sport + functional plans only)
// so a session name communicates intent, not just the body part: a day that opens on
// explosive work and is mostly explosive reads 'Explosive'; a day that merely includes
// some power work gets a 'Power' tag (e.g. 'Lower Power'). Build/strength plans keep the
// plain region label. Reads the slot's WORKING picks — finisher/mobility (factor 0)
// don't count. Returns '' when there's no distinct quality to surface.
export function qualityTag(picks = [], style) {
  if (style !== 'sport' && style !== 'functional') return '';
  const working = picks.filter(p => p && p.ex && p.item && p.item.volumeFactor !== 0);
  if (!working.length) return '';
  const powerWork = working.filter(p => p.ex.quality === 'power');
  if (!powerWork.length) return '';
  const anchorIsPower = picks[0] && picks[0].ex && picks[0].ex.quality === 'power';
  if (anchorIsPower && powerWork.length >= Math.ceil(working.length / 2)) return 'Explosive';
  return 'Power';
}

/**
 * Allocate a week of gym sessions to hit per-muscle volume targets.
 * @param {object} args
 *   targets  { muscle: sets } — the week's per-muscle set target to fill
 *   slots    [{ minutes, equip }] — one per session; equip is an access array
 *            (defaults to ctx.access)
 *   ctx      { style, intent, deload, weekNum, level, sex, lifts, access }
 * @returns {Array} session specs { discipline:'gym', focus, duration, items,
 *          intensity, lowerBody } — one per slot, scheduler/renderer ready.
 */
export function allocateGym({ targets = {}, slots = [], ctx = {} } = {}) {
  // P0-1 (audit TR-01): discipline ids are first-class styles — before this, they were
  // coerced to 'functional' here, so every build discipline ran functional volume/scheme.
  const style = ['strength', 'bodybuilding', 'functional', 'sport'].includes(styleFamily(ctx.style)) ? ctx.style : 'functional';
  const deload = !!ctx.deload;
  const taper = !!ctx.taper;
  const intent = ctx.intent || 'base';
  const weekNum = ctx.weekNum || 1;
  const repBump = femaleRepBump(ctx.sex);
  const levelName = ctx.level || 'intermediate';
  const power = !!ctx.power;
  // Endurance sports: demote heavy horizontal pressing (bench) to a light accessory
  // and cap it to one slot per session — it's low-transfer, mass-adding deadweight
  // for runners/cyclists. Swimmers keep pressing (it's sport-specific for them).
  const demotePress = style === 'sport' && (ctx.sport === 'run' || ctx.sport === 'cycle');
  // No barbell (dumbbell / bodyweight only) → a max-strength scheme can't be loaded.
  const noBarbell = !availableEquip(ctx.access || []).has('barbell');
  const s = scheme(style, intent, deload, taper, noBarbell);
  // WP-40: runtime contraindications gate SELECTION on EVERY path (EDS §36 — constraints
  // pre-shape, the post-filter is a backstop). The reflow passes ctx.blockedNameRegexes
  // from the athlete's active injuries; the pure baseline generator passes none, so
  // baseline output is byte-identical. Previously only the D11 sport branch honoured
  // these — the legacy fill selected blocked movements the injury filter then struck
  // and hid: silent volume loss for injured build athletes (Art 8 / Art 15).
  const blockedRx = ctx.blockedNameRegexes || [];
  const isBlockedEx = (ex) => blockedRx.length > 0 && blockedRx.some((r) => r.test(ex.name));

  // Hard WEEKLY ceiling: the actual allocated volume for a muscle (counting the
  // synergist contributions that compounds credit) may never exceed its MRV across
  // the whole week. This is the no-overtraining backstop, shared across all slots
  // (so synergist-only volume — e.g. back from hinges — is capped too).
  const weeklyCeiling = {};
  for (const m in VOLUME_LANDMARKS) weeklyCeiling[m] = VOLUME_LANDMARKS[m].mrv;
  const weeklyDelivered = {};   // muscle → fractional sets delivered across ALL slots
  const weeklyExCount = {};     // exercise id → sessions it's appeared in this week (variety penalty)

  const work = slots.map((slot, idx) => ({
    idx,
    minutes: slot.minutes || 60,
    equip: availableEquip(slot.equip || ctx.access || []),
    level: LEVELS[ctx.level] ?? 0,
    budget: slotBudget(slot.minutes || 60),
    timeUsed: 0,
    picks: [],       // { ex, item } — structured into supersets at finalise
    patternsUsed: new Set(),
    exUsed: new Set(),
    delivered: {},   // muscle → sets delivered IN THIS SLOT (per-slot volume tally)
    muscleVol: {},   // muscle → total fractional sets in this slot (for label/flags)
    focus: slot.focus || null,       // split day's muscle weights — biases selection (null = no bias)
    focusLabel: slot.focusLabel || null,  // WP-49 Plan 2 T3b: the split's region label (Upper/Lower/
                                     // Push/Pull) — previously dropped, so the D11 region-filter defaulted
                                     // to 'full'. Only the hypertrophy discipline consumes it (below);
                                     // sports + powerlifting + olympic stay region='full' (byte-identical).
    priorityIds: slot.priorityIds || null,               // WP-49 T4b-2: olympic per-day lift family
    targetQualityOverride: slot.targetQualityOverride || null,  // WP-49 T4b-2: olympic per-day quality
    anchors: slot.anchors || null,   // split day's opening pattern(s)
    axialLoad: 0                     // running spinal-load budget for this session
  }));

  // SHARED weekly deficit — the single volume controller. Each slot pays it down;
  // the split steers WHICH slot gets WHAT (anchors + focus bias), never the total.
  const deficit = { ...targets };

  const prioritySet = ctx.exercisePriority && ctx.exercisePriority.length
    ? new Set(ctx.exercisePriority) : null;

  const priorityByIntent = ctx.priorityByIntent instanceof Map ? ctx.priorityByIntent : new Map();
  const idToIntent = new Map();
  for (const [intent, ids] of priorityByIntent) for (const id of ids) if (!idToIntent.has(id)) idToIntent.set(id, intent);
  // Fallback anchor: a fundamental compound, rotated so the week always covers
  // legs + push + pull no matter how few/short the sessions are.
  const FUNDAMENTAL = ['squat', 'hpush', 'hinge', 'hpull', 'vpush', 'lunge', 'vpull'];

  const place = (slot, pick) => {
    const { ex, sets, contrib, effectiveRole } = pick;
    const vf = stimulusFactor(ex, levelName);
    const item = makeItem(ex, slot.picks.length, slot.scheme || s, style, deload, repBump, effectiveRole, taper);
    item.volumeFactor = vf;
    if (vf === 0) item.tag = 'mobility';   // health/activation — render + count as zero
    slot.picks.push({ ex, effectiveRole, item });
    slot.timeUsed += sets * perSetMin(ex, effectiveRole);
    slot.patternsUsed.add(ex.pattern);
    slot.exUsed.add(ex.id);
    slot.axialLoad = (slot.axialLoad || 0) + axialOf(ex);
    const exIntent = idToIntent.get(ex.id);
    if (exIntent) item.intent = exIntent;   // tag for the de-spine pass
    weeklyExCount[ex.id] = (weeklyExCount[ex.id] || 0) + 1;   // cross-session variety tracking
    for (const m in contrib) {
      const v = sets * contrib[m] * vf;   // stimulus-weighted volume toward the ledger
      deficit[m] = (deficit[m] || 0) - v;
      slot.delivered[m] = (slot.delivered[m] || 0) + v;
      slot.muscleVol[m] = (slot.muscleVol[m] || 0) + v;
      weeklyDelivered[m] = (weeklyDelivered[m] || 0) + v;   // weekly MRV accounting
    }
  };

  // Round-out coverage (season-phased SKB, 2026-07-09): guarantee the sport's DERIVED under-
  // developed movement patterns appear on a round-out session — the off-season "round out the
  // physique" work. Gated on a programming block (null for un-migrated sports → no-op → byte-
  // identical). demotePress is intentionally OFF here: this IS the deliberate balance work the
  // sport's own emphasis suppresses. Sourced sport-priority-first, then the catalogue. Called by
  // BOTH the D11 and the legacy fill paths (each returns its own sessions).
  const applyRoundOut = () => {
    const roCfg = ctx.programming, roTargets = ctx.roundOut;
    if (!roCfg || (roCfg.roundOutSessionsPerWeek || 0) < 1 || !roTargets || !(roTargets.patterns || []).length) return;
    const gymDays = work.length;
    const nRO = gymDays === 1 ? 1 : Math.min(roCfg.roundOutSessionsPerWeek, Math.max(1, gymDays - 1));
    const dose = (roCfg.roundOut && roCfg.roundOut.dose) || 'develop';
    const maxCover = dose === 'develop' ? roTargets.patterns.length : dose === 'maintain' ? 1 : 0;
    const prioIds = new Set(ctx.exercisePriority || []);
    for (const slot of work.slice(gymDays - nRO)) {   // the LAST nRO slots (deterministic)
      let added = 0;
      for (const token of roTargets.patterns) {
        if (added >= maxCover) break;
        if (slot.picks.some(p => exerciseMatchesToken(p.ex, token))) continue;   // already covered
        const cands = EXERCISES.filter(ex =>
          exerciseMatchesToken(ex, token) && slot.equip.has(ex.equip) && ex.level <= slot.level &&
          !slot.exUsed.has(ex.id) && !isBlockedEx(ex) && stimulusFactor(ex, levelName) > 0 &&
          (!ex.discipline || ex.discipline === ctx.discipline));
        if (!cands.length) continue;
        cands.sort((a, b) => ((prioIds.has(b.id) ? 1 : 0) - (prioIds.has(a.id) ? 1 : 0)) || ((hash(a.id) % 7) - (hash(b.id) % 7)));
        const ex = cands[0];
        const role = effectiveRoleOf(ex, slot.level, false);   // demotePress OFF for round-out
        place(slot, { ex, sets: roleSetCount(ex, slot.scheme || s, style, role), contrib: muscleContribution(ex), effectiveRole: role });
        added++;
      }
    }
  };

  // Pick a fundamental-pattern anchor for a slot from candidate patterns (the
  // split's day patterns, or the rotating FUNDAMENTAL fallback).
  const patternAnchor = (slot, patterns) => {
    for (const pat of patterns) {
      // WP-49 Plan 1: discipline-tagged lifts are only selectable when their discipline is active.
      let cands = EXERCISES.filter(e => (!e.discipline || e.discipline === ctx.discipline) && e.pattern === pat && slot.equip.has(e.equip) && e.level <= slot.level && powerAllowed(e, power, prioritySet, style) && !isBlockedEx(e));
      if (!cands.length) continue;
      const prim = cands.filter(e => e.role === 'primary');
      if (prim.length) cands = prim;
      const bar = cands.filter(e => e.equip === 'barbell');
      if (bar.length) cands = bar;
      return cands[(weekNum + slot.idx) % cands.length];
    }
    return null;
  };

  // ── ONE construction path (Phase 3 M2b — G6 / TR-08): EVERY cohort is diagnosis-first. The
  //    value-ordered selection (M-SESS / D11) satisfies each session's D9/D10 requirement, stopping
  //    at the fatigue budget; muscle-volume stays the MRV LEDGER (Art 6 — it validates, it no longer
  //    DRIVES). The legacy volume-first deficit fill was DELETED here: proven dead (no cohort routed
  //    to it after Wave-A cohort rescue + the build flip). diagnosisSteers survives only as
  //    PlanGenerator's display-honesty gate (whether to SHOW meta.diagnosis) — never a construction fork.
  // WP-49 T4c: a build discipline with NO diagnosed priority (an already-strong athlete, no
  // capability gap) still gets a target — seed its canonical quality so selection + dose have one
  // instead of an empty rotation. Sports without a discipline keep the raw (possibly empty) list.
  const rawPriorityQualities = ctx.priorityQualities || [];
  const priorityQualities = (rawPriorityQualities.length === 0 && ctx.discipline && DISCIPLINE_DOSE_QUALITY[ctx.discipline])
    ? [DISCIPLINE_DOSE_QUALITY[ctx.discipline]] : rawPriorityQualities;
  // Swim + the team sports are CATEGORY-LED (WP-20): they arrive with an SKB category plan
  // (ctx.categoryPlan, built by the caller) whose per-session assignments name each day's
  // coverage, movements, and dose quality — replacing the priority-quality rotation.
  const categoryPlan = ctx.categoryPlan || null;
  {
    const goalPrimaryD11 = null;
    // The D9 target-quality rotation is a property of the WEEK, not of this call. The
    // weekly builder passes all of a week's slots at once, so rotating over work.length
    // is correct there — but the runtime reflow rebuilds ONE pending slot per call, and
    // rotating over a single-slot call pinned every session to the same top-priority
    // quality (a runner's explosive days collapsed into repeats of the durability day).
    // A caller that allocates a week piecemeal declares the slot's baseline identity via
    // ctx.weekGymCount (the week's gym-session count) + ctx.weekSlotIdx (this slot's
    // index within that week); absent, behaviour is exactly the old whole-week rotation.
    const weekCount = ctx.weekGymCount || work.length;
    const targetsD11 = assignTargetQualities(priorityQualities, weekCount, goalPrimaryD11, ctx.sport);
    const contraPatternsD11 = ctx.contraindicatedPatterns || new Set();
    const blockedRxD11 = ctx.blockedNameRegexes || [];
    const constrainedD11 = contraPatternsD11.size > 0 || blockedRxD11.length > 0;
    work.forEach((slot, i) => {
      const wi = ctx.weekSlotIdx != null ? (ctx.weekSlotIdx + i) % weekCount : i;
      // WP-49 Plan 2 T3b: only HYPERTROPHY consumes the split's region label (upper/lower/push/
      // pull days). Every other diagnosis-steered cohort — sports, powerlifting, olympic — trains
      // full-body / lift-focused sessions and keeps region='full' (byte-identical to pre-T3b).
      // Region gate by discipline:
      //  • hypertrophy — the finer Push/Pull-aware split (Push/Pull/Legs at higher day counts).
      //  • powerlifting — the coarse Upper/Lower split (bench-led upper day, squat/deadlift-led lower
      //    day) so a 4-day isn't four identical full-body days with no muscle spacing (WP-49 T6).
      //  • olympic — 'full': it carries its own per-day lift family + target quality (T4b-2), not a region.
      //  • sports + legacy — 'full' (byte-identical; sports thread priority work through every session).
      const region = ctx.discipline === 'hypertrophy' ? hypertrophyRegionOf(slot.focusLabel)
        : ctx.discipline === 'powerlifting' ? regionOf(slot.focusLabel)
          : 'full';
      // Category-led slot (WP-20): the SKB assignment names the day's coverage, its
      // movements, and its dose quality (led by its highest-rated movement).
      const assignment = categoryPlan ? categoryPlan.sessions[wi % categoryPlan.sessions.length] : null;
      // Competency gate: a beginner targeting a power quality builds the max-strength base first (EDS §22).
      // WP-49 T4b-2: an olympic day carries its own target quality (snatch/C&J = explosive; squat day =
      // max strength) so the squat day isn't filtered out of an explosive rotation. Still competency-gated.
      let targetQuality = competencyAdjustedTarget(slot.targetQualityOverride || (assignment ? assignment.doseQuality : targetsD11[wi]), levelName);
      // Constraint gate (D9): if injuries contraindicate this quality's drivers, re-target
      // the next trainable priority (constraintAdjustedTarget). The oracle asks: does any
      // legal tier-1/2 driver survive equipment × level × pattern × name constraints?
      // Only evaluated when constraints exist — the pure generator path is untouched.
      let retargetedFrom = null;
      if (constrainedD11 && !assignment) {
        // The oracle mirrors selection's FULL driver gate: a quality is trainable only if
        // some exercise survives equipment × level × contraindicated-pattern × blocked-name
        // AND is a tier-1/2 driver AND matches the quality's own post-subtraction ideal
        // patterns (D10). Tier legality alone is not enough — a hamstring strain leaves
        // robustness with squat-tagged drivers but lunge/calf ideal patterns, which the
        // selection gate would reject; the session must re-target, not go accessory-only.
        const isTrainable = (q) => {
          const reqQ = deriveMovementRequirements({ targetQuality: q, region, level: levelName, contraindicatedPatterns: contraPatternsD11 });
          if (!reqQ) return false;
          const pats = new Set(reqQ.movementPatterns || []);
          return EXERCISES.some((ex) =>
            slot.equip.has(ex.equip) && (ex.level ?? 0) <= slot.level &&
            !contraPatternsD11.has(ex.pattern) &&
            !blockedRxD11.some((r) => r.test(ex.name)) &&
            (tierOf(ex, q, ctx.sport) === 1 || tierOf(ex, q, ctx.sport) === 2) &&
            (!pats.size || pats.has(ex.pattern)));
        };
        ({ quality: targetQuality, retargetedFrom } = constraintAdjustedTarget({
          targetQuality, priorityQualities, sport: ctx.sport, level: levelName, isTrainable
        }));
      }
      const objective = deriveSessionObjective({ targetQuality, region, phaseIntent: intent, deload, taper, season: ctx.season });
      if (retargetedFrom) objective.rationale += ` (re-targeted from ${retargetedFrom} — its drivers are contraindicated by an active injury)`;
      // Constraints before content (EDS L8, WP-13): callers that know the athlete's ACTIVE
      // injuries (the reflow, Train Now) pass ctx.contraindicatedPatterns, so D11 selects a
      // legal alternative instead of the post-filter stripping picks and leaving a hole. The
      // pure baseline stays injury-blind (injuries are runtime state, not profile) and the
      // app-side post-filter remains the BACKSTOP on every path — it also catches the
      // guarantee-coverage fallback anchor below, which is pattern-blind by design.
      const requirements = deriveMovementRequirements({ targetQuality, region, level: levelName, contraindicatedPatterns: ctx.contraindicatedPatterns || new Set() });
      const req = { objective, requirements };
      // D12 (WP-21): the session doses from its TARGET QUALITY when the quality has a
      // scheme block (data/doseSchemes.js) — a robustness day runs HSR tempo work, an
      // explosive day runs strength-speed triples — falling back to the style-bridged
      // sportSupport composite otherwise. Build/swim/legacy never set slot.scheme.
      // WP-49 T4c: a build DISCIPLINE doses in its OWN character (a powerlifter's lifts are always
      // heavy low-rep), so it pins to its canonical phase-progressing quality scheme instead of the
      // per-day diagnosis quality, and applies its doseCharacter's exact rest. Selection still uses
      // targetQuality above — only the DOSE is discipline-pinned. Sports/legacy: unchanged.
      const disciplineDoseQ = ctx.discipline && DISCIPLINE_DOSE_QUALITY[ctx.discipline];
      if (disciplineDoseQ) {
        const dc = getDiscipline(ctx.discipline)?.doseCharacter;
        const base = doseForQuality(disciplineDoseQ, intent, { deload, taper }) || s;
        slot.scheme = dc ? { ...base, mainRestSec: dc.main?.restSec, accRestSec: dc.accessory?.restSec } : base;
      } else {
        slot.scheme = doseForQuality(targetQuality, intent, { deload, taper }) || s;
      }
      const makePick = (ex) => {
        const effectiveRole = effectiveRoleOf(ex, slot.level, demotePress);
        return { ex, sets: roleSetCount(ex, slot.scheme, style, effectiveRole), contrib: muscleContribution(ex), effectiveRole };
      };
      const picks = selectInterventions({
        req, equip: slot.equip, level: slot.level, levelName, sport: ctx.sport,
        skbIds: ctx.skbIds || new Set(), ledger: { weeklyDelivered, weeklyCeiling }, makePick,
        blockedNameRegexes: ctx.blockedNameRegexes || [],
        categoryIds: assignment ? new Set(assignment.exerciseIds) : null,
        discipline: ctx.discipline,
        // WP-49 Plan 2 T4: anchor the discipline's own priority lifts (tier 0), in authored order.
        // T4b-2: an olympic day supplies its own per-day family (slot.priorityIds); every other
        // discipline day uses the full discipline priority list. Gated to the build-discipline cohort
        // so sports + legacy see priorityIds=null (byte-identical).
        priorityIds: slot.priorityIds || (ctx.discipline ? (ctx.exercisePriority || []) : null)
      });
      if (assignment) objective.rationale += ` (${assignment.rationale})`;
      // WP-30a: ship the D9 objective WITH the session — the rationale string now
      // carries the re-target + category notes appended above. Annotation, not
      // prescription (the _underscore convention, like the reflow's _adapted).
      slot._objective = { quality: objective.targetQuality, purpose: objective.purpose, rationale: objective.rationale };
      if (picks.length === 0) {
        // Guarantee coverage: fall back to a fundamental anchor (never an empty session).
        const anchor = patternAnchor(slot, slot.anchors || [FUNDAMENTAL[slot.idx % FUNDAMENTAL.length]]) || patternAnchor(slot, FUNDAMENTAL);
        if (anchor) place(slot, { ex: anchor, sets: roleSetCount(anchor, slot.scheme, style, effectiveRoleOf(anchor, slot.level, demotePress)), contrib: muscleContribution(anchor), effectiveRole: effectiveRoleOf(anchor, slot.level, demotePress) });
      } else {
        // Session foot-contact ceiling for reactive work (H9 C7, de Villarreal 2009):
        // jumps stop when the level's contact budget is spent — quality over quantity.
        const contactCeiling = REACTIVE_LIMITS.footContacts[levelName] ?? REACTIVE_LIMITS.footContacts.intermediate;
        const powerContacts = (() => { const m = /(\d+)\s*×\s*(\d+)/.exec(POWER_DOSE.sets); return m ? Number(m[1]) * Number(m[2]) : 16; })();
        let footContacts = 0;
        for (const p of picks) {
          // Ground-contact budget applies to BALLISTIC power work (jumps) — a barbell
          // classic lift has no landing contacts and must never be skipped by this cap.
          if (p.ex.quality === 'power' && !olympicClassicLift(p.ex)) {
            if (footContacts + powerContacts > contactCeiling) continue;
            footContacts += powerContacts;
          }
          place(slot, p);
        }
      }
    });
    applyRoundOut();   // season-phased SKB (2026-07-09) — gated; no-op for un-migrated sports
    // WP-49 T4c-3: a hypertrophy session gets DIRECT isolation for its region's smaller muscles
    // (arms/delts/calves) as working volume — BEFORE the factor-0 finisher, since it's real work.
    addHypertrophyIsolation(work, ctx, weeklyDelivered, weeklyCeiling, targets, s, style, deload, taper, repBump, levelName);
    // Short D11 sessions get the same supportive finisher as the legacy path (factor-0
    // prehab — §34 tiers 6–7; the fatigue budget governs WORKING sets, not support work).
    addSupportiveFinishers(work, ctx, levelName, s, style, deload, taper, repBump);
    injectSecondaryGoals(work, ctx, s, style, deload, taper, repBump);   // WP-49 T5 — accessory tail only
    // Finalise sport slots through the SAME structuring/weights/duration machinery, then return.
    return work.map(slot => finaliseSlot(slot, style, ctx));
  }
}

// WP-49 T4c-3: HYPERTROPHY direct-isolation pass. A "build muscle" plan should carry direct arm /
// delt / calf / leg-isolation, but the compounds fill the fatigue budget and the push/pull region
// filter excludes 'iso', so the smaller muscles got no direct work. This appends region-appropriate
// isolation as WORKING volume — MRV-gated (never over a muscle's weekly ceiling) + time-capped, in
// leftover session budget, AFTER the main compounds (so the mains are untouched). Gated to the
// hypertrophy discipline via its own region path → every other cohort is byte-identical.
const ISO_FOR_REGION = {
  push:  ['triceps_pushdown', 'chest_fly', 'lateral_raise'],
  pull:  ['biceps_curl', 'rear_fly'],
  lower: ['leg_curl', 'leg_ext', 'calf_raise'],
  upper: ['triceps_pushdown', 'biceps_curl', 'lateral_raise'],
  full:  ['biceps_curl', 'triceps_pushdown', 'calf_raise'],
};
const HYP_ISO_CAP_MIN = 12;
function addHypertrophyIsolation(work, ctx, weeklyDelivered, weeklyCeiling, targets, s, style, deload, taper, repBump, levelName) {
  if (ctx.discipline !== 'hypertrophy') return;
  const contra = ctx.contraindicatedPatterns instanceof Set ? ctx.contraindicatedPatterns : new Set(ctx.contraindicatedPatterns || []);
  const blockedRx = ctx.blockedNameRegexes || [];
  for (const slot of work) {
    const list = ISO_FOR_REGION[hypertrophyRegionOf(slot.focusLabel)] || ISO_FOR_REGION.full;
    const have = slot.equip instanceof Set ? slot.equip : availableEquip(slot.equip || ctx.access || []);
    let budget = Math.min(HYP_ISO_CAP_MIN, (slot.minutes || 60) - slot.timeUsed);
    for (const id of list) {
      if (budget <= 2) break;
      const ex = EX_BY_ID_ALL.get(id);
      if (!ex || !have.has(ex.equip) || slot.exUsed.has(ex.id)) continue;
      if (contra.has(ex.pattern) || blockedRx.some((r) => r.test(ex.name))) continue;
      const contrib = muscleContribution(ex);
      const vf = stimulusFactor(ex, levelName);
      // The isolation's DOMINANT muscle (what it exists to hit).
      const dom = Object.keys(contrib).sort((a, b) => contrib[b] - contrib[a])[0];
      // TARGET gate: only add while the dominant muscle is still below the WEEK'S target (the MEV→MAV
      // ramp / deload floor) — so isolation ramps WITH the block instead of blowing past a light base
      // week. This also respects MRV (target ≤ MAV ≤ MRV). Skip if it's already met its target.
      if (dom && (weeklyDelivered[dom] || 0) >= (targets[dom] ?? Infinity) - 0.01) continue;
      const item = makeItem(ex, slot.picks.length, slot.scheme || s, style, deload, repBump, ex.role, taper);
      const setN = parseSetCount(item.sets) || 3;
      // MRV backstop: never push ANY muscle it touches over its recoverable ceiling.
      let exceeds = false;
      for (const m in contrib) { if ((weeklyDelivered[m] || 0) + setN * contrib[m] * vf > (weeklyCeiling[m] ?? Infinity) + 0.01) { exceeds = true; break; } }
      if (exceeds) continue;
      item.volumeFactor = vf;
      slot.picks.push({ ex, effectiveRole: ex.role, item });
      slot.exUsed.add(ex.id);
      const cost = setN * perSetMin(ex, ex.role);
      slot.timeUsed += cost; budget -= cost;
      for (const m in contrib) weeklyDelivered[m] = (weeklyDelivered[m] || 0) + setN * contrib[m] * vf;
    }
  }
}

// Supportive finisher: round out a short session with sport/goal-appropriate
// factor-0 work (counts nothing toward volume). The amount scales inversely to the
// realised working dose — a long session has no gap and gets nothing. Shared by the
// legacy fill AND the D11 path: D11 sessions are FATIGUE-bounded, not time-bounded,
// and §34 tiers 6–7 support work is exactly what should fill a short session's
// remaining minutes (a beginner runner's 15-minute hinge day still gets its prehab).
function addSupportiveFinishers(work, ctx, levelName, s, style, deload, taper, repBump) {
  for (const slot of work) {
    let gap = FINISHER_TARGET_MIN - slot.timeUsed;
    if (gap <= 2) continue;
    let added = 0;
    for (const ex of finisherPool(slot, ctx, levelName)) {
      if (gap <= 2 || added >= FINISHER_CAP_MIN) break;
      // Variety guard: the prone Y/T/W scapular trio is one movement family — never
      // stack a second member into the same session (redundant prehab).
      if (/prone [ytw] raise/i.test(ex.name) && slot.picks.some((p) => /prone [ytw] raise/i.test(p.ex.name))) continue;
      const effectiveRole = ex.role;
      const item = makeItem(ex, slot.picks.length, s, style, deload, repBump, effectiveRole, taper);
      item.volumeFactor = 0;
      item.tag = 'mobility';
      slot.picks.push({ ex, effectiveRole, item });
      slot.exUsed.add(ex.id);
      const cost = (parseSetCount(item.sets) * perSetMin(ex, effectiveRole)) || 2;
      slot.timeUsed += cost; gap -= cost; added += cost;
    }
  }
}

// WP-49 Plan 2 T5: layer the athlete's SECONDARY-GOAL corrective work (posture / prehab /
// mobility / conditioning) onto each slot's ACCESSORY TAIL, in leftover time budget, AFTER main
// selection AND the supportive finisher. Runs LAST and only APPENDS factor-0 corrective items, so
// the main work (priority lifts + their dose) is untouched and the MRV ledger is unchanged
// (authority order, design §5: safety > discipline main work > diagnosis priorities > secondary
// corrective). Gated: no-op when ctx.secondaryGoals is empty, so every sport + no-goal build plan
// is byte-identical. Equipment / injury (blocked name + contraindicated pattern) / duplicate aware.
const EX_BY_ID_ALL = new Map(EXERCISES.map((e) => [e.id, e]));
const SECONDARY_CAP_MIN = 10;   // at most ~10 min of secondary corrective per session
function injectSecondaryGoals(work, ctx, s, style, deload, taper, repBump) {
  const goals = (ctx.secondaryGoals || []).map(getSecondaryGoal).filter(Boolean);
  if (!goals.length) return;
  const blockedRx = ctx.blockedNameRegexes || [];
  const contra = ctx.contraindicatedPatterns instanceof Set ? ctx.contraindicatedPatterns : new Set(ctx.contraindicatedPatterns || []);
  for (const slot of work) {
    const have = slot.equip instanceof Set ? slot.equip : availableEquip(slot.equip || ctx.access || []);
    // One legal corrective queue per goal; round-robin so a multi-select SPREADS, not stacks.
    const queues = goals.map((g) => (g.accessoryPreferences || [])
      .map((id) => EX_BY_ID_ALL.get(id)).filter(Boolean)
      .filter((ex) => have.has(ex.equip) && !slot.exUsed.has(ex.id) && !contra.has(ex.pattern) && !blockedRx.some((r) => r.test(ex.name)))
      .map((ex) => ({ ex, goalId: g.id })));
    let budget = Math.min(SECONDARY_CAP_MIN, (slot.minutes || 60) - slot.timeUsed);
    let progress = true;
    while (budget > 2 && progress) {
      progress = false;
      for (const q of queues) {
        if (budget <= 2) break;
        const next = q.shift();
        if (!next || slot.exUsed.has(next.ex.id)) continue;
        const { ex, goalId } = next;
        const item = makeItem(ex, slot.picks.length, s, style, deload, repBump, ex.role, taper);
        item.volumeFactor = 0;        // corrective — never touches the muscle-volume ledger
        item.tag = 'mobility';        // renders through existing support-work handling
        item.secondaryGoal = goalId;  // provenance: which secondary goal added it
        slot.picks.push({ ex, effectiveRole: ex.role, item });
        slot.exUsed.add(ex.id);
        const cost = (parseSetCount(item.sets) * perSetMin(ex, ex.role)) || 2;
        slot.timeUsed += cost; budget -= cost;
        progress = true;
      }
    }
  }
}

// WP-43: the legacy fill finally explains itself (Art 14 applies to every athlete, not
// just the D11 cohort). An honest STYLE-derived objective — what this day is for and how
// its content was chosen — never a diagnosis claim (no diagnosis steers this path; the
// shared `source: 'style'` marker keeps that distinction machine-checkable).
function styleObjective(slot, style, ctx) {
  const focus = focusLabel(slot.muscleVol) || 'Full body';
  const f = focus.toLowerCase();
  const phase = ctx.taper ? 'taper — stay sharp' : ctx.deload ? 'deload — recover and absorb'
    : ctx.intent === 'peak' ? 'peak — sharpen' : ctx.intent === 'build' ? 'progress the intensity' : 'build the base';
  const BY_STYLE = {
    strength: {
      quality: 'maxStrength',
      purpose: `develop ${f} strength`,
      rationale: `Your strength goal leads with heavy main lifts; accessories keep each supporting muscle at its evidence-based weekly volume target. This ${focus} day: ${phase}.`,
    },
    bodybuilding: {
      quality: 'hypertrophy',
      purpose: `grow ${f} musculature`,
      rationale: `Your muscle-building goal programs every muscle toward its weekly volume target (MEV→MAV ramp across the block), favouring stretch-loaded work. This ${focus} day: ${phase}.`,
    },
    functional: {
      quality: 'strengthEndurance',
      purpose: `balanced ${f} conditioning`,
      rationale: `Your general-fitness goal spreads strength, work capacity and movement quality across the week. This ${focus} day: ${phase}.`,
    },
    sport: {
      quality: 'sportSupport',
      purpose: `sport-support ${f} strength`,
      rationale: `Gym work that supports your sport: the sport's emphasis template biases this ${focus} day's muscles, and selection fills each toward its weekly target. This day: ${phase}.`,
    },
  };
  const o = BY_STYLE[style] || BY_STYLE[styleFamily(style)] || BY_STYLE.functional;
  return { ...o, source: 'style' };
}

// Finalise a single slot: structure into supersets/fillers, then a session spec.
// Shared verbatim by the legacy fill path and the D11 sport path so BUILD output
// stays byte-identical no matter which path populated slot.picks.
function finaliseSlot(slot, style, ctx) {
  const deload = !!ctx.deload;
  // D11/category sessions carry their own D9 objective; every other session gets the
  // honest style-derived one (WP-43) so no athlete is left without a "why".
  if (!slot._objective) slot._objective = styleObjective(slot, style, ctx);
  const items = structureItems(slot.picks);
  shiftRpe(items, ctx.rpeOffset || 0, ctx.rpeFloor != null ? ctx.rpeFloor : 5);
  applyWeights(items, ctx.lifts || {}, ctx.level, ctx.bodyweight);
  // D12 estimator-driven creep (Phase 3 M2 — powerlifting T2 + hypertrophy T3 + olympic T4 +
  // sport gym-support T5; gated + no-op for every other cohort): a non-logging athlete's compound
  // load/reps and accessory reps advance week-over-week at the governed conservative rate. Runs
  // AFTER applyWeights so accessory (and hypertrophy-primary) loads are stamped at BASE reps
  // (double progression holds load while reps climb). roleByExId comes from the slot's picks
  // (effectiveRole survives structuring, keyed by stable exId).
  //
  // T5: a sport profile carries NO build discipline (ctx.discipline null), so map style==='sport'
  // to the synthetic 'sportSupport' creep discipline, and pass ctx.season (program.season) so the
  // creep is SEASON-shaped — off-season builds, pre/in/transition hit the maintenance ceiling
  // (progression.sport_support). Both the baseline AND the reflow reach finaliseSlot with the SAME
  // ctx.style + ctx.season (reflow threads gctx.style/gctx.season), so a neutral reflow reproduces
  // the identical creep — no season/calendar leak into the reflow (the M0 reflow≡baseline invariant).
  applyProgressionCreep(items, {
    discipline: ctx.discipline || (ctx.style === 'sport' ? 'sportSupport' : null),
    season: ctx.season || null,
    creepWeeks: ctx.creepWeeks || 0,
    deload: !!ctx.deload, taper: !!ctx.taper,
    roleByExId: new Map(slot.picks.map((p) => [p.ex.id, p.effectiveRole || p.ex.role])),
    loggedLiftKeys: ctx.loggedLiftKeys instanceof Set ? ctx.loggedLiftKeys : new Set(),
  });
  const total = Object.values(slot.muscleVol).reduce((a, b) => a + b, 0) || 1;
  const lower = (slot.muscleVol.quads || 0) + (slot.muscleVol.hamstrings || 0) +
                (slot.muscleVol.glutes || 0) + (slot.muscleVol.calves || 0);
  // A single rounded ESTIMATE from the REALISED work (sets × per-set minutes,
  // supersets already compressed in perSetMin), not the requested slot length —
  // so a packed 1-day session no longer mislabels 90 min of work as "~60 min" (F5).
  const duration = `~${Math.max(15, Math.round(slot.timeUsed / 5) * 5)} min`;
  return {
    discipline: 'gym',
    focus: [focusLabel(slot.muscleVol), qualityTag(slot.picks, style)].filter(Boolean).join(' '),
    duration,
    items,
    intensity: deload ? 'moderate' : 'hard',
    lowerBody: lower >= 0.4 * total,
    muscleVol: slot.muscleVol,   // realised per-muscle volume — lets the scheduler space same-muscle days
    axialLoad: Object.values(slot.picks).reduce((a, p) => a + axialOf(p.ex), 0),
    // Count of plyometric/ballistic picks — lets the scheduler keep plyo days
    // 48–72 h apart (H9 C7). Scheduling signal only; not emitted on sessions.
    plyoLoad: Object.values(slot.picks).reduce((a, p) => a + (p.ex.quality === 'power' ? 1 : 0), 0),
    ...(slot._objective ? { _objective: slot._objective } : {})
  };
}

export default { allocateGym, scheme };
