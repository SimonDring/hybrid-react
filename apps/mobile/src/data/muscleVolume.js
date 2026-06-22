/**
 * muscleVolume — the data behind "how much work is each muscle getting?"
 *
 * Best-in-class strength programming is built on weekly SET VOLUME per muscle
 * group. The reference framework (Renaissance Periodisation / Israetel; backed
 * by Schoenfeld's dose-response work) gives each muscle three landmarks, in
 * "hard sets per week":
 *
 *   MEV — Minimum Effective Volume: the least that still drives growth.
 *   MAV — Maximum Adaptive Volume: the productive sweet spot you aim to sit in.
 *   MRV — Maximum Recoverable Volume: past this you accumulate more fatigue than
 *         you can recover from — the ceiling.
 *
 * A good block starts near MEV and ramps toward MAV across the weeks, then
 * deloads. (That ramp is Step 2 — this file is just the measuring stick.)
 *
 * The numbers below are sensible mid-range defaults for a general trainee. They
 * are intentionally approximate — individual tolerance varies — but they let us
 * COUNT what the engine produces and flag "too little / about right / too much",
 * which is the foundation for everything adaptive that comes later.
 *
 * NOTE: "back" here lumps lats + mid-back + traps together, and "shoulders"
 * lumps side + rear delts (front delts get plenty from pressing). Splitting them
 * finer is a later refinement; this granularity is enough to drive decisions.
 */

// The muscle groups we account for. Front delts are deliberately omitted — they
// are well covered by horizontal/vertical pressing and rarely the limiter.
export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core'
];

// Human labels for display.
export const MUSCLE_LABELS = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', core: 'Core'
};

// Weekly hard-set landmarks per muscle group (general-trainee mid-range).
export const VOLUME_LANDMARKS = {
  chest:      { mev: 8,  mav: 16, mrv: 22 },
  back:       { mev: 10, mav: 18, mrv: 25 },
  shoulders:  { mev: 8,  mav: 18, mrv: 26 },
  biceps:     { mev: 6,  mav: 14, mrv: 20 },
  triceps:    { mev: 6,  mav: 14, mrv: 20 },
  quads:      { mev: 8,  mav: 16, mrv: 20 },
  hamstrings: { mev: 6,  mav: 13, mrv: 18 },
  glutes:     { mev: 6,  mav: 14, mrv: 20 },
  calves:     { mev: 6,  mav: 13, mrv: 20 },
  core:       { mev: 0,  mav: 16, mrv: 25 }
};

/**
 * How much a working set of a given movement PATTERN contributes to each muscle.
 * A direct/primary mover counts as a full set (1.0); a synergist that does real
 * but secondary work counts as a fraction (0.5) — the standard "fractional set"
 * convention. The numbers are weights, not percentages: a bench-press set adds
 * 1.0 to chest and 0.5 each to triceps and shoulders.
 *
 * Isolation exercises (pattern 'iso') don't use this table — they carry a
 * `muscle` field on the exercise itself, mapped by ISO_MUSCLE_GROUP below.
 */
export const PATTERN_CONTRIB = {
  squat: { quads: 1.0, glutes: 0.5 },
  hinge: { hamstrings: 1.0, glutes: 0.8, back: 0.5 },
  lunge: { quads: 1.0, glutes: 0.5 },
  hpush: { chest: 1.0, triceps: 0.5, shoulders: 0.5 },
  vpush: { shoulders: 1.0, triceps: 0.5 },
  hpull: { back: 1.0, biceps: 0.5 },
  vpull: { back: 1.0, biceps: 0.5 },
  carry: { core: 0.5 },
  core:  { core: 1.0 },
  calf:  { calves: 1.0 }
};

// Isolation exercises tag a specific `muscle` — map those tags onto our groups.
export const ISO_MUSCLE_GROUP = {
  sidedelt: 'shoulders', reardelt: 'shoulders',
  biceps: 'biceps', triceps: 'triceps',
  ham: 'hamstrings', quad: 'quads', chest: 'chest'
};

export default { MUSCLE_GROUPS, MUSCLE_LABELS, VOLUME_LANDMARKS, PATTERN_CONTRIB, ISO_MUSCLE_GROUP };
