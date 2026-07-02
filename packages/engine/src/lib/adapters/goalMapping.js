// Bijective-enough mapping between outcome goals (the model) and the legacy goal_type/
// strength_style pair (what the live engine reads). Sport outcomes carry a sportRef.
export const OUTCOME_TO_LEGACY = {
  get_stronger:  { goal_type: 'build', strength_style: 'strength' },
  build_muscle:  { goal_type: 'build', strength_style: 'bodybuilding' },
  general_fitness: { goal_type: 'build', strength_style: 'functional' },
  general_health:  { goal_type: 'build', strength_style: 'functional' },
  improve_sport_performance: { goal_type: 'sport', strength_style: 'strength' },
  improve_sprint_speed: { goal_type: 'sport', strength_style: 'strength' },
  increase_vertical_jump: { goal_type: 'sport', strength_style: 'strength' },
  improve_endurance: { goal_type: 'sport', strength_style: 'strength' },
};

export function legacyToOutcome(goalType, strengthStyle, sport) {
  if (goalType === 'sport') return 'improve_sport_performance';
  if (strengthStyle === 'bodybuilding') return 'build_muscle';
  if (strengthStyle === 'functional') return 'general_fitness';
  return 'get_stronger';
}
