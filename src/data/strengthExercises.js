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
  { id: 'back_squat',     name: 'Back squat',        pattern: 'squat', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'returning' },
  { id: 'front_squat',    name: 'Front squat',       pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'intermediate' },
  { id: 'goblet_squat',   name: 'Goblet squat',      pattern: 'squat', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'hack_squat',     name: 'Hack / leg-press',  pattern: 'squat', equip: 'machine',   level: 0, role: 'accessory' },
  { id: 'bw_squat',       name: 'Bodyweight squat',  pattern: 'squat', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'tempo_squat',    name: 'Tempo squat (3s down)', pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'box_squat',      name: 'Box squat',         pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'intermediate' },

  // ---------------- HINGE ----------------
  { id: 'deadlift',       name: 'Deadlift',          pattern: 'hinge', equip: 'barbell',   level: 1, role: 'primary', liftKey: 'deadlift',  minLevelForPrimary: 'returning' },
  { id: 'trap_bar_dl',    name: 'Trap-bar deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'deadlift' },
  { id: 'rdl',            name: 'Romanian deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory', liftKey: 'deadlift', sportTags: ['run', 'cycle'],          goalTags: ['strength'] },
  { id: 'db_rdl',         name: 'DB Romanian deadlift', pattern: 'hinge', equip: 'dumbbell', level: 0, role: 'accessory',                    sportTags: ['run', 'cycle'] },
  { id: 'hip_thrust',     name: 'Hip thrust',        pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory',                      sportTags: ['cycle', 'swim'],          goalTags: ['strength'] },
  { id: 'glute_bridge',   name: 'Glute bridge',      pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'sl_hinge',       name: 'Single-leg hip hinge', pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory',                  sportTags: ['run', 'cycle', 'swim'],   minLevelForPrimary: 'returning' },
  { id: 'kb_swing',       name: 'Kettlebell swing',  pattern: 'hinge', equip: 'kettlebell', level: 1, role: 'accessory',                     sportTags: ['run'],                    minLevelForPrimary: 'returning' },
  { id: 'good_morning',   name: 'Good morning',      pattern: 'hinge', equip: 'barbell',   level: 2, role: 'accessory',                                                             minLevelForPrimary: 'intermediate' },

  // ---------------- LUNGE / single-leg ----------------
  { id: 'split_squat',    name: 'Bulgarian split squat', pattern: 'lunge', equip: 'dumbbell', level: 0, role: 'accessory', unilateral: true, sportTags: ['run', 'cycle'] },
  { id: 'bw_split_squat', name: 'Split squat',       pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'walking_lunge',  name: 'Walking lunge',     pattern: 'lunge', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },
  { id: 'reverse_lunge',  name: 'Reverse lunge',     pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'step_up',        name: 'Step-up',           pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },
  { id: 'cossack_squat',  name: 'Cossack squat',     pattern: 'lunge', equip: 'bodyweight', level: 2, role: 'accessory', unilateral: true },

  // ---------------- HORIZONTAL PUSH ----------------
  { id: 'bench',          name: 'Bench press',       pattern: 'hpush', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'bench',     minLevelForPrimary: 'returning' },
  { id: 'db_bench',       name: 'DB bench press',    pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'primary', liftKey: 'bench' },
  { id: 'incline_bench',  name: 'Incline bench press', pattern: 'hpush', equip: 'barbell', level: 1, role: 'accessory' },
  { id: 'incline_db',     name: 'Incline DB press',  pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pushup',         name: 'Push-up',           pattern: 'hpush', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'decline_pushup', name: 'Feet-elevated push-up', pattern: 'hpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'dip',            name: 'Dip',               pattern: 'hpush', equip: 'bodyweight', level: 2, role: 'accessory' },

  // ---------------- VERTICAL PUSH ----------------
  { id: 'ohp',            name: 'Overhead press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'primary',                        minLevelForPrimary: 'intermediate' },
  { id: 'db_ohp',         name: 'DB shoulder press', pattern: 'vpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pike_pushup',    name: 'Pike push-up',      pattern: 'vpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'landmine_press', name: 'Landmine press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'accessory' },

  // ---------------- HORIZONTAL PULL ----------------
  { id: 'barbell_row',    name: 'Barbell row',       pattern: 'hpull', equip: 'barbell',   level: 1, role: 'primary',                        minLevelForPrimary: 'intermediate', sportTags: ['swim'] },
  { id: 'db_row',         name: 'Single-arm DB row', pattern: 'hpull', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true,    sportTags: ['swim'] },
  { id: 'cable_row',      name: 'Seated cable row',  pattern: 'hpull', equip: 'cable',     level: 0, role: 'accessory',                      sportTags: ['swim'] },
  { id: 'chest_supported_row', name: 'Chest-supported row', pattern: 'hpull', equip: 'dumbbell', level: 0, role: 'accessory',                sportTags: ['swim'] },
  { id: 'inverted_row',   name: 'Inverted row',      pattern: 'hpull', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'band_row',       name: 'Band row',          pattern: 'hpull', equip: 'band',      level: 0, role: 'accessory' },

  // ---------------- VERTICAL PULL ----------------
  { id: 'pullup',         name: 'Pull-up',           pattern: 'vpull', equip: 'bodyweight', level: 2, role: 'primary',                       minLevelForPrimary: 'intermediate' },
  { id: 'lat_pulldown',   name: 'Lat pulldown',      pattern: 'vpull', equip: 'cable',     level: 0, role: 'primary',                        minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'assisted_pullup', name: 'Band-assisted pull-up', pattern: 'vpull', equip: 'bodyweight', level: 0, role: 'accessory',               sportTags: ['swim'] },
  { id: 'straight_arm_pd', name: 'Straight-arm pulldown', pattern: 'vpull', equip: 'cable', level: 1, role: 'accessory',                    sportTags: ['swim'] },

  // ---------------- CARRY ----------------
  { id: 'farmer_carry',   name: 'Farmer carry',      pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory',                      goalTags: ['functional', 'strength'] },
  { id: 'suitcase_carry', name: 'Suitcase carry',    pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true,    goalTags: ['functional'],              sportTags: ['run', 'cycle', 'swim'] },
  { id: 'bw_carry',       name: 'Backpack carry',    pattern: 'carry', equip: 'bodyweight', level: 0, role: 'accessory' },

  // ---------------- CORE ----------------
  { id: 'plank',          name: 'Plank',             pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional', 'strength'], sportTags: ['run', 'cycle', 'swim'] },
  { id: 'pallof',         name: 'Pallof press',      pattern: 'core', equip: 'cable',      level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'band_pallof',    name: 'Band Pallof press', pattern: 'core', equip: 'band',       level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'dead_bug',       name: 'Dead bug',          pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'hanging_knee',   name: 'Hanging knee raise', pattern: 'core', equip: 'bodyweight', level: 1, role: 'core' },
  { id: 'side_plank',     name: 'Side plank',        pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'copenhagen',     name: 'Copenhagen plank',  pattern: 'core', equip: 'bodyweight', level: 3, role: 'core',                                       sportTags: ['run', 'cycle', 'swim'] },

  // ---------------- CALF ----------------
  { id: 'calf_raise',     name: 'Calf raise',        pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'] },
  { id: 'sl_calf',        name: 'Single-leg calf raise', pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'], unilateral: true },
  { id: 'seated_calf',    name: 'Seated calf raise', pattern: 'calf', equip: 'machine',    level: 0, role: 'iso', sportTags: ['run', 'cycle'] },

  // ---------------- ISOLATION (bodybuilding accents) ----------------
  { id: 'lateral_raise',  name: 'Lateral raise',     pattern: 'iso', muscle: 'sidedelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'rear_fly',       name: 'Rear-delt fly',     pattern: 'iso', muscle: 'reardelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'face_pull',      name: 'Face pull',         pattern: 'iso', muscle: 'reardelt', equip: 'cable',    level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
  { id: 'band_face_pull', name: 'Band face pull',    pattern: 'iso', muscle: 'reardelt', equip: 'band',     level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
  { id: 'biceps_curl',    name: 'Biceps curl',       pattern: 'iso', muscle: 'biceps',  equip: 'dumbbell',  level: 0, role: 'iso' },
  { id: 'band_curl',      name: 'Band curl',         pattern: 'iso', muscle: 'biceps',  equip: 'band',      level: 0, role: 'iso' },
  { id: 'triceps_pushdown', name: 'Triceps pushdown', pattern: 'iso', muscle: 'triceps', equip: 'cable',   level: 0, role: 'iso' },
  { id: 'overhead_ext',   name: 'Overhead triceps ext.', pattern: 'iso', muscle: 'triceps', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'diamond_pushup', name: 'Close-grip push-up', pattern: 'iso', muscle: 'triceps', equip: 'bodyweight', level: 0, role: 'iso' },
  { id: 'leg_curl',       name: 'Leg curl',          pattern: 'iso', muscle: 'ham',     equip: 'machine',   level: 0, role: 'iso', sportTags: ['run', 'cycle'] },
  { id: 'nordic_curl',    name: 'Nordic curl',       pattern: 'iso', muscle: 'ham',     equip: 'bodyweight', level: 3, role: 'iso', sportTags: ['run', 'cycle'] },
  { id: 'leg_ext',        name: 'Leg extension',     pattern: 'iso', muscle: 'quad',    equip: 'machine',   level: 0, role: 'iso' },
  { id: 'chest_fly',      name: 'Chest fly',         pattern: 'iso', muscle: 'chest',   equip: 'dumbbell',  level: 0, role: 'iso' },

  // ---------------- HYPERTROPHY ACCENTS ----------------
  { id: 'incline_db_curl',      name: 'Incline DB Curl',                  pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'spider_curl',          name: 'Spider Curl',                      pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'overhead_cable_ext',   name: 'Overhead Cable Tricep Extension',  pattern: 'iso',    muscle: 'triceps',   equip: 'cable',      level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'low_high_cable_fly',   name: 'Low-to-High Cable Fly',            pattern: 'hpush',                       equip: 'cable',      level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'seated_leg_curl',      name: 'Seated Leg Curl',                  pattern: 'iso',    muscle: 'ham',       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'] },
  { id: 'heel_elevated_goblet', name: 'Heel-Elevated Goblet Squat',       pattern: 'squat',                       equip: 'dumbbell',   level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'reverse_pec_deck',     name: 'Reverse Pec Deck',                 pattern: 'hpull',                       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'serratus_punch_cable', name: 'Serratus Punch (cable)',           pattern: 'core',                        equip: 'cable',      level: 1, role: 'core',      minLevelForPrimary: 'returning',    goalTags: ['hypertrophy', 'functional'], sportTags: ['swim'] },
  { id: 'prone_y_raise',        name: 'Prone Y Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy', 'functional'], sportTags: ['swim', 'functional'] },
  { id: 'prone_t_raise',        name: 'Prone T Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'prone_w_raise',        name: 'Prone W Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'db_pullover',          name: 'DB Pullover',                      pattern: 'hpull',                       equip: 'dumbbell',   level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['hypertrophy'] },
  { id: 'jm_press',             name: 'JM Press',                         pattern: 'hpush',                       equip: 'barbell',    level: 3, role: 'accessory', minLevelForPrimary: 'advanced',     goalTags: ['strength'] },
  { id: 'close_grip_bench',     name: 'Close-Grip Bench Press',           pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'hypertrophy'] },
  { id: 'ab_wheel',             name: 'Ab Wheel Rollout',                 pattern: 'core',                        equip: 'bodyweight', level: 2, role: 'core',                                          goalTags: ['strength', 'functional'] },
  { id: 'pause_squat',          name: 'Pause Squat (2-3s)',               pattern: 'squat',                       equip: 'barbell',    level: 2, role: 'primary',   minLevelForPrimary: 'intermediate', goalTags: ['strength'], liftKey: 'squat' },
  { id: 'rack_pull',            name: 'Rack Pull',                        pattern: 'hinge',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'deficit_deadlift',     name: 'Deficit Deadlift',                 pattern: 'hinge',                       equip: 'barbell',    level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     goalTags: ['strength'], liftKey: 'deadlift' },
  { id: 'floor_press',          name: 'Floor Press',                      pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'seated_box_jump',      name: 'Seated Box Jump',                  pattern: 'squat',                       equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'functional'], sportTags: ['run'] },

  // ---------------- FUNCTIONAL / DESK-JOB COUNTERBALANCE ----------------
  // activationPrimer:true → prepended to every functional session by buildWeek()
  { id: 'hip_flexor_90_90',        name: '90/90 Hip Flexor Stretch',       pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'glute_bridge_activation',  name: 'Glute Bridge (2s hold)',         pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'band_pull_apart',          name: 'Band Pull-Apart',                pattern: 'hpull',    equip: 'band',       level: 0, role: 'iso',   activationPrimer: true,  goalTags: ['functional', 'hypertrophy'], sportTags: ['swim'] },
  { id: 'cat_camel_thoracic',       name: 'Cat-Camel + Thoracic Rotation', pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: true,  goalTags: ['functional'] },
  { id: 'half_kneeling_pallof',     name: 'Half-Kneeling Pallof Press',    pattern: 'core',     equip: 'cable',      level: 1, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['run', 'swim'] },
  { id: 'serratus_wall_slide',      name: 'Serratus Wall Slide',            pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'bird_dog',                 name: 'Bird Dog (5s hold)',             pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional', 'strength'] },
  { id: 'tall_kneeling_landmine',   name: 'Tall-Kneeling Landmine Press',  pattern: 'vpush',    equip: 'barbell',    level: 1, role: 'accessory', minLevelForPrimary: 'returning', activationPrimer: false, goalTags: ['functional'] },
  { id: 'prone_hip_extension',      name: 'Prone Hip Extension',           pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'iso',   activationPrimer: false, goalTags: ['functional'], sportTags: ['cycle'] },
  { id: 'thoracic_foam_roller',     name: 'Thoracic Foam Roller Extension',pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  activationPrimer: false, goalTags: ['functional'], sportTags: ['cycle'] },

  // ---------------- RUN SUPPORT ----------------
  { id: 'double_leg_pogo',     name: 'Double-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['run'], goalTags: ['functional'] },
  { id: 'sl_pogo_jump',        name: 'Single-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'bounding_a_skip',     name: 'A-Skip / Bounding',         pattern: 'lunge',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'lateral_band_walk',   name: 'Lateral Band Walk',         pattern: 'iso',    muscle: 'glutes', equip: 'band', level: 0, role: 'iso', minLevelForPrimary: 'beginner',  sportTags: ['run', 'cycle'], goalTags: ['functional'] },
  { id: 'sl_hip_abduction',    name: 'Side-Lying Hip Abduction',  pattern: 'iso',    muscle: 'glutes', equip: 'dumbbell', level: 1, role: 'iso', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },
  { id: 'sl_squat_to_box',     name: 'Single-Leg Squat to Box',   pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'tibialis_raise',      name: 'Tibialis Raise',            pattern: 'iso',    muscle: 'quad',  equip: 'bodyweight', level: 0, role: 'iso', minLevelForPrimary: 'beginner',    sportTags: ['run'] },
  { id: 'glute_bridge_single_leg', name: 'Single-Leg Glute Bridge', pattern: 'hinge', equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },

  // ── Sprint-specific exercises ────────────────────────────────────────────
  { id: 'hang_clean',  name: 'Hang Clean',  pattern: 'squat', equip: 'barbell',    level: 2, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'power_clean', name: 'Power Clean', pattern: 'squat', equip: 'barbell',    level: 3, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'advanced' },
  { id: 'depth_jump',  name: 'Depth Jump',  pattern: 'squat', equip: 'bodyweight', level: 2, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'broad_jump',  name: 'Broad Jump',  pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'returning' },
  { id: 'sled_push',   name: 'Sled Push',   pattern: 'lunge', equip: 'other',      level: 0, role: 'accessory', sportTags: ['run_sprint'] },

  // ---------------- CYCLE SUPPORT ----------------
  { id: 'sl_leg_press',  name: 'Single-Leg Leg Press',  pattern: 'squat', equip: 'machine',    level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['cycle'] },

  // ---------------- SWIM SUPPORT ----------------
  { id: 'sl_ext_rotation',       name: 'Side-Lying External Rotation',   pattern: 'iso', muscle: 'shoulders', equip: 'dumbbell', level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_ext_rotation_90', name: 'Cable ER at 90° Abduction',      pattern: 'iso', muscle: 'shoulders', equip: 'cable',    level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_woodchop',        name: 'Cable Woodchop (high-to-low)',   pattern: 'core',                     equip: 'cable',    level: 2, role: 'core',                                          goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'ankle_plantarflex_band',name: 'Banded Ankle Plantarflexion',    pattern: 'calf',                     equip: 'band',     level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     sportTags: ['swim'] },
  { id: 'glute_ham_raise',       name: 'Glute-Ham Raise',                pattern: 'hinge',                    equip: 'machine',  level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     sportTags: ['swim'] }
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
