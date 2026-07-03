/**
 * qualityMovementMap — the "adaptation→movement" knowledge (EDS §32, D10 input): for each physical
 * quality, the ideal movement requirements (patterns + force-velocity + contraction) — as REQUIREMENTS,
 * not exercises. Reuses the S5 FORCE_VELOCITY vocab and the exercise `pattern` vocab so the layers speak
 * one language. Honest seed data (needsReview). PARALLEL — read only by the D9/D10 session layer + tests.
 *
 * Cardio qualities (aerobic/anaerobic) are NOT gym-trained directly; CARDIO_GYM_SUPPORT translates them
 * to the gym-trainable qualities that SUPPORT them (e.g. aerobicCapacity → robustness + reactiveStrength:
 * durability + running economy via tendon stiffness — the EDS in-season-runner's exact gym prescription).
 */
const ev = (confidence) => ({ level: 'seed', confidence, source: 'seed movement map (Sprint 7)', needsReview: true });

export const QUALITY_MOVEMENT = {
  maxStrength:       { movementPatterns: ['squat', 'hinge', 'hpush', 'vpush', 'hpull', 'vpull'], forceVelocity: 'maximal-force', contraction: 'grinding', evidence: ev('moderate') },
  hypertrophy:       { movementPatterns: ['squat', 'hinge', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull', 'iso'], forceVelocity: 'controlled-hypertrophy', contraction: 'controlled', evidence: ev('moderate') },
  explosiveStrength: { movementPatterns: ['squat', 'hinge'], forceVelocity: 'strength-speed', contraction: 'explosive-concentric', evidence: ev('moderate') },
  reactiveStrength:  { movementPatterns: ['squat', 'calf'], forceVelocity: 'ballistic', contraction: 'fast-ssc', evidence: ev('moderate') },
  strengthEndurance: { movementPatterns: ['lunge', 'carry', 'calf', 'iso'], forceVelocity: 'endurance', contraction: 'sustained', evidence: ev('low') },
  aerobicCapacity:   { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  anaerobicCapacity: { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  mobility:          { movementPatterns: ['mobility'], forceVelocity: 'mobility', contraction: 'end-range', evidence: ev('moderate') },
  stability:         { movementPatterns: ['core', 'carry', 'iso'], forceVelocity: 'isometric', contraction: 'isometric', evidence: ev('moderate') },
  robustness:        { movementPatterns: ['hinge', 'lunge', 'calf', 'iso'], forceVelocity: 'maximal-force', contraction: 'eccentric-emphasis', evidence: ev('moderate') },
};

// A cardio priority means "support it in the gym" — translate to gym-trainable qualities.
export const CARDIO_GYM_SUPPORT = {
  aerobicCapacity: ['robustness', 'reactiveStrength'],
  anaerobicCapacity: ['strengthEndurance', 'maxStrength'],
};

// The gym-trainable qualities (everything except the two cardio qualities).
export const GYM_TRAINABLE = new Set([
  'maxStrength', 'hypertrophy', 'explosiveStrength', 'reactiveStrength',
  'strengthEndurance', 'mobility', 'stability', 'robustness',
]);

export function movementRequirementsFor(qualityId) {
  return QUALITY_MOVEMENT[qualityId] || null;
}

export default { QUALITY_MOVEMENT, CARDIO_GYM_SUPPORT, GYM_TRAINABLE, movementRequirementsFor };
