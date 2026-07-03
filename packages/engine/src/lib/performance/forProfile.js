/**
 * performanceModelForProfile — derive the Performance Model (diagnosis) from a LEGACY engine profile.
 * The single derivation used by both generatePlan and the PlanService reflow, so the diagnosis reaches
 * the plan the same way everywhere. profileToAthleteModel already infers the SKB sport id from the
 * legacy sport (+ run discipline), so this is a thin, pure wrapper. Non-sport profiles derive an empty
 * priorityAdaptations, which keeps the allocator on its legacy (build) path.
 */
import { profileToAthleteModel } from '../adapters/profileToAthleteModel.js';
import { derivePerformanceModel } from './index.js';

export function performanceModelForProfile(profile, asOf) {
  const model = profileToAthleteModel(profile || {}, asOf);
  return derivePerformanceModel(model, asOf);
}

export default { performanceModelForProfile };
