// @performance-os/engine — the public API (WP-25; TAS T21).
//
// ── THE SIX CALLS ─────────────────────────────────────────────────────────────
//   plan(profile, opts?)        → the pure generated plan (alias: generatePlan)
//   reflow(inputs)              → the runtime-adapted horizon (alias: reflowPhases)
//   deriveReadiness(inputs)     → the readiness signal (alias: readinessIndex)
//   deriveLoad(inputs)          → the training-load signal (alias: assessLoad)
//   validate(week, ctx?)        → the D14 ValidationReport (alias: validateWeek)
//   rollUp(row, {nowMs})        → the team roll-up: a coach-safe player_status row → the
//                                 derived coaching signal (RAG status/confidence/load).
//                                 The engine owns this derivation (WP-53, TAS Appendix A);
//                                 the web dashboard + a future edge function consume it.
//   explain                     → RESERVED: lands with WP-30 (the decision read-model).
// Every consumer surface (the PWA's PlanService/store, apps/web, future Edge
// Functions) should import from THIS barrel. Deep "./lib/*" subpaths remain for
// tests and for the documented residue in tests/engine-api-boundary.js — that
// allowlist only shrinks. The app's PlanService is the L3 orchestrator feeding
// Database/store/overrides into these pure functions.
export { generatePlan, generatePlan as plan } from './src/lib/PlanGenerator.js';
export {
  reflowPhases, reflowPhases as reflow,
  weekTarget, missedWindowVolume, horizonSlots, gymSessionsWithDates, withinEpoch,
  recentSessionRecovery, sessionKey, intentOfTitle, localISO, sessionDiscipline
} from './src/lib/plan/reflow.js';
export { resolveProgram } from './src/lib/strength/program.js';
export { deriveBlockObjective } from './src/lib/plan/blockObjective.js';
export { resolvePeriodization, deriveSeason, continueBlock } from './src/lib/plan/periodization.js';
export { weeklyMuscleTargets } from './src/lib/strength/targets.js';
export { allocateGym, SESSION_CEILING_MIN } from './src/lib/plan/allocator.js';
export { assessRecovery, recoveryFromScore, subjectiveScore } from './src/lib/recovery/recovery.js';
export { assessLoad, assessLoad as deriveLoad } from './src/lib/load/load.js';
export { readinessIndex, readinessIndex as deriveReadiness } from './src/lib/indices/index.js';
export { computeReadiness, readinessFor, sleepScoreFor } from './src/lib/Readiness.js';
export {
  dailyLoads, acuteChronic, acwr, acwrSeries, loadDecision, acwrBand,
  combinedMultiplier, deloadRecommendation, sessionLoad, workoutLoad
} from './src/lib/plan/trainingLoad.js';
export { getContraindications } from './src/lib/injury/injuryRules.js';
export { REGIONS, DIAGNOSES } from './src/data/injuryTaxonomy.js';
export { getQuestions as injuryTriageQuestions, assess as assessInjurySymptoms } from './src/lib/injury/symptomAssessment.js';
export { applyInjuryRules, applyPrevention } from './src/lib/injury/injuryFilter.js';
export { default as kb } from './src/lib/knowledge/kb.js';
export { authorityOf, mayForceAlone, mayScaleAlone } from './src/lib/knowledge/authority.js';
export { validateWeek, validateWeek as validate, VALIDATORS, CONFLICT_ORDER } from './src/lib/validation/contract.js';
export { rollUp, deriveStatus as rollUpStatus, deriveConfidence as rollUpConfidence, LOW_ADHERENCE_THRESHOLD } from './src/lib/team/rollUp.js';
// The AIGAS Seam 1 gate (WP-60): decision contracts + proposal disposal. The engine's
// decision modules never import ai/ (one-way, test-pinned); proposers live platform-side.
export { DECISION_CONTRACTS, contractFor, validateProposal } from './src/lib/ai/contracts.js';
export { default as sportKnowledge } from './src/lib/sportKnowledge/index.js';
export { exerciseQualities, FORCE_VELOCITY } from './src/data/exerciseQualities.js';
export { deriveSessionSpecs, regionOf } from './src/lib/session/sessionSpecs.js';
export { performanceModelForProfile } from './src/lib/performance/forProfile.js';
export { selectInterventions } from './src/lib/plan/selectInterventions.js';
export { deriveSessionObjective, assignTargetQualities, gymTrainableTargets } from './src/lib/session/sessionObjective.js';
export { deriveMovementRequirements, contraindicatedPatternsFrom, contraindicatedPatternsForInjuries, blockedNameRegexesForInjuries } from './src/lib/session/movementRequirements.js';
export { weekCategoryPlan, categoryPlanFor } from './src/lib/session/categoryCoverage.js';
export { competencyAdjustedTarget, constraintAdjustedTarget } from './src/lib/session/sessionObjective.js';

// ── Athlete model + adapters (the D1 surface AthleteModelService/onboarding use) ──
export { profileToAthleteModel } from './src/lib/adapters/profileToAthleteModel.js';
export { athleteModelToEngineInput } from './src/lib/adapters/athleteModelToEngineInput.js';
export { selectableSports, positionsFor } from './src/lib/sportKnowledge/selectable.js';
export { bindingFor } from './src/data/sportEngineBinding.js';

// ── Prescription + progression contracts screens/stores legitimately consume ──
export { nextE1RM, resolveLifts, matchLift, applyWeights, estimateE1RM, parseReps, parseRpe, trackedLiftsInSession, epley1RM, pullupE1RM } from './src/lib/liftProgression.js';
export { suggestOptimalFrequency } from './src/lib/plan/frequency.js';
export { createAthleteModel, ATHLETE_SCHEMA_VERSION } from './src/lib/athlete/index.js';
export { derivePerformanceModel } from './src/lib/performance/index.js';
export { substituteOptions } from './src/lib/plan/substitutions.js';
export { getGymLevel } from './src/lib/Utils.js';
export { buildPrimer } from './src/lib/plan/primers.js';
export { countWeeklyVolume, gradeVolume, volumeReport, exerciseMuscles } from './src/lib/plan/volume.js';
export { deriveConstraints, suggestGymDays, lightenItems } from './src/lib/plan/constraints.js';
export { parseTeamSchedule, applyTeamSchedule } from './src/lib/plan/teamSchedule.js';
export { ruleVolumeAdjustment } from './src/lib/sportKnowledge/reflowAdjust.js';
export { MUSCLE_GROUPS, MUSCLE_LABELS, VOLUME_LANDMARKS } from './src/data/muscleVolume.js';
export { STRENGTH_STANDARDS, STRENGTH_BANDS, strengthBandFor } from './src/data/strengthStandards.js';
export { EXERCISES, LEVELS, availableEquip } from './src/data/strengthExercises.js';
export { DOSE_SCHEMES, doseForQuality, REACTIVE_LIMITS } from './src/data/doseSchemes.js';
export { ENGINE_VERSION, provenance } from './src/version.js';
export { KNOWLEDGE_SET_VERSION } from './src/lib/knowledge/entries.js';
// WP-59 — the first honest learning loop (pure; STAGED, never engine-consumed).
export { blockOutcome } from './src/lib/learning/blockOutcome.js';
export { readinessValidation } from './src/lib/indices/readinessValidation.js';
