// D5 · Priority-Quality Selection. Pure: from the ranked limiting factors, pick a confidence-scaled
// set (k 1–3) of positive-magnitude priority qualities, each mapped to the adaptations that develop it
// (quality registry) and tracing to its limiter, respecting a compatibility guard.
import { getQuality } from '../../data/qualities.js';
import { areIncompatible } from '../../data/qualityCompatibility.js';

const K_BY_CONFIDENCE = { low: 1, moderate: 2, high: 3 };

export function prioritiseQualities(limitingFactors) {
  const ranked = (Array.isArray(limitingFactors) ? limitingFactors : []).filter((f) => f && f.magnitude > 0);
  if (ranked.length === 0) return [];
  const k = K_BY_CONFIDENCE[ranked[0].confidence] || 1;

  const selected = [];
  for (const f of ranked) {
    if (selected.length >= k) break;
    if (selected.some((s) => areIncompatible(s.qualityId, f.qualityId))) continue; // defer — conflicts with a higher priority
    const q = getQuality(f.qualityId);
    const adaptations = (q && Array.isArray(q.adaptations)) ? q.adaptations.slice() : [];
    selected.push({
      qualityId: f.qualityId,
      order: selected.length + 1,
      magnitude: f.magnitude,
      confidence: f.confidence,
      adaptations,
      tracesToLimiter: f.qualityId,
      rationale: `prioritising ${f.qualityId} (limiter magnitude ${f.magnitude}); develop via ${adaptations.join(', ') || 'n/a'}.`,
    });
  }
  return selected;
}
