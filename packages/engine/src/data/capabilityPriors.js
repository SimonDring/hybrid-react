// Population capability priors (0..1) per quality per training-age band. These are the
// documented ASSUMPTION used when a quality is unmeasured (low confidence by construction).
// Seed values — rise monotonically with training age; refine with real data later.
import { qualityIds } from './qualities.js';

const BAND_BASE = { novice: 0.25, intermediate: 0.50, advanced: 0.72, highlyAdvanced: 0.88 };

export const CAPABILITY_PRIORS = Object.fromEntries(
  qualityIds().map((q) => [q, { ...BAND_BASE }])
);

export function priorLevel(qualityId, bandId) {
  const block = CAPABILITY_PRIORS[qualityId];
  if (!block || block[bandId] == null) return 0.35;
  return block[bandId];
}
