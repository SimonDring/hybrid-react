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

// EDS §34 tier, or null if the exercise is off-target for this sport session.
export function tierOf(ex, target, sport) {
  const role = trainsTarget(ex, target);
  if (isCompound(ex) && role === 'primary') return 1;
  if (isCompound(ex) && role === 'secondary') return 2;
  if ((ex.loadClass === 'health') && ex.pattern !== 'mobility') return 3;   // prehab
  // Ordering note: a SPORT-TAGGED movement is tier 4 (sport-demanded — legitimately selected), so a
  // sport-specific iso (e.g. nordic/calf/glute-med prehab) is chosen as sport work, NOT MEV-gated.
  // GENERIC hypertrophy isolations carry no sportTags → they fall through to tier 5 and ARE MEV-gated
  // (only added when a muscle is genuinely below MEV). Both tiers are still bounded by the MRV ledger.
  if (sport && (ex.sportTags || []).includes(sport)) return 4;              // sport-demanded movement
  if (ex.role === 'iso' && role) return 5;                                  // lagging-muscle hypertrophy (MEV-gated below)
  if (ex.pattern === 'core') return 6;
  if (ex.pattern === 'mobility') return 7;
  return null;
}
// transfer-per-fatigue: quality match × SKB boost, ÷ fatigue (weights: selection.transfer_weights).
function valueOf(ex, target, skbIds) {
  const role = trainsTarget(ex, target);
  const match = role === 'primary' ? TRANSFER.primary : role === 'secondary' ? TRANSFER.secondary : TRANSFER.support;
  const boost = skbIds && skbIds.has(ex.id) ? TRANSFER.skbBoost : 1.0;
  return (match * boost) / fatigueScalar(ex);
}

export function selectInterventions({ req, exercises = EXERCISES, equip, level = 0, levelName = 'intermediate', sport = null, skbIds = new Set(), ledger = {}, makePick, blockedNameRegexes = [] } = {}) {
  const target = req?.objective?.targetQuality;
  const reqPatterns = new Set(req?.requirements?.movementPatterns || []);
  const contra = new Set((req?.requirements?.contraindicated || []).map((c) => c.pattern));
  const budget = FATIGUE_BUDGET[req?.objective?.fatigueBudget?.level] ?? 6;
  const weeklyDelivered = { ...(ledger.weeklyDelivered || {}) };
  const weeklyCeiling = ledger.weeklyCeiling || {};

  // Eligible candidates, tiered + valued.
  const cand = [];
  for (const ex of exercises) {
    if (equip && !equip.has(ex.equip)) continue;
    if ((ex.level ?? 0) > level) continue;
    if (contra.has(ex.pattern)) continue;
    // Name-level contraindication (WP-13): the pattern vocabulary is majority-vote
    // coarse — a hamstring-protect block on jumping doesn't contraindicate the whole
    // 'calf' pattern, but pogo jumps must still never be SELECTED for that athlete.
    if (blockedNameRegexes.length && blockedNameRegexes.some((r) => r.test(ex.name))) continue;
    const tier = tierOf(ex, target, sport);
    if (tier == null) continue;
    // Quality-driver compounds must match a required movement pattern (D10).
    if ((tier === 1 || tier === 2) && reqPatterns.size && !reqPatterns.has(ex.pattern)) continue;
    cand.push({ ex, tier, value: valueOf(ex, target, skbIds) });
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
