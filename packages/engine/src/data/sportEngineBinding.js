// Maps an SKB sport id to the LIVE engine sport module (+ discipline) that plans it, so the
// legacy plan generator still biases correctly while onboarding/demand reason in SKB ids.
// Authoring a new flagship SKB profile only needs an entry here (default is a best-effort guess).
export const SKB_ENGINE_BINDING = {
  running_sprint: { engineSport: 'run', discipline: 'sprint' },
  running_middle: { engineSport: 'run', discipline: 'middle' },
  running_long:   { engineSport: 'run', discipline: 'long' },
  cycling:        { engineSport: 'cycle', discipline: null },
  swimming:       { engineSport: 'swim', discipline: null },
  gaelic_football:{ engineSport: 'gaa', discipline: null },
  field_hockey:   { engineSport: 'gaa', discipline: null }, // invasion field sport — the gaa gym-support module is the closest legacy biasing; the SKB carries the hockey-specific knowledge
  hurling:        { engineSport: 'gaa', discipline: null },
  rugby:          { engineSport: 'rugby', discipline: null },
  triathlon:      { engineSport: 'triathlon', discipline: null }, // swim+bike+run blend (own gym-support module, audit 2026-07-08); previously collapsed to 'run' → runner's leg-day, no upper body
  soccer:         { engineSport: 'soccer', discipline: null }, // WP-48: flagship-authored 2026-07-06
};

export function bindingFor(skbId) {
  return SKB_ENGINE_BINDING[skbId] || null;
}

// The distinct engine-sport ids the binding can produce — the single source of truth for the
// `sport` values a profile may legitimately hold. The app's onboarding input-validation derives
// its accepted-sport list from this (rather than hand-copying it), so a newly-bound flagship sport
// can never be rejected on save as "not a recognised value" (the triathlon/team-sport onboarding
// bug, 2026-07-09).
export const ENGINE_SPORT_IDS = [...new Set(Object.values(SKB_ENGINE_BINDING).map((b) => b.engineSport))];
