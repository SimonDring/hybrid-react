// D4 · Limiting-Factor Diagnosis (the pivot). Pure: ranks the gap between the sport/position DEMAND
// (demandProfile) and the athlete's CAPABILITY per quality. A sport athlete always has a diagnosis
// (every demanded quality is ranked, incl. zero-magnitude).
//
// WP-36: the trainability + injuryRisk seams are ENRICHED (they were neutral =1.0):
//   trainability — the quality's responsiveness at the athlete's training-age band
//     (data/qualities.js trainabilityByBand; Rhea 2003 diminishing returns).
//   injuryRisk — a history of injury in a region raises the priority of the qualities
//     that protect it (data/regionQualityRisk.js; previous injury is the dominant
//     re-injury risk factor — Hägglund 2006, Fulton 2014).
// Both are magnitude MODIFIERS (re-rankers), never gates, and NEITHER touches
// confidence — confidence stays the weakest input (the capability estimate).
import { getQuality } from '../../data/qualities.js';
import { riskBoostFor } from '../../data/regionQualityRisk.js';

const round2 = (n) => Math.round(n * 100) / 100;

export function diagnoseLimitingFactors(capabilities, demandProfile, { trainingAgeBand = null, injuryHistory = [] } = {}) {
  if (!Array.isArray(demandProfile) || demandProfile.length === 0) return [];
  const capById = new Map((Array.isArray(capabilities) ? capabilities : []).map((c) => [c.qualityId, c]));

  const factors = demandProfile.map((d) => {
    const cap = capById.get(d.qualityId) || {};
    const capabilityLevel = typeof cap.level === 'number' ? cap.level : 0;
    const capabilityConfidence = cap.confidence || 'low';
    const demandImportance = typeof d.importance === 'number' ? d.importance : 0;
    const gap = Math.max(0, demandImportance - capabilityLevel);
    const q = getQuality(d.qualityId);
    const tb = q && q.trainabilityByBand;
    const trainability = (trainingAgeBand && tb && tb[trainingAgeBand] != null) ? tb[trainingAgeBand] : 1.0;
    const injuryRisk = riskBoostFor(d.qualityId, injuryHistory);
    const magnitude = round2(gap * demandImportance * trainability * injuryRisk);
    const confidence = capabilityConfidence; // demand is SKB-evidence-backed; capability is the weak link
    let rationale = gap > 0
      ? `demands ${d.qualityId} at ${round2(demandImportance)}; your level is ${round2(capabilityLevel)} (${cap.source || 'inferred'}) — gap ${round2(gap)}.`
      : `you meet the ${d.qualityId} demand (${round2(demandImportance)}); maintain it.`;
    if (gap > 0 && injuryRisk > 1) rationale += ` Your injury history raises the stakes here (×${round2(injuryRisk)}).`;
    if (gap > 0 && trainability !== 1.0 && trainingAgeBand) rationale += ` Responsiveness at your training age: ×${round2(trainability)}.`;
    return { qualityId: d.qualityId, magnitude, demandImportance: round2(demandImportance), capabilityLevel: round2(capabilityLevel), confidence, trainability: round2(trainability), injuryRisk: round2(injuryRisk), rationale };
  });

  factors.sort((a, b) => (b.magnitude - a.magnitude) || (a.qualityId < b.qualityId ? -1 : a.qualityId > b.qualityId ? 1 : 0));
  return factors;
}
