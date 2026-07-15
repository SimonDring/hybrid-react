// src/lib/injury/injuryRules.js
// Pure functions — no side effects.
// Contraindication rules per body_part_key + severity + rehab_phase.
//
// The per-region contraindication patterns + prevention protocols now live in the
// data-driven injury profiles (./profiles.js, schema ./_schema.js); this module is the
// thin accessor that applies the severity policy and returns the phase's blocked
// patterns. Matching is on exercise NAME (session items carry only a name), so the
// returned `blockedPatterns` are RegExp — behaviour is unchanged by the migration.

import { getProfile } from './index.js';
import { contraindicationCell } from './contraindicationVocab.js';

/**
 * Get blocked exercise name patterns for a body part, severity, and phase.
 *   severity <= 1 → no blocks (train with caution)
 *   severity >= 4 → force 'protect'-level blocks regardless of declared phase
 * @returns {{ blockedPatterns: RegExp[], forcedPhase: string }}
 */
export function getContraindications(body_part_key, severity = 3, rehab_phase = 'protect') {
  const profile = getProfile(body_part_key);
  if (!profile) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 1: train with caution, no blocks.
  if (severity <= 1) return { blockedPatterns: [], forcedPhase: rehab_phase };

  // Severity 4+: force protect-level blocks regardless of phase.
  const effectivePhase = severity >= 4 ? 'protect' : rehab_phase;
  const c = profile.contraindications;
  const patterns = c[effectivePhase] || c.protect || [];

  return { blockedPatterns: patterns, forcedPhase: effectivePhase };
}

/**
 * The ID / MOVEMENT-PATTERN contraindication for a body part, severity, and phase (TR-10).
 * The id-keyed twin of getContraindications: it applies the SAME severity policy (≤1 → no
 * blocks, ≥4 → force `protect`) but returns the exercise-identity vocabulary instead of
 * name-regexes, so the join is rename-proof and catches novel exercises by their pattern.
 *   patternSet   — Set of contraindicated movement patterns (block ANY exercise of the pattern)
 *   extraIdSet   — Set of contraindicated exercise ids whose pattern is not itself blocked
 *   clearedIdSet — Set of ids kept un-blocked despite a blocked pattern (compatibility snapshot)
 * Blocked ⇔  extraIdSet.has(id) || (patternSet.has(pattern) && !clearedIdSet.has(id))
 * @returns {{ patternSet: Set<string>, extraIdSet: Set<string>, clearedIdSet: Set<string>, forcedPhase: string }}
 */
export function getContraindicatedExercises(body_part_key, severity = 3, rehab_phase = 'protect') {
  const empty = () => ({ patternSet: new Set(), extraIdSet: new Set(), clearedIdSet: new Set(), forcedPhase: rehab_phase });
  if (!getProfile(body_part_key)) return empty();

  // Severity 1: train with caution, no blocks.
  if (severity <= 1) return empty();

  // Severity 4+: force protect-level blocks regardless of phase.
  const effectivePhase = severity >= 4 ? 'protect' : rehab_phase;
  const cell = contraindicationCell(body_part_key, effectivePhase);
  return {
    patternSet: new Set(cell.patterns),
    extraIdSet: new Set(cell.extraIds),
    clearedIdSet: new Set(cell.clearedIds),
    forcedPhase: effectivePhase,
  };
}

export default { getContraindications, getContraindicatedExercises };
