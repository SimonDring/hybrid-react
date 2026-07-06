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

// Sport-experience prior (WP-38c): years of sport participation is a strong prior on the
// sport's DOMINANT qualities (specificity of adaptation — training-response specificity is
// L1 exercise-science consensus; the band values are seed estimates, confidence 'low' by
// construction, never a gate). Applies only to qualities whose demand importance meets
// dominantImportanceMin — participation trains what the sport demands most, nothing else.
export const SPORT_EXPERIENCE = {
  dominantImportanceMin: 0.7,
  base: { novice: 0.35, intermediate: 0.55, advanced: 0.75, highlyAdvanced: 0.88 },
};

export function sportExperiencePriorLevel(bandId) {
  return bandId != null ? (SPORT_EXPERIENCE.base[bandId] ?? null) : null;
}
