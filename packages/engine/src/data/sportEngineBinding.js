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
  hurling:        { engineSport: 'gaa', discipline: null },
  triathlon:      { engineSport: 'run', discipline: null }, // run is triathlon's binding constraint (SKB)
};

export function bindingFor(skbId) {
  return SKB_ENGINE_BINDING[skbId] || null;
}
