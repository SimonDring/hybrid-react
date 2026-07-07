/**
 * schedulingPolicy — GOVERNED weights for the D13 session-scheduler's interference penalty
 * (WP-61). Per the Knowledge Architecture, the numbers the scheduler reasons with are DATA
 * here, not literals in scheduler.js — so scheduling POLICY (how hard to push same-muscle days
 * apart, how much to keep gym work off sport days) is reviewable knowledge, not a code edit.
 *
 * Lower total penalty = better weekday assignment. All values reproduce the previous inline
 * literals exactly (this is a byte-identical extraction). Evidence level L5 (heuristic ordinal
 * weights — no literature fixes a "14"); confidence low. The relative ORDERING is what matters:
 * same-muscle-adjacent (14) must dominate the generic hard-day term (10); the 2-day-apart terms
 * (3, 2) are a soft nudge. Plyometric spacing is governed separately (doseSchemes.REACTIVE_LIMITS,
 * de Villarreal 2009) and is NOT duplicated here.
 */
export const SCHEDULING_PENALTIES = {
  // Gym work that taxes the sport's muscles, placed on/near a sport day. Scaled by how much
  // the session loads those muscles; `nearest` = weekday distance to the closest sport day.
  sportProximity: { onDay: 3, adjacent: 2 },   // nearest 0 → 3, nearest 1 → 2, else 0
  // Adjacent training days (gap ≤ 1 day apart).
  adjacent: {
    sameMusclePerGroup: 14,   // × number of shared heavy muscle groups (the dominant lever)
    hardHard: 10,             // both days hard
    highAxialHighAxial: 9,    // recover the spine between heavy-axial days
  },
  // Two days apart (gap === 2) — a lighter nudge.
  twoApart: {
    sameMusclePerGroup: 3,
    hardHard: 2,
  },
};

export default { SCHEDULING_PENALTIES };
