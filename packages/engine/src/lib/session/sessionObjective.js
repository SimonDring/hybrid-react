/**
 * sessionObjective — D9: give each session ONE named purpose (target quality + intensity zone +
 * fatigue budget), driven by the diagnosis. PARALLEL — read only by the session layer + tests.
 *
 * Gym-target resolution: pass a diagnosis priority quality through if the gym can train it; translate
 * a cardio priority to the gym-trainable qualities that support it (CARDIO_GYM_SUPPORT). A build athlete
 * (empty diagnosis) uses the goal's primary quality.
 */
import { getQuality } from '../../data/qualities.js';
import { GYM_TRAINABLE, CARDIO_GYM_SUPPORT } from '../../data/qualityMovementMap.js';

const QUALITY_LABEL = {
  maxStrength: 'max strength', hypertrophy: 'hypertrophy', explosiveStrength: 'explosive strength',
  reactiveStrength: 'reactive strength', strengthEndurance: 'strength endurance',
  aerobicCapacity: 'aerobic capacity', anaerobicCapacity: 'anaerobic capacity',
  mobility: 'mobility', stability: 'stability', robustness: 'robustness',
};
const REGION_WORD = { lower: 'lower body', upper: 'upper body', core: 'trunk', full: '' };
const idOf = (p) => (p && typeof p === 'object' ? p.qualityId : p);

// The ordered, distinct gym-trainable target qualities for an athlete.
export function gymTrainableTargets(priorityQualities = [], goalPrimary = null) {
  const out = [];
  for (const p of Array.isArray(priorityQualities) ? priorityQualities : []) {
    const q = idOf(p);
    if (!q) continue;
    if (GYM_TRAINABLE.has(q)) out.push(q);
    else if (CARDIO_GYM_SUPPORT[q]) out.push(...CARDIO_GYM_SUPPORT[q]);
  }
  const distinct = [...new Set(out)];
  if (distinct.length) return distinct;
  if (goalPrimary && GYM_TRAINABLE.has(goalPrimary)) return [goalPrimary];
  return ['maxStrength'];
}

// One target quality per session (round-robin over the gym-trainable targets).
export function assignTargetQualities(priorityQualities, sessionCount, goalPrimary) {
  const targets = gymTrainableTargets(priorityQualities, goalPrimary);
  const n = Math.max(1, sessionCount || 1);
  return Array.from({ length: n }, (_, i) => targets[i % targets.length]);
}

// Coarse fatigue level (0..2) from a quality's dominant fatigue cost.
function fatigueLevel(quality) {
  const fc = (quality && quality.fatigueCost) || {};
  const order = { low: 0, moderate: 1, high: 2 };
  return Math.max(order[fc.neural] ?? 1, order[fc.metabolic] ?? 1, order[fc.mechanical] ?? 1);
}

export function deriveSessionObjective({ targetQuality, region = 'full', phaseIntent = 'base', deload = false, taper = false, season = null } = {}) {
  const q = getQuality(targetQuality);
  const label = QUALITY_LABEL[targetQuality] || targetQuality || 'strength';
  const rw = REGION_WORD[region] || '';

  // Intensity zone from the quality's dose-response (added in S5), adjusted for phase/deload/taper.
  const dr = (q && q.doseResponse) || {};
  let intensityZone;
  if (deload) intensityZone = 'reduced load (~65%, leave 3+ reps in reserve)';
  else if (taper) intensityZone = `${dr.intensity || 'near-peak'} — hold intensity, cut volume`;
  else if (phaseIntent === 'peak') intensityZone = `${dr.intensity || 'high'} (top of range)`;
  else intensityZone = [dr.intensity, dr.rir && dr.rir !== 'n/a' ? `RIR ${dr.rir}` : ''].filter(Boolean).join(', ') || 'quality-appropriate';

  // Fatigue budget: dominant cost, reduced for deload/taper and in-season sport.
  let lvl = fatigueLevel(q);
  if (deload || taper) lvl = Math.max(0, lvl - 1);
  if (season === 'in') lvl = Math.max(0, lvl - 1);
  const level = ['low', 'moderate', 'high'][lvl];
  const note = season === 'in' ? 'protect the sport — spend little fatigue' : deload || taper ? 'recover — bank fatigue' : 'train hard within budget';

  const purpose = season === 'in'
    ? `Maintain ${label}${rw ? ' — ' + rw : ''}, minimal fatigue`
    : `Develop ${label}${rw ? ' — ' + rw : ''}`;

  return {
    purpose,
    targetQuality: targetQuality || 'maxStrength',
    intensityZone,
    fatigueBudget: { level, note },
    rationale: `targeting ${label} from the diagnosis; ${intensityZone}; fatigue budget ${level}.`,
  };
}

export default { gymTrainableTargets, assignTargetQualities, deriveSessionObjective };
