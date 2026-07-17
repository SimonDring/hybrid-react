// sessionBuilding — session-assembly time budgets (KA Domain 6, Programming).
//
// How many minutes of each SUPPORTIVE / CORRECTIVE layer the session builder may add in a slot's
// leftover time budget, AFTER the main working sets. These are programming magnitudes — how much
// prehab/finisher/isolation/corrective a session should carry — so they are coaching KNOWLEDGE, not
// engine logic. Relocated VERBATIM from lib/session/sessionBuilder.js (closure §3 row 1 subset;
// commitment C3 / Art 17 — a scientist can review the session-assembly budgets without opening the
// engine). VALUES UNCHANGED. No plan delta — knowledge relocation only.
//
// Provenance: time-efficient-training practice (a short session is rounded out with factor-0
// support work rather than left half-empty; the main work is never displaced — authority order:
// safety > main work > diagnosis priorities > secondary corrective). Confidence: low (practical
// heuristics; the D16 outcome loop is the validation path, SR-11).
export const SESSION_BUILDING = {
  finisherTargetMin: 30,     // round a short session out toward this many total minutes with factor-0 support
  finisherCapMin: 15,        // ...but never add more than this many minutes of supportive finisher
  hypertrophyIsoCapMin: 12,  // hypertrophy direct-isolation pass: at most this many minutes of added isolation
  secondaryCapMin: 10,       // secondary-goal corrective: at most this many minutes per session

  // Wall-clock minutes a working SET roughly costs, by role (closure §3 row 1). Supersetting
  // compresses non-primary work (performed in another lift's rest), so filler sets are cheap —
  // this is what lets a short session still hit real volume (Iversen et al. 2021). Confidence: low.
  perSetMinByRole: {
    primary: 2.8,     // heavy main, fuller rest
    isoCoreCalf: 1.2, // light filler (iso / core / calf)
    accessory: 1.5,   // accessory, supersetted
  },

  // Session-focus LABELLING thresholds (closure §3 row 1): as fractions of the session's total
  // working volume, how much a region must carry to name the day. `meaningfulFraction` = the
  // minimum share for a region to count toward the label; `coreDominance` = the core share above
  // which a day reads 'Core'. These NAME the session, they do not steer its content. Confidence: low.
  focusLabel: {
    meaningfulFraction: 0.25,
    coreDominance: 0.5,
  },
};

export default { SESSION_BUILDING };
