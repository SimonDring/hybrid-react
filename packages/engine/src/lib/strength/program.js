/**
 * program — resolves a user's GOAL into the parameters the gym engine programs to.
 * Single source of truth read by targets.js (volume) and the allocator (selection).
 *
 * Returns:
 *   { goalType, style, emphasis:{muscle:×}, volumeScalar, power, sport, season, level,
 *     exercisePriority: string[] }
 *   - exercisePriority  ordered exercise IDs that score ×1.35 in the allocator.
 *     Based on the strongest evidence for each goal (see design spec 2026-06-12).
 *   - discipline  present (== profile.discipline) ONLY when the profile opted into a build
 *     discipline (powerlifting/hypertrophy/olympic — WP-49 Plan 2 T2); absent for every legacy
 *     profile, and read by the allocator's discipline gate + Task 3's plan-level selection.
 */

import { deriveSeason } from '../plan/periodization.js';
import { getGymLevel } from '../Utils.js';
import { dosePrior } from '../priors.js';
import sports from '../../data/sportGymSupport/index.js';
import { sportLoadScalar } from './sportLoad.js';
import { availableEquip, LEVELS } from '../../data/strengthExercises.js';
import { resolveIntents } from './priorityIntents.js';
import { getDiscipline, resolveBuildDisciplineId } from '../../data/disciplines/index.js';
import * as SKB from '../sportKnowledge/index.js';
import { programmingForPhase } from '../sportKnowledge/seasonProgramming.js';
import { gymSupportOf } from '../sportKnowledge/gymSupport.js';
import { deriveRoundOutTargets } from '../plan/roundOutTargets.js';

// Sport emphasis vectors, priority-exercise lists and season volume scalars now live
// in the pluggable sport modules (src/data/sportGymSupport/) behind a registry — adding a sport
// no longer touches this file. Build-style priority lists now live in priorityIntents.js
// as intent chains with equipment-ordered fallbacks (BUILD_INTENTS), so a dumbbell
// athlete gets a curated list rather than a ~1-item stub.

// WP-37 (D12): the athlete's volume-tolerance prior scales the whole dose chain —
// plan generation AND the reflow read volumeScalar from here, so one seam covers
// both. Population default = 1 (byte-identical output); D16 writes real values later.
function volumeToleranceOf(profile) {
  const lp = profile && profile.athlete_model && profile.athlete_model.learnedPriors;
  return dosePrior('volumeTolerance', lp).value;
}

// A discipline's priorityLifts is already an ORDERED, curated list (competition lifts /
// core compounds first) — unlike BUILD_INTENTS there's no equipment-fallback chain per
// entry, so each lift becomes a single-candidate intent (mirrors how BUILD_INTENTS.bodybuilding/
// functional single-candidate intents are built above). resolveIntents then does the one
// piece of real work: drop lifts the athlete's equipment can't support, in order. `lvlNum` is
// accepted for interface symmetry with resolveIntents/the legacy call site — like the legacy
// path, competency (minLevelForPrimary) is enforced by the allocator at fill time, not here.
function resolveDisciplineLifts(disc, equip, lvlNum) {
  const intents = disc.priorityLifts.map(id => ({ intent: id, chain: [id] }));
  return resolveIntents(intents, equip, lvlNum);
}

// v1: no clean, general accessoryPatterns -> per-muscle emphasis mapping exists yet (the
// patterns are qualitative labels like 'weak_lift_variant', 'posterior_chain' — not muscle
// keys). Keep it minimal (YAGNI) until a real mapping is needed; volume.js/targets.js already
// carry the per-muscle MEV->MAV ledger regardless of emphasis.
function emphasisFromAccessoryPatterns() {
  return {};
}

export function resolveProgram(profile = {}) {
  // Programme resolution defaults an unset experience to 'intermediate'.
  const level = getGymLevel(profile, 'intermediate');
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const mod = sports.get(sport);   // undefined for an unknown sport → generic defaults
    // Season: an explicit override wins, else derive from event date / intent.
    const season = profile.sport_season || deriveSeason(profile) || 'off';
    // Run sub-disciplines (sprint/middle/long) override the module's defaults. An
    // unstated discipline defaults to 'middle' — the SAME generic-runner prior as the
    // SKB lookup (sportKnowledge skbSportIdFor): one athlete, one assumed discipline.
    const disc = sport === 'run' ? (profile.run_discipline || 'middle') : null;
    const byD = disc && mod && mod.byDiscipline ? mod.byDiscipline[disc] : null;
    // P1 (2026-07-09): the SKB's gymSupport section is the source for the season-invariant
    // gym-support data (emphasis fallback, priority, power) — relocated verbatim from the legacy
    // sportGymSupport modules, so reading it is byte-identical. `?? legacy` keeps un-relocated
    // sports (none, post-relocation) working; the legacy fallback is removed when the layer is deleted.
    const skbProfile = SKB.get(SKB.skbSportIdOf(profile));
    const gs = gymSupportOf(skbProfile);
    const sportPriority = (gs && gs.priorityExercises) || (byD && byD.priorityExercises) || (mod && mod.priorityExercises) || [];
    const equip = availableEquip(profile.access || []);
    const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
    const intents = sportPriority.map(id => ({ intent: id, chain: [id] }));
    const { list, byIntent } = resolveIntents(intents, equip, lvlNum);
    // Season-phased SKB (Approach A): a machine-consumable programming block for THIS phase is the
    // source of truth for per-phase emphasis + the round-out the split/allocator read. Absent → the
    // gymSupport (season-invariant) emphasis. Resolved off the SAME `season` this function computed.
    const programming = programmingForPhase(skbProfile, season);
    const legacyEmphasis = (gs && gs.emphasis) || (byD && byD.emphasis) || (mod && mod.emphasis) || {};
    // Round-out targets = what the SPORT inherently under-develops. Derive them from the sport's
    // most sport-SPECIFIC emphasis (its in-season / competition vector), NOT the current phase's
    // (which may be floored/balanced for the off-season — deriving from that would find no gaps).
    // Runner in-season chest 0.55 → upper gaps; swimmer in-season legs low → lower gaps.
    const sportSpecific = (programmingForPhase(skbProfile, 'in') || {}).muscleEmphasis || legacyEmphasis;
    return {
      goalType: 'sport', style: 'sport',
      emphasis: programming ? programming.muscleEmphasis : legacyEmphasis,
      volumeScalar: sportLoadScalar(profile, { season, mod, gymSupport: gs }) * volumeToleranceOf(profile),
      power: gs && typeof gs.power === 'boolean' ? gs.power : (mod ? !!mod.power : true), sport, season, level,
      exercisePriority: list, priorityByIntent: byIntent,
      programming: programming || null,
      roundOut: programming ? deriveRoundOutTargets(sportSpecific, programming.roundOut) : null
    };
  }

  // THE FLIP (WP-49 Plan 2 T6): every BUILD goal now runs off the DISCIPLINE engine — the legacy
  // volume-first strength_style path (BUILD_INTENTS) is retired. resolveBuildDisciplineId is the
  // single source of truth (shared with the diagnosis adapter, so program + diagnosis agree).
  const disc = getDiscipline(resolveBuildDisciplineId(profile)) || getDiscipline('hypertrophy');
  const equip = availableEquip(profile.access || []);
  const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
  const { list, byIntent } = resolveDisciplineLifts(disc, equip, lvlNum);
  return {
    goalType: 'build', style: disc.id, discipline: disc.id,
    emphasis: emphasisFromAccessoryPatterns(disc),
    volumeScalar: 1.0 * volumeToleranceOf(profile),
    power: (disc.demand.explosiveStrength || disc.demand.power || 0) >= 0.6,
    sport: null, season: null, level,
    exercisePriority: list, priorityByIntent: byIntent
  };
}

export default { resolveProgram };
