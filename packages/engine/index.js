// @performance-os/engine — public API barrel.
//
// The deterministic plan engine + its pure recommendation modules, extracted from
// apps/mobile so a second runtime (a future AI Edge Function, or apps/web plan
// previews) can run it without importing from the app. Internal/deep modules stay
// importable via the "./lib/*" and "./data/*" subpath exports (see package.json);
// this barrel surfaces the headline API. The app's PlanService is the thin adapter
// that feeds Database/store/overrides into these pure functions.
export { generatePlan } from './src/lib/PlanGenerator.js';
export { resolveProgram } from './src/lib/strength/program.js';
export { resolvePeriodization, deriveSeason, continueBlock } from './src/lib/plan/periodization.js';
export { weeklyMuscleTargets } from './src/lib/strength/targets.js';
export { allocateGym } from './src/lib/plan/allocator.js';
export { assessRecovery, subjectiveScore } from './src/lib/recovery/recovery.js';
export { assessLoad } from './src/lib/load/load.js';
export { computeReadiness, readinessFor, sleepScoreFor } from './src/lib/Readiness.js';
export {
  dailyLoads, acuteChronic, acwr, acwrSeries, loadDecision,
  combinedMultiplier, deloadRecommendation, sessionLoad, workoutLoad
} from './src/lib/plan/trainingLoad.js';
export { getContraindications } from './src/lib/injury/injuryRules.js';
export { applyInjuryRules, applyPrevention } from './src/lib/injury/injuryFilter.js';
export { default as kb } from './src/lib/knowledge/kb.js';
export { default as sportKnowledge } from './src/lib/sportKnowledge/index.js';
export { exerciseQualities, FORCE_VELOCITY } from './src/data/exerciseQualities.js';
