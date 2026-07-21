/**
 * selectInterventions — D11: choose the minimum-effective set of exercises that SATISFY a session's
 * D9/D10 requirement, ordered by transfer-per-fatigue in the EDS §34 value hierarchy, and STOP at the
 * session's fatigue budget (bank the rest — L5). Pure. Muscle-volume is a downstream ledger (MRV gate),
 * not the driver. Used by the allocator's SPORT branch; the caller supplies makePick (sets/contrib).
 *
 * §34 tiers: 1 primary-quality compound · 2 secondary-quality compound · 3 injury-prevention ·
 * 4 sport accessory · 5 lagging-muscle hypertrophy (within MEV/MRV) · 6 core · 7 mobility.
 */
import { EXERCISES } from '../../data/strengthExercises.js';
import { exerciseQualities } from '../../data/exerciseQualities.js';
import { QUALITY_MOVEMENT } from '../../data/qualityMovementMap.js';
import { SELECTION_SCORING } from '../../data/selectionScoring.js';
import { stimulusFactor } from '../strength/stimulus.js';
import { VOLUME_LANDMARKS } from '../../data/muscleVolume.js';
import kb from '../knowledge/kb.js';

// The §34 selection weights are governed knowledge (WP-15) — confidence tags per the
// H9 review §4 (the budget/transfer numbers are honest low-confidence heuristics;
// the pattern cap is the one uncontested rule).
const FATIGUE_BUDGET = kb.value('selection.fatigue_budget');
const { unit: UNIT, combineWeights: COMBINE } = kb.value('selection.fatigue_units');
const TRANSFER = kb.value('selection.transfer_weights');
const PATTERN_CAP = kb.value('selection.pattern_cap');

// H9 C4/F7: the 3-D fatigue vector combines by WEIGHTED MEAN, not max() — max()
// equalised five of eight exercise classes at 3 units, so a heavy squat, an Olympic
// pull and a leg extension all cost the same in the transfer-per-fatigue denominator.
// The mean preserves the neural/metabolic/mechanical model (a metabolic-only cost no
// longer masquerades as a full-CNS one); the weights are governed knowledge.
function fatigueScalar(ex) {
  const fc = exerciseQualities(ex.id)?.fatigueCost;
  if (!fc) return 2;
  const w = COMBINE;
  const num = (w.neural * (UNIT[fc.neural] || 1)) + (w.metabolic * (UNIT[fc.metabolic] || 1)) + (w.mechanical * (UNIT[fc.mechanical] || 1));
  return num / (w.neural + w.metabolic + w.mechanical);
}
// 'primary' | 'secondary' | null — does the exercise train the target quality (S5 tags)?
function trainsTarget(ex, target) {
  const q = exerciseQualities(ex.id)?.qualities?.find((x) => x.id === target);
  return q ? q.role : null;
}
const isCompound = (ex) => ex.role === 'primary' || (ex.role === 'accessory' && !['iso', 'core', 'calf', 'mobility'].includes(ex.pattern));

// The SKB library's transfer rating for an exercise: Map(id→rating) is the Sprint-9
// form; a legacy Set (membership only) falls back to the default rating; absent → null.
function skbRatingOf(skbIds, id) {
  if (!skbIds) return null;
  if (skbIds instanceof Map) return skbIds.has(id) ? (skbIds.get(id) ?? TRANSFER.skbDefaultRating) : null;
  return skbIds.has && skbIds.has(id) ? TRANSFER.skbDefaultRating : null;
}

// EDS §34 tier, or null if the exercise is off-target for this sport session.
export function tierOf(ex, target, sport, skbIds = null) {
  const role = trainsTarget(ex, target);
  if (isCompound(ex) && role === 'primary') return 1;
  if (isCompound(ex) && role === 'secondary') return 2;
  if ((ex.loadClass === 'health') && ex.pattern !== 'mobility') return 3;   // prehab
  // Ordering note: a SPORT-TAGGED movement is tier 4 (sport-demanded — legitimately selected), so a
  // sport-specific iso (e.g. nordic/calf/glute-med prehab) is chosen as sport work, NOT MEV-gated.
  // GENERIC hypertrophy isolations carry no sportTags → they fall through to tier 5 and ARE MEV-gated
  // (only added when a muscle is genuinely below MEV). Both tiers are still bounded by the MRV ledger.
  if (sport && ((ex.sportTags || []).includes(sport) || skbRatingOf(skbIds, ex.id) != null)) return 4;   // sport-demanded (catalogue tag or SKB library membership)
  if (ex.role === 'iso' && role) return 5;                                  // lagging-muscle hypertrophy (MEV-gated below)
  if (ex.pattern === 'core') return 6;
  if (ex.pattern === 'mobility') return 7;
  return null;
}
// transfer-per-fatigue (weights: selection.transfer_weights): the quality-match value,
// OR the SKB library's authored per-movement transfer rating ÷ divisor — whichever is
// better. The sport scientist's judgement (rating 1–10, per-entry provenance in the
// SKB) replaces the old blunt ×1.5 membership boost (Sprint 9 19a).
// The force→velocity continuum positions (M-SESS force-velocity-aware selection). The off-continuum
// classes (controlled-hypertrophy / endurance / isometric / mobility) are each their OWN quality's
// home — the quality tag already selects them — so they don't take part in the continuum distance.
const FV_CONTINUUM = { 'maximal-force': 0, 'strength-speed': 1, 'speed-strength': 2, ballistic: 3 };
const FV_SPAN = 3;
// 0..1 match between the target quality's IDEAL force-velocity (QUALITY_MOVEMENT) and the exercise's
// (exerciseQualities). 0.5 = NEUTRAL (no nudge) when either side is missing or off the continuum —
// so an un-tagged exercise is never penalised (additive-first). Both maps are seed → soft (Art 13).
export function forceVelocityMatch(ex, target) {
  const targetFV = QUALITY_MOVEMENT[target]?.forceVelocity;
  const exFV = exerciseQualities(ex.id)?.forceVelocity;
  if (!targetFV || !exFV) return 0.5;
  const pt = FV_CONTINUUM[targetFV], pe = FV_CONTINUUM[exFV];
  if (pt == null || pe == null) return targetFV === exFV ? 1 : 0.5; // off-continuum: exact match only
  return 1 - Math.abs(pe - pt) / FV_SPAN;
}

function valueOf(ex, target, skbIds, forceVelocityAware = false) {
  const role = trainsTarget(ex, target);
  const match = role === 'primary' ? TRANSFER.primary : role === 'secondary' ? TRANSFER.secondary : TRANSFER.support;
  const qualityValue = match / fatigueScalar(ex);
  const rating = skbRatingOf(skbIds, ex.id);
  const transferValue = rating != null ? (rating / TRANSFER.skbRatingDivisor) / fatigueScalar(ex) : 0;
  const value = Math.max(qualityValue, transferValue);
  // Force-velocity-aware nudge (flag-gated; default OFF ⇒ this branch never runs ⇒ byte-identical).
  // A small soft re-ordering WITHIN a quality toward the exercises whose force-velocity best fits the
  // target: perfect match ×(1+w/2), poor match ×(1−w/2). The quality tier still bounds it, so a
  // wrong-quality exercise can never win (Art 13 — the seed map steers at soft input only).
  if (forceVelocityAware) {
    const w = SELECTION_SCORING.forceVelocityWeight || 0;
    return value * (1 + w * (forceVelocityMatch(ex, target) - 0.5));
  }
  return value;
}

export function selectInterventions({ req, exercises = EXERCISES, equip, level = 0, levelName = 'intermediate', sport = null, skbIds = new Set(), ledger = {}, makePick, blockedNameRegexes = [], categoryIds = null, discipline = undefined, priorityIds = null, forceVelocityAware = false, positionPatterns = null, positionPreventionIds = null } = {}) {
  // Position priority-pattern nudge (Sprint 3 B2): a small ADDITIVE preference for candidates whose
  // movement pattern is on the athlete's SKB position list. NOT flag-gated (ships on) but never a
  // gate — additive, so it only re-orders WITHIN a quality tier (the sort below is tier-first),
  // and it touches only the score, never candidacy: the pool is identical with/without a position.
  // Empty/absent list ⇒ bonus is always 0 ⇒ byte-identical (every non-team-position plan).
  const positionSet = positionPatterns && positionPatterns.length ? new Set(positionPatterns) : null;
  const positionBonus = (ex) => (positionSet && positionSet.has(ex.pattern) ? (SELECTION_SCORING.positionPatternWeight || 0) : 0);
  // Position injury-prevention nudge (Sprint 3 B3): a second small ADDITIVE preference for candidates
  // that are a prevention exercise for one of the athlete's position's common injury regions (the ids
  // are resolved upstream from the position's SKB commonInjuryRegions via the injury taxonomy). Same
  // discipline as B2 — additive, tier-bounded, never a gate. Empty/absent set ⇒ always 0 ⇒ byte-identical.
  // Applied ONLY to CORRECTIVE/accessory candidates (tier ≥ 3): prevention is a preference among the
  // prehab/sport-accessory/core picks, NOT a lever on the session's PRIMARY anchor — a small prehab iso
  // must never leapfrog a tier-1/2 compound and hijack the day's dose quality (that would reshape the
  // session, not re-rank its prevention). Minimum effective intervention (Art 7).
  const preventionSet = positionPreventionIds && positionPreventionIds.length ? new Set(positionPreventionIds) : null;
  const preventionBonus = (ex, tier) => (preventionSet && tier >= 3 && preventionSet.has(ex.id) ? (SELECTION_SCORING.positionInjuryPreventionWeight || 0) : 0);
  const target = req?.objective?.targetQuality;
  const reqPatterns = new Set(req?.requirements?.movementPatterns || []);
  const contra = new Set((req?.requirements?.contraindicated || []).map((c) => c.pattern));
  const budget = FATIGUE_BUDGET[req?.objective?.fatigueBudget?.level] ?? 6;
  const weeklyDelivered = { ...(ledger.weeklyDelivered || {}) };
  const weeklyCeiling = ledger.weeklyCeiling || {};
  // WP-49 Plan 2 T4: discipline priority lifts anchor in their AUTHORED order (the discipline
  // module lists the competition lifts first, then variant/weak-point accessories) — NOT by
  // transfer-per-fatigue, which prefers a lower-fatigue partial-ROM variant (box squat, board
  // press) over the competition lift it assists. rank 0 = highest priority.
  const priorityRank = new Map((priorityIds || []).map((id, i) => [id, i]));

  // Eligible candidates, tiered + valued.
  const cand = [];
  for (const ex of exercises) {
    // WP-49 Plan 1: discipline-tagged lifts are only selectable when their discipline is active.
    if (ex.discipline && ex.discipline !== discipline) continue;
    if (equip && !equip.has(ex.equip)) continue;
    if ((ex.level ?? 0) > level) continue;
    if (contra.has(ex.pattern)) continue;
    // Name-level contraindication (WP-13): the pattern vocabulary is majority-vote
    // coarse — a hamstring-protect block on jumping doesn't contraindicate the whole
    // 'calf' pattern, but pogo jumps must still never be SELECTED for that athlete.
    if (blockedNameRegexes.length && blockedNameRegexes.some((r) => r.test(ex.name))) continue;
    // Category-led sessions (WP-20): the slot's SKB category assignment IS the
    // requirement — its movements are tier 1 and exempt from the quality-pattern
    // gate (their legality was already filtered above: equip/level/contra/name).
    // Mobility work never takes tier-1 standing (it stays a tier-7 finisher — a
    // foam roller must not anchor a session at a working dose).
    const isCategoryPick = categoryIds ? (categoryIds.has(ex.id) && ex.pattern !== 'mobility') : false;
    let tier = isCategoryPick ? 1 : tierOf(ex, target, sport, skbIds);
    if (tier == null) continue;
    // Quality-driver compounds must match a required movement pattern (D10).
    if (!isCategoryPick && (tier === 1 || tier === 2) && reqPatterns.size && !reqPatterns.has(ex.pattern)) continue;
    // WP-49 Plan 2 T4: discipline priority-lift ANCHORING. For the build-discipline cohort
    // (powerlifting/olympic/hypertrophy — where the gym IS the sport, Simon 2026-07-07), the
    // discipline's own competition/priority lifts must LEAD the session: an already-eligible
    // priority lift (it passed the tier + region gates above) is elevated to tier 0 so
    // squat/bench/deadlift, snatch + clean&jerk, and the main hypertrophy compounds anchor the
    // day (ORDERED by their authored priority rank) before accessories fill — and before their own
    // lower-fatigue variants. Without this, transfer-per-fatigue ranking surfaces cheap isolation
    // (a hypertrophy day is iso-primary tier-1, the bench only secondary tier-2) and lower-fatigue
    // partial-ROM variants over the competition lifts. Gated by priorityIds — the allocator passes
    // it ONLY when a discipline drives the plan, so sports + legacy stay byte-identical.
    const isPriority = priorityRank.has(ex.id);
    if (isPriority) tier = 0;
    // Within a category assignment the authored rating alone orders picks — the
    // transfer-per-fatigue division would let a cheap prehab move outrank the
    // pull-up the assignment exists for; the fatigue BUDGET still bounds totals.
    const baseValue = isPriority
      ? (1e6 - priorityRank.get(ex.id))   // authored order within tier 0 (rank 0 sorts first)
      : isCategoryPick
        ? (skbRatingOf(skbIds, ex.id) ?? TRANSFER.skbDefaultRating) / TRANSFER.skbRatingDivisor
        : valueOf(ex, target, skbIds, forceVelocityAware);
    // Position nudges apply to ALL three value paths (category-led team sports pick via the
    // rating path, not valueOf): a tiny additive lift, bounded by the tier sort. Both are a no-op on
    // the discipline priority path in practice — position implies a sport, disciplines don't set
    // priorityIds — and the ±0.1 could never reorder integer-ranked (1e6−rank) anchors anyway.
    const value = baseValue + positionBonus(ex) + preventionBonus(ex, tier);
    cand.push({ ex, tier, value });
  }
  cand.sort((a, b) => a.tier - b.tier || b.value - a.value || (a.ex.id < b.ex.id ? -1 : a.ex.id > b.ex.id ? 1 : 0));

  const picks = [];
  const patternCount = {};
  let fatigue = 0;
  for (const c of cand) {
    if (fatigue >= budget && picks.length >= 1) break;           // stopping rule — bank the rest (L5)
    // Variety: at most 2 exercises per movement pattern (EDS §34 primary + secondary compound). This
    // stops a session collapsing to 3+ variants of the target quality's one pattern (e.g. 3 deadlifts).
    if ((patternCount[c.ex.pattern] || 0) >= PATTERN_CAP) continue;
    const pick = makePick(c.ex);
    if (!pick || !(pick.sets > 0)) continue;
    const vf = stimulusFactor(c.ex, levelName);
    let exceeds = false;
    for (const m in pick.contrib) {
      if ((weeklyDelivered[m] || 0) + pick.sets * pick.contrib[m] * vf > (weeklyCeiling[m] ?? Infinity) + 0.01) { exceeds = true; break; }
    }
    if (exceeds) continue;                                        // MRV ledger gate
    if (c.tier === 5) {                                           // hypertrophy only to a genuinely lagging muscle
      const lagging = Object.keys(pick.contrib).some((m) => VOLUME_LANDMARKS[m] && (weeklyDelivered[m] || 0) < VOLUME_LANDMARKS[m].mev);
      if (!lagging) continue;
    }
    picks.push({ ...pick, tier: c.tier });
    patternCount[c.ex.pattern] = (patternCount[c.ex.pattern] || 0) + 1;
    fatigue += fatigueScalar(c.ex);
    for (const m in pick.contrib) weeklyDelivered[m] = (weeklyDelivered[m] || 0) + pick.sets * pick.contrib[m] * vf;
  }
  return picks;
}

export default { selectInterventions };
