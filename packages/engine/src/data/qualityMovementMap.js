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
  explosiveStrength: { movementPatterns: ['squat', 'hinge', 'lunge'], forceVelocity: 'strength-speed', contraction: 'explosive-concentric', evidence: ev('moderate') }, // +lunge (H9 C9): unilateral explosive drivers (bounding, sled) are lunge-pattern
  reactiveStrength:  { movementPatterns: ['squat', 'calf'], forceVelocity: 'ballistic', contraction: 'fast-ssc', evidence: ev('moderate') },
  strengthEndurance: { movementPatterns: ['carry', 'calf', 'iso'], forceVelocity: 'endurance', contraction: 'sustained', evidence: ev('low') }, // -lunge (H9 C13): no lunge driver carries an SE tag
  aerobicCapacity:   { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  anaerobicCapacity: { movementPatterns: ['carry', 'lunge'], forceVelocity: 'endurance', contraction: 'sustained', note: 'gym-support only — developed by cardio, not the gym', evidence: ev('low') },
  mobility:          { movementPatterns: ['mobility'], forceVelocity: 'mobility', contraction: 'end-range', evidence: ev('moderate') },
  stability:         { movementPatterns: ['core', 'carry', 'iso'], forceVelocity: 'isometric', contraction: 'isometric', evidence: ev('moderate') },
  // H9 review C2: squat + carry belong here — they are tagged robustness drivers
  // (lower-limb/tendon/bone load tolerance; loaded carries for connective tissue), and
  // omitting them silently excluded them at D11's pattern gate (a hamstring-injured
  // runner lost their best remaining robustness work). See docs/engine/06 §3.2.
  robustness:        { movementPatterns: ['squat', 'hinge', 'lunge', 'calf', 'carry', 'iso'], forceVelocity: 'maximal-force', contraction: 'eccentric-emphasis', evidence: ev('moderate') },
};

// A cardio priority means "support it in the gym" — translate to gym-trainable qualities.
// The static map is the IMPACT-sport (stretch-shortening-cycle) translation and the
// no-sport default; use cardioGymSupport(quality, sport) when the sport is known.
export const CARDIO_GYM_SUPPORT = {
  aerobicCapacity: ['robustness', 'reactiveStrength'],
  anaerobicCapacity: ['strengthEndurance', 'maxStrength'],
};

// H9 review C1: reactive/plyometric transfer to aerobic economy is REAL for impact
// locomotion (tendon-stiffness → running economy: Rønnestad & Mujika 2014; Blagrove
// 2018; Barnes 2015) and ABSENT for non-impact sports — cycling/swimming have no
// stretch-shortening cycle, and their evidence-based gym support is heavy strength
// (Rønnestad 2010; Aagaard 2011). A sport-agnostic map was injecting pogos into a
// cyclist's plan. Sports whose locomotion loads the SSC:
const SSC_SPORTS = new Set(['run']);
export function cardioGymSupport(qualityId, sport = null) {
  const base = CARDIO_GYM_SUPPORT[qualityId];
  if (!base) return null;
  if (qualityId === 'aerobicCapacity' && sport && !SSC_SPORTS.has(sport)) {
    return ['robustness', 'maxStrength'];
  }
  return base;
}

// The gym-trainable qualities (everything except the two cardio qualities).
export const GYM_TRAINABLE = new Set([
  'maxStrength', 'hypertrophy', 'explosiveStrength', 'reactiveStrength',
  'strengthEndurance', 'mobility', 'stability', 'robustness',
]);

export function movementRequirementsFor(qualityId) {
  return QUALITY_MOVEMENT[qualityId] || null;
}

export default { QUALITY_MOVEMENT, CARDIO_GYM_SUPPORT, cardioGymSupport, GYM_TRAINABLE, movementRequirementsFor };
