// src/lib/injury/contraindicationVocab.js
/**
 * ID / MOVEMENT-PATTERN contraindication vocabulary (TR-10 / P2-4).
 *
 * The injury safety join used to match on the exercise's DISPLAY NAME (a RegExp over
 * `item.name`, in profiles.js). That is fragile: a catalogue RENAME, or a NEW exercise
 * whose name dodges the patterns, silently ships a contraindicated lift to an injured
 * athlete (the reassessment's #1 latent safety risk; engine-audit TR-10; the recurring
 * risk the injury-classification pin was built to catch). This table re-keys the join on
 * the two things that DON'T drift with a display name: the exercise's stable `id` and its
 * `pattern` (movement class).
 *
 * Per region × rehab phase the contraindication is:
 *   patterns   — movement PATTERNS that are contraindicated for the region×phase. The
 *                exhaustive, future-proof key: ANY exercise of the pattern is blocked,
 *                including a brand-new catalogue entry the name-regex never anticipated
 *                (a novel exercise is caught by its pattern, never missed by a name gap).
 *   extraIds   — individual exercise IDS contraindicated whose PATTERN is not itself a
 *                contraindicated `patterns` member (cross-pattern items — e.g. the leg-curl
 *                / leg-extension isolations for a knee, the barbell row for a lower back).
 *   clearedIds — a COMPATIBILITY SNAPSHOT: the current-catalogue members of a contraindicated
 *                `patterns` class that the name-regex authoring did NOT block, so they keep
 *                their existing (regex-era) classification of not-blocked. This is what makes
 *                the id/pattern join reproduce today's blocking EXACTLY (the injury-
 *                classification pin is byte-identical). A NOVEL exercise of a contraindicated
 *                pattern is NOT on this list, so it is blocked by safe default — clearing it
 *                (declaring it safe for the region) is a deliberate, reviewed edit.
 *
 * Blocked ⇔  extraIds.has(id)  ||  (patterns.has(pattern) && !clearedIds.has(id))
 *
 * PROVENANCE: derived verbatim from the phase-staged contraindication authoring in
 * profiles.js (same clinical content, re-keyed onto id/pattern). The equivalence is
 * MACHINE-CHECKED against the regexes over the live catalogue by the injury-classification
 * pin (apps/mobile/tests/injury-classification-pin.js) — if the vocab and the regex
 * authoring ever diverge, that test fails. The severity policy (≤1 = no blocks, ≥4 = force
 * `protect`) is applied by injuryRules.getContraindicatedExercises, exactly as for the
 * regex path — this table holds the per-phase knowledge only.
 *
 * Residual (recorded, deferred to Simon's science review — the pin file's standing note):
 * the name-regex left a handful of EXISTING catalogue exercises un-blocked whose movement
 * pattern is contraindicated (they appear in `clearedIds`) — e.g. the ballistic olympic
 * lifts (`hang_clean`, `power_clean`) and running/plyo drills (`bounding_a_skip`,
 * `sled_push`) for a protected lower limb. This vocabulary PRESERVES that behaviour
 * (byte-identical) rather than silently re-classify clinical rules; promoting those from
 * cleared → blocked is a deliberate, adjudicated re-baseline, not part of this mechanism swap.
 */

// Bumped when the id/pattern contraindication knowledge changes (NOT the same axis as the
// knowledge-entries KNOWLEDGE_SET_VERSION, which stamps plan meta — this table does not).
export const CONTRAINDICATION_VOCAB_VERSION = '1.0.0';

const EMPTY_CELL = { patterns: [], extraIds: [], clearedIds: [] };

/** @type {Object<string, Object<string, {patterns:string[], extraIds:string[], clearedIds:string[]}>>} */
export const INJURY_CONTRAINDICATIONS = {
  knee: {
    protect: { patterns: ['hinge', 'lunge', 'squat'], extraIds: ['leg_curl', 'leg_ext', 'nordic_curl', 'seated_leg_curl'], clearedIds: ['bounding_a_skip', 'glute_ham_raise', 'good_morning', 'hang_clean', 'kb_swing', 'power_clean', 'prone_hip_extension', 'rack_pull', 'sled_push'] },
    early_motion: { patterns: ['lunge', 'squat'], extraIds: ['db_rdl', 'deadlift', 'deficit_deadlift', 'nordic_curl', 'rdl', 'trap_bar_dl'], clearedIds: ['bounding_a_skip', 'hang_clean', 'power_clean', 'sled_push'] },
    loading: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  ankle: {
    protect: { patterns: ['calf', 'lunge', 'squat'], extraIds: ['db_rdl', 'deadlift', 'deficit_deadlift', 'rdl', 'trap_bar_dl'], clearedIds: ['ankle_plantarflex_band', 'bounding_a_skip', 'hack_squat', 'hang_clean', 'power_clean', 'sl_leg_press', 'sled_push'] },
    early_motion: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  hamstring: {
    protect: { patterns: ['hinge'], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'leg_curl', 'nordic_curl', 'seated_box_jump', 'seated_leg_curl', 'sl_pogo_jump'], clearedIds: ['glute_bridge', 'glute_bridge_activation', 'glute_bridge_single_leg', 'glute_ham_raise', 'hip_thrust', 'prone_hip_extension', 'rack_pull'] },
    early_motion: { patterns: [], extraIds: ['broad_jump', 'db_rdl', 'deadlift', 'deficit_deadlift', 'depth_jump', 'double_leg_pogo', 'nordic_curl', 'rdl', 'seated_box_jump', 'sl_pogo_jump', 'trap_bar_dl'], clearedIds: [] },
    loading: { patterns: [], extraIds: ['depth_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  hip: {
    protect: { patterns: ['hinge', 'lunge', 'squat'], extraIds: [], clearedIds: ['bounding_a_skip', 'glute_ham_raise', 'good_morning', 'hack_squat', 'hang_clean', 'kb_swing', 'power_clean', 'prone_hip_extension', 'rack_pull', 'sl_hinge', 'sl_leg_press', 'sled_push'] },
    early_motion: { patterns: ['lunge', 'squat'], extraIds: ['db_rdl', 'deadlift', 'deficit_deadlift', 'rdl', 'trap_bar_dl'], clearedIds: ['bounding_a_skip', 'hack_squat', 'hang_clean', 'power_clean', 'sl_leg_press', 'sled_push', 'step_up'] },
    loading: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  calf: {
    protect: { patterns: ['calf', 'lunge', 'squat'], extraIds: [], clearedIds: ['ankle_plantarflex_band', 'bounding_a_skip', 'hack_squat', 'hang_clean', 'power_clean', 'sl_leg_press', 'sled_push', 'step_up'] },
    early_motion: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    loading: { patterns: [], extraIds: ['depth_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  shin: {
    protect: { patterns: ['lunge', 'squat'], extraIds: [], clearedIds: ['bounding_a_skip', 'hack_squat', 'hang_clean', 'power_clean', 'sl_leg_press', 'sled_push'] },
    early_motion: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    loading: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  quad: {
    protect: { patterns: ['lunge', 'squat'], extraIds: ['leg_ext'], clearedIds: ['bounding_a_skip', 'hang_clean', 'power_clean', 'sled_push'] },
    early_motion: { patterns: ['lunge', 'squat'], extraIds: [], clearedIds: ['bounding_a_skip', 'hack_squat', 'hang_clean', 'power_clean', 'sl_leg_press', 'sled_push', 'step_up'] },
    loading: { patterns: [], extraIds: ['broad_jump', 'depth_jump', 'double_leg_pogo', 'seated_box_jump', 'sl_pogo_jump'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  shoulder: {
    protect: { patterns: ['hpush', 'vpull', 'vpush'], extraIds: ['band_row', 'barbell_row', 'cable_row', 'chest_fly', 'chest_supported_row', 'db_row', 'diamond_pushup', 'inverted_row', 'lateral_raise', 'rear_fly'], clearedIds: ['board_press', 'floor_press', 'incline_db', 'jm_press', 'landmine_press', 'push_press', 'straight_arm_pd', 'tall_kneeling_landmine'] },
    early_motion: { patterns: ['vpull'], extraIds: ['bench', 'close_grip_bench', 'db_bench', 'db_ohp', 'dip', 'incline_bench', 'ohp'], clearedIds: ['straight_arm_pd'] },
    loading: { patterns: [], extraIds: ['assisted_pullup', 'db_ohp', 'ohp', 'pullup'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  elbow: {
    protect: { patterns: ['hpush'], extraIds: ['assisted_pullup', 'band_row', 'barbell_row', 'cable_row', 'chest_supported_row', 'db_row', 'diamond_pushup', 'inverted_row', 'overhead_cable_ext', 'overhead_ext', 'pike_pushup', 'pullup', 'triceps_pushdown'], clearedIds: ['board_press', 'floor_press', 'incline_db', 'jm_press', 'low_high_cable_fly'] },
    early_motion: { patterns: ['hpush'], extraIds: ['assisted_pullup', 'diamond_pushup', 'overhead_cable_ext', 'overhead_ext', 'pike_pushup', 'pullup', 'triceps_pushdown'], clearedIds: ['board_press', 'floor_press', 'incline_db', 'jm_press', 'low_high_cable_fly'] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  wrist: {
    protect: { patterns: ['hpush'], extraIds: ['assisted_pullup', 'band_row', 'barbell_row', 'cable_row', 'chest_supported_row', 'db_rdl', 'db_row', 'deadlift', 'deficit_deadlift', 'diamond_pushup', 'inverted_row', 'ohp', 'pike_pushup', 'pullup', 'rdl', 'trap_bar_dl'], clearedIds: ['board_press', 'floor_press', 'incline_db', 'jm_press', 'low_high_cable_fly'] },
    early_motion: { patterns: [], extraIds: ['assisted_pullup', 'bench', 'close_grip_bench', 'db_bench', 'db_rdl', 'deadlift', 'deficit_deadlift', 'incline_bench', 'ohp', 'pullup', 'rdl', 'trap_bar_dl'], clearedIds: [] },
    loading: { patterns: [], extraIds: ['ohp'], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  lumbar: {
    protect: { patterns: ['hinge'], extraIds: ['back_squat', 'barbell_row', 'box_squat', 'bw_split_squat', 'bw_squat', 'cossack_squat', 'front_squat', 'goblet_squat', 'heel_elevated_goblet', 'ohp', 'overhead_squat', 'pause_squat', 'pin_squat', 'sl_squat_to_box', 'split_squat', 'tempo_squat'], clearedIds: ['glute_bridge', 'glute_bridge_activation', 'glute_bridge_single_leg', 'glute_ham_raise', 'hip_thrust', 'prone_hip_extension', 'rack_pull'] },
    early_motion: { patterns: [], extraIds: ['back_squat', 'barbell_row', 'box_squat', 'bw_split_squat', 'bw_squat', 'cossack_squat', 'db_rdl', 'deadlift', 'deficit_deadlift', 'front_squat', 'goblet_squat', 'good_morning', 'heel_elevated_goblet', 'overhead_squat', 'pause_squat', 'pin_squat', 'rdl', 'sl_squat_to_box', 'split_squat', 'tempo_squat', 'trap_bar_dl'], clearedIds: [] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  thoracic: {
    protect: { patterns: [], extraIds: ['assisted_pullup', 'band_row', 'barbell_row', 'bench', 'cable_row', 'chest_supported_row', 'close_grip_bench', 'db_bench', 'db_rdl', 'db_row', 'deadlift', 'deficit_deadlift', 'incline_bench', 'inverted_row', 'ohp', 'pullup', 'rdl', 'trap_bar_dl'], clearedIds: [] },
    early_motion: { patterns: [], extraIds: ['ohp'], clearedIds: [] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  cervical: {
    protect: { patterns: [], extraIds: ['assisted_pullup', 'barbell_row', 'db_rdl', 'deadlift', 'deficit_deadlift', 'ohp', 'pullup', 'rdl', 'trap_bar_dl'], clearedIds: [] },
    early_motion: { patterns: [], extraIds: ['ohp'], clearedIds: [] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
  core: {
    protect: { patterns: [], extraIds: ['back_squat', 'box_squat', 'bw_split_squat', 'bw_squat', 'cossack_squat', 'db_rdl', 'deadlift', 'deficit_deadlift', 'front_squat', 'goblet_squat', 'heel_elevated_goblet', 'ohp', 'overhead_squat', 'pause_squat', 'pin_squat', 'rdl', 'sl_squat_to_box', 'split_squat', 'tempo_squat', 'trap_bar_dl'], clearedIds: [] },
    early_motion: { patterns: [], extraIds: ['db_rdl', 'deadlift', 'deficit_deadlift', 'ohp', 'rdl', 'trap_bar_dl'], clearedIds: [] },
    loading: { patterns: [], extraIds: [], clearedIds: [] },
    return_to_sport: { patterns: [], extraIds: [], clearedIds: [] },
  },
};

/** The raw {patterns, extraIds, clearedIds} cell for a region×phase (empty if unknown). */
export function contraindicationCell(region, phase) {
  const r = INJURY_CONTRAINDICATIONS[region];
  return (r && r[phase]) || EMPTY_CELL;
}

/**
 * Is a resolved catalogue exercise contraindicated under a {patterns, extraIds, clearedIds}
 * contraindication? `patternSet`/`extraIdSet`/`clearedIdSet` are Sets (see
 * injuryRules.getContraindicatedExercises).
 * @param {{id:string, pattern:string}} ex
 */
export function isExerciseContraindicated(ex, { patternSet, extraIdSet, clearedIdSet }) {
  if (!ex) return false;
  if (extraIdSet.has(ex.id)) return true;
  if (patternSet.has(ex.pattern) && !clearedIdSet.has(ex.id)) return true;
  return false;
}

export default { CONTRAINDICATION_VOCAB_VERSION, INJURY_CONTRAINDICATIONS, contraindicationCell, isExerciseContraindicated };
