// Measurable training-age bands. Replaces vague "beginner/intermediate" labels with
// year-derived bands, while keeping a mapping back to the legacy engine level so the
// live plan generator (which still reads experience.gym) is unaffected.
export const TRAINING_AGE_BANDS = [
  { id: 'novice',         maxYears: 1,        legacyLevel: 'beginner' },
  { id: 'intermediate',   maxYears: 3,        legacyLevel: 'intermediate' },
  { id: 'advanced',       maxYears: 5,        legacyLevel: 'advanced' },
  { id: 'highlyAdvanced', maxYears: Infinity, legacyLevel: 'advanced' },
];

export function bandForYears(years) {
  if (years == null || Number.isNaN(Number(years))) return null;
  const y = Number(years);
  for (const b of TRAINING_AGE_BANDS) if (y < b.maxYears) return b.id;
  return 'highlyAdvanced';
}

export function legacyLevelForBand(bandId) {
  const b = TRAINING_AGE_BANDS.find((x) => x.id === bandId);
  return b ? b.legacyLevel : 'intermediate';
}

// Legacy label → band. 'returning' has no clean year band; it maps to novice's band for
// prior lookups (the self-rated label itself is preserved separately for the engine).
export function bandForLegacyLevel(level) {
  switch (level) {
    case 'beginner': return 'novice';
    case 'returning': return 'novice';
    case 'advanced': return 'advanced';
    case 'intermediate':
    default: return 'intermediate';
  }
}
