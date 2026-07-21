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
 *   equipDetail (optional) a specific station/bar/machine key from the equipment
 *            taxonomy (data/equipmentTaxonomy.js). Read ONLY when a user supplies
 *            accessDetail, to NARROW selection within a detailed base — absent
 *            detail, it is inert (see exerciseAvailable there). Never gates today.
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
  { id: 'back_squat', axialLoad: 2,     name: 'Back squat',        pattern: 'squat', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'returning' },
  { id: 'front_squat', axialLoad: 2, stretchBias: true,    name: 'Front squat',       pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'intermediate' },
  { id: 'goblet_squat',   name: 'Goblet squat',      pattern: 'squat', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'hack_squat', stretchBias: true,     name: 'Hack / leg-press',  pattern: 'squat', equip: 'machine',   level: 0, role: 'accessory' },
  { id: 'bw_squat', loadClass: 'bodyweightStrength',       name: 'Bodyweight squat',  pattern: 'squat', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'tempo_squat', loadClass: 'bodyweightStrength',    name: 'Tempo squat (3s down)', pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'box_squat', axialLoad: 2, quality: 'strength',      name: 'Box squat',         pattern: 'squat', equip: 'barbell',   level: 2, role: 'primary', liftKey: 'squat',     minLevelForPrimary: 'intermediate' },

  // ---------------- HINGE ----------------
  { id: 'deadlift', axialLoad: 2,       name: 'Deadlift',          pattern: 'hinge', equip: 'barbell',   level: 1, role: 'primary', liftKey: 'deadlift',  minLevelForPrimary: 'returning' },
  { id: 'trap_bar_dl', axialLoad: 1, equipDetail: 'trap_bar',    name: 'Trap-bar deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'deadlift' },
  { id: 'rdl', cns: 'high', axialLoad: 1, stretchBias: true,            name: 'Romanian deadlift', pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory', liftKey: 'deadlift', sportTags: ['run', 'cycle'],          goalTags: ['strength'] },
  { id: 'db_rdl', cns: 'high', axialLoad: 1, stretchBias: true,         name: 'DB Romanian deadlift', pattern: 'hinge', equip: 'dumbbell', level: 0, role: 'accessory',                    sportTags: ['run', 'cycle'] },
  { id: 'hip_thrust',     name: 'Hip thrust',        pattern: 'hinge', equip: 'barbell',   level: 0, role: 'accessory',                      sportTags: ['cycle', 'swim'],          goalTags: ['strength'] },
  { id: 'glute_bridge', loadClass: 'bodyweightStrength',   name: 'Glute bridge',      pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'sl_hinge', loadClass: 'bodyweightStrength',       name: 'Single-leg hip hinge', pattern: 'hinge', equip: 'bodyweight', level: 0, role: 'accessory',                  sportTags: ['run', 'cycle', 'swim'],   minLevelForPrimary: 'returning' },
  { id: 'kb_swing', axialLoad: 1,       name: 'Kettlebell swing',  pattern: 'hinge', equip: 'kettlebell', level: 1, role: 'accessory',                     sportTags: ['run'],                    minLevelForPrimary: 'returning' },
  { id: 'good_morning', cns: 'high', axialLoad: 2, stretchBias: true, quality: 'strength',   name: 'Good morning',      pattern: 'hinge', equip: 'barbell',   level: 2, role: 'accessory',                                                             minLevelForPrimary: 'intermediate' },

  // ---------------- LUNGE / single-leg ----------------
  { id: 'split_squat', axialLoad: 1, stretchBias: true,    name: 'Bulgarian split squat', pattern: 'lunge', equip: 'dumbbell', level: 0, role: 'accessory', unilateral: true, sportTags: ['run', 'cycle'] },
  { id: 'bw_split_squat', axialLoad: 1, stretchBias: true, loadClass: 'bodyweightStrength', name: 'Split squat',       pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'walking_lunge', axialLoad: 1,  name: 'Walking lunge',     pattern: 'lunge', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },
  { id: 'reverse_lunge', loadClass: 'bodyweightStrength',  name: 'Reverse lunge',     pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true },
  { id: 'step_up', loadClass: 'bodyweightStrength',        name: 'Step-up',           pattern: 'lunge', equip: 'bodyweight', level: 0, role: 'accessory', unilateral: true, sportTags: ['run'] },
  { id: 'cossack_squat', loadClass: 'bodyweightStrength',  name: 'Cossack squat',     pattern: 'lunge', equip: 'bodyweight', level: 2, role: 'accessory', unilateral: true },

  // ---------------- HORIZONTAL PUSH ----------------
  { id: 'bench',          name: 'Bench press',       pattern: 'hpush', equip: 'barbell',   level: 0, role: 'primary', liftKey: 'bench',     minLevelForPrimary: 'returning' },
  { id: 'db_bench',       name: 'DB bench press',    pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'primary', liftKey: 'bench' },
  { id: 'incline_bench',  name: 'Incline bench press', pattern: 'hpush', equip: 'barbell', level: 1, role: 'accessory' },
  { id: 'incline_db', stretchBias: true,     name: 'Incline DB press',  pattern: 'hpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pushup', loadClass: 'bodyweightStrength',         name: 'Push-up',           pattern: 'hpush', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'decline_pushup', loadClass: 'bodyweightStrength', name: 'Feet-elevated push-up', pattern: 'hpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'dip', stretchBias: true, loadClass: 'bodyweightStrength', equipDetail: 'dip_station',            name: 'Dip',               pattern: 'hpush', equip: 'bodyweight', level: 2, role: 'accessory' },

  // ---------------- VERTICAL PUSH ----------------
  { id: 'ohp', axialLoad: 2,            name: 'Overhead press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'primary',                        minLevelForPrimary: 'intermediate' },
  { id: 'db_ohp', axialLoad: 1,         name: 'DB shoulder press', pattern: 'vpush', equip: 'dumbbell',  level: 0, role: 'accessory' },
  { id: 'pike_pushup', loadClass: 'bodyweightStrength',    name: 'Pike push-up',      pattern: 'vpush', equip: 'bodyweight', level: 1, role: 'accessory' },
  { id: 'landmine_press', axialLoad: 1, equipDetail: 'landmine', name: 'Landmine press',    pattern: 'vpush', equip: 'barbell',   level: 1, role: 'accessory' },

  // ---------------- HORIZONTAL PULL ----------------
  { id: 'barbell_row', axialLoad: 2,    name: 'Barbell row',       pattern: 'hpull', equip: 'barbell',   level: 1, role: 'primary',                        minLevelForPrimary: 'intermediate', sportTags: ['swim'] },
  { id: 'db_row', axialLoad: 1,         name: 'Single-arm DB row', pattern: 'hpull', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true,    sportTags: ['swim'] },
  { id: 'cable_row',      name: 'Seated cable row',  pattern: 'hpull', equip: 'cable',     level: 0, role: 'accessory',                      sportTags: ['swim'] },
  { id: 'chest_supported_row', name: 'Chest-supported row', pattern: 'hpull', equip: 'dumbbell', level: 0, role: 'accessory',                sportTags: ['swim'] },
  { id: 'inverted_row', loadClass: 'bodyweightStrength',   name: 'Inverted row',      pattern: 'hpull', equip: 'bodyweight', level: 0, role: 'accessory' },
  { id: 'band_row',       name: 'Band row',          pattern: 'hpull', equip: 'band',      level: 0, role: 'accessory' },

  // ---------------- VERTICAL PULL ----------------
  { id: 'pullup', equipDetail: 'pullup_bar',         name: 'Pull-up',           pattern: 'vpull', equip: 'bodyweight', level: 2, role: 'primary',                       minLevelForPrimary: 'intermediate' },
  { id: 'lat_pulldown', repFloor: 6, equipDetail: 'lat_pulldown',  name: 'Lat pulldown',      pattern: 'vpull', equip: 'cable',     level: 0, role: 'primary',                        minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'assisted_pullup', equipDetail: 'pullup_bar', name: 'Band-assisted pull-up', pattern: 'vpull', equip: 'bodyweight', level: 0, role: 'accessory',               sportTags: ['swim'] },
  { id: 'straight_arm_pd', stretchBias: true, quality: 'hypertrophy', name: 'Straight-arm pulldown', pattern: 'vpull', equip: 'cable', level: 1, role: 'accessory',                    sportTags: ['swim'] },

  // ---------------- CARRY ----------------
  { id: 'farmer_carry', axialLoad: 1,   name: 'Farmer carry',      pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory',                      goalTags: ['functional', 'strength'] },
  { id: 'suitcase_carry', axialLoad: 1, name: 'Suitcase carry',    pattern: 'carry', equip: 'dumbbell',  level: 0, role: 'accessory', unilateral: true,    goalTags: ['functional'],              sportTags: ['run', 'cycle', 'swim'] },
  { id: 'bw_carry', loadClass: 'bodyweightStrength',       name: 'Backpack carry',    pattern: 'carry', equip: 'bodyweight', level: 0, role: 'accessory' },

  // ---------------- CORE ----------------
  { id: 'plank', loadClass: 'isoCore',          name: 'Plank',             pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional', 'strength'], sportTags: ['run', 'cycle', 'swim'] },
  { id: 'pallof', loadClass: 'isoCore',         name: 'Pallof press',      pattern: 'core', equip: 'cable',      level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'band_pallof', loadClass: 'isoCore',    name: 'Band Pallof press', pattern: 'core', equip: 'band',       level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'dead_bug', loadClass: 'isoCore',       name: 'Dead bug',          pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'hanging_knee', equipDetail: 'pullup_bar',   name: 'Hanging knee raise', pattern: 'core', equip: 'bodyweight', level: 1, role: 'core' },
  { id: 'side_plank', loadClass: 'isoCore',     name: 'Side plank',        pattern: 'core', equip: 'bodyweight', level: 0, role: 'core', goalTags: ['functional'],             sportTags: ['run', 'cycle', 'swim'] },
  { id: 'copenhagen', loadClass: 'isoCore',     name: 'Copenhagen plank',  pattern: 'core', equip: 'bodyweight', level: 3, role: 'core',                                       sportTags: ['run', 'cycle', 'swim'] },

  // ---------------- CALF ----------------
  { id: 'calf_raise', stretchBias: true,     name: 'Calf raise',        pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'] },
  { id: 'sl_calf', stretchBias: true,        name: 'Single-leg calf raise', pattern: 'calf', equip: 'bodyweight', level: 0, role: 'iso', sportTags: ['run'], unilateral: true },
  { id: 'seated_calf', stretchBias: true, equipDetail: 'calf_raise_machine',    name: 'Seated calf raise', pattern: 'calf', equip: 'machine',    level: 0, role: 'iso', sportTags: ['run', 'cycle'] },

  // ---------------- ISOLATION (bodybuilding accents) ----------------
  { id: 'lateral_raise', quality: 'hypertrophy',  name: 'Lateral raise',     pattern: 'iso', muscle: 'sidedelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'rear_fly', quality: 'hypertrophy',       name: 'Rear-delt fly',     pattern: 'iso', muscle: 'reardelt', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'face_pull',      name: 'Face pull',         pattern: 'iso', muscle: 'reardelt', equip: 'cable',    level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
  { id: 'band_face_pull', name: 'Band face pull',    pattern: 'iso', muscle: 'reardelt', equip: 'band',     level: 0, role: 'iso', sportTags: ['swim'],          goalTags: ['functional'] },
  { id: 'biceps_curl', quality: 'hypertrophy',    name: 'Biceps curl',       pattern: 'iso', muscle: 'biceps',  equip: 'dumbbell',  level: 0, role: 'iso' },
  { id: 'band_curl', quality: 'hypertrophy',      name: 'Band curl',         pattern: 'iso', muscle: 'biceps',  equip: 'band',      level: 0, role: 'iso' },
  { id: 'triceps_pushdown', quality: 'hypertrophy', name: 'Triceps pushdown', pattern: 'iso', muscle: 'triceps', equip: 'cable',   level: 0, role: 'iso' },
  { id: 'overhead_ext', stretchBias: true, quality: 'hypertrophy',   name: 'Overhead triceps ext.', pattern: 'iso', muscle: 'triceps', equip: 'dumbbell', level: 0, role: 'iso' },
  { id: 'diamond_pushup', loadClass: 'bodyweightStrength', name: 'Close-grip push-up', pattern: 'iso', muscle: 'triceps', equip: 'bodyweight', level: 0, role: 'iso' },
  { id: 'leg_curl', quality: 'hypertrophy', equipDetail: 'leg_curl_machine',       name: 'Leg curl',          pattern: 'iso', muscle: 'ham',     equip: 'machine',   level: 0, role: 'iso', sportTags: ['run', 'cycle'] },
  { id: 'nordic_curl', stretchBias: true, repCap: 6,    name: 'Nordic curl',       pattern: 'iso', muscle: 'ham',     equip: 'bodyweight', level: 3, role: 'iso', sportTags: ['run', 'cycle'] },
  { id: 'leg_ext', quality: 'hypertrophy', equipDetail: 'leg_extension_machine',        name: 'Leg extension',     pattern: 'iso', muscle: 'quad',    equip: 'machine',   level: 0, role: 'iso' },
  { id: 'chest_fly', stretchBias: true, quality: 'hypertrophy',      name: 'Chest fly',         pattern: 'iso', muscle: 'chest',   equip: 'dumbbell',  level: 0, role: 'iso' },

  // ---------------- HYPERTROPHY ACCENTS ----------------
  { id: 'incline_db_curl', stretchBias: true, quality: 'hypertrophy',      name: 'Incline DB Curl',                  pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'spider_curl', quality: 'hypertrophy',          name: 'Spider Curl',                      pattern: 'iso',    muscle: 'biceps',    equip: 'dumbbell',   level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'overhead_cable_ext', stretchBias: true, quality: 'hypertrophy',   name: 'Overhead Cable Tricep Extension',  pattern: 'iso',    muscle: 'triceps',   equip: 'cable',      level: 1, role: 'iso',       minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'low_high_cable_fly', stretchBias: true, quality: 'hypertrophy',   name: 'Low-to-High Cable Fly',            pattern: 'hpush',                       equip: 'cable',      level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'seated_leg_curl', stretchBias: true, quality: 'hypertrophy', equipDetail: 'leg_curl_machine',      name: 'Seated Leg Curl',                  pattern: 'iso',    muscle: 'ham',       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'] },
  { id: 'heel_elevated_goblet', stretchBias: true, name: 'Heel-Elevated Goblet Squat',       pattern: 'squat',                       equip: 'dumbbell',   level: 1, role: 'accessory', minLevelForPrimary: 'returning',    goalTags: ['hypertrophy'] },
  { id: 'reverse_pec_deck', quality: 'hypertrophy',     name: 'Reverse Pec Deck',                 pattern: 'hpull',                       equip: 'machine',    level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'serratus_punch_cable', loadClass: 'health', name: 'Serratus Punch (cable)',           pattern: 'core',                        equip: 'cable',      level: 1, role: 'core',      minLevelForPrimary: 'returning',    goalTags: ['hypertrophy', 'functional'], sportTags: ['swim'] },
  { id: 'prone_y_raise', loadClass: 'health',        name: 'Prone Y Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy', 'functional'], sportTags: ['swim', 'functional'] },
  { id: 'prone_t_raise', loadClass: 'health',        name: 'Prone T Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'prone_w_raise', loadClass: 'health',        name: 'Prone W Raise',                    pattern: 'hpull',                       equip: 'dumbbell',   level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     goalTags: ['hypertrophy'], sportTags: ['swim'] },
  { id: 'db_pullover', stretchBias: true, quality: 'hypertrophy',          name: 'DB Pullover',                      pattern: 'hpull',                       equip: 'dumbbell',   level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['hypertrophy'] },
  { id: 'jm_press',             name: 'JM Press',                         pattern: 'hpush',                       equip: 'barbell',    level: 3, role: 'accessory', minLevelForPrimary: 'advanced',     goalTags: ['strength'] },
  { id: 'close_grip_bench',     name: 'Close-Grip Bench Press',           pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'hypertrophy'] },
  { id: 'ab_wheel',             name: 'Ab Wheel Rollout',                 pattern: 'core',                        equip: 'bodyweight', level: 2, role: 'core',                                          goalTags: ['strength', 'functional'] },
  { id: 'pause_squat', quality: 'strength',          name: 'Pause Squat (2-3s)',               pattern: 'squat',                       equip: 'barbell',    level: 2, role: 'primary',   minLevelForPrimary: 'intermediate', goalTags: ['strength'], liftKey: 'squat' },
  { id: 'rack_pull', cns: 'high', axialLoad: 2, quality: 'strength',            name: 'Rack Pull',                        pattern: 'hinge',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'deficit_deadlift', axialLoad: 2, quality: 'strength',     name: 'Deficit Deadlift',                 pattern: 'hinge',                       equip: 'barbell',    level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     goalTags: ['strength'], liftKey: 'deadlift' },
  { id: 'floor_press', quality: 'strength',          name: 'Floor Press',                      pattern: 'hpush',                       equip: 'barbell',    level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength'] },
  { id: 'seated_box_jump', quality: 'power',      name: 'Seated Box Jump',                  pattern: 'squat',                       equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', goalTags: ['strength', 'functional'], sportTags: ['run'] },

  // ---------------- FUNCTIONAL / DESK-JOB COUNTERBALANCE ----------------
  // mobility-pattern + health-class items: the functional primer (prepended by
  // buildWeek) and supportive-finisher pool. They count zero toward volume.
  { id: 'hip_flexor_90_90',        name: '90/90 Hip Flexor Stretch',       pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',   goalTags: ['functional'] },
  { id: 'glute_bridge_activation', loadClass: 'health',  name: 'Glute Bridge (2s hold)',         pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'core',   goalTags: ['functional'] },
  { id: 'band_pull_apart', loadClass: 'health',          name: 'Band Pull-Apart',                pattern: 'hpull',    equip: 'band',       level: 0, role: 'iso',    goalTags: ['functional', 'hypertrophy'], sportTags: ['swim'] },
  { id: 'cat_camel_thoracic',       name: 'Cat-Camel + Thoracic Rotation', pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',   goalTags: ['functional'] },
  { id: 'half_kneeling_pallof', loadClass: 'isoCore',     name: 'Half-Kneeling Pallof Press',    pattern: 'core',     equip: 'cable',      level: 1, role: 'core',  goalTags: ['functional'], sportTags: ['run', 'swim'] },
  { id: 'serratus_wall_slide', loadClass: 'health',      name: 'Serratus Wall Slide',            pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'bird_dog', loadClass: 'isoCore',                 name: 'Bird Dog (5s hold)',             pattern: 'core',     equip: 'bodyweight', level: 0, role: 'core',  goalTags: ['functional', 'strength'] },
  { id: 'tall_kneeling_landmine', axialLoad: 1, equipDetail: 'landmine',   name: 'Tall-Kneeling Landmine Press',  pattern: 'vpush',    equip: 'barbell',    level: 1, role: 'accessory', minLevelForPrimary: 'returning', goalTags: ['functional'] },
  { id: 'prone_hip_extension', loadClass: 'health',      name: 'Prone Hip Extension',           pattern: 'hinge',    equip: 'bodyweight', level: 0, role: 'iso',   goalTags: ['functional'], sportTags: ['cycle'] },
  { id: 'thoracic_foam_roller',     name: 'Thoracic Foam Roller Extension',pattern: 'mobility', equip: 'bodyweight', level: 0, role: 'core',  goalTags: ['functional'], sportTags: ['cycle'] },

  // ---------------- RUN SUPPORT ----------------
  { id: 'double_leg_pogo', quality: 'power',     name: 'Double-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['run'], goalTags: ['functional'] },
  { id: 'sl_pogo_jump', quality: 'power',        name: 'Single-Leg Pogo Jump',      pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'bounding_a_skip', quality: 'power',     name: 'A-Skip / Bounding',         pattern: 'lunge',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'lateral_band_walk',   name: 'Lateral Band Walk',         pattern: 'iso',    muscle: 'glutes', equip: 'band', level: 0, role: 'iso', minLevelForPrimary: 'beginner',  sportTags: ['run', 'cycle'], goalTags: ['functional'] },
  { id: 'sl_hip_abduction',    name: 'Side-Lying Hip Abduction',  pattern: 'iso',    muscle: 'glutes', equip: 'dumbbell', level: 1, role: 'iso', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },
  { id: 'sl_squat_to_box',     name: 'Single-Leg Squat to Box',   pattern: 'squat',  equip: 'bodyweight', level: 2, role: 'accessory', minLevelForPrimary: 'intermediate', sportTags: ['run'] },
  { id: 'tibialis_raise',      name: 'Tibialis Raise',            pattern: 'iso',    muscle: 'quad',  equip: 'bodyweight', level: 0, role: 'iso', minLevelForPrimary: 'beginner',    sportTags: ['run'] },
  { id: 'glute_bridge_single_leg', loadClass: 'bodyweightStrength', name: 'Single-Leg Glute Bridge', pattern: 'hinge', equip: 'bodyweight', level: 1, role: 'accessory', minLevelForPrimary: 'returning', sportTags: ['run', 'cycle'] },

  // ── Sprint-specific exercises ────────────────────────────────────────────
  { id: 'hang_clean', quality: 'power',  name: 'Hang Clean',  pattern: 'squat', equip: 'barbell',    level: 2, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'power_clean', quality: 'power', name: 'Power Clean', pattern: 'squat', equip: 'barbell',    level: 3, role: 'primary',   sportTags: ['run_sprint'], minLevelForPrimary: 'advanced' },
  { id: 'depth_jump', quality: 'power',  name: 'Depth Jump',  pattern: 'squat', equip: 'bodyweight', level: 2, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'intermediate' },
  { id: 'broad_jump', quality: 'power',  name: 'Broad Jump',  pattern: 'squat', equip: 'bodyweight', level: 1, role: 'accessory', sportTags: ['run_sprint'], minLevelForPrimary: 'returning' },
  { id: 'sled_push', quality: 'power', equipDetail: 'sled',   name: 'Sled Push',   pattern: 'lunge', equip: 'machine',    level: 0, role: 'accessory', sportTags: ['run_sprint'] },

  // ---------------- CYCLE SUPPORT ----------------
  { id: 'sl_leg_press',  name: 'Single-Leg Leg Press',  pattern: 'squat', equip: 'machine',    level: 1, role: 'accessory', minLevelForPrimary: 'returning',    sportTags: ['cycle'] },

  // ---------------- SWIM SUPPORT ----------------
  { id: 'sl_ext_rotation',       name: 'Side-Lying External Rotation',   pattern: 'iso', muscle: 'shoulders', equip: 'dumbbell', level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_ext_rotation_90', name: 'Cable ER at 90° Abduction',      pattern: 'iso', muscle: 'shoulders', equip: 'cable',    level: 1, role: 'iso',       minLevelForPrimary: 'returning',    sportTags: ['swim'] },
  { id: 'cable_woodchop',        name: 'Cable Woodchop (high-to-low)',   pattern: 'core',                     equip: 'cable',    level: 2, role: 'core',                                          goalTags: ['functional'], sportTags: ['swim'] },
  { id: 'ankle_plantarflex_band', loadClass: 'health',name: 'Banded Ankle Plantarflexion',    pattern: 'calf',                     equip: 'band',     level: 0, role: 'iso',       minLevelForPrimary: 'beginner',     sportTags: ['swim'] },
  { id: 'glute_ham_raise', stretchBias: true, repCap: 8, equipDetail: 'ghd',       name: 'Glute-Ham Raise',                pattern: 'hinge',                    equip: 'machine',  level: 3, role: 'primary',   minLevelForPrimary: 'advanced',     sportTags: ['swim'] },

  // ---------------- OLYMPIC + POWERLIFTING CATALOGUE LIFTS (WP-49 Plan 1) ----------------
  // discipline-gated: `discipline` marks these as ONLY selectable when ctx.discipline
  // matches (see allocator.js's discipline gate) — every current caller leaves
  // ctx.discipline undefined, so these never enter a build/sport plan (byte-identical).
  // Technical lifts, not volume drivers — muscle contribution comes from `pattern`
  // (PATTERN_CONTRIB) like every other compound; no inline muscle maps here.
  { id: 'snatch', axialLoad: 3, quality: 'power', name: 'Snatch', pattern: 'olympic', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'clean_and_jerk', axialLoad: 3, quality: 'power', name: 'Clean and Jerk', pattern: 'olympic', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'power_snatch', axialLoad: 3, quality: 'power', name: 'Power Snatch', pattern: 'olympic', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'hang_snatch', axialLoad: 3, quality: 'power', name: 'Hang Snatch', pattern: 'olympic', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'split_jerk', axialLoad: 3, quality: 'power', name: 'Split Jerk', pattern: 'olympic', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'overhead_squat', axialLoad: 3, quality: 'power', name: 'Overhead Squat', pattern: 'squat', equip: 'barbell', level: 3, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'advanced' },
  { id: 'push_press', axialLoad: 2, quality: 'power', name: 'Push Press', pattern: 'vpush', equip: 'barbell', level: 2, role: 'primary', discipline: 'olympic', minLevelForPrimary: 'intermediate' },
  { id: 'snatch_pull', axialLoad: 3, quality: 'power', name: 'Snatch Pull', pattern: 'olympic', equip: 'barbell', level: 2, role: 'accessory', discipline: 'olympic', minLevelForPrimary: 'intermediate' },
  { id: 'clean_pull', axialLoad: 3, quality: 'power', name: 'Clean Pull', pattern: 'olympic', equip: 'barbell', level: 2, role: 'accessory', discipline: 'olympic', minLevelForPrimary: 'intermediate' },
  { id: 'muscle_snatch', axialLoad: 2, quality: 'power', name: 'Muscle Snatch', pattern: 'olympic', equip: 'barbell', level: 2, role: 'accessory', discipline: 'olympic', minLevelForPrimary: 'intermediate' },
  { id: 'board_press', axialLoad: 1, quality: 'strength', name: 'Board Press', pattern: 'hpush', equip: 'barbell', level: 2, role: 'accessory', discipline: 'powerlifting', liftKey: 'bench', minLevelForPrimary: 'intermediate' },
  { id: 'pin_squat', axialLoad: 2, quality: 'strength', name: 'Pin Squat', pattern: 'squat', equip: 'barbell', level: 2, role: 'accessory', discipline: 'powerlifting', liftKey: 'squat', minLevelForPrimary: 'intermediate' }
];

// Equipment keys an exercise can require.
export const EQUIP_KEYS = ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'kettlebell', 'bodyweight'];

// Equipment the athlete can use. Accepts the onboarding ACCESS TIERS
// (full_gym / home_weights / none) and also DIRECT equipment keys (e.g.
// ['dumbbell','band']) — the latter is what the on-demand "train now" picker
// passes when you only have what's in front of you. Bodyweight is always implied.
//
// The OPTIONAL finer-grained "detailed equipment" layer (narrow-only) lives in
// data/equipmentTaxonomy.js: availableEquipDetailed() wraps this, exerciseAvailable()
// applies the narrowing. Kept there (not here) so the taxonomy owns its own logic
// and this module stays the single, dependency-free source for the 7 base categories.
export function availableEquip(access = []) {
  const has = k => access.includes(k);
  if (has('full_gym')) return new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'kettlebell']);
  if (has('home_weights')) return new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'kettlebell']);
  const direct = access.filter(k => EQUIP_KEYS.includes(k));
  if (direct.length) return new Set([...direct, 'bodyweight']);
  return new Set(['bodyweight', 'band']);
}

// WP-46 (completion): governed id-keyed maps that REPLACE the name-fuzzy joins in the plan
// path — keyed by exId so a display-name change can't break progression tracking or the core
// hold/reps scheme (the fragility WP-41 fixed for injuries). Values reproduce the previous
// name-regex matchers exactly (name matching stays as the fallback for un-stamped items).

// exId → the barbell lift its top-set logs progress + the strength factor vs that lift
// (front/box squat etc. track the same e1RM). Barbell lifts only; DB/goblet excluded.
// Reproduces liftProgression.matchLift().
export const PROGRESSION_LIFTS = {
  back_squat:       { key: 'squat',    factor: 1 },
  front_squat:      { key: 'squat',    factor: 0.85 },
  box_squat:        { key: 'squat',    factor: 0.9 },
  deadlift:         { key: 'deadlift', factor: 1 },
  trap_bar_dl:      { key: 'deadlift', factor: 1 },
  rdl:              { key: 'deadlift', factor: 0.8 },
  bench:            { key: 'bench',    factor: 1 },
  incline_bench:    { key: 'bench',    factor: 1 },
  close_grip_bench: { key: 'bench',    factor: 1 },
  ohp:              { key: 'ohp',      factor: 1 },
  lat_pulldown:     { key: 'pull',     factor: 1 },
  deficit_deadlift: { key: 'deadlift', factor: 1 },
};

// Core exercises dosed as an isometric HOLD (time), not reps. Reproduces the allocator's
// /plank|hold|dead bug|copenhagen|hollow|bird dog/ regex over the current core catalogue.
export const CORE_HOLDS = new Set(['plank', 'dead_bug', 'side_plank', 'copenhagen', 'bird_dog']);

export default { EXERCISES, LEVELS, availableEquip, PROGRESSION_LIFTS, CORE_HOLDS };
