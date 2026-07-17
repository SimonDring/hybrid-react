/**
 * selectionScoring — GOVERNED multipliers for the D11 allocator's exercise-scoring economy
 * (WP-61). Per the Knowledge Architecture, the numbers the allocator scores with are DATA here,
 * not literals in allocator.js — so "how much to reward the axial-preferred lift / punish a
 * repeated pattern" is reviewable knowledge, not a code edit. These COMPOSE with the already-
 * governed selection.* knowledge in the KB (transfer weights, fatigue budget, pattern cap);
 * this file is the fine-grain scoring economy that sits under them.
 *
 * All values reproduce the previous inline literals EXACTLY (byte-identical extraction). Evidence
 * level L5 (heuristic ordinal multipliers); confidence low. The relative ordering is the point:
 * boost the intent's axial-preferred member (1.35) and openers (1.2), damp within-session pattern
 * repeats (0.6) and cross-session repeats (0.82^n), keep a tiny deterministic rotation jitter.
 */
export const SELECTION_SCORING = {
  repeatPatternMult: 0.6,                        // within-session variety: a repeated pattern is damped
  openCompound: { primary: 1.2, other: 0.85 },   // opening the session (timeUsed < 5) favours a compound
  posturePullLean: 1.05,                         // slight lean toward horizontal/vertical pulls (posture)
  axialPreferredMult: 1.35,                      // the intent's axial-preferred member
  crossSessionRepeatBase: 0.82,                  // ^(times used this week) — decays a lift repeated across days
  focusFloor: 0.4, focusSpan: 0.6,               // sport focus weighting: 0.4 + 0.6 × in-focus ratio
  rotationJitter: 0.01,                          // × ((hash+week+slot) % 7) — deterministic tie-break rotation

  // Supportive-FINISHER candidate relevance ranking (closure §3 row 1): additive points that order
  // the factor-0 support pool for a short session — a priority-list lift outranks a sport-tagged
  // one, which outranks a goal-tagged one, with general mobility a safe fallback. Ordinal, not
  // absolute; the ordering is the point. Confidence: low (seed heuristic).
  finisherRelevance: { priority: 3, sportTag: 2, goalTag: 1, mobilityFallback: 0.5 },
};

export default { SELECTION_SCORING };
