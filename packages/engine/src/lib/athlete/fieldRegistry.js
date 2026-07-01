// The justification manifest: NO stored field may exist without a documented reason and the
// decision(s) it serves (guiding principle, made mechanical). Decisions reference the
// Migration Blueprint D1–D16 catalogue (current or documented-future).
//
// listStoredFieldPaths walks the model to a fixed depth and returns one path per persisted
// "group". Registry keys must exactly cover those paths (registryGaps === []).

const REGISTERED_SECTIONS = {
  // identity (leaf-level)
  'identity.age': { why: 'Age modulates recovery capacity and trainability.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population median for band' },
  'identity.biologicalSex': { why: 'Sex normalises strength standards and rep/volume defaults.', decisions: ['D1', 'D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'unspecified → neutral defaults' },
  'identity.heightCm': { why: 'Anthropometry contextualises lift standards and ROM.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'omit from normalisation' },
  'identity.bodyMassKg': { why: 'Bodyweight normalises strength (BW multiples) and loads bodyweight work.', decisions: ['D1', 'D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population median for band' },
  // goals
  'goals': { why: 'Outcome goals (prioritised) drive diagnosis and prioritisation.', decisions: ['D4', 'D5', 'D7'], mandatory: true, confidenceIfMissing: 'low', assumptionIfMissing: 'general_fitness' },
  // sporting context
  'sportingContext.primarySport': { why: 'Sport sets the demand profile that qualities are compared against.', decisions: ['D2', 'D4'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'no sport → general demand' },
  'sportingContext.secondarySports': { why: 'Secondary sports add demand + scheduling load.', decisions: ['D2', 'D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'sportingContext.position': { why: 'Position refines the demand profile within a sport.', decisions: ['D2'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'generic position' },
  'sportingContext.competitiveLevel': { why: 'Level scales expected capability and training tolerance.', decisions: ['D5', 'D7'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'recreational' },
  'sportingContext.seasonPhase': { why: 'Season phase sets the periodisation intent + volume scalar.', decisions: ['D7'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'derive from event date/off-season' },
  'sportingContext.competitionCalendar': { why: 'Dated events drive tapers and block boundaries.', decisions: ['D7', 'D15'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'no fixed events' },
  'sportingContext.weeklySportSchedule': { why: 'Sport sessions are fixed constraints gym work routes around.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'no fixed sport days' },
  'sportingContext.competitionFrequency': { why: 'Competition density affects in-season maintenance.', decisions: ['D7'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'sportingContext.trainingFrequency': { why: 'Sport training frequency bounds total weekly load.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: '0' },
  // training history
  'trainingHistory.resistanceTrainingYears': { why: 'Measurable training age sets capability priors + progression rate.', decisions: ['D1', 'D7', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'derive from self-rated level' },
  'trainingHistory.sportYears': { why: 'Years in sport inform skill/robustness base.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'unknown' },
  'trainingHistory.selfRatedLevel': { why: 'Coarse competency the athlete self-reports; drives legacy engine level + exercise gating.', decisions: ['D9', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'intermediate' },
  'trainingHistory.olympicLiftingExperience': { why: 'Gates Olympic-lift selection.', decisions: ['D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.barbellExperience': { why: 'Gates heavy barbell selection + loading.', decisions: ['D11', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.plyometricExperience': { why: 'Gates plyometric selection (landing competency).', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.vbtExperience': { why: 'Reserved: enables velocity-based dosing later.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.coachingHistory': { why: 'Optional context on prior coaching.', decisions: ['D1'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'trainingHistory.movementCompetency': { why: 'Per-pattern competency gates exercise complexity (the L4 gate).', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from training age' },
  // constraints
  'constraints.equipment': { why: 'Available equipment gates every exercise choice.', decisions: ['D11'], mandatory: true, confidenceIfMissing: 'high', assumptionIfMissing: 'bodyweight only' },
  'constraints.availableDays': { why: 'Preferred training days for scheduling.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine suggests days' },
  'constraints.daysPerWeek': { why: 'Sessions/week sets frequency + per-session volume budget.', decisions: ['D8', 'D9'], mandatory: true, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine suggests frequency' },
  'constraints.sessionDurationMin': { why: 'Time per session bounds session size.', decisions: ['D9'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'engine sizes by volume ÷ days' },
  'constraints.injuryHistory': { why: 'Historical injuries drive prevention emphasis.', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.currentPain': { why: 'Active pain contraindicates patterns.', decisions: ['D10', 'D15'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.medicalRestrictions': { why: 'Medical limits hard-exclude work.', decisions: ['D10'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.mobilityLimitations': { why: 'Mobility limits gate ROM-demanding lifts.', decisions: ['D10', 'D11'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  'constraints.travel': { why: 'Travel reduces equipment access + recovery.', decisions: ['D11', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'false' },
  'constraints.shiftWork': { why: 'Shift work degrades recovery.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'false' },
  'constraints.rehabStatus': { why: 'Rehab stage shapes return-to-performance dosing.', decisions: ['D10', 'D12'], mandatory: false, confidenceIfMissing: 'moderate', assumptionIfMissing: 'none' },
  'constraints.other': { why: 'Extension point for future constraint kinds.', decisions: ['D8'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'none' },
  // lifestyle
  'lifestyle.sleepQuality': { why: 'Sleep is a primary recovery driver.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'average' },
  'lifestyle.stress': { why: 'Life stress reduces recovery capacity.', decisions: ['D12', 'D15'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'average' },
  'lifestyle.occupation': { why: 'Occupational load adds to total load.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'sedentary' },
  'lifestyle.recoveryOpportunities': { why: 'Available recovery windows scale weekly volume.', decisions: ['D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'moderate' },
  // assessments + metrics + priors
  'assessments': { why: 'Structured, source-tagged results sharpen capability estimates.', decisions: ['D1', 'D4'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from priors' },
  'performanceMetrics': { why: 'Objective metrics (1RMs, times, jumps) are the measured inputs to capability.', decisions: ['D1', 'D4', 'D12'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'infer from priors' },
  'learnedPriors': { why: 'Learning seam — population defaults now, athlete-specific later.', decisions: ['D12', 'D16'], mandatory: false, confidenceIfMissing: 'low', assumptionIfMissing: 'population default' },
};

export const FIELD_REGISTRY = REGISTERED_SECTIONS;

// System keys that are structural, not athlete data — excluded from justification.
const SYSTEM_KEYS = new Set(['schemaVersion', 'athleteId', 'updatedAt', 'meta']);

export function listStoredFieldPaths(model) {
  const out = [];
  for (const [section, val] of Object.entries(model)) {
    if (SYSTEM_KEYS.has(section)) continue;
    if (val && !Array.isArray(val) && typeof val === 'object') {
      // registered at leaf level if any leaf is registered, else at section level
      const leaves = Object.keys(val).map((k) => `${section}.${k}`);
      const anyLeafRegistered = leaves.some((p) => p in FIELD_REGISTRY);
      if (anyLeafRegistered) out.push(...leaves);
      else out.push(section);
    } else {
      out.push(section); // arrays + scalars registered at section level
    }
  }
  return out;
}

export function registryGaps(model) {
  return listStoredFieldPaths(model).filter((p) => !(p in FIELD_REGISTRY));
}
