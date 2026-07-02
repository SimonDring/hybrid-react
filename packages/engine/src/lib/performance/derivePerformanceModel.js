// The Performance Model: capability-per-physical-quality with confidence, derived from the
// Athlete Model + knowledge. Independent of programme generation. demandProfile (from the SKB) and
// the diagnosis — limitingFactors (D4) + priorityAdaptations (D5) — are computed here as model
// output; they do not yet steer plan generation (that re-seating is a later sprint).
import { qualityIds } from '../../data/qualities.js';
import { estimateCapability } from './estimation.js';
import { buildDemandProfile } from './demandProfile.js';
import { diagnoseLimitingFactors } from './diagnose.js';
import { prioritiseQualities } from './prioritise.js';

export function derivePerformanceModel(model, asOf) {
  const m = model || {}; // never throw on a null/partial model
  const capabilities = qualityIds().map((q) => estimateCapability(q, m, asOf));
  const sc = m.sportingContext || {};
  const dp = sc.primarySport ? buildDemandProfile(sc.primarySport, sc.position || null) : [];
  const demandProfile = dp.length ? dp : null;
  const limitingFactors = diagnoseLimitingFactors(capabilities, demandProfile);
  const priorityAdaptations = prioritiseQualities(limitingFactors);
  return {
    athleteId: m.athleteId || null,
    derivedAt: asOf || null,
    capabilities,
    demandProfile,
    limitingFactors,
    priorityAdaptations,
  };
}
