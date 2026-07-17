// sportLoadDefaults — the global sport-support load magnitudes (KA Domain 7 / Domain 6).
//
// The generation-time pullback that keeps a trained sport's gym plan SUPPORTING the sport rather
// than competing with it (lib/strength/sportLoad.js): scalar = season base × goal factor × sport-day
// factor × sport systemic factor, clamped to [floor, ceil]. The PER-SPORT systemic factor is already
// an authored SKB fact (gymSupport.systemicFactor); these are the GLOBAL defaults, relocated VERBATIM
// from sportLoad.js (closure §3 row 9; commitment C3 / Art 17 — a load magnitude is coaching
// knowledge). VALUES UNCHANGED. No plan delta — knowledge relocation only.
//
// Provenance: a trained athlete's gym is secondary to the sport, so more sport days ⇒ less gym room
// (concurrent-training interference — Rønnestad & Mujika 2014; heavy-low-volume support). The floor
// holds a maintenance dose (never zero); a strength goal trims slightly (0.90) to protect the sport.
// Confidence: low (practical support-load heuristics; the D16 outcome loop is the validation path).
export const SPORT_LOAD = {
  goalFactor: { build_base: 1.0, get_stronger: 0.90, stay_durable: 1.0 },
  volumeFloor: 0.5,
  volumeCeil: 1.0,
  // Sport-day trim: each day of sport beyond two leaves less room for the gym (~0.07/day).
  sportDayFactor: { upTo2: 1.0, three: 0.92, four: 0.85, fivePlus: 0.78 },
};

export default { SPORT_LOAD };
