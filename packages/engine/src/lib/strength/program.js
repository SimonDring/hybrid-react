/**
 * program — resolves a user's GOAL into the parameters the gym engine programs to.
 * Single source of truth read by targets.js (volume) and the allocator (selection).
 *
 * Returns:
 *   { goalType, style, emphasis:{muscle:×}, volumeScalar, power, sport, season, level,
 *     exercisePriority: string[] }
 *   - exercisePriority  ordered exercise IDs that score ×1.35 in the allocator.
 *     Based on the strongest evidence for each goal (see design spec 2026-06-12).
 */

import { deriveSeason } from '../plan/periodization.js';
import { getGymLevel } from '../Utils.js';
import skb, { normalizeSportId } from '../sportKnowledge/index.js';
import { DEFAULT_SEASON_VOLUME } from '../sportKnowledge/blocks.js';
import { availableEquip, LEVELS } from '../../data/strengthExercises.js';
import { BUILD_INTENTS, resolveIntents } from './priorityIntents.js';

// Sport emphasis vectors, priority-exercise lists and season volume scalars now live
// in the pluggable sport modules (src/lib/sports/) behind a registry — adding a sport
// no longer touches this file. Build-style priority lists now live in priorityIntents.js
// as intent chains with equipment-ordered fallbacks (BUILD_INTENTS), so a dumbbell
// athlete gets a curated list rather than a ~1-item stub.

export function resolveProgram(profile = {}) {
  // Programme resolution defaults an unset experience to 'intermediate'.
  const level = getGymLevel(profile, 'intermediate');
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;                                   // raw ID (e.g. 'run') — preserved for allocator/sportTags
    const gp = (skb.get(normalizeSportId(sport)) || {}).gymProgramming || null;   // null → generic fallback
    const season = profile.sport_season || deriveSeason(profile) || 'off';
    const disc = profile.run_discipline || null;
    const byD = disc && gp && gp.byDiscipline ? gp.byDiscipline[disc] : null;
    const sportPriority = (byD && byD.priorityExercises) || (gp && gp.priorityExercises) || [];
    const equip = availableEquip(profile.access || []);
    const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
    const intents = sportPriority.map(id => ({ intent: id, chain: [id] }));
    const { list, byIntent } = resolveIntents(intents, equip, lvlNum);
    return {
      goalType: 'sport', style: 'sport',
      emphasis: (byD && byD.emphasis) || (gp && gp.emphasis) || {},
      volumeScalar: ((gp && gp.seasonModifiers) || DEFAULT_SEASON_VOLUME)[season] ?? 1.0,
      power: gp ? !!gp.power : true, sport, season, level,
      exercisePriority: list, priorityByIntent: byIntent
    };
  }

  let style = profile.strength_style;
  if (!style) style = (profile.focus || []).includes('strength_physique') ? 'bodybuilding' : 'functional';
  if (!['strength', 'bodybuilding', 'functional'].includes(style)) style = 'strength';

  const emphasis = {};
  if (style === 'bodybuilding') { emphasis.shoulders = 1.1; emphasis.biceps = 1.1; emphasis.triceps = 1.1; }
  if (style === 'functional') { emphasis.core = 1.2; }

  const equip = availableEquip(profile.access || []);
  const lvlNum = LEVELS[level] ?? LEVELS.intermediate;
  const { list, byIntent } = resolveIntents(BUILD_INTENTS[style] || [], equip, lvlNum);
  return {
    goalType: 'build', style, emphasis, volumeScalar: 1.0, power: style === 'functional',
    sport: null, season: null, level,
    exercisePriority: list, priorityByIntent: byIntent
  };
}

export default { resolveProgram };
