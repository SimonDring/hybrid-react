/**
 * sports — the per-sport Atlas registry.
 *
 * Each sport picks ~6–8 pillars from ../athletePillars.js. The pillar set is
 * SPORT-SPECIFIC: explosive sports lead with power/speed, endurance sports lead
 * with the aerobic engine and durability. Scoring lives in the signal providers,
 * so a sport entry is pure configuration.
 *
 * ── How to add a sport ───────────────────────────────────────────────────────
 * 1. Add an entry to SPORTS below: { key, label, family, emphasisKey, pillars }.
 *    - `pillars` are ids from ../athletePillars.js (add a new pillar there if a
 *      genuinely new athletic quality is needed; add a new signal provider only
 *      if no existing one fits).
 *    - `emphasisKey` should match the key the gym engine uses in
 *      src/lib/strength/program.js (SPORT_EMPHASIS) once that sport is supported.
 * 2. Map the user's profile to the new key in sportConfigFor() if it isn't a
 *    run/cycle/swim variant.
 * computePillars, RadarChart and the Atlas screen need no changes.
 *
 * Shipping now: the sports onboarding already supports — run (sprint/middle/long),
 * cycle, swim — plus a `build` default for non-sport strength goals. Team sports
 * (hurling, Gaelic football, soccer, rugby, field hockey…) slot in here later.
 */

export const SPORTS = {
  run_sprint: {
    key: 'run_sprint', label: 'Sprint runner', family: 'power', emphasisKey: 'run_sprint',
    pillars: ['explosive', 'speed_strength', 'strength', 'core', 'anaerobic', 'recovery', 'consistency']
  },
  run_middle: {
    key: 'run_middle', label: 'Middle-distance runner', family: 'mixed', emphasisKey: 'run_middle',
    pillars: ['aerobic', 'lower_power', 'durability', 'core', 'strength', 'recovery', 'consistency']
  },
  run_long: {
    key: 'run_long', label: 'Distance runner', family: 'endurance', emphasisKey: 'run_long',
    pillars: ['aerobic', 'durability', 'lower_power', 'core', 'strength', 'recovery', 'consistency']
  },
  cycle: {
    key: 'cycle', label: 'Cyclist', family: 'endurance', emphasisKey: 'cycle',
    pillars: ['aerobic', 'leg_power', 'hip_stability', 'core', 'strength', 'recovery', 'consistency']
  },
  swim: {
    key: 'swim', label: 'Swimmer', family: 'mixed', emphasisKey: 'swim',
    pillars: ['upper_pull', 'shoulder_health', 'core', 'aerobic', 'explosive', 'recovery', 'consistency']
  },
  build: {
    key: 'build', label: 'Strength athlete', family: 'mixed', emphasisKey: null,
    pillars: ['strength', 'upper_body', 'lower_body', 'core', 'recovery', 'consistency']
  }
};

// Resolve a user's profile to its sport config (defaults to the build profile).
export function sportConfigFor(profile = {}) {
  if (profile.goal_type === 'sport' && profile.sport) {
    if (profile.sport === 'run') {
      const key = `run_${profile.run_discipline || 'middle'}`;
      return SPORTS[key] || SPORTS.run_middle;
    }
    if (SPORTS[profile.sport]) return SPORTS[profile.sport];
  }
  return SPORTS.build;
}

export default { SPORTS, sportConfigFor };
