// Maps an SKB sport id to the LIVE engine sport module (+ discipline) that plans it, so the
// legacy plan generator still biases correctly while onboarding/demand reason in SKB ids.
// Authoring a new flagship SKB profile only needs an entry here (default is a best-effort guess).
export const SKB_ENGINE_BINDING = {
  running_sprint: { engineSport: 'run', discipline: 'sprint', d11Steered: true, sscScreened: true },
  running_middle: { engineSport: 'run', discipline: 'middle', d11Steered: true, sscScreened: true },
  running_long:   { engineSport: 'run', discipline: 'long', d11Steered: true, sscScreened: true },
  cycling:        { engineSport: 'cycle', discipline: null, d11Steered: true },
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

// Sport-cohort facts DERIVED from the binding's authored flags (closure §3 row 7b; C3 / Art 17):
// which engineSport buckets are D11-RATING-STEERED (the endurance individual sports whose diagnosed
// qualities agree with their ratings — run/cycle) and which are SSC-SCREENED (impact locomotion
// that loads the stretch-shortening cycle, so plyometric/reactive work transfers to aerobic economy
// — run only; Rønnestad & Mujika 2014 / Blagrove 2018). Authored per binding entry (d11Steered /
// sscScreened), so a new sport declares its cohort HERE, never in a hardcoded engine Set (the
// Art-17 falsification TR-12 named). Membership unchanged from the retired code Sets.
export const D11_STEERED_ENGINE_SPORTS = [...new Set(Object.values(SKB_ENGINE_BINDING).filter((b) => b.d11Steered).map((b) => b.engineSport))];
export const SSC_SCREENED_ENGINE_SPORTS = [...new Set(Object.values(SKB_ENGINE_BINDING).filter((b) => b.sscScreened).map((b) => b.engineSport))];
