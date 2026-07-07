/**
 * exerciseSimilarity — enrichment data read by the exercise-substitution scorer
 * (lib/plan/substitutions.js): accurate primary/secondary muscle profiles so
 * substitutes rank by scientific likeness to the original.
 *
 * WP-45: the per-exercise OVERRIDES now come from THE one canonical muscle table
 * (data/muscleVolume.js EXERCISE_MUSCLES) — the same corrections drive volume
 * accounting (as weighted contributions) and likeness (as these lists), so the two
 * models can never disagree again (the old split let a hip thrust count as a
 * hamstring movement in the ledger while substitution knew it was glute-primary).
 * The PATTERN-LEVEL defaults below remain likeness-specific (they carry synergists
 * the accounting convention deliberately doesn't credit).
 *
 * Muscle vocabulary = the engine's MUSCLE_GROUPS:
 *   quads, hamstrings, glutes, calves, chest, back, shoulders, biceps, triceps, core
 */
import { EXERCISE_MUSCLES } from './muscleVolume.js';

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
// WP-45: sourced from the canonical table — see the header. (Shape unchanged for
// every consumer: { primary: [...], secondary: [...] } per exercise id.)
export const OVERRIDES = EXERCISE_MUSCLES;

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
