/**
 * program — resolves a user's GOAL into the parameters the gym engine programs to.
 * Single source of truth read by targets.js (volume) and the allocator (selection).
 *
 * The goal forks (see onboardingModel.js):
 *   • Build me   → style (strength | bodybuilding | functional).
 *   • Support a sport → run | cycle | swim + season (in | off) → a SUPPORTIVE
 *     strength program: heavy/low-rep base (style 'strength'), volume trimmed
 *     (maintenance dose in-season), and weighted toward the muscles that drive the
 *     sport — backed by the strength-for-endurance literature (running economy,
 *     cycling efficiency, sprint-swim performance; see plan sources).
 *
 * Returns:
 *   { goalType, style, emphasis:{muscle:×}, volumeScalar, power, sport, season, level }
 *   - emphasis  multiplies a muscle's weekly volume target (1 = neutral).
 *   - volumeScalar  scales the whole week (sport in-season < off-season < build).
 *   - power  include explosive/plyometric work (sport + functional).
 */

// Which muscles each sport leans on (prime movers ↑, non-essential ↓). Values are
// multipliers applied on top of the base volume target.
const SPORT_EMPHASIS = {
  run:   { quads: 1.15, hamstrings: 1.25, glutes: 1.2, calves: 1.3, core: 1.2, back: 0.9, shoulders: 0.8, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  cycle: { quads: 1.3, glutes: 1.25, hamstrings: 1.15, calves: 1.0, core: 1.15, back: 0.9, shoulders: 0.7, chest: 0.55, biceps: 0.55, triceps: 0.7 },
  swim:  { back: 1.3, shoulders: 1.25, triceps: 1.15, biceps: 1.1, core: 1.2, chest: 1.0, quads: 0.7, hamstrings: 0.7, glutes: 0.7, calves: 0.5 }
};

function gymLevel(profile) {
  const e = profile.experience || {};
  return e.gym || e.strength_functional || e.strength_physique || 'intermediate';
}

export function resolveProgram(profile = {}) {
  const level = gymLevel(profile);
  // Goal type: explicit, else inferred (legacy accounts) — a sport set ⇒ sport.
  const goalType = profile.goal_type || (profile.sport ? 'sport' : 'build');

  if (goalType === 'sport' && profile.sport) {
    const sport = profile.sport;
    const season = profile.sport_season || 'off';
    return {
      goalType: 'sport', style: 'strength',
      emphasis: SPORT_EMPHASIS[sport] || {},
      volumeScalar: season === 'in' ? 0.6 : 0.85,   // maintenance in-season, developmental off-season
      power: true, sport, season, level
    };
  }

  // Build — style from strength_style (legacy: physique → bodybuilding).
  let style = profile.strength_style;
  if (!style) style = (profile.focus || []).includes('strength_physique') ? 'bodybuilding' : 'functional';
  if (!['strength', 'bodybuilding', 'functional'].includes(style)) style = 'strength';

  const emphasis = {};
  if (style === 'bodybuilding') { emphasis.shoulders = 1.1; emphasis.biceps = 1.1; emphasis.triceps = 1.1; }
  if (style === 'functional') { emphasis.core = 1.2; }

  return { goalType: 'build', style, emphasis, volumeScalar: 1.0, power: style === 'functional', sport: null, season: null, level };
}

export default { resolveProgram };
