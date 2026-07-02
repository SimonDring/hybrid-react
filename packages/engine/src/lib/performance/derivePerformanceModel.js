// The Performance Model: capability-per-physical-quality with confidence, derived from the
// Athlete Model + knowledge. Independent of programme generation. Diagnosis fields
// (demandProfile/limitingFactors/priorityAdaptations) are scaffolded here, computed later.
import { qualityIds } from '../../data/qualities.js';
import { estimateCapability } from './estimation.js';

export function derivePerformanceModel(model, asOf) {
  const m = model || {}; // never throw on a null/partial model
  const capabilities = qualityIds().map((q) => estimateCapability(q, m, asOf));
  return {
    athleteId: m.athleteId || null,
    derivedAt: asOf || null,
    capabilities,
    demandProfile: null,
    limitingFactors: [],
    priorityAdaptations: [],
  };
}
