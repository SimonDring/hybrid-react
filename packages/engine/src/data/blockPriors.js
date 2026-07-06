/**
 * blockPriors — GOVERNED knowledge for D7 block objectives (WP-47). Per the Knowledge
 * Architecture, the numbers D7 reasons with are DATA here, not literals in blockObjective.js.
 * Versioned by KNOWLEDGE_SET_VERSION.
 *
 * Block length and deload rhythm come from `trajectory × recoverability`, NEVER from a
 * strength-style enum (the A9 compliance the EDS D7 requires). Recoverability modulates
 * the base length: a low recoveryRate prior shortens the block + pulls deloads earlier.
 *
 * Evidence level: L5 (periodisation heuristics — block lengths are not tightly evidenced;
 * confidence 'low', which is why D7 v0 is ADVISORY and steers nothing yet).
 * Source: classic block-periodisation practice (Issurin accumulation/transmutation/
 * realisation; Rønnestad in-season 2×/wk maintenance dose).
 */

// The season → dominant-objective template (EDS D7 §3 Step 1). The objective is NAMED
// from the D5 limiter at runtime; this fixes only the trajectory/shape per season.
export const SEASON_OBJECTIVE = {
  off:        { verb: 'develop',  trajectory: 'accumulation',  volumeShape: 'ramp', intensityShape: 'build' },
  pre:        { verb: 'convert',  trajectory: 'transmutation', volumeShape: 'hold', intensityShape: 'build' },
  in:         { verb: 'maintain', trajectory: 'maintenance',   volumeShape: 'hold', intensityShape: 'hold' },
  transition: { verb: 'restore',  trajectory: 'maintenance',   volumeShape: 'taper', intensityShape: 'low' },
};

// Base block length (weeks) per trajectory, before recoverability modulation.
export const BASE_LENGTH_WEEKS = {
  accumulation: 4,
  transmutation: 3,
  realisation: 2,
  maintenance: 3,
};

// Recoverability band → weeks adjustment applied to the base length (and to how early
// the deload lands). Bands come from the recoveryRate prior / training-age posture.
export const RECOVERABILITY_LENGTH_ADJ = { low: -1, moderate: 0, high: 1 };

// Deload cadence: a deload every N weeks within a block; low recoverability pulls it in.
export const DELOAD_CADENCE_WEEKS = { low: 3, moderate: 4, high: 4 };

// Map a recoveryRate prior value (≈1.0 population mean; <1 = recovers slower) to a band.
export function recoverabilityBand(recoveryRate) {
  if (recoveryRate == null) return 'moderate';
  if (recoveryRate < 0.9) return 'low';
  if (recoveryRate > 1.1) return 'high';
  return 'moderate';
}

export default { SEASON_OBJECTIVE, BASE_LENGTH_WEEKS, RECOVERABILITY_LENGTH_ADJ, DELOAD_CADENCE_WEEKS, recoverabilityBand };
