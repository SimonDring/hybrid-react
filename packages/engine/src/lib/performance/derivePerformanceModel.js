// The Performance Model: capability-per-physical-quality with confidence, derived from the
// Athlete Model + knowledge. Independent of programme generation. demandProfile (from the SKB) and
// the diagnosis — limitingFactors (D4) + priorityAdaptations (D5) — are computed here as model
// output; they do not yet steer plan generation (that re-seating is a later sprint).
import { qualityIds } from '../../data/qualities.js';
import { estimateCapability, bandForModel } from './estimation.js';
import { buildDemandProfile } from './demandProfile.js';
import { goalDemandProfile } from '../../data/goalDemand.js';
import { disciplineDemandFor, demandVectorToProfile, disciplineIdFor } from './disciplineDemand.js';
import { diagnoseLimitingFactors } from './diagnose.js';
import { prioritiseQualities } from './prioritise.js';

export function derivePerformanceModel(model, asOf) {
  const m = model || {}; // never throw on a null/partial model
  const sc = m.sportingContext || {};
  // Demand first: capability estimation reads it for the sport-experience prior (WP-38c).
  // The sport's SKB profile, or — for build goals (WP-42a, EDS D2's goal-as-sport) — the
  // discipline's demand vector when the athlete model carries one (WP-49 Plan 2 T1), else the
  // goal's own quality-importance profile — so D4 NEVER returns an empty diagnosis.
  const goalOutcome = (Array.isArray(m.goals) && m.goals[0] && m.goals[0].outcome) || null;
  const discDemand = disciplineDemandFor(m);
  const buildDemand = discDemand ? demandVectorToProfile(discDemand, disciplineIdFor(m)) : goalDemandProfile(goalOutcome);
  const dp = sc.primarySport
    ? buildDemandProfile(sc.primarySport, sc.position || null)
    : buildDemand;
  const demandProfile = dp.length ? dp : null;
  const capabilities = qualityIds().map((q) => estimateCapability(q, m, asOf, demandProfile));
  const limitingFactors = diagnoseLimitingFactors(capabilities, demandProfile, {
    trainingAgeBand: bandForModel(m),
    injuryHistory: (m.constraints && m.constraints.injuryHistory) || [],
  });
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
