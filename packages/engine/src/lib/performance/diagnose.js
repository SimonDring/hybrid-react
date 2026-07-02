// D4 · Limiting-Factor Diagnosis (the pivot). Pure: ranks the gap between the sport/position DEMAND
// (demandProfile) and the athlete's CAPABILITY per quality. A sport athlete always has a diagnosis
// (every demanded quality is ranked, incl. zero-magnitude). trainability + injuryRisk are neutral
// seams (=1.0) — typed + ready to enrich. Confidence = the weakest input (the capability estimate).
const round2 = (n) => Math.round(n * 100) / 100;

export function diagnoseLimitingFactors(capabilities, demandProfile) {
  if (!Array.isArray(demandProfile) || demandProfile.length === 0) return [];
  const capById = new Map((Array.isArray(capabilities) ? capabilities : []).map((c) => [c.qualityId, c]));

  const factors = demandProfile.map((d) => {
    const cap = capById.get(d.qualityId) || {};
    const capabilityLevel = typeof cap.level === 'number' ? cap.level : 0;
    const capabilityConfidence = cap.confidence || 'low';
    const demandImportance = typeof d.importance === 'number' ? d.importance : 0;
    const gap = Math.max(0, demandImportance - capabilityLevel);
    const trainability = 1.0; // neutral seam (enrich later from the quality registry)
    const injuryRisk = 1.0;   // neutral seam (enrich later from the injury system)
    const magnitude = round2(gap * demandImportance * trainability * injuryRisk);
    const confidence = capabilityConfidence; // demand is SKB-evidence-backed; capability is the weak link
    const rationale = gap > 0
      ? `demands ${d.qualityId} at ${round2(demandImportance)}; your level is ${round2(capabilityLevel)} (${cap.source || 'inferred'}) — gap ${round2(gap)}.`
      : `you meet the ${d.qualityId} demand (${round2(demandImportance)}); maintain it.`;
    return { qualityId: d.qualityId, magnitude, demandImportance: round2(demandImportance), capabilityLevel: round2(capabilityLevel), confidence, trainability, injuryRisk, rationale };
  });

  factors.sort((a, b) => (b.magnitude - a.magnitude) || (a.qualityId < b.qualityId ? -1 : a.qualityId > b.qualityId ? 1 : 0));
  return factors;
}
