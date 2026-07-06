// packages/engine/src/lib/performance/estimation.js
// Per-quality capability estimation: measured (from metrics/assessments) → higher confidence,
// else inferred from training-age priors → low confidence. The D1 "assess" seed (in engine).
// Seed normalisation coefficients — representative, to be validated.
import { getQuality } from '../../data/qualities.js';
import { capabilityPrior } from '../priors.js';
import { sportExperiencePriorLevel, SPORT_EXPERIENCE } from '../../data/capabilityPriors.js';
import { bandForYears, bandForLegacyLevel } from '../../data/trainingAgeBands.js';

// Per-lift "strong" 1RM/bodyweight multiples mapping to level 1.0 (WP-38b). Seed values from
// strengthlevel.com population percentiles (~advanced band), consistent with the app's
// per-lift display standards. 1rm_pull is REPS, not a load — never scored here.
const STRONG_BW_MULTIPLE = {
  '1rm_squat':    { male: 2.0, female: 1.5, other: 1.8 },
  '1rm_deadlift': { male: 2.5, female: 1.9, other: 2.2 },
  '1rm_bench':    { male: 1.5, female: 1.0, other: 1.25 },
  '1rm_ohp':      { male: 1.0, female: 0.7, other: 0.85 },
};

export function bandForModel(model) {
  const th = (model && model.trainingHistory) || {};
  const byYears = bandForYears(th.resistanceTrainingYears);
  if (byYears) return byYears;
  if (th.selfRatedLevel) return bandForLegacyLevel(th.selfRatedLevel);
  return 'intermediate';
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso + 'T00:00:00'), b = new Date(bIso + 'T00:00:00');
  return Math.abs((b - a) / 86400000);
}

function measuredMaxStrength(model, asOf) {
  // Each lift is scored against its OWN standard; the estimate is the mean of per-lift levels
  // (overall demonstrated strength, not the best lift). Lifts without a standard (1rm_pull is
  // reps) never drive this estimate.
  const metrics = ((model && model.performanceMetrics) || [])
    .filter((m) => STRONG_BW_MULTIPLE[m.metric] && m.value > 0);
  if (!metrics.length) return null;
  const id = (model && model.identity) || {};
  const bw = id.bodyMassKg || 80;
  const sex = id.biologicalSex || 'other';
  const levels = metrics.map((m) => {
    const mult = STRONG_BW_MULTIPLE[m.metric][sex] || STRONG_BW_MULTIPLE[m.metric].other;
    return Math.min(1, Math.max(0, (m.value / bw) / mult));
  });
  const level = levels.reduce((a, b) => a + b, 0) / levels.length;
  // Confidence decays from the most recent measurement date among the used lifts.
  const newest = metrics.map((m) => m.measuredAt).filter(Boolean).sort().pop() || null;
  let confidence = 'moderate';
  if (newest) confidence = daysBetween(newest, asOf) <= 30 ? 'high' : (daysBetween(newest, asOf) <= 180 ? 'moderate' : 'low');
  const evidence = 'measured ' + metrics.map((m) => `${m.metric} ${m.value}${m.unit || ''}`).join(', ');
  return { level, confidence, evidence };
}

// WP-38c: years in the sport are a prior on the sport's DOMINANT qualities only
// (importance ≥ SPORT_EXPERIENCE.dominantImportanceMin in the supplied demand profile).
function sportExperiencePriorFor(qualityId, model, demandProfile) {
  const th = (model && model.trainingHistory) || {};
  const sc = (model && model.sportingContext) || {};
  const band = bandForYears(th.sportYears);
  if (!band || !sc.primarySport || !Array.isArray(demandProfile)) return null;
  const d = demandProfile.find((x) => x.qualityId === qualityId);
  if (!d || d.importance < SPORT_EXPERIENCE.dominantImportanceMin) return null;
  const level = sportExperiencePriorLevel(band);
  return level == null ? null : { level, band, sport: sc.primarySport };
}

export function estimateCapability(qualityId, model, asOf, demandProfile) {
  model = model || {};
  const q = getQuality(qualityId);
  const band = bandForModel(model);
  // WP-37: the assumed level resolves through the typed priors read-path. With no
  // learned prior on the model (today's universal case) this is the population
  // default and the evidence string is unchanged; a learned prior (the future D16
  // writer's output) changes the level AND declares itself in the evidence.
  const prior = capabilityPrior(qualityId, band, model.learnedPriors);
  let inferred = {
    qualityId, level: prior.value, source: 'inferred',
    confidence: prior.source === 'population' ? 'low' : prior.confidence,
    evidence: prior.source === 'population'
      ? `training-age band prior (${band})`
      : `learned prior (${prior.source}, ${band})`,
    updatedAt: asOf || null,
  };
  // A learned prior stays authoritative; otherwise the sport-experience prior lifts the
  // population default for the sport's dominant qualities. Still a prior → confidence 'low'.
  if (prior.source === 'population') {
    const sp = sportExperiencePriorFor(qualityId, model, demandProfile);
    if (sp && sp.level > inferred.level) {
      inferred = { ...inferred, level: sp.level, evidence: `sport-experience prior (${sp.sport}, ${sp.band})` };
    }
  }
  if (!q) return inferred;

  if (qualityId === 'maxStrength') {
    const m = measuredMaxStrength(model, asOf);
    if (m) return { qualityId, level: m.level, source: 'measured', confidence: m.confidence, evidence: m.evidence, updatedAt: asOf || null };
  }
  return inferred;
}
