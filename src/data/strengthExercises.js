/**
 * Strength exercise database — the "body of exercises" the gym engine selects
 * from, so sessions are assembled with intent + variety rather than hard-coded.
 *
 * The science (movement-pattern programming): organise training around the
 * fundamental patterns — squat, hinge, lunge, push (horizontal/vertical), pull
 * (horizontal/vertical), plus carry & core — and make sure they're covered
 * across the week. Sessions then get a distinct emphasis (e.g. one leg day
 * squat/quad-focused, another hinge/posterior-focused) while weekly volume stays
 * balanced (StrongFirst; Built With Science; a ~2:1 pull:push lean for posture).
 *
 * Each exercise:
 *   pattern  squat·hinge·lunge·hpush·vpush·hpull·vpull·carry·core·calf·iso
 *   muscle   (iso only) which muscle it targets
 *   equip    barbell·dumbbell·machine·cable·bodyweight·band·kettlebell
 *   level    min experience to program it (0 beginner → 3 advanced)
 *   role     primary (heavy compound) · accessory · iso · core · plyo
 *   liftKey  squat·bench·deadlift → ties into 1RM-based target weights
 *
 * The engine filters by available equipment + the athlete's level, then rotates
 * the choice week to week so the plan doesn't feel copy-pasted.
 */

export const LEVELS = { beginner: 0, returning: 1, intermediate: 2, advanced: 3 };

export const EXERCISES = [
  // ---------------- SQUAT ----------------
  { id: 'back_squat',     name: 'Back squat',        pattern: 'squat', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'squat' },
  { id: 'front_squat',    name: 'Front squat',       pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat' },
  { id: 'goblet_squat',   name: 'Goblet squat',      pattern: 'squat', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'hack_squat',     name: 'Hack / leg-press',  pattern: 'squat', equip: 'machine',   level: 0, role: 'accessory' },
  { id: 'bw_squat',       name: 'Bodyweight squat',  pattern: 'squat', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'tempo_squat',    name: 'Tempo squat (3s down)', pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'box_squat',      name: 'Box squat',         pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat' },

  // ---------------- HINGE ----------------
  { id: 'deadlift',       name: 'Deadlift',          pattern: 'hinge', equip: 'barbell',   level: 1, role: 'primary', liftKey: 'deadlift' },
  { id: 'trap_bar_dl',    name: 'Trap-bar deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'deadlift' },
  { id: 'rdl',            name: 'Romanian deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory', liftKey: 'deadlift' },
  { id: 'db_rdl',         name: 'DB Romanian deadlift', pattern: 'hinge', equip: 'dumbbell', level: 0, role: 'accessory' },
  { id: 'hip_thrust',     name: 'Hip thrust',        pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory' },
  { id: 'glute_bridge',   name: 'Glute bridge',      pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'sl_hinge',       name: 'Single-leg hip hinge', pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'kb_swing',       name: 'Kettlebell swing',  pattern: 'hinge', equip: 'kettlebell', level: 1, role: 'accessory' },
  { id: 'good_morning',   name: 'Good morning',      pattern: 'hinge', equip: 'barbell',   level: 2, role: 'accessory' },

  // ---------------- LUNGE / single-leg ----------------
  { id: 'split_squat',    name: 'Bulgarian split squat', pattern: 'lunge', equip: 'dumbbell', level: 0, role: 'accessory', unilateral: true },
  { id: 'bw_split_squat', name: 'Split squat',       pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'walking_lunge',  name: 'Walking lunge',     pattern: 'lunge', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true },
  { id: 'reverse_lunge',  name: 'Reverse lunge',     pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'step_up',        name: 'Step-up',           pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'cossack_squat',  name: 'Cossack squat',     pattern: 'lunge', equip: 'bodyweight', level: 2, role: 'accessory', unilateral: true },

  // ---------------- HORIZONTAL PUSH ----------------
  { id: 'bench',          name: 'Bench press',       pattern: 'hpush', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'bench' },
  { id: 'db_bench',       name: 'DB bench press',    pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'primary', liftKey: 'bench' },
  { id: 'incline_bench',  name: 'Incline bench press', pattern: 'hpush', equip: 'barbell', level: 1, role: 'accessory' },
  { id: 'incline_db',     name: 'Incline DB press',  pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pushup',         name: 'Push-up',           pattern: 'hpush', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'decline_pushup', name: 'Feet-elevated push-up', pattern: 'hpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'dip',            name: 'Dip',               pattern: 'hpush', equip: 'bodyweight', level: 2, role: 'accessory' },

  // ---------------- VERTICAL PUSH ----------------
  { id: 'ohp',            name: 'Overhead press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'primary' },
  { id: 'db_ohp',         name: 'DB shoulder press', pattern: 'vpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pike_pushup',    name: 'Pike push-up',      pattern: 'vpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'landmine_press', name: 'Landmine press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'accessory' },

  // ---------------- HORIZONTAL PULL ----------------
  { id: 'barbell_row',    name: 'Barbell row',       pattern: 'hpull', equip: 'barbell',   level: 1, role: 'primary' },
  { id: 'db_row',         name: 'Single-arm DB row', pattern: 'hpull', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true },
  { id: 'cable_row',      name: 'Seated cable row',  pattern: 'hpull', equip: 'cable',     level: 0, role: 'accessory' },
  { id: 'chest_supported_row', name: 'Chest-supported row', pattern: 'hpull', equip: 'dumbbell', level: 0, role: 'accessory' },
  { id: 'inverted_row',   name: 'Inverted row',      pattern: 'hpull', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'band_row',       name: 'Band row',          pattern: 'hpull', equip: 'band',      level: 0, role: 'accessory' },

  // ---------------- VERTICAL PULL ----------------
  { id: 'pullup',         name: 'Pull-up',           pattern: 'vpull', equip: 'bodyweight', level: 2, role: 'primary' },
  { id: 'lat_pulldown',   name: 'Lat pulldown',      pattern: 'vpull', equip: 'cable',     level: 0, role: 'primary' },
  { id: 'assisted_pullup', name: 'Band-assisted pull-up', pattern: 'vpull', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'straight_arm_pd', name: 'Straight-arm pulldown', pattern: 'vpull', equip: 'cable', level: 1, role: 'accessory' },

  // ---------------- CARRY ----------------
  { id: 'farmer_carry',   name: 'Farmer carry',      pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'suitcase_carry', name: 'Suitcase carry',    pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true },
  { id: 'bw_carry',       name: 'Backpack carry',    pattern: 'carry', equip: 'bodyweight', level: 0, role: 'accessory' },

  // ---------------- CORE ----------------
  { id: 'plank',          name: 'Plank',             pattern: 'core', equip: 'bodyweight', level: 0, role: 'core' },
  { id: 'pallof',         name: 'Pallof press',      pattern: 'core', equip: 'cable',      level: 0, role: 'core' },
  { id: 'band_pallof',    name: 'Band Pallof press', pattern: 'core', equip: 'band',       level: 0, role: 'core' },
  { id: 'dead_bug',       name: 'Dead bug',          pattern: 'core', equip: 'bodyweight', level: 0, role: 'core' },
  { id: 'hanging_knee',   name: 'Hanging knee raise', pattern: 'core', equip: 'bodyweight', level: 1, role: 'core' },
  { id: 'side_plank',     name: 'Side plank',        pattern: 'core', equip: 'bodyweight', level: 0, role: 'core' },
  { id: 'copenhagen',     name: 'Copenhagen plank',  pattern: 'core', equip: 'bodyweight', level: 2, role: 'core' },

  // ---------------- CALF ----------------
  { id: 'calf_raise',     name: 'Calf raise',        pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso' },
  { id: 'sl_calf',        name: 'Single-leg calf raise', pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', unilateral: true },
  { id: 'seated_calf',    name: 'Seated calf raise', pattern: 'calf', equip: 'machine',    level: 0, role: 'iso' },

  // ---------------- ISOLATION (bodybuilding accents) ----------------
  { id: 'lateral_raise',  name: 'Lateral raise',     pattern: 'iso', muscle: 'sidedelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'rear_fly',       name: 'Rear-delt fly',     pattern: 'iso', muscle: 'reardelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'face_pull',      name: 'Face pull',         pattern: 'iso', muscle: 'reardelt', equip: 'cable',    level: 0, role: 'iso' },
  { id: 'band_face_pull', name: 'Band face pull',    pattern: 'iso', muscle: 'reardelt', equip: 'band',     level: 0, role: 'iso' },
  { id: 'biceps_curl',    name: 'Biceps curl',       pattern: 'iso', muscle: 'biceps',  equip: 'dumbbell',  level: 0, role: 'iso' },
  { id: 'band_curl',      name: 'Band curl',         pattern: 'iso', muscle: 'biceps',  equip: 'band',      level: 0, role: 'iso' },
  { id: 'triceps_pushdown', name: 'Triceps pushdown', pattern: 'iso', muscle: 'triceps', equip: 'cable',   level: 0, role: 'iso' },
  { id: 'overhead_ext',   name: 'Overhead triceps ext.', pattern: 'iso', muscle: 'triceps', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'diamond_pushup', name: 'Close-grip push-up', pattern: 'iso', muscle: 'triceps', equip: 'bodyweight', level: 0, role: 'iso' },
  { id: 'leg_curl',       name: 'Leg curl',          pattern: 'iso', muscle: 'ham',     equip: 'machine',   level: 0, role: 'iso' },
  { id: 'nordic_curl',    name: 'Nordic curl',       pattern: 'iso', muscle: 'ham',     equip: 'bodyweight', level: 2, role: 'iso' },
  { id: 'leg_ext',        name: 'Leg extension',     pattern: 'iso', muscle: 'quad',    equip: 'machine',   level: 0, role: 'iso' },
  { id: 'chest_fly',      name: 'Chest fly',         pattern: 'iso', muscle: 'chest',   equip: 'dumbbell',  level: 0, role: 'iso' }
];

// Equipment keys an exercise can require.
export const EQUIP_KEYS = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Equipment the athlete can use. Accepts the onboarding ACCESS TIERS
// (full_gym / home_weights / none) and also DIRECT equipment keys (e.g.
// ['dumbbell','band']) — the latter is what the on-demand "train now" picker
// passes when you only have what's in front of you. Bodyweight is always implied.
export function availableEquip(access = []) {
  const has = k => access.includes(k);
  if (has('full_gym')) return new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
  if (has('home_weights')) return new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'kettlebell']);
  const direct = access.filter(k => EQUIP_KEYS.includes(k));
  if (direct.length) return new Set([...direct, 'bodyweight']);
  return new Set(['bodyweight', 'band']);
}

export default { EXERCISES, LEVELS, availableEquip };
