/**
 * Wearable provider registry.
 *
 * Declares each integration the app knows about: its display label, what kinds
 * of data it can supply (baseline recovery metrics and/or workouts), and whether
 * it's live or a coming-soon placeholder. Mirrors the activityTypes.js registry
 * pattern so the Integrations screen renders a card per provider with no
 * hard-coded special cases, and so later sub-projects (and the AI engine) have a
 * machine-readable contract for each source's capabilities.
 *
 * capabilities.baseline → can supply resting HR, HRV, sleep, etc. (only the
 *                         user's PRIMARY device's baseline is used).
 * capabilities.workouts → can supply individual workouts (any device may).
 * status: 'live' (connectable now) | 'coming_soon' (placeholder).
 */

export const PROVIDERS = {
  fitbit: {
    id: 'fitbit',
    label: 'Fitbit / Google Health',
    capabilities: { baseline: true, workouts: true },
    status: 'live'
  },
  garmin: {
    id: 'garmin',
    label: 'Garmin',
    capabilities: { baseline: true, workouts: true },
    status: 'coming_soon'
  },
  strava: {
    id: 'strava',
    label: 'Strava',
    capabilities: { baseline: false, workouts: true },
    status: 'coming_soon'
  }
};

// Registry as an array, in declaration order (fitbit first).
export function listProviders() {
  return Object.values(PROVIDERS);
}

export default { PROVIDERS, listProviders };
