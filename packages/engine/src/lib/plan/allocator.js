/**
 * allocator — the "fill" half of the target → ledger → fill model, and the heart
 * of the adaptive gym engine.
 *
 * It takes a weekly per-muscle SET-VOLUME target (from src/lib/strength/targets.js)
 * and a set of session "slots" — each with a time budget and available equipment —
 * and produces concrete gym sessions that spend the available time on the volume
 * that matters most, progressing toward the target.
 *
 * Why this replaces fixed splits: a real busy professional trains an irregular
 * number of times, for irregular lengths, with whatever kit is to hand (full gym
 * one week, hotel dumbbells the next). A fixed "upper/lower ×2" split can't bend
 * to that. An allocator can: give it 2 slots or 5, 30 min or 75, barbells or just
 * bands, and it fills each slot with the highest-value work toward the same goal.
 *
 * How it fills (a transparent greedy search, not a black box):
 *  • Track a running per-muscle DEFICIT (how far each muscle is from its target).
 *  • Go round-robin across the slots; each round, each slot picks the ONE
 *    exercise that pays down the biggest remaining deficits per set — which
 *    naturally favours compound lifts (they hit several muscles at once) and
 *    spreads a muscle across ≥2 sessions (frequency) instead of dumping it all
 *    in one. Equipment + experience gate the choices; movement variety, a
 *    posture-friendly pull lean, and weekly rotation break ties.
 *  • Stop a slot when its time budget is spent. Stop overall when the deficits
 *    are paid or the slots are full — whatever is left is the honest gap (too
 *    few/short sessions to hit the ideal), which the UI surfaces rather than hides.
 *
 * Pure function → reproducible sessions → stable completion keys.
 *
 * NOTE: no circular import. strength.js calls THIS; this imports only data +
 * liftProgression + volume helpers, never strength.js.
 */

import { EXERCISES, LEVELS, availableEquip, CORE_HOLDS } from '../../data/strengthExercises.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { SELECTION_SCORING as SS } from '../../data/selectionScoring.js';
import { muscleContribution } from './contributions.js';
import { parseSetCount } from './volume.js';
import { applyWeights } from '../liftProgression.js';
import { stimulusFactor } from '../strength/stimulus.js';
import { AXIAL_SESSION_CAP, axialOf } from './axial.js';
import { selectInterventions, tierOf } from './selectInterventions.js';
import { deriveSessionObjective, assignTargetQualities, competencyAdjustedTarget, constraintAdjustedTarget } from '../session/sessionObjective.js';
import { DOSE_SCHEMES, STYLE_SCHEME_BRIDGE, DEFAULT_SCHEME_KEY, LIGHT_STRENGTH_MAINS, POWER_DOSE, REST_SECONDS, ISO_SETS, CORE_SETS, REACTIVE_LIMITS, doseForQuality } from '../../data/doseSchemes.js';
import { deriveMovementRequirements } from '../session/movementRequirements.js';
import { regionOf, hypertrophyRegionOf } from '../session/sessionSpecs.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// The internal per-session ceiling — replaces any user-picked session length.
// ~6–10 hard sets/muscle (the within-session stimulus cap) ≈ 75 min of productive
// work. The allocator stops a slot here; volume ÷ day count sizes the rest.
export const SESSION_CEILING_MIN = 75;

// Sport sessions stay lean to leave recovery for the sport: cap fatiguing (working)
// items per session. The factor-0 prehab/mobility finisher is exempt — it's
// non-fatiguing — and priority prehab is picked first, so it survives the cap.
export const SPORT_WORK_ITEM_CAP = 6;

// AXIAL_SESSION_CAP (the within-session spinal-load budget) + axialOf live in
// ./axial.js, shared with the scheduler + de-spine pass so they can't diverge.

// CNS / recovery demand of an exercise — drives what may be supersetted and how much
// rest it gets. An explicit `cns` on the exercise wins; otherwise it's derived: heavy
// compounds + power work are 'high' (straight sets, full rest); axially-loaded
// accessories are 'moderate' (may pair only with light work); isolation / core / calf /
// health work is 'low' (the stuff that belongs in a superset). This is why a heavy
// Good morning / RDL no longer gets crammed into a light lift's rest gap.
function cnsTier(ex) {
  if (!ex) return 'low';
  if (ex.cns) return ex.cns;
  if (ex.role === 'primary' || axialOf(ex) >= 2 || ex.quality === 'power') return 'high';
  if (axialOf(ex) >= 1) return 'moderate';
  if (ex.role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf' || ex.loadClass === 'health') return 'low';
  return 'moderate';
}

const EX_BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

// Which cohorts the diagnosis actually STEERS (the D11/category-led gate) — the ONE
// predicate shared by the allocator's branch and PlanGenerator's meta.diagnosis emission
// (WP-42a display honesty: a plan never ships a diagnosis it ignored). Extend the sets
// here when a cohort flips (WP-48 team sports, WP-49 build) and both stay in lockstep.
const D11_SPORTS = new Set(['run', 'cycle']);
export function diagnosisSteers({ style, sport, priorityQualities = [], categoryPlan = null, discipline = null } = {}) {
  // WP-49 (Plan 2 T3): a build-discipline profile (powerlifting/hypertrophy/olympic) with a
  // non-empty diagnosis steers like the D11 sports — same treatment, different cohort key
  // (discipline instead of sport). Checked BEFORE the style==='sport' branch since a
  // discipline profile's style is the discipline id itself (program.js), not 'sport'.
  if (discipline && priorityQualities.length > 0) return true;
  // Rating-based (run/cycle) needs a non-empty diagnosis; category-led needs a plan —
  // categoryPlanFor() is itself gated by CATEGORY_LED (swim + the team sports + soccer,
  // WP-48), so a present categoryPlan IS the flip decision for that sport.
  return style === 'sport' && ((priorityQualities.length > 0 && D11_SPORTS.has(sport))
    || !!categoryPlan);
}

// Supportive finisher: round a short session out toward FINISHER_TARGET_MIN with
// sport/goal-appropriate factor-0 work (prehab/mobility/core-activation), but never
// add more than FINISHER_CAP_MIN — a session is never mostly prehab.
const FINISHER_TARGET_MIN = 30;
const FINISHER_CAP_MIN = 15;

// Goal's primary training quality, derived from the style — drives the soft
// strength↔hypertrophy steer. Only the BUILD styles steer; sport + functional are
// balanced (their selection is already governed by sport priority + emphasis, and
// steering sport toward strength nudges it into synergist-volume overshoot).
function primaryQuality(style) {
  if (style === 'strength') return 'strength';
  if (style === 'bodybuilding') return 'hypertrophy';
  return null;   // sport + functional = balanced (no steer)
}
// Map the build style to its goalTag value (bodybuilding is tagged 'hypertrophy').
const styleGoalTag = (style) => (style === 'bodybuilding' ? 'hypertrophy' : style);
// Hard gate: a power-quality exercise is allowed only when the goal wants power AND
// it's contextually relevant (in the resolved priority list, or goal-tagged).
function powerAllowed(ex, power, prioritySet, style) {
  if ((ex.quality || 'general') !== 'power') return true;
  if (!power) return false;
  return (prioritySet && prioritySet.has(ex.id)) || (ex.goalTags || []).includes(styleGoalTag(style));
}
// Soft steer: prefer on-quality work, de-prioritise the off-quality strength/
// hypertrophy pair; general + (gated-in) power stay neutral.
function qualityMult(ex, goalPrimary) {
  const q = ex.quality || 'general';
  if (!goalPrimary || q === 'general' || q === 'power') return 1.0;
  return q === goalPrimary ? 1.15 : 0.7;
}
// Lengthened-position bias: nudge a hypertrophy plan toward stretch-loaded work
// (more growth at long muscle lengths — Maeo/Pedrosa/Schoenfeld). Tunable; a
// tie-breaker weaker than the priority boost, so it never overrides curation.
function stretchMult(ex, goalPrimary) {
  return (ex.stretchBias && goalPrimary === 'hypertrophy') ? 1.12 : 1.0;
}

// ---- rep / RPE / intensity scheme — the DOSE MODEL is governed knowledge now
// (data/doseSchemes.js, WP-14): schemes keyed by (scheme key, phase) with per-block
// provenance; this is a thin lookup through the style→scheme bridge, byte-identical
// to the old style-keyed tables (golden masters prove it). Taper keeps intensity
// (peaking — Bosquet 2007; Travis & Mujika 2020); deload drops it (recovery). ----
function scheme(style, intent, deload, taper, light = false) {
  const q = DOSE_SCHEMES[STYLE_SCHEME_BRIDGE[style] || DEFAULT_SCHEME_KEY];
  if (taper) return q.taper;
  if (deload) return q.deload;
  let out = q[intent] || DOSE_SCHEMES[DEFAULT_SCHEME_KEY].base;
  // Max-strength mains need a barbell — light-equipment override (see the module).
  if (style === 'strength' && light) {
    const h = LIGHT_STRENGTH_MAINS[intent] || LIGHT_STRENGTH_MAINS.fallback;
    out = { ...out, main: h.main, acc: h.acc };
  }
  return out;
}

const isoStr = (style) => (style === 'bodybuilding' ? ISO_SETS.bodybuilding : ISO_SETS.default);
const coreStr = (light) => (light ? CORE_SETS.light : CORE_SETS.default);
const mainNote = (deload, taper) =>
  taper ? 'taper — keep the load, just fewer sets. Arrive fresh.'
    : deload ? 'deload — ~65% load, leave 3+ reps in the tank'
      : '+small load when the last set is ≤ target RPE';

// Power / plyometric prescription (quality:'power' exercises — jumps, pogos,
// cleans, sled). Dosed by QUALITY, not role: low reps, sub-maximal RPE (quality
// not failure), full recovery — and exempt from the female rep bump. This is how
// jumps/cleans develop rate-of-force-development instead of being run as a
// fatiguing 3×10 accessory.
const POWER_SETS = POWER_DOSE.sets;
const POWER_RPE = POWER_DOSE.rpe;
const POWER_REST = POWER_DOSE.restSec;
const POWER_NOTE = POWER_DOSE.note;

// Clamp the rep number(s) in a "sets" string to a per-exercise ceiling. Some
// movements have a hard rep ceiling far below the generic accessory/iso scheme —
// a Nordic curl is ~3–6 reps, not the 12–14 the iso scheme (plus female bump)
// would prescribe. Only applied to exercises that declare `repCap`; leaves
// time/hold rows ("2 × 30s") untouched.
function capReps(setsStr, cap) {
  if (!cap) return setsStr;
  return setsStr.replace(/×\s*(\d+(?:[–-]\d+)?)/, (m, reps) => {
    const nums = reps.split(/[–-]/).map(n => Math.min(Number(n), cap));
    const uniq = [...new Set(nums)];
    return '× ' + (uniq.length > 1 ? uniq.join('–') : String(uniq[0]));
  });
}

// Raise the rep number(s) up to a per-exercise floor. A machine vertical-pull
// (lat pulldown) is not a maximal-strength movement — it shouldn't inherit the
// 3–5-rep "main" scheme; a floor keeps it in a sane strength-endurance range.
function floorReps(setsStr, floor) {
  if (!floor) return setsStr;
  return setsStr.replace(/×\s*(\d+(?:[–-]\d+)?)/, (m, reps) => {
    if (/[sm]/.test(reps)) return m; // time/hold rows — leave alone
    const nums = reps.split(/[–-]/).map(n => Math.max(Number(n), floor));
    const uniq = [...new Set(nums)];
    return '× ' + (uniq.length > 1 ? uniq.join('–') : String(uniq[0]));
  });
}

// Subtle, evidence-based sex tuning: women recover faster between sets and can
// absorb a little more rep volume on supporting work — nudge accessory/iso reps
// up a touch (heavy mains, holds, carries untouched). Mirrors strength.js.
const femaleRepBump = (sex) => (sex === 'female' ? 2 : 0);
function bumpReps(sets, d) {
  if (!d) return sets;
  return String(sets).replace(/×\s*(\d+(?:–\d+)?)(?!\s*[sm])/, (m, reps) =>
    '× ' + reps.replace(/\d+/g, n => String(Number(n) + d)));
}

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

// Working-set count an exercise contributes, by its role + the current scheme.
// effectiveRole overrides ex.role when minLevelForPrimary demotes the exercise.
function roleSetCount(ex, s, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (ex.quality === 'power') return parseSetCount(POWER_SETS);
  if (role === 'primary') return parseSetCount(s.main);
  if (ex.pattern === 'core') return 3;
  if (ex.pattern === 'calf') return parseSetCount('3 × 12');
  if (role === 'iso') return parseSetCount(isoStr(style));
  return parseSetCount(s.acc);   // accessory
}

// Rest prescription per role and style — surfaced as `restSec` on every item.
// The UI reads this field to show a static label and seed the rest timer.
// Superset B exercises get their value overridden to 20s in structureItems().
function restForRole(ex, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  if (ex.quality === 'power') return POWER_REST;
  if (role === 'primary') return (style === 'strength' || style === 'sport') ? REST_SECONDS.primaryHeavy : REST_SECONDS.primaryOther;
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return REST_SECONDS.isoCoreCalf;
  // Accessory compound. A GENUINE high-CNS accessory (heavy RDL / Good morning / Rack
  // pull) now runs as a STRAIGHT SET, so it needs real rest — not the 75s that assumed
  // it would be tucked into another lift's rest gap; moderate accessories sit between.
  // A *demoted* primary (a barbell main programmed light for a less-experienced athlete)
  // keeps the lighter accessory rest — it's deliberately not loaded like a heavy main.
  if (ex.role === 'accessory') {
    const tier = cnsTier(ex);
    if (tier === 'high') return REST_SECONDS.accessoryHighCns;
    if (tier === 'moderate') return REST_SECONDS.accessoryModerateCns;
  }
  return REST_SECONDS.accessoryDefault;
}

// Build the rendered item for a chosen exercise at a given position in the slot.
function makeItem(ex, idx, s, style, deload, repBump, effectiveRole, taper) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  const per = ex.unilateral ? ' ea.' : '';
  const num = LETTERS[Math.min(idx, LETTERS.length - 1)] + '1';
  const restSec = restForRole(ex, style, role);
  const cap = (str) => {
    const floored = ex.repFloor ? floorReps(str, ex.repFloor) : str;
    return ex.repCap ? capReps(floored, ex.repCap) : floored;
  };
  // Power / plyometric work: dosed by quality (low reps, full recovery), never
  // the role scheme and never the female rep bump. Deload/taper still thins it
  // via the allocator's slot budget; the prescription itself stays explosive.
  if (ex.quality === 'power') {
    return { num, exId: ex.id, name: ex.name, sets: POWER_SETS + per, rpe: POWER_RPE, note: POWER_NOTE, restSec };
  }
  if (role === 'primary') {
    return { num, exId: ex.id, name: ex.name, sets: cap(s.main) + per, rpe: s.mainRpe, note: s.mainNote || mainNote(deload, taper), restSec };
  }
  if (ex.pattern === 'core') {
    const hold = CORE_HOLDS.has(ex.id) || /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, exId: ex.id, name: ex.name, sets: hold ? coreStr(deload || taper) : '3 × 12' + per, rpe: 'RPE 6', note: '', restSec };
  }
  if (ex.pattern === 'calf' || role === 'iso') {
    const str = ex.pattern === 'calf' ? '3 × 12' : isoStr(style);
    return { num, exId: ex.id, name: ex.name, sets: cap(bumpReps(str + per, repBump)), rpe: s.accRpe, note: '', restSec };
  }
  return { num, exId: ex.id, name: ex.name, sets: cap(bumpReps(s.acc + per, repBump)), rpe: s.accRpe, note: '', restSec };
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

// ---- session structuring: supersets, antagonist pairs, rest-gap fillers ----
// Two exercises share a muscle? (then they compete — don't pair them).
function shareMuscle(a, b) {
  const ca = muscleContribution(a), cb = muscleContribution(b);
  for (const m in ca) if (cb[m]) return true;
  return false;
}
// A light "filler" that can slot into a heavy lift's rest without compromising it.
function isFiller(ex) { return ex.role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf'; }
// Can these be supersetted? Not two heavy mains; never overlapping muscles (so
// antagonist push↔pull, or compound↔unrelated isolation, but not squat↔deadlift).
function canPair(a, b) {
  if (a.id === b.id) return false;
  if (a.role === 'primary' && b.role === 'primary') return false;
  // Don't pair two CNS-demanding moves. A 'moderate' accessory may only superset with
  // 'low' isolation/core work (high-CNS work is straight-set and never reaches here),
  // so a heavy lift's rest is never spent on another heavy lift.
  if (cnsTier(a) !== 'low' && cnsTier(b) !== 'low') return false;
  return !shareMuscle(a, b);
}

// Turn a flat list of picks (each { ex, item }) into a structured session:
// heavy mains get a non-competing filler in their rest gap; remaining accessories
// pair into antagonist/non-competing supersets. Emits items renumbered A1/A2…
// with `superset` + `group` flags for rendering. Volume is unchanged.
function structureItems(picks) {
  const LET = 'ABCDEFGH';
  // The session OPENS on its anchor (picks[0]) — its headline lift. The anchor, every
  // primary, and every high-CNS accessory run as STRAIGHT SETS (their own block, full
  // rest); only lower-CNS work is eligible to be supersetted below. This keeps heavy /
  // neurally-demanding work — including a sport's lead lift — out of supersets, instead
  // of cramming a light isolation into its rest gap (which isn't "free" recovery).
  const anchorId = picks[0] && picks[0].ex.id;
  const isStraightSet = (p) => p.ex.role === 'primary' || cnsTier(p.ex) === 'high' || p.ex.id === anchorId;
  const mains = [], rest = [];
  picks.forEach(p => (isStraightSet(p) ? mains : rest).push(p));
  let blocks = [];

  // Core + health/mobility work is never supersetted into another block — it forms
  // its own singleton blocks so it can be sequenced cleanly at the end of the session.
  const isSupportive = (p) => p.ex.loadClass === 'health' || p.ex.pattern === 'core' || (p.item && p.item.tag === 'mobility');

  for (const m of mains) blocks.push([m]);

  // Pair the remaining (lower-CNS) work into antagonist / non-competing supersets,
  // preferring the LIGHTEST compatible partner — so it's the isolation/core work that
  // gets compressed into a rest gap, never two demanding moves crammed together.
  const cnsWeight = { low: 0, moderate: 1, high: 2 };
  const rem = rest.map((p, i) => ({ p, i }));
  const taken = new Set();
  for (let i = 0; i < rem.length; i++) {
    if (taken.has(i)) continue;
    if (isSupportive(rem[i].p)) { taken.add(i); blocks.push([rem[i].p]); continue; }
    let j = -1, bestW = Infinity;
    for (let k = i + 1; k < rem.length; k++) {
      if (taken.has(k) || isSupportive(rem[k].p)) continue;
      if (!canPair(rem[i].p.ex, rem[k].p.ex)) continue;
      const w = cnsWeight[cnsTier(rem[k].p.ex)] ?? 1;
      if (w < bestW) { bestW = w; j = k; }
    }
    if (j >= 0) { taken.add(i); taken.add(j); blocks.push([rem[i].p, rem[j].p]); }
    else { taken.add(i); blocks.push([rem[i].p]); }
  }

  // Sequence the session soundly: explosive/plyometric work first (performed
  // fresh), then heavy compound primaries, then accessories, then isoCore, then
  // health/mobility. A block ranks by its MOST important pick (min class), so a
  // heavy main paired with a calf/core filler still leads — it no longer sorts
  // behind the lone accessories it used to (the old rank took the MAX class, which
  // demoted any main+filler block). Volume is unchanged; this only reorders.
  const pickClass = (p) => {
    const role = p.effectiveRole || p.ex.role;
    if (p.ex.quality === 'power') return 0;                                  // plyo/ballistic — lead when fresh
    if (p.ex.loadClass === 'health' || (p.item && p.item.tag === 'mobility')) return 4; // prehab/mobility — last
    if (p.ex.pattern === 'core' || p.ex.loadClass === 'isoCore') return 3;   // trunk / iso filler
    if (role === 'primary') return 1;                                        // heavy compound
    return 2;                                                                // accessory
  };
  const blockRank = (blk) => Math.min(...blk.map(pickClass));

  // The session OPENS on its anchor (picks[0]) — a sport-priority lift for sport, the
  // split's fundamental compound for build. Pin it first (by design — sessions lead
  // with their most important/sport-specific work), then order the REMAINING blocks
  // power → primary → accessory → isoCore → health, so a heavy main is never buried
  // behind the lone accessory/core filler it used to sort behind.
  let anchorBlock = null;
  if (anchorId) {
    const ai = blocks.findIndex(blk => blk.some(p => p.ex.id === anchorId));
    if (ai >= 0) anchorBlock = blocks.splice(ai, 1)[0];
  }
  const ordered = blocks
    .map((blk, i) => ({ blk, i, r: blockRank(blk) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.blk);
  blocks = anchorBlock ? [anchorBlock, ...ordered] : ordered;

  const items = [];
  blocks.forEach((blk, bi) => {
    const g = LET[Math.min(bi, 7)];
    const paired = blk.length > 1;
    blk.forEach((p, pos) => {
      const restSec = (paired && pos > 0) ? REST_SECONDS.supersetB : p.item.restSec;
      items.push({ ...p.item, num: `${g}${pos + 1}`, group: g, superset: paired, restSec });
    });
  });
  return items;
}

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

// How hard to discourage volume that overshoots the remaining target. Higher = the
// actual allocated volume tracks the evidence-based target more tightly (less junk).
const OVERSHOOT_PENALTY = 0.1;

// Pick the single best exercise to add to a slot right now, or null when nothing
// left pays down a deficit (within the slot's remaining time). `targets` is the
// full per-muscle target (for urgency), `deficit` the running remainder.
function bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, fillersOnly = false, prioritySet = null, levelName = 'intermediate', power = false, goalPrimary = null, demotePress = false, weeklyExCount = {}, priorityFor = () => false, blockedRx = [], discipline = undefined) {
  let best = null, bestScore = 0.25; // threshold: ignore near-useless picks
  for (const ex of EXERCISES) {
    // NB: ex.discipline is the strength-discipline TAG (olympic/powerlifting), distinct from the session-spec 'discipline' modality field (gym/rehab).
    // WP-49 Plan 1: discipline-tagged lifts are only selectable when their discipline is active.
    if (ex.discipline && ex.discipline !== discipline) continue;
    if (!slot.equip.has(ex.equip)) continue;
    if (ex.level > slot.level) continue;
    if (slot.exUsed.has(ex.id)) continue;
    if (blockedRx.length && blockedRx.some(r => r.test(ex.name))) continue;  // injury-contraindicated (WP-40)
    if (!powerAllowed(ex, power, prioritySet, style)) continue;   // power gate
    if (fillersOnly && !isFiller(ex)) continue;   // filler pass: only light rest-gap work
    // Endurance sports: at most one horizontal-press slot per session (low transfer).
    if (demotePress && ex.pattern === 'hpush' && slot.picks.some(p => p.ex.pattern === 'hpush')) continue;

    const effectiveRole = effectiveRoleOf(ex, slot.level, demotePress);

    // Cap at 2 primaries per slot — beyond that, extra heavy mains crowd out accessories
    // without adding meaningful variety, and make sessions uncomfortably long.
    if (!fillersOnly && effectiveRole === 'primary' &&
        slot.picks.filter(p => p.ex.role === 'primary' && p.effectiveRole === 'primary').length >= (style === 'strength' ? 3 : 2)) continue;

    const sets = roleSetCount(ex, s, style, effectiveRole);
    if (sets <= 0) continue;
    const cost = sets * perSetMin(ex, effectiveRole);
    // Fillers slot into a main's rest gap, so they don't consume the time budget.
    if (!fillersOnly && slot.timeUsed > 0 && slot.timeUsed + cost > slot.budget + 2) continue;

    const contrib = muscleContribution(ex);
    // Stimulus credit: a set's counted volume scales by load class × level (a bird
    // dog ≈ 0 for an advanced athlete; health work = 0). The factor applies to ALL
    // the volume math so selection, the MRV ceiling and the count stay coherent.
    const vf = stimulusFactor(ex, levelName);
    // Never let a pick push any muscle past its weekly MRV ceiling (counting
    // synergist credit). This is the backstop that keeps high-frequency plans in
    // a recoverable range.
    let exceedsMRV = false;
    for (const m in contrib) {
      if ((weeklyDelivered[m] || 0) + sets * contrib[m] * vf > (weeklyCeiling[m] ?? Infinity) + 0.01) { exceedsMRV = true; break; }
    }
    if (exceedsMRV) continue;

    let useful = 0, waste = 0;
    for (const m in contrib) {
      const eff = sets * contrib[m] * vf;   // stimulus-weighted volume this pick delivers
      const cap = (perSlotCap[m] ?? Infinity) - (slot.delivered[m] || 0);
      const weeklyRoom = (weeklyCeiling[m] ?? Infinity) - (weeklyDelivered[m] || 0);
      const room = Math.min(Math.max(0, deficit[m] || 0), Math.max(0, cap), Math.max(0, weeklyRoom));
      // Urgency: a muscle far from its target (e.g. calves at 0%) gets weighted
      // up so single-muscle isolation can compete with multi-muscle compounds,
      // instead of always being crowded out and starved.
      const urgency = targets[m] > 0 ? Math.max(0, Math.min(1, (deficit[m] || 0) / targets[m])) : 0;
      useful += Math.min(eff, room) * (0.6 + 0.9 * urgency);
      // Volume this pick dumps PAST the remaining target — junk sets that overshoot
      // the evidence-based target (e.g. a squat piling quads onto a swimmer whose leg
      // target is already met). Penalised below so actual volume tracks the target.
      waste += Math.max(0, eff - Math.max(0, deficit[m] || 0));
    }
    if (useful <= 0) continue;

    let score = useful;
    if (slot.patternsUsed.has(ex.pattern)) score *= SS.repeatPatternMult;   // variety within a session
    if (slot.timeUsed < 5) score *= effectiveRole === 'primary' ? SS.openCompound.primary : SS.openCompound.other; // open on a compound
    if (ex.pattern === 'hpull' || ex.pattern === 'vpull') score *= SS.posturePullLean; // posture pull-lean
    if (priorityFor(ex.id, slot.axialLoad)) score *= SS.axialPreferredMult;     // intent's axial-preferred member
    score *= qualityMult(ex, goalPrimary);                        // goal-quality steer
    score *= stretchMult(ex, goalPrimary);                        // lengthened-position bias (hypertrophy)
    // Cross-session variety: an accessory/iso already used in earlier sessions this
    // week is gently penalised so the SAME filler (cable fly, woodchop, prone raise)
    // doesn't recur every day. Primaries + power are exempt — repeating the main
    // lifts / plyos session-on-session IS the progressive-overload signal.
    if (effectiveRole !== 'primary' && ex.quality !== 'power') {
      const used = weeklyExCount[ex.id] || 0;
      if (used) score *= Math.pow(SS.crossSessionRepeatBase, used);
    }
    // Split FOCUS bias: steer this day toward the muscles its split assigns (an Upper
    // day prefers chest/back/shoulders, a Lower day quads/hams/glutes), so the week
    // reads as a curated split rather than identical days. The multiplier only ever
    // SUPPRESSES off-focus work (≤1, never a boost) — it reorders which day gets what
    // without lowering the pick threshold, so the shared weekly deficit still controls
    // total volume (no overshoot). A null focus (direct call) applies no bias.
    if (slot.focus) {
      let c = 0, inFocus = 0;
      for (const m in contrib) { c += contrib[m]; if ((slot.focus[m] || 0) > 0) inFocus += contrib[m]; }
      // Region-pure focused days (build/strength only): a candidate whose work is
      // ENTIRELY off-focus (e.g. a chest press on a Lower day) is EXCLUDED, not just
      // suppressed — so a focused day stays in its region instead of absorbing
      // cross-region weekly-deficit spillover. Full-body days weight every trained
      // muscle > 0, so nothing is ever fully off-focus and nothing is excluded.
      // SPORT is exempt: sport splits deliberately thread the sport's priority work
      // through every session (a swimmer leads even a lower day with pull work).
      if (style !== 'sport' && c > 0 && inFocus === 0) continue;
      score *= SS.focusFloor + SS.focusSpan * (c > 0 ? inFocus / c : 1);
    }
    score -= OVERSHOOT_PENALTY * waste;                            // prefer picks that fit the remaining target
    score += (hash(ex.id) + weekNum + slot.idx) % 7 * SS.rotationJitter;   // rotation tie-break (rotates near-equal picks)

    if (score > bestScore) { bestScore = score; best = { ex, sets, contrib, effectiveRole }; }
  }
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
  const goal = ctx.style;                        // strength | bodybuilding | functional | sport
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
  const style = ['strength', 'bodybuilding', 'functional', 'sport'].includes(ctx.style) ? ctx.style : 'functional';
  const deload = !!ctx.deload;
  const taper = !!ctx.taper;
  const intent = ctx.intent || 'base';
  const weekNum = ctx.weekNum || 1;
  const repBump = femaleRepBump(ctx.sex);
  const levelName = ctx.level || 'intermediate';
  const power = !!ctx.power;
  const goalPrimary = primaryQuality(style);
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
  // Sport-only: count fatiguing (working, factor>0) picks in a slot, and whether it's
  // at the lean cap. The factor-0 supportive finisher is added later and stays exempt.
  const workCount = (slot) => slot.picks.filter(p => (p.item?.volumeFactor ?? 1) > 0).length;
  const overSportCap = (slot) => style === 'sport' && workCount(slot) >= SPORT_WORK_ITEM_CAP;

  // Hard WEEKLY ceiling: the actual allocated volume for a muscle (counting the
  // synergist contributions that compounds credit) may never exceed its MRV across
  // the whole week. This is the no-overtraining backstop, shared across all slots
  // (so synergist-only volume — e.g. back from hinges — is capped too).
  const weeklyCeiling = {};
  for (const m in VOLUME_LANDMARKS) weeklyCeiling[m] = VOLUME_LANDMARKS[m].mrv;
  const weeklyDelivered = {};   // muscle → fractional sets delivered across ALL slots
  const weeklyExCount = {};     // exercise id → sessions it's appeared in this week (variety penalty)

  // Cap how much of a muscle's weekly target lands in ONE slot, so volume spreads
  // across sessions (frequency). With 2+ slots, no slot gets more than ~half a
  // muscle; never more than ~half its MRV (the "no-monster" backstop).
  const freq = Math.min(2, Math.max(1, slots.length));
  const perSlotCap = {};
  for (const m in targets) {
    const even = Math.ceil((targets[m] || 0) / freq) || Infinity;
    const lm = VOLUME_LANDMARKS[m];
    const ceiling = lm ? Math.ceil(lm.mrv / 2) : Infinity;
    perSlotCap[m] = Math.min(even, ceiling);
  }

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
    delivered: {},   // muscle → sets delivered IN THIS SLOT (for perSlotCap)
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
  // Boost test used in scoring: is `id` the axial-preferred member of its intent now?
  const priorityFor = (id, slotAxial) => {
    const intent = idToIntent.get(id);
    if (!intent) return prioritySet ? prioritySet.has(id) : false; // sport/no-intent fallback
    return preferredMember(priorityByIntent.get(intent) || [], slotAxial, AXIAL_SESSION_CAP) === id;
  };

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

  // ── D11 (SPORT): value-ordered selection satisfying each session's D9/D10 requirement, stopping at
  //    the fatigue budget. Build keeps the legacy fill below. Muscle-volume stays the MRV ledger.
  //    Scoped to run + cycle for now: their gym need (posterior-chain/power durability) matches the
  //    diagnosis-driven target well. Swim is deferred — a swimmer isn't strength-limited, so its
  //    diagnosis points to mobility (→ robustness), which crowds out the upper-pull/shoulder work a
  //    swimmer actually needs; swim keeps the legacy fill until the model surfaces that need.
  const priorityQualities = ctx.priorityQualities || [];
  // Swim is CATEGORY-LED (WP-20): it joins the D11 path only when its SKB category
  // plan is present (ctx.categoryPlan, built by the caller from the swimming
  // library) — the plan's per-session assignments replace the quality rotation
  // that mis-served it in Sprint 8.
  const categoryPlan = ctx.categoryPlan || null;
  const useD11 = diagnosisSteers({ style, sport: ctx.sport, priorityQualities, categoryPlan, discipline: ctx.discipline || null });
  if (useD11) {
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
      // Simon's decision (2026-07-07): a region split is only warranted where the day count makes
      // one sensible, and hypertrophy is the one build goal that needs it — with Push/Pull/Legs at
      // higher day counts, so pressing and pulling get their own days (hypertrophyRegionOf splits
      // Push/Pull, which regionOf collapses to 'upper').
      const region = ctx.discipline === 'hypertrophy' ? hypertrophyRegionOf(slot.focusLabel) : 'full';
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
      slot.scheme = doseForQuality(targetQuality, intent, { deload, taper }) || s;
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
          if (p.ex.quality === 'power') {
            if (footContacts + powerContacts > contactCeiling) continue;
            footContacts += powerContacts;
          }
          place(slot, p);
        }
      }
    });
    // Short D11 sessions get the same supportive finisher as the legacy path (factor-0
    // prehab — §34 tiers 6–7; the fatigue budget governs WORKING sets, not support work).
    addSupportiveFinishers(work, ctx, levelName, s, style, deload, taper, repBump);
    // Finalise sport slots through the SAME structuring/weights/duration machinery, then return.
    return work.map(slot => finaliseSlot(slot, style, ctx));
  }

  // 1) Anchor each slot. SPORT plans lead with the sport's priority work (a swimmer
  //    opens on a pull, a sprinter on a power lift); when the day has a focus we
  //    prefer a priority lift that hits it. BUILD plans open on the split day's
  //    fundamental pattern (an Upper day on a press/row, a Lower day on a squat/
  //    hinge). Anything uncovered falls back to the rotating fundamental anchor.
  const sportAnchors = style === 'sport'
    ? (ctx.exercisePriority || []).map(id => EXERCISES.find(e => e.id === id)).filter(e => e && !isFiller(e))
    : [];
  for (const slot of work) {
    let ex = null;
    if (sportAnchors.length) {
      const fit = sportAnchors.filter(e => slot.equip.has(e.equip) && e.level <= slot.level && !isBlockedEx(e));
      const focused = slot.focus
        ? fit.filter(e => { const c = muscleContribution(e); return Object.keys(c).some(m => (slot.focus[m] || 0) > 0); })
        : fit;
      const pool = focused.length ? focused : fit;
      if (pool.length) ex = pool[(weekNum + slot.idx) % pool.length];
    }
    if (!ex) ex = patternAnchor(slot, slot.anchors || [FUNDAMENTAL[slot.idx % FUNDAMENTAL.length]]);
    if (!ex && slot.anchors) ex = patternAnchor(slot, FUNDAMENTAL);   // split pattern unavailable → guarantee coverage
    if (!ex) continue; // equipment can't cover it — the fill pass populates the slot
    const anchorEffectiveRole = effectiveRoleOf(ex, slot.level, demotePress);
    place(slot, { ex, sets: roleSetCount(ex, s, style, anchorEffectiveRole), contrib: muscleContribution(ex), effectiveRole: anchorEffectiveRole });
  }

  // 2) Round-robin fill: interleaving slots spreads each muscle across sessions.
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const slot of work) {
      if (slot.timeUsed >= slot.budget || overSportCap(slot)) continue;
      const pick = bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, false, prioritySet, levelName, power, goalPrimary, demotePress, weeklyExCount, priorityFor, blockedRx, ctx.discipline);
      if (!pick) continue;
      place(slot, pick);
      progressed = true;
    }
  }

  // Fallback: if a slot ended up empty (e.g. tiny remaining target on a reflow),
  // give it light maintenance work against the full target so no session is blank.
  for (const slot of work) {
    if (slot.picks.length) continue;
    const maint = { ...targets };
    let go = true;
    while (go && slot.timeUsed < slot.budget) {
      const pick = bestExercise(slot, targets, maint, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, false, prioritySet, levelName, power, goalPrimary, demotePress, weeklyExCount, priorityFor, blockedRx, ctx.discipline);
      if (!pick) { go = false; break; }
      place(slot, pick);
      for (const m in pick.contrib) maint[m] -= pick.sets * pick.contrib[m];
    }
  }

  // Filler pass: top up with ONE light, non-competing move (calves/core/rear delt/cuff)
  // into a rest gap — but only when a muscle is still meaningfully short of its weekly
  // target. This used to add up to (mains+1) fillers chasing every small remainder,
  // which tacked a string of seemingly-random exercises onto the end of a session.
  // One targeted filler, real gap only.
  const FILLER_MIN_GAP = 0.33;   // a muscle must still be ≥ a third of its target short
  for (const slot of work) {
    if (slot.timeUsed >= slot.budget || overSportCap(slot)) continue;
    const pick = bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, true, prioritySet, levelName, power, goalPrimary, demotePress, weeklyExCount, priorityFor, blockedRx, ctx.discipline);
    if (!pick) continue;
    const realGap = Object.keys(pick.contrib).some(m => (targets[m] || 0) > 0 && (deficit[m] || 0) >= FILLER_MIN_GAP * targets[m]);
    if (!realGap) continue;
    place(slot, pick);
  }

  addSupportiveFinishers(work, ctx, levelName, s, style, deload, taper, repBump);

  // Finalise each slot: structure into supersets/fillers, then a session spec.
  return work.map(slot => finaliseSlot(slot, style, ctx));
}

// Readiness intensity honesty (WP-10): shift a rendered 'RPE n' by the caller's
// rpeOffset, floored (knowledge: recovery.intensity_policy). Applied BEFORE
// applyWeights, so the suggested kg drop coherently via the inverse-Epley %1RM —
// one lever, no second load model. The pure generator passes no offset (0) and is
// byte-identical.
function shiftRpe(items, rpeOffset, rpeFloor) {
  if (!rpeOffset) return items;
  for (const it of items) {
    const m = /^RPE\s+(\d+(?:\.\d+)?)/i.exec(it.rpe || '');
    if (!m) continue;
    const n = Number(m[1]);
    if (n <= rpeFloor) continue;   // already at/below the floor — never raise, never cut further
    it.rpe = `RPE ${Math.max(rpeFloor, n + rpeOffset)}`;
  }
  return items;
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
  const o = BY_STYLE[style] || BY_STYLE.functional;
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
