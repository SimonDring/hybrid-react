// Seed adaptation registry. Each adaptation is a physiological change that develops one or
// more qualities. Dose-response coefficients are representative seed values to be validated.
export const ADAPTATIONS = [
  { id: 'motor_unit_recruitment', change: 'more/earlier high-threshold MU recruitment', develops: ['maxStrength', 'explosiveStrength'] },
  { id: 'myofibrillar_hypertrophy', change: 'contractile protein accretion', develops: ['maxStrength', 'hypertrophy'] },
  { id: 'sarcoplasmic_hypertrophy', change: 'non-contractile volume growth', develops: ['hypertrophy'] },
  { id: 'rate_coding', change: 'higher motor-unit firing frequency', develops: ['explosiveStrength'] },
  { id: 'tendon_stiffness', change: 'increased series-elastic stiffness', develops: ['reactiveStrength'] },
  { id: 'ssc_efficiency', change: 'stretch-shortening-cycle efficiency', develops: ['reactiveStrength'] },
  { id: 'capillary_density', change: 'increased capillarisation', develops: ['strengthEndurance', 'aerobicCapacity'] },
  { id: 'fiber_type_shift', change: 'IIx->IIa shift', develops: ['strengthEndurance'] },
  { id: 'mitochondrial_density', change: 'more mitochondria', develops: ['aerobicCapacity'] },
  { id: 'stroke_volume', change: 'cardiac stroke-volume increase', develops: ['aerobicCapacity'] },
  { id: 'glycolytic_enzymes', change: 'glycolytic enzyme upregulation', develops: ['anaerobicCapacity'] },
  { id: 'buffering_capacity', change: 'improved H+ buffering', develops: ['anaerobicCapacity'] },
  { id: 'sarcomerogenesis', change: 'added in-series sarcomeres (length)', develops: ['mobility'] },
  { id: 'tissue_tolerance', change: 'end-range tissue tolerance', develops: ['mobility', 'robustness'] },
  { id: 'proprioception', change: 'improved joint position sense', develops: ['stability'] },
  { id: 'co_contraction', change: 'agonist/antagonist co-contraction control', develops: ['stability'] },
  { id: 'tendon_remodelling', change: 'collagen remodelling / tendon capacity', develops: ['robustness'] },
  { id: 'bone_density', change: 'bone mineral density', develops: ['robustness'] },
];
export const adaptationIds = () => ADAPTATIONS.map((a) => a.id);
