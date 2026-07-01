// The Athlete Model — durable, portable representation of WHO the athlete is (Ontology §8,
// EDS §29). Source of truth every future decision reads. Pure factory; no clocks.
export const ATHLETE_SCHEMA_VERSION = 1;

const defaults = () => ({
  schemaVersion: ATHLETE_SCHEMA_VERSION,
  athleteId: null,
  updatedAt: null, // stamped by the persistence layer, not the pure builder

  identity: { age: null, biologicalSex: null, heightCm: null, bodyMassKg: null },

  // Outcome-based, multiple, prioritised. Replaces single "training style".
  goals: [], // { id, outcome, priority, sportRef, targetMetric, deadline }

  sportingContext: {
    primarySport: null, secondarySports: [], position: null, competitiveLevel: null,
    seasonPhase: null, competitionCalendar: [], weeklySportSchedule: [],
    competitionFrequency: null, trainingFrequency: null,
  },

  trainingHistory: {
    resistanceTrainingYears: null, sportYears: null,
    selfRatedLevel: null, // 'beginner'|'returning'|'intermediate'|'advanced' — preserves legacy input
    olympicLiftingExperience: null, barbellExperience: null, plyometricExperience: null,
    vbtExperience: null, coachingHistory: null,
    movementCompetency: { squat: null, hinge: null, press: null, pull: null, olympic: null, plyo: null },
  },

  constraints: {
    equipment: [], availableDays: [], daysPerWeek: null, sessionDurationMin: null,
    injuryHistory: [], currentPain: [], medicalRestrictions: [], mobilityLimitations: [],
    travel: null, shiftWork: null, rehabStatus: null, other: [],
  },

  lifestyle: { sleepQuality: null, stress: null, occupation: null, recoveryOpportunities: null },

  assessments: [],        // { id, type, value, unit, source, confidence, measuredAt }
  performanceMetrics: [], // { id, metric, value, unit, source, confidence, measuredAt }

  learnedPriors: {
    recoveryRate: { value: 1, source: 'population', confidence: 'low' },
    volumeTolerance: { value: 1, source: 'population', confidence: 'low' },
  },

  meta: { onboardedAt: null, source: null, planStartDate: null, enginePassthrough: {} },
});

export function createAthleteModel(overrides = {}) {
  const base = defaults();
  const out = { ...base };
  for (const key of Object.keys(overrides)) {
    const cur = base[key];
    const ov = overrides[key];
    if (cur && !Array.isArray(cur) && typeof cur === 'object' &&
        ov && !Array.isArray(ov) && typeof ov === 'object') {
      out[key] = { ...cur, ...ov };
    } else {
      out[key] = ov;
    }
  }
  return out;
}
