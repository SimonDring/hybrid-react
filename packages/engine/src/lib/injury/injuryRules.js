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

export default { getContraindications };
