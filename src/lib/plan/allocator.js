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

import { EXERCISES, LEVELS, availableEquip } from '../../data/strengthExercises.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import { muscleContribution } from './contributions.js';
import { parseSetCount } from './volume.js';
import { applyWeights } from '../liftProgression.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ---- rep / RPE / intensity scheme by style + phase (moved here from strength.js
// so the allocator owns the prescription and there's no import cycle) ----
function scheme(style, intent, deload, taper) {
  // Event taper (peaking): cut VOLUME hard (2 sets, lean accessories) but KEEP
  // intensity high — load/RPE stay near peak so the athlete sharpens, not detrains.
  // This is the opposite of a deload (which drops intensity too). Evidence: Bosquet
  // 2007 (endurance) + Travis & Mujika 2020 (maximal strength) — reduce volume
  // ~40–60%, maintain intensity. Taper takes precedence over deload.
  if (taper) {
    const t = {
      strength:     { main: '2 × 3', acc: '2 × 4', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
      bodybuilding: { main: '2 × 6', acc: '2 × 8', mainRpe: 'RPE 8', accRpe: 'RPE 8' },
      functional:   { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 8', accRpe: 'RPE 7' },
      sport:        { main: '2 × 3', acc: '2 × 5', mainRpe: 'RPE 8', accRpe: 'RPE 7' }
    };
    return t[style] || t.functional;
  }
  if (deload) {
    if (style === 'sport') return { main: '2 × 4', acc: '2 × 6', mainRpe: 'RPE 5', accRpe: 'RPE 5' };
    return { main: '2 × 5', acc: '2 × 8', mainRpe: 'RPE 6', accRpe: 'RPE 6' };
  }
  const table = {
    strength: {
      base:  { main: '4 × 5', acc: '3 × 8', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 4', acc: '3 × 6', mainRpe: 'RPE 8',   accRpe: 'RPE 7→8' },
      peak:  { main: '4 × 3', acc: '3 × 5', mainRpe: 'RPE 8→9', accRpe: 'RPE 8' }
    },
    bodybuilding: {
      base:  { main: '3 × 12', acc: '3 × 12', mainRpe: 'RPE 7',   accRpe: 'RPE 8' },
      build: { main: '4 × 10', acc: '3 × 12', mainRpe: 'RPE 8',   accRpe: 'RPE 8→9' },
      peak:  { main: '4 × 8',  acc: '3 × 10', mainRpe: 'RPE 8→9', accRpe: 'RPE 9' }
    },
    functional: {
      base:  { main: '3 × 8', acc: '3 × 10', mainRpe: 'RPE 7',   accRpe: 'RPE 7' },
      build: { main: '4 × 6', acc: '3 × 8',  mainRpe: 'RPE 7→8', accRpe: 'RPE 7' },
      peak:  { main: '3 × 5', acc: '3 × 6',  mainRpe: 'RPE 8',   accRpe: 'RPE 8' }
    },
    sport: {
      base:  { main: '3 × 5', acc: '3 × 8', mainRpe: 'RPE 7',   accRpe: 'RPE 6' },
      build: { main: '4 × 4', acc: '3 × 8', mainRpe: 'RPE 8',   accRpe: 'RPE 7' },
      peak:  { main: '4 × 3', acc: '3 × 6', mainRpe: 'RPE 8→9', accRpe: 'RPE 7→8' }
    }
  };
  return (table[style] || table.functional)[intent] || table.functional.base;
}

const isoStr = (style) => (style === 'bodybuilding' ? '3 × 12–15' : '3 × 12');
const coreStr = (light) => (light ? '2 × 30s' : '3 × 30s');
const mainNote = (deload, taper) =>
  taper ? 'taper — keep the load, just fewer sets. Arrive fresh.'
    : deload ? 'deload — ~65% load, leave 3+ reps in the tank'
      : '+small load when the last set is ≤ target RPE';

// Subtle, evidence-based sex tuning: women recover faster between sets and can
// absorb a little more rep volume on supporting work — nudge accessory/iso reps
// up a touch (heavy mains, holds, carries untouched). Mirrors strength.js.
const femaleRepBump = (sex) => (sex === 'female' ? 2 : 0);
function bumpReps(sets, d) {
  if (!d) return sets;
  return String(sets).replace(/×\s*(\d+(?:–\d+)?)(?!\s*[sm])/, (m, reps) =>
    '× ' + reps.replace(/\d+/g, n => String(Number(n) + d)));
}

// Working-set count an exercise contributes, by its role + the current scheme.
// effectiveRole overrides ex.role when minLevelForPrimary demotes the exercise.
function roleSetCount(ex, s, style, effectiveRole) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
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
  if (role === 'primary') return (style === 'strength' || style === 'sport') ? 180 : 120;
  if (role === 'iso' || ex.pattern === 'core' || ex.pattern === 'calf') return 60;
  return 75; // accessory compound — supersetted, so actual rest ≈ partner's work time
}

// Build the rendered item for a chosen exercise at a given position in the slot.
function makeItem(ex, idx, s, style, deload, repBump, effectiveRole, taper) {
  const role = effectiveRole != null ? effectiveRole : ex.role;
  const per = ex.unilateral ? ' ea.' : '';
  const num = LETTERS[Math.min(idx, LETTERS.length - 1)] + '1';
  const restSec = restForRole(ex, style, role);
  if (role === 'primary') {
    return { num, name: ex.name, sets: s.main + per, rpe: s.mainRpe, note: mainNote(deload, taper), restSec };
  }
  if (ex.pattern === 'core') {
    const hold = /plank|hold|dead bug|copenhagen|hollow|bird dog/i.test(ex.name);
    return { num, name: ex.name, sets: hold ? coreStr(deload || taper) : '3 × 12' + per, rpe: 'RPE 6', tag: 'mobility', note: '', restSec };
  }
  if (ex.pattern === 'calf' || role === 'iso') {
    const str = ex.pattern === 'calf' ? '3 × 12' : isoStr(style);
    return { num, name: ex.name, sets: bumpReps(str + per, repBump), rpe: s.accRpe, tag: ex.pattern === 'calf' ? 'mobility' : undefined, note: '', restSec };
  }
  return { num, name: ex.name, sets: bumpReps(s.acc + per, repBump), rpe: s.accRpe, note: '', restSec };
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
  return !shareMuscle(a, b);
}

// Turn a flat list of picks (each { ex, item }) into a structured session:
// heavy mains get a non-competing filler in their rest gap; remaining accessories
// pair into antagonist/non-competing supersets. Emits items renumbered A1/A2…
// with `superset` + `group` flags for rendering. Volume is unchanged.
function structureItems(picks) {
  const LET = 'ABCDEFGH';
  const mains = [], rest = [];
  picks.forEach(p => (p.ex.role === 'primary' ? mains : rest).push(p));
  const usedRest = new Set();
  const blocks = [];

  for (const m of mains) {
    let fi = -1;
    for (let i = 0; i < rest.length; i++) {
      if (!usedRest.has(i) && isFiller(rest[i].ex) && canPair(m.ex, rest[i].ex)) { fi = i; break; }
    }
    if (fi >= 0) { usedRest.add(fi); blocks.push([m, rest[fi]]); } else blocks.push([m]);
  }
  const rem = rest.map((p, i) => ({ p, i })).filter(x => !usedRest.has(x.i));
  const taken = new Set();
  for (let i = 0; i < rem.length; i++) {
    if (taken.has(i)) continue;
    let j = -1;
    for (let k = i + 1; k < rem.length; k++) {
      if (!taken.has(k) && canPair(rem[i].p.ex, rem[k].p.ex)) { j = k; break; }
    }
    if (j >= 0) { taken.add(i); taken.add(j); blocks.push([rem[i].p, rem[j].p]); }
    else { taken.add(i); blocks.push([rem[i].p]); }
  }

  // Keep the anchor (the slot's first pick — a fundamental compound for build, the
  // sport-priority opener for sport) as the session's first block, so a swimmer's
  // session leads with a pull rather than a press the role-ordering promoted.
  const anchorId = picks[0] && picks[0].ex.id;
  if (anchorId) {
    const ai = blocks.findIndex(blk => blk.some(p => p.ex.id === anchorId));
    if (ai > 0) blocks.unshift(blocks.splice(ai, 1)[0]);
  }

  const items = [];
  blocks.forEach((blk, bi) => {
    const g = LET[Math.min(bi, 7)];
    const paired = blk.length > 1;
    blk.forEach((p, pos) => {
      const restSec = (paired && pos > 0) ? 20 : p.item.restSec;
      items.push({ ...p.item, num: `${g}${pos + 1}`, group: g, superset: paired, restSec });
    });
  });
  return items;
}

// How hard to discourage volume that overshoots the remaining target. Higher = the
// actual allocated volume tracks the evidence-based target more tightly (less junk).
const OVERSHOOT_PENALTY = 0.1;

// Pick the single best exercise to add to a slot right now, or null when nothing
// left pays down a deficit (within the slot's remaining time). `targets` is the
// full per-muscle target (for urgency), `deficit` the running remainder.
function bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, fillersOnly = false, prioritySet = null) {
  let best = null, bestScore = 0.25; // threshold: ignore near-useless picks
  for (const ex of EXERCISES) {
    if (!slot.equip.has(ex.equip)) continue;
    if (ex.level > slot.level) continue;
    if (slot.exUsed.has(ex.id)) continue;
    if (fillersOnly && !isFiller(ex)) continue;   // filler pass: only light rest-gap work

    // Demote complex primaries to accessory when athlete is below minLevelForPrimary.
    const effectiveRole = (ex.minLevelForPrimary && ex.role === 'primary' &&
      slot.level < (LEVELS[ex.minLevelForPrimary] ?? 0)) ? 'accessory' : ex.role;

    // Cap at 2 primaries per slot — beyond that, extra heavy mains crowd out accessories
    // without adding meaningful variety, and make sessions uncomfortably long.
    if (!fillersOnly && effectiveRole === 'primary' &&
        slot.picks.filter(p => p.ex.role === 'primary' && p.effectiveRole === 'primary').length >= 2) continue;

    const sets = roleSetCount(ex, s, style, effectiveRole);
    if (sets <= 0) continue;
    const cost = sets * perSetMin(ex, effectiveRole);
    // Fillers slot into a main's rest gap, so they don't consume the time budget.
    if (!fillersOnly && slot.timeUsed > 0 && slot.timeUsed + cost > slot.budget + 2) continue;

    const contrib = muscleContribution(ex);
    // Never let a pick push any muscle past its weekly MRV ceiling (counting
    // synergist credit). This is the backstop that keeps high-frequency plans in
    // a recoverable range.
    let exceedsMRV = false;
    for (const m in contrib) {
      if ((weeklyDelivered[m] || 0) + sets * contrib[m] > (weeklyCeiling[m] ?? Infinity) + 0.01) { exceedsMRV = true; break; }
    }
    if (exceedsMRV) continue;

    let useful = 0, waste = 0;
    for (const m in contrib) {
      const cap = (perSlotCap[m] ?? Infinity) - (slot.delivered[m] || 0);
      const weeklyRoom = (weeklyCeiling[m] ?? Infinity) - (weeklyDelivered[m] || 0);
      const room = Math.min(Math.max(0, deficit[m] || 0), Math.max(0, cap), Math.max(0, weeklyRoom));
      // Urgency: a muscle far from its target (e.g. calves at 0%) gets weighted
      // up so single-muscle isolation can compete with multi-muscle compounds,
      // instead of always being crowded out and starved.
      const urgency = targets[m] > 0 ? Math.max(0, Math.min(1, (deficit[m] || 0) / targets[m])) : 0;
      useful += Math.min(sets * contrib[m], room) * (0.6 + 0.9 * urgency);
      // Volume this pick dumps PAST the remaining target — junk sets that overshoot
      // the evidence-based target (e.g. a squat piling quads onto a swimmer whose leg
      // target is already met). Penalised below so actual volume tracks the target.
      waste += Math.max(0, sets * contrib[m] - Math.max(0, deficit[m] || 0));
    }
    if (useful <= 0) continue;

    let score = useful;
    if (slot.patternsUsed.has(ex.pattern)) score *= 0.6;          // variety within a session
    if (slot.timeUsed < 5) score *= effectiveRole === 'primary' ? 1.2 : 0.85; // open on a compound
    if (ex.pattern === 'hpull' || ex.pattern === 'vpull') score *= 1.05; // posture pull-lean
    if (prioritySet && prioritySet.has(ex.id)) score *= 1.35;     // science-backed priority boost
    // Split FOCUS bias: steer this day toward the muscles its split assigns (an
    // Upper day prefers chest/back/shoulders, a Lower day quads/hams/glutes), so the
    // week reads as a curated split rather than identical full-body days. The shared
    // weekly deficit still controls TOTAL volume — this only reorders which day gets
    // what. A null focus (sport even-split, or a direct call) applies no bias.
    if (slot.focus) {
      let c = 0, inFocus = 0;
      for (const m in contrib) { c += contrib[m]; if ((slot.focus[m] || 0) > 0) inFocus += contrib[m]; }
      score *= 0.35 + 1.35 * (c > 0 ? inFocus / c : 1);
    }
    score -= OVERSHOOT_PENALTY * waste;                            // prefer picks that fit the remaining target
    score += (hash(ex.id) + weekNum + slot.idx) % 7 * 0.001;       // rotation tie-break

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
  if (lower >= upper) return 'Lower';
  // Upper-dominant: name the actual movement focus.
  if (push >= meaningful && pull >= meaningful) return 'Upper';
  return pull > push ? 'Pull' : 'Push';
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
  const s = scheme(style, intent, deload, taper);

  // Hard WEEKLY ceiling: the actual allocated volume for a muscle (counting the
  // synergist contributions that compounds credit) may never exceed its MRV across
  // the whole week. This is the no-overtraining backstop, shared across all slots
  // (so synergist-only volume — e.g. back from hinges — is capped too).
  const weeklyCeiling = {};
  for (const m in VOLUME_LANDMARKS) weeklyCeiling[m] = VOLUME_LANDMARKS[m].mrv;
  const weeklyDelivered = {};   // muscle → fractional sets delivered across ALL slots

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
    anchors: slot.anchors || null    // split day's opening pattern(s)
  }));

  // SHARED weekly deficit — the single volume controller. Each slot pays it down;
  // the split steers WHICH slot gets WHAT (anchors + focus bias), never the total.
  const deficit = { ...targets };

  const prioritySet = ctx.exercisePriority && ctx.exercisePriority.length
    ? new Set(ctx.exercisePriority) : null;

  // Fallback anchor: a fundamental compound, rotated so the week always covers
  // legs + push + pull no matter how few/short the sessions are.
  const FUNDAMENTAL = ['squat', 'hpush', 'hinge', 'hpull', 'vpush', 'lunge', 'vpull'];

  const place = (slot, pick) => {
    const { ex, sets, contrib, effectiveRole } = pick;
    slot.picks.push({
      ex, effectiveRole,
      item: makeItem(ex, slot.picks.length, s, style, deload, repBump, effectiveRole, taper)
    });
    slot.timeUsed += sets * perSetMin(ex, effectiveRole);
    slot.patternsUsed.add(ex.pattern);
    slot.exUsed.add(ex.id);
    for (const m in contrib) {
      const v = sets * contrib[m];
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
      let cands = EXERCISES.filter(e => e.pattern === pat && slot.equip.has(e.equip) && e.level <= slot.level);
      if (!cands.length) continue;
      const prim = cands.filter(e => e.role === 'primary');
      if (prim.length) cands = prim;
      const bar = cands.filter(e => e.equip === 'barbell');
      if (bar.length) cands = bar;
      return cands[(weekNum + slot.idx) % cands.length];
    }
    return null;
  };

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
      const fit = sportAnchors.filter(e => slot.equip.has(e.equip) && e.level <= slot.level);
      const focused = slot.focus
        ? fit.filter(e => { const c = muscleContribution(e); return Object.keys(c).some(m => (slot.focus[m] || 0) > 0); })
        : fit;
      const pool = focused.length ? focused : fit;
      if (pool.length) ex = pool[(weekNum + slot.idx) % pool.length];
    }
    if (!ex) ex = patternAnchor(slot, slot.anchors || [FUNDAMENTAL[slot.idx % FUNDAMENTAL.length]]);
    if (!ex && slot.anchors) ex = patternAnchor(slot, FUNDAMENTAL);   // split pattern unavailable → guarantee coverage
    if (!ex) continue; // equipment can't cover it — the fill pass populates the slot
    const anchorEffectiveRole = (ex.minLevelForPrimary && ex.role === 'primary' &&
      slot.level < (LEVELS[ex.minLevelForPrimary] ?? 0)) ? 'accessory' : ex.role;
    place(slot, { ex, sets: roleSetCount(ex, s, style, anchorEffectiveRole), contrib: muscleContribution(ex), effectiveRole: anchorEffectiveRole });
  }

  // 2) Round-robin fill: interleaving slots spreads each muscle across sessions.
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const slot of work) {
      if (slot.timeUsed >= slot.budget) continue;
      const pick = bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, false, prioritySet);
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
      const pick = bestExercise(slot, targets, maint, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, false, prioritySet);
      if (!pick) { go = false; break; }
      place(slot, pick);
      for (const m in pick.contrib) maint[m] -= pick.sets * pick.contrib[m];
    }
  }

  // Filler pass: add light, non-competing work (calves, core, rear delts, cuff)
  // into the rest gaps of the heavy lifts — extra volume "for free" toward the
  // weekly target. One filler per main (+1), placed against the biggest deficits.
  for (const slot of work) {
    const numMains = Math.max(1, slot.picks.filter(p => p.ex.role === 'primary').length);
    let added = 0;
    while (added < numMains + 1 && slot.timeUsed < slot.budget) {
      const pick = bestExercise(slot, targets, deficit, perSlotCap, weeklyCeiling, weeklyDelivered, s, style, weekNum, true, prioritySet);
      if (!pick) break;
      place(slot, pick);
      added++;
    }
  }

  // Finalise each slot: structure into supersets/fillers, then a session spec.
  return work.map(slot => {
    const items = structureItems(slot.picks);
    applyWeights(items, ctx.lifts || {});
    const total = Object.values(slot.muscleVol).reduce((a, b) => a + b, 0) || 1;
    const lower = (slot.muscleVol.quads || 0) + (slot.muscleVol.hamstrings || 0) +
                  (slot.muscleVol.glutes || 0) + (slot.muscleVol.calves || 0);
    // A single rounded ESTIMATE from the REALISED work (sets × per-set minutes,
    // supersets already compressed in perSetMin), not the requested slot length —
    // so a packed 1-day session no longer mislabels 90 min of work as "~60 min" (F5).
    const duration = `~${Math.max(15, Math.round(slot.timeUsed / 5) * 5)} min`;
    return {
      discipline: 'gym',
      focus: focusLabel(slot.muscleVol),
      duration,
      items,
      intensity: deload ? 'moderate' : 'hard',
      lowerBody: lower >= 0.4 * total
    };
  });
}

export default { allocateGym, scheme };
