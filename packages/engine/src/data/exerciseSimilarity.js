/**
 * exerciseSimilarity — enrichment data read ONLY by the exercise-substitution scorer
 * (lib/plan/substitutions.js). It gives every exercise an accurate primary/secondary
 * muscle profile so substitutes can be ranked by scientific likeness to the original.
 *
 * IMPORTANT: this is deliberately separate from `muscleContribution` (data/muscleVolume
 * + lib/plan/contributions), which is pattern-based and drives the whole plan allocator
 * and its MEV/MAV/MRV volume accounting. Nothing here touches that — the generated plan
 * is unaffected. Muscles resolve via PATTERN DEFAULTS + per-exercise OVERRIDES so we
 * only hand-author the exceptions; a new exercise with no override falls back to its
 * pattern default.
 *
 * Muscle vocabulary = the engine's MUSCLE_GROUPS:
 *   quads, hamstrings, glutes, calves, chest, back, shoulders, biceps, triceps, core
 */

// Default primary/secondary movers per movement pattern.
export const DEFAULT_MUSCLES = {
  squat:  { primary: ['quads'], secondary: ['glutes', 'hamstrings'] },
  hinge:  { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  lunge:  { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  hpush:  { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  vpush:  { primary: ['shoulders'], secondary: ['triceps'] },
  hpull:  { primary: ['back'], secondary: ['biceps'] },
  vpull:  { primary: ['back'], secondary: ['biceps'] },
  calf:   { primary: ['calves'], secondary: [] },
  carry:  { primary: ['core'], secondary: ['back', 'shoulders'] },
  core:   { primary: ['core'], secondary: [] },
  mobility: { primary: [], secondary: [] },
  iso:    { primary: [], secondary: [] }   // resolved from the exercise's `muscle` (see ISO_GROUP)
};

// pattern:'iso' exercises carry their own `muscle`; map it to a MUSCLE_GROUP.
export const ISO_GROUP = {
  biceps: 'biceps', triceps: 'triceps', chest: 'chest',
  quad: 'quads', ham: 'hamstrings', glutes: 'glutes', calves: 'calves',
  sidedelt: 'shoulders', reardelt: 'shoulders', shoulders: 'shoulders'
};

// Per-exercise overrides where the pattern default (or a mis-tagged pattern) is wrong.
export const OVERRIDES = {
  // Rear-delt / scapular isolations mis-tagged with the hpull pattern — they train the
  // rear delts (shoulders), NOT the lats/biceps the hpull default implies.
  reverse_pec_deck: { primary: ['shoulders'], secondary: ['back'] },
  prone_y_raise:    { primary: ['shoulders'], secondary: ['back'] },
  prone_t_raise:    { primary: ['shoulders'], secondary: ['back'] },
  prone_w_raise:    { primary: ['shoulders'], secondary: ['back'] },
  band_pull_apart:  { primary: ['shoulders'], secondary: ['back'] },

  // Glute-dominant hinges (the hinge default leads with hamstrings).
  hip_thrust:               { primary: ['glutes'], secondary: ['hamstrings'] },
  glute_bridge:             { primary: ['glutes'], secondary: ['hamstrings'] },
  glute_bridge_single_leg:  { primary: ['glutes'], secondary: ['hamstrings'] },
  prone_hip_extension:      { primary: ['glutes'], secondary: ['hamstrings'] },

  // Triceps-biased presses.
  close_grip_bench: { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  jm_press:         { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  dip:              { primary: ['chest'], secondary: ['triceps'] },

  // Lat-isolation pulls (no real biceps involvement).
  db_pullover:    { primary: ['back'], secondary: ['chest'] },
  straight_arm_pd:{ primary: ['back'], secondary: [] }
};

// Equipment → resistance modality, and how similar two modalities feel (force vector).
export const MODALITY = {
  barbell: 'free', dumbbell: 'free', kettlebell: 'free',
  cable: 'cable', machine: 'machine', band: 'band', bodyweight: 'bodyweight'
};
const SIM = {
  free:       { free: 1.0, cable: 0.7, machine: 0.55, band: 0.45, bodyweight: 0.5 },
  cable:      { free: 0.7, cable: 1.0, machine: 0.7, band: 0.6, bodyweight: 0.4 },
  machine:    { free: 0.55, cable: 0.7, machine: 1.0, band: 0.4, bodyweight: 0.35 },
  band:       { free: 0.45, cable: 0.6, machine: 0.4, band: 1.0, bodyweight: 0.5 },
  bodyweight: { free: 0.5, cable: 0.4, machine: 0.35, band: 0.5, bodyweight: 1.0 }
};
export function modalitySim(equipA, equipB) {
  const a = MODALITY[equipA] || 'free', b = MODALITY[equipB] || 'free';
  return (SIM[a] && SIM[a][b] != null) ? SIM[a][b] : 0.4;
}

export default { DEFAULT_MUSCLES, ISO_GROUP, OVERRIDES, MODALITY, modalitySim };
