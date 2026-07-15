/**
 * exerciseLoad — turn the five tracked main-lift e1RMs into a realistic SUGGESTED
 * working weight for EVERY loadable exercise, so the athlete only ever logs their
 * five mains and every accessory's target climbs automatically as those mains do.
 *
 * Two stages (see docs / plan):
 *   1. accessory 1RM  = anchorE1RM × C        (C = the exercise's 1RM as a fraction
 *      of its anchor lift's 1RM — population ratios from StrengthLevel, not guesses).
 *   2. working weight = accessory1RM × %1RM(reps, RIR)   ← applied in liftProgression.
 *
 * `anchorFor` is DISPLAY-ONLY (what weight to suggest). It is deliberately separate
 * from `matchLift` (what to LOG): only the five mains are logged; everything is shown.
 *
 * All numbers are motivating estimates ("start here, adjust to feel"), consistent with
 * strengthStandards.js. Bodyweight / band / core / mobility take no external kg → null.
 */
import { EXERCISES } from '../../data/strengthExercises.js';

const round2_5 = (x) => Math.round(x / 2.5) * 2.5;

// ── anchor lift by movement, when an exercise has no explicit override ──────────
const PATTERN_ANCHOR = {
  squat: 'squat', hinge: 'deadlift', lunge: 'squat',
  hpush: 'bench', vpush: 'ohp', hpull: 'pull', vpull: 'pull',
  carry: 'deadlift', calf: 'squat'
  // core / mobility / plyo → no anchor (null)
};
const MUSCLE_ANCHOR = {   // for pattern:'iso', pick the anchor the muscle assists
  biceps: 'bench', triceps: 'bench', chest: 'bench',
  sidedelt: 'ohp', reardelt: 'ohp', shoulders: 'ohp',
  quad: 'squat', ham: 'deadlift', glutes: 'deadlift', calf: 'squat'
};

// Fallback coefficient for exercises without a measured ratio — calibrated so it lands
// near the StrengthLevel-derived values in OVERRIDE below.
const ROLE_BASE = { primary: 1.0, accessory: 0.6, iso: 0.22 };       // core/plyo → null
const EQUIP_MULT = { barbell: 1.0, machine: 1.0, cable: 0.6, dumbbell: 0.42, kettlebell: 0.45, bodyweight: null, band: null };

// Per-exercise coefficient C (accessory 1RM ÷ anchor 1RM), intermediate male. Sources:
// the high-visibility isolations + compounds come straight from StrengthLevel exercise-
// vs-exercise standards; the rest are well-known training priors. `key` overrides the
// heuristic anchor; `perHand`/`single` override the equipment default. DB ratios are
// already per-dumbbell.
const OVERRIDE = {
  // squat family
  front_squat: { c: 0.85 }, box_squat: { c: 0.9 }, pause_squat: { c: 0.85 },
  goblet_squat: { c: 0.4, perHand: false }, heel_elevated_goblet: { c: 0.35, perHand: false },
  hack_squat: { c: 1.5 }, sl_leg_press: { c: 0.6 }, leg_ext: { c: 0.74 },          // leg ext 0.74×squat
  hang_clean: { c: 0.6 }, power_clean: { c: 0.65 },
  // olympic classic lifts + derivatives (Phase 3 M2 T4): pattern:'olympic' has no
  // PATTERN_ANCHOR entry (no generic movement anchor fits a technical lift), so without an
  // explicit `key` these shipped with NO working weight at all — meaning progressionCreep's
  // load-creep + warm-up ramp (07-PROGRESSION §2.2; SR-10) had nothing to advance or ramp
  // from. Anchored to squat by the standard weightlifting-coaching %-of-back-squat heuristic
  // (Everett, Olympic Weightlifting; Bompa & Haff, Periodization) — internal-conservative,
  // athlete-specific in reality, and (like every anchor-derived weight) a displayed estimate
  // only, never a logged truth.
  snatch: { key: 'squat', c: 0.6 }, power_snatch: { key: 'squat', c: 0.55 },
  hang_snatch: { key: 'squat', c: 0.5 }, clean_and_jerk: { key: 'squat', c: 0.8 },
  split_jerk: { key: 'squat', c: 0.85 },
  // hinge / deadlift family
  trap_bar_dl: { c: 1.05 }, rdl: { c: 0.79 }, db_rdl: { c: 0.35 }, good_morning: { c: 0.45 },
  rack_pull: { c: 1.1 }, deficit_deadlift: { c: 0.9 }, hip_thrust: { c: 1.0 },
  leg_curl: { c: 0.42 }, seated_leg_curl: { c: 0.42 },                              // leg curl 0.42×deadlift
  glute_ham_raise: null, kb_swing: { c: 0.3, perHand: false },
  // horizontal push / bench family
  db_bench: { c: 0.42 }, incline_bench: { c: 0.85 }, incline_db: { c: 0.38 },
  close_grip_bench: { c: 0.9 }, floor_press: { c: 0.9 }, jm_press: { c: 0.45 },
  low_high_cable_fly: { c: 0.18 }, chest_fly: { c: 0.2 },
  // triceps / biceps (anchor bench)
  triceps_pushdown: { c: 0.58 }, overhead_ext: { c: 0.2 }, overhead_cable_ext: { c: 0.3 },
  biceps_curl: { c: 0.22 }, incline_db_curl: { c: 0.18 }, spider_curl: { c: 0.18 },
  // vertical push / ohp family
  db_ohp: { c: 0.42 }, landmine_press: { c: 0.5 }, tall_kneeling_landmine: { c: 0.4 },
  lateral_raise: { c: 0.2 }, rear_fly: { c: 0.12 }, face_pull: { c: 0.3 },
  sl_ext_rotation: { c: 0.06 }, cable_ext_rotation_90: { c: 0.08 },
  prone_y_raise: { c: 0.05 }, prone_t_raise: { c: 0.05 }, prone_w_raise: { c: 0.05 },
  // pull family (anchor = the pull e1RM, i.e. lat-pulldown / pull-up scale)
  lat_pulldown: { c: 1.0 }, straight_arm_pd: { c: 0.45 }, barbell_row: { c: 1.0 },
  db_row: { c: 0.45 }, cable_row: { c: 0.9 }, chest_supported_row: { c: 0.45 },
  db_pullover: { c: 0.35 }, reverse_pec_deck: { c: 0.5 },
  // carry / lunge / calf
  farmer_carry: { c: 0.5 }, suitcase_carry: { c: 0.5 },
  split_squat: { c: 0.25 }, walking_lunge: { c: 0.25 }, sl_hip_abduction: { c: 0.08 },
  seated_calf: { c: 0.5 }
};

// Isolation ratios climb with strength (lateral raise 0.31→0.60, pushdown 0.36→0.70,
// leg ext 0.55→0.85), so a single coefficient over-prescribes for beginners. Scale the
// iso coefficient by level. Compound-accessory ratios are flat → not scaled.
const LEVEL_SCALE = { beginner: 0.7, returning: 0.85, intermediate: 1.0, advanced: 1.12 };

const BY_NAME = new Map(EXERCISES.map((e) => [e.name, e]));

function anchorKeyFor(ex) {
  const ov = OVERRIDE[ex.id];
  if (ov && ov.key) return ov.key;
  if (ex.liftKey) return ex.liftKey;
  if (ex.pattern === 'iso') return MUSCLE_ANCHOR[ex.muscle] || null;
  return PATTERN_ANCHOR[ex.pattern] || null;
}

// → { key, coefficient, perHand, iso } | null (null = no external kg for this exercise).
export function anchorFor(ex) {
  if (!ex) return null;
  if (OVERRIDE[ex.id] === null) return null;        // explicitly no-load (e.g. GHR)
  const equipMult = EQUIP_MULT[ex.equip];
  if (equipMult == null) return null;               // bodyweight / band → no kg
  if (ex.pattern === 'core' || ex.pattern === 'mobility') return null;
  const key = anchorKeyFor(ex);
  if (!key) return null;

  const ov = OVERRIDE[ex.id] || {};
  const coefficient = ov.c != null ? ov.c : (ROLE_BASE[ex.role] ?? 0.5) * equipMult;
  const perHand = ov.perHand != null ? ov.perHand : (ex.equip === 'dumbbell' || ex.equip === 'kettlebell');
  return { key, coefficient, perHand, iso: ex.role === 'iso' };
}

export function anchorForName(name) {
  return anchorFor(BY_NAME.get(name));
}

// Apply the level scaling (isolations only) + the short-rest superset fatigue nudge.
export function effectiveCoefficient(anchor, { level = 'intermediate', superset = false } = {}) {
  if (!anchor) return null;
  let c = anchor.coefficient;
  if (anchor.iso) c *= (LEVEL_SCALE[level] ?? 1);
  if (superset) c *= 0.95;
  return c;
}

// Round to a weight that reads like real plates/dumbbells, then format.
export function formatLoad(kg, { perHand = false } = {}) {
  if (!(kg > 0)) return null;
  const rounded = perHand && kg < 10 ? Math.round(kg) : round2_5(kg);
  if (!(rounded > 0)) return null;
  return `${rounded} kg${perHand ? '/hand' : ''}`;
}

export default { anchorFor, anchorForName, effectiveCoefficient, formatLoad };
