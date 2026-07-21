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
  // Match-day microcycle shaping (Phase 1; flag-gated fixtureMicrocycle). Soft nudges that
  // position gym work around a fixture: heavy far from the match, power close, recovery after.
  // Weighted BELOW adjacent.sameMusclePerGroup (14) so MD shaping refines placement without
  // overriding muscle-recovery spacing. Evidence L5 (heuristic ordinal — no literature fixes a
  // number; the ORDERING is the knowledge: a heavy lift inside MD-1/MD/MD+1 is the worst case).
  // Confidence low. See docs/superpowers/specs/2026-07-17-sport-data-integration-roadmap-design.md.
  //
  // heavyOffTargetDayPerStep raised 2→4 (2026-07-21 refinement): heavy day should PREFER
  // landing on MD-4/MD-3 (the SKB target), not merely avoid MD-1/MD/MD+1 — 2 was too weak
  // against the avoid-MD-1 term (12) and same-muscle-adjacent spacing (14), so heavy would
  // settle for an off-target day rather than the target one whenever avoidance was already
  // satisfied. 4 is the largest step that keeps heavyOffTargetDayPerStep × 3 (the max
  // weekday distance) ≤ adjacent.sameMusclePerGroup (14) — so the preference nudge can never
  // outweigh genuine muscle-recovery spacing, per the ORDERING this file already commits to.
  // Reaching MD-4/MD-3 in every case (incl. when the accessory days are plyometric-loaded,
  // where the 48–72 h plyo-spacing rule — doseSchemes.REACTIVE_LIMITS — is the actual
  // "unavoidable constraint" forcing heavy to stay off-target) needs a stronger step (6) that
  // breaches this cap; deliberately not taken here — see coaching-refinements-report.md.
  md: {
    heavyOnAvoidDay: 12,          // heavy + high-axial gym work on MD-1/MD/MD+1
    hardOnRecoveryDay: 6,         // any hard session on the MD+1 recovery day
    powerOffPreferredDay: 4,      // power/plyo work NOT on a preferred (MD-2/MD-3) day
    heavyOffTargetDayPerStep: 4,  // × weekday distance from the nearest heavy-target (MD-4/MD-3) day — prefers MD-4/MD-3, capped so muscle-recovery spacing still wins when it genuinely conflicts
  },
};

export default { SCHEDULING_PENALTIES };
