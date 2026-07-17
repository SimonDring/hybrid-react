/**
 * secondaryGoals — the fixed menu of add-on goals (posture / prehab / mobility /
 * conditioning) an athlete can multi-select alongside their discipline.
 *
 * DATA ONLY (WP-49 Plan 1 Task 4). This module is READ by the plan generator
 * (WP-49 Plan 2 Task 5 shipped): injectSecondaryGoals (session/sessionBuilder.js)
 * layers these onto a discipline plan's accessory tail via getSecondaryGoal.
 * Design: docs/superpowers/specs/2026-07-07-build-discipline-engine-design.md §5.
 *
 * The hard rule (Plan 2 will enforce this, not this file): secondary goals
 * compete ONLY for the accessory/finisher slots, AFTER the discipline diagnosis.
 * Authority order: safety > discipline main work > diagnosis priorities >
 * secondary-goal corrective work. They never displace a priority lift, cut main
 * work below its dose, or override an injury constraint — which is why
 * emphasisModifier values here are deliberately gentle (>0, ≤1.3): a nudge, not
 * an override.
 *
 * Each entry: { id, label, correctivePatterns:string[], emphasisModifier:{muscle:number},
 * accessoryPreferences:string[] (real exercise ids), targetAreas:string[] }.
 */

export const SECONDARY_GOALS = [
  {
    id: 'posture',
    label: 'Counteract a desk job',
    targetAreas: ['upper_back', 'rear_delts', 'hip_flexors', 'thoracic'],
    correctivePatterns: ['horizontal_pull', 'external_rotation', 'hip_mobility', 'glute_activation'],
    emphasisModifier: { back: 1.1, shoulders: 1.05 },
    accessoryPreferences: ['face_pull', 'band_pull_apart', 'chest_supported_row'],
  },
  {
    id: 'prehab',
    label: 'Injury prevention',
    targetAreas: ['rotator_cuff', 'knees', 'hips'],
    correctivePatterns: ['rotator_cuff', 'eccentric_control', 'single_leg_stability'],
    emphasisModifier: {},
    // WP-49 Plan 2 T5: real catalogue ids — rotator-cuff, hip/adductor, spinal stability.
    accessoryPreferences: ['sl_ext_rotation', 'copenhagen', 'bird_dog'],
  },
  {
    id: 'mobility',
    label: 'Mobility & flexibility',
    targetAreas: ['hips', 'ankles', 'shoulders', 'thoracic'],
    correctivePatterns: ['full_rom', 'loaded_stretch'],
    emphasisModifier: {},
    // WP-49 Plan 2 T5: hip, thoracic/shoulder, ankle mobility.
    accessoryPreferences: ['hip_flexor_90_90', 'cat_camel_thoracic', 'ankle_plantarflex_band'],
  },
  {
    id: 'conditioning',
    label: 'General conditioning',
    targetAreas: ['work_capacity'],
    correctivePatterns: ['metabolic_finisher', 'carries'],
    emphasisModifier: {},
    // WP-49 Plan 2 T5: loaded carries — work-capacity that doesn't tax the main lifts.
    accessoryPreferences: ['farmer_carry', 'suitcase_carry'],
  },
];

const BY_ID = new Map(SECONDARY_GOALS.map((g) => [g.id, g]));

export const SECONDARY_GOAL_IDS = SECONDARY_GOALS.map((g) => g.id);

export function getSecondaryGoal(id) {
  return BY_ID.get(id) || null;
}

export default { SECONDARY_GOALS, getSecondaryGoal, SECONDARY_GOAL_IDS };
