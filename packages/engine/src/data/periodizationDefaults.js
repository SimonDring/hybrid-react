// periodizationDefaults — the generic sport season-volume + block templates, relocated here
// (2026-07-09, retire-legacy P1) from the deleted data/sportGymSupport/_schema.js so they survive
// the legacy layer's removal. They are the ULTIMATE fallback: every SKB profile now carries its own
// `gymSupport.seasonVolume` + `gymSupport.periodization` (relocated verbatim), and the engine reads
// those; these defaults only apply to an unknown/unauthored sport. Values unchanged.

export const SEASONS = ['off', 'pre', 'in', 'transition'];

// Shared default season volume scalar (in-season = maintenance dose; Rønnestad 2011). Off-season
// pulled back 1.0 → 0.90 so gym strength SUPPORTS the sport (sportLoadScalar trims further).
export const DEFAULT_SEASON_VOLUME = { off: 0.90, pre: 0.85, in: 0.6, transition: 0.7 };

// Generic sport block templates. Off-season builds a max-strength base (Rønnestad 2015); pre-season
// tapers in (Bosquet 2007); in-season holds a maintenance dose; transition recovers (Mujika 2010).
export const SPORT_BLOCKS = {
  off:        { totalWeeks: 12, split: [{ intent: 'base', weeks: 5 }, { intent: 'build', weeks: 7 }], deloads: [5, 10] },
  pre:        { totalWeeks: 6,  split: [{ intent: 'base', weeks: 3 }, { intent: 'build', weeks: 3 }], deloads: [6] },
  in:         { totalWeeks: 4,  split: [{ intent: 'build', weeks: 4 }], deloads: [] },
  transition: { totalWeeks: 4,  split: [{ intent: 'base', weeks: 4 }], deloads: [] },
};

export default { SEASONS, DEFAULT_SEASON_VOLUME, SPORT_BLOCKS };
