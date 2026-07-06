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
 *
 * The landmark numbers themselves now live in the evidence knowledge base
 * (src/lib/knowledge/) with their provenance + confidence — VOLUME_LANDMARKS below
 * is sourced from there so the science is auditable and editable in one place.
 */

import kb from '../lib/knowledge/kb.js';

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
// Sourced from the evidence knowledge base (provenance + confidence live there).
export const VOLUME_LANDMARKS = kb.value('volume.landmarks');

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

// ── WP-45: THE one per-exercise muscle table ──────────────────────────────────────
// Exercises whose movement-pattern default misattributes their work. This is the SINGLE
// canonical source: volume accounting derives weighted contributions from it (primary
// 1.0 / secondary 0.5 — the synergist convention above) and the substitution likeness
// model derives its primary/secondary lists from it (data/exerciseSimilarity.js). The
// two models previously disagreed — the ledger credited a hip thrust as a hamstring
// movement while substitution knew it was glute-primary, so a hip-thrust-heavy plan
// could 'hit' hamstring volume while glutes went undercounted, invisible to the MRV
// validator. Evidence: glute-dominant bridging kinematics (Contreras 2015 EMG),
// rear-delt/scapular isolation vs lat rowing (Schoenfeld 2014 shoulder EMG),
// triceps-biased pressing (Barnett 1995 grip-width EMG), long-lever lat isolation
// with no elbow-flexion torque. Sources — and now feeds — the corrections previously
// documented in data/exerciseSimilarity.js OVERRIDES.
export const EXERCISE_MUSCLES = {
  // Rear-delt / scapular isolations tagged hpull: rear delts, not lats/biceps.
  reverse_pec_deck: { primary: ['shoulders'], secondary: ['back'] },
  prone_y_raise:    { primary: ['shoulders'], secondary: ['back'] },
  prone_t_raise:    { primary: ['shoulders'], secondary: ['back'] },
  prone_w_raise:    { primary: ['shoulders'], secondary: ['back'] },
  band_pull_apart:  { primary: ['shoulders'], secondary: ['back'] },
  // Glute-dominant bridging hinges (no from-the-floor spinal-erector loading).
  hip_thrust:               { primary: ['glutes'], secondary: ['hamstrings'] },
  glute_bridge:             { primary: ['glutes'], secondary: ['hamstrings'] },
  glute_bridge_single_leg:  { primary: ['glutes'], secondary: ['hamstrings'] },
  prone_hip_extension:      { primary: ['glutes'], secondary: ['hamstrings'] },
  // Triceps-biased presses.
  close_grip_bench: { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  jm_press:         { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  dip:              { primary: ['chest'], secondary: ['triceps'] },
  // Long-lever lat isolation — no elbow-flexion (biceps) torque.
  db_pullover:    { primary: ['back'], secondary: ['chest'] },
  straight_arm_pd:{ primary: ['back'], secondary: [] },
};

// Weighted contribution view of EXERCISE_MUSCLES (primary 1.0, secondary 0.5).
export const EXERCISE_CONTRIB = Object.fromEntries(
  Object.entries(EXERCISE_MUSCLES).map(([id, m]) => [id, {
    ...Object.fromEntries(m.primary.map((g) => [g, 1.0])),
    ...Object.fromEntries(m.secondary.map((g) => [g, 0.5])),
  }])
);

export default { MUSCLE_GROUPS, MUSCLE_LABELS, VOLUME_LANDMARKS, PATTERN_CONTRIB, ISO_MUSCLE_GROUP, EXERCISE_MUSCLES, EXERCISE_CONTRIB };
