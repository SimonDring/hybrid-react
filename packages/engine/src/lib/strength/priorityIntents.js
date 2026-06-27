/**
 * priorityIntents — goal priorities as movement INTENTS with equipment-ordered
 * fallback chains. The chain head is the goal's ideal/curated exercise; later
 * entries are equipment substitutes (free weight → machine/DB → bodyweight).
 * resolveIntents resolves each intent to the candidates the athlete can actually
 * perform, so a dumbbell athlete still gets a curated strength list (not 1/17),
 * and the allocator can pick a lower-axial member of a chain when needed.
 *
 * Heads are ordered to reproduce the former flat GOAL_PRIORITY lists verbatim at
 * full equipment (the preservation principle), so full-gym plans don't change.
 */
import { EXERCISES, LEVELS } from '../../data/strengthExercises.js';

const BY_ID = new Map(EXERCISES.map(e => [e.id, e]));

export const BUILD_INTENTS = {
  strength: [
    { intent: 'squat',       chain: ['back_squat','front_squat','box_squat','goblet_squat','bw_split_squat'] },
    { intent: 'hinge',       chain: ['deadlift','trap_bar_dl','rdl','db_rdl','sl_hinge'] },
    { intent: 'h_press',     chain: ['bench','db_bench','incline_db','dip','pushup'] },
    { intent: 'squat_var',   chain: ['pause_squat','box_squat','tempo_squat','bw_split_squat'] },
    { intent: 'hinge_var',   chain: ['rack_pull','good_morning','rdl','db_rdl'] },
    { intent: 'hinge_var2',  chain: ['deficit_deadlift','rdl','db_rdl'] },
    { intent: 'tri_press',   chain: ['jm_press','close_grip_bench','diamond_pushup'] },
    { intent: 'press_acc',   chain: ['close_grip_bench','floor_press','dip','diamond_pushup'] },
    { intent: 'press_acc2',  chain: ['floor_press','db_bench','pushup'] },
    { intent: 'h_pull',      chain: ['barbell_row','db_row','chest_supported_row','cable_row','inverted_row'] },
    { intent: 'v_press',     chain: ['ohp','db_ohp','pike_pushup'] },
    { intent: 'hinge_tb',    chain: ['trap_bar_dl','rdl','db_rdl'] },
    { intent: 'squat_front', chain: ['front_squat','goblet_squat','hack_squat'] },
    { intent: 'glute',       chain: ['hip_thrust','glute_bridge','glute_bridge_single_leg'] },
    { intent: 'carry',       chain: ['farmer_carry','suitcase_carry','bw_carry'] },
    { intent: 'trunk',       chain: ['ab_wheel','pallof','side_plank','hanging_knee'] },
    { intent: 'power',       chain: ['seated_box_jump'] }
  ],
  // bodybuilding / functional priorities are already DB/cable/bodyweight-friendly,
  // so they ship as single-candidate intents (heads = former GOAL_PRIORITY lists).
  bodybuilding: ['incline_db_curl','spider_curl','overhead_cable_ext','low_high_cable_fly','seated_leg_curl','heel_elevated_goblet','reverse_pec_deck','prone_y_raise','prone_t_raise','prone_w_raise','db_pullover','leg_curl','leg_ext','chest_fly','lateral_raise','rear_fly','biceps_curl','triceps_pushdown','overhead_ext'].map(id => ({ intent: id, chain: [id] })),
  functional: ['bird_dog','dead_bug','pallof','side_plank','ab_wheel','suitcase_carry','farmer_carry','split_squat','step_up','serratus_wall_slide','serratus_punch_cable','half_kneeling_pallof','tall_kneeling_landmine','seated_box_jump','bounding_a_skip','hip_flexor_90_90','glute_bridge_activation','band_pull_apart','thoracic_foam_roller','prone_hip_extension'].map(id => ({ intent: id, chain: [id] }))
};

// Resolve each intent to its EQUIPMENT-available candidates (chain order). We do NOT
// filter by experience level here: the priority list stays level-agnostic (as the
// old flat lists were) and the allocator gates selection by level at fill time, so a
// curated priority (e.g. a runner's Nordic curl) stays listed even for athletes a tier
// below it. `level` is accepted for caller compatibility but intentionally unused.
// Returns { list, byIntent }: `list` is the flat ordered id set (the ×1.35 boost
// pool, deduped — same shape resolveProgram returned before); `byIntent` maps each
// intent to its available candidate ids (for the allocator's axial pick + despine).
export function resolveIntents(intents = [], equip, level = LEVELS.intermediate) {  // eslint-disable-line no-unused-vars
  const byIntent = new Map();
  const list = [];
  const seen = new Set();
  for (const { intent, chain } of intents) {
    const avail = chain.filter(id => {
      const ex = BY_ID.get(id);
      return ex && equip.has(ex.equip);
    });
    byIntent.set(intent, avail);
    if (avail.length && !seen.has(avail[0])) { list.push(avail[0]); seen.add(avail[0]); }
  }
  return { list, byIntent };
}

export default { BUILD_INTENTS, resolveIntents };
