// packages/engine/src/lib/performance/estimation.js
// Per-quality capability estimation: measured (from metrics/assessments) → higher confidence,
// else inferred from training-age priors → low confidence. The D1 "assess" seed (in engine).
// Seed normalisation coefficients — representative, to be validated.
import { getQuality } from '../../data/qualities.js';
import { priorLevel } from '../../data/capabilityPriors.js';
import { bandForYears, bandForLegacyLevel } from '../../data/trainingAgeBands.js';

const STRONG_BW_MULTIPLE = { male: 2.0, female: 1.5, other: 1.8 }; // squat 1RM/BW mapping to level 1.0

export function bandForModel(model) {
  const th = model.trainingHistory || {};
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
  const metrics = (model.performanceMetrics || []).filter((m) => /^1rm_/.test(m.metric || '') && m.value > 0);
  if (!metrics.length) return null;
  const squat = metrics.find((m) => m.metric === '1rm_squat') || metrics[0];
  const bw = model.identity.bodyMassKg || 80;
  const sex = model.identity.biologicalSex || 'other';
  const mult = STRONG_BW_MULTIPLE[sex] || STRONG_BW_MULTIPLE.other;
  const level = Math.min(1, Math.max(0, (squat.value / bw) / mult));
  let confidence = 'moderate';
  if (squat.measuredAt) confidence = daysBetween(squat.measuredAt, asOf) <= 30 ? 'high' : (daysBetween(squat.measuredAt, asOf) <= 180 ? 'moderate' : 'low');
  return { level, confidence, evidence: `measured ${squat.metric} ${squat.value}${squat.unit || ''}` };
}

export function estimateCapability(qualityId, model, asOf) {
  const q = getQuality(qualityId);
  const band = bandForModel(model);
  const inferred = {
    qualityId, level: priorLevel(qualityId, band), source: 'inferred',
    confidence: 'low', evidence: `training-age band prior (${band})`, updatedAt: asOf || null,
  };
  if (!q) return inferred;

  if (qualityId === 'maxStrength') {
    const m = measuredMaxStrength(model, asOf);
    if (m) return { qualityId, level: m.level, source: 'measured', confidence: m.confidence, evidence: m.evidence, updatedAt: asOf || null };
  }
  return inferred;
}
