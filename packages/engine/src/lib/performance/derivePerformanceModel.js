// The Performance Model: capability-per-physical-quality with confidence, derived from the
// Athlete Model + knowledge. Independent of programme generation. The demandProfile is
// populated from the SKB (buildDemandProfile); limitingFactors/priorityAdaptations remain
// scaffolded here (diagnosis, computed in a later sprint).
import { qualityIds } from '../../data/qualities.js';
import { estimateCapability } from './estimation.js';
import { buildDemandProfile } from './demandProfile.js';

export function derivePerformanceModel(model, asOf) {
  const m = model || {}; // never throw on a null/partial model
  const capabilities = qualityIds().map((q) => estimateCapability(q, m, asOf));
  const sc = m.sportingContext || {};
  const dp = sc.primarySport ? buildDemandProfile(sc.primarySport, sc.position || null) : [];
  return {
    athleteId: m.athleteId || null,
    derivedAt: asOf || null,
    capabilities,
    demandProfile: dp.length ? dp : null,
    limitingFactors: [],
    priorityAdaptations: [],
  };
}
