// SKB physicalProfile quality vocabulary → the Performance-Model quality ids (Plan 1's fixed set).
// SKB qualities with no Performance-Model home yet (sport-skill / speed qualities) map to null and
// are dropped from the demand profile — documented here, not invented into the strength vocabulary.
export const SKB_TO_PM_QUALITY = {
  maxStrength: 'maxStrength',
  relativeStrength: 'maxStrength',
  explosivePower: 'explosiveStrength',
  reactiveStrength: 'reactiveStrength',
  aerobicEndurance: 'aerobicCapacity',
  anaerobicEndurance: 'anaerobicCapacity',
  repeatSprintAbility: 'anaerobicCapacity',
  mobility: 'mobility',
  stability: 'stability',
  balance: 'stability',
  durability: 'robustness',
  // UNMAPPED (return null — future quality expansion / sport-skill layer, not this sprint):
  //   sprintSpeed, acceleration, deceleration, changeOfDirection, coordination,
  //   rotationalPower, gripStrength, neckStrength
};

export function mapSkbQuality(name) {
  return SKB_TO_PM_QUALITY[name] || null;
}
