/**
 * weeklyObjective — D8 · Weekly Objective / microcycle (M-PERIOD's D8). A PURE function that lays a
 * week's loading pattern around the fixed sport schedule: it selects the sport's authored microcycle
 * by FIXTURE DENSITY (the `matches_this_week` signal) and composes a typed `WeeklyObjective
 * {value, confidence, rationale}` — sport-aware spacing constraints + the week's targets inherited
 * from the block objective (D7). EDS §20 D8; 02 §2.8.
 *
 * This finally CONSUMES the rich `microcycles` section every SKB profile carries but that nothing
 * read at the pin (heavy far from the match, power/priming close, recovery after; stricter when
 * fixtures compress). The microcycle PERIOD is a constraint input, not a hard-coded seven; a
 * congested fortnight is a legitimate microcycle (01 §7). Per-day intent is INHERITED from the block
 * objective, never a template label ("Monday is chest day" is the forbidden defect — Ontology §7).
 *
 * ROLLOUT — v0 is ADVISORY / PARALLEL (the same seam D4/D5/D6/D7 shipped on): this object steers
 * NOTHING yet — it reads existing SKB data and emits nothing into the plan, so every golden is
 * byte-identical (no data change ⇒ no KSV bump either). Wiring it to actually reshape the week is a
 * later, FLAG-GATED (default-OFF) flip — the one place M6 may legitimately move a golden (a newly-
 * consumed input, for fixture-bearing athletes only). Pure: no I/O, no clock (Art 18).
 */

// Fixture density → the SKB microcycle bucket. ≤1 match = the normal MD-anchored week; 2 = congested;
// 3+ / tournament = the strictest recovery-first pattern.
function densityBucket(matchesThisWeek) {
  if (matchesThisWeek == null) return null;
  const n = Number(matchesThisWeek);
  if (!Number.isFinite(n)) return null;
  if (n <= 1) return 'oneMatchPerWeek';
  if (n === 2) return 'twoMatchesPerWeek';
  return 'tournamentOrCongested';
}

/**
 * @param {object} args
 *   blockObjective   — one D7 BlockObjective { trajectory, volumeShape, intensityShape, ... } (optional)
 *   microcycles      — the sport's SKB `microcycles` section (optional; absent for build goals)
 *   matchesThisWeek  — the fixture-density signal (optional; absent ⇒ no fixture reshaping)
 * @returns {{ value: object, confidence: string, rationale: string }}
 */
export function deriveWeeklyObjective({ blockObjective = null, microcycles = null, matchesThisWeek = null } = {}) {
  const bucket = densityBucket(matchesThisWeek);
  // Fall back to the one-match pattern only when a density is known but that exact bucket is unauthored.
  const pattern = (microcycles && bucket && (microcycles[bucket] || microcycles.oneMatchPerWeek)) || null;

  const weeklyTargets = blockObjective
    ? { volumeShape: blockObjective.volumeShape ?? null, intensityShape: blockObjective.intensityShape ?? null, trajectory: blockObjective.trajectory ?? null }
    : null;

  // No sport microcycle, or no fixture signal → NOT fixture-aware: the block objective governs the
  // week exactly as today (byte-identical — no reshaping around a schedule we don't have).
  if (!pattern) {
    return {
      value: { fixtureAware: false, fixtureDensity: bucket, matchesThisWeek, spacingConstraints: null, weeklyTargets },
      confidence: 'low',
      rationale: 'no sport microcycle / no fixture signal — the block objective governs the week (no fixture reshaping).',
    };
  }

  // Fixture-aware: expose the sport's spacing constraints (heavy far from the match, power close,
  // recovery after) as structured signals D9/D13 can lay the week around. Per-day-by-calendar-date
  // assignment is the flag-gated wiring flip; v0 emits the constraints + the block's targets.
  const spacingConstraints = {
    avoidHeavyLiftingDays: Array.isArray(pattern.avoidHeavyLiftingDays) ? pattern.avoidHeavyLiftingDays : [],
    preferExplosiveWorkDays: Array.isArray(pattern.preferExplosiveWorkDays) ? pattern.preferExplosiveWorkDays : [],
    heavyDay: pattern.heavyDay ?? null,
    powerDay: pattern.powerDay ?? null,
    recoveryDay: pattern.recoveryDay ?? null,
    injuryPreventionDay: pattern.injuryPreventionDay ?? null,
  };

  return {
    value: {
      fixtureAware: true,
      fixtureDensity: bucket,
      matchesThisWeek: Number(matchesThisWeek),
      spacingConstraints,
      loadingPattern: pattern.typicalLoadingPattern ?? null,
      weeklyTargets,
    },
    confidence: 'moderate', // microcycle structuring is well-evidenced; congestion models less so (Art 13)
    rationale: `${bucket} microcycle — ${pattern.pattern || 'lay heavy work far from the match, sharpen close, recover after'}.`,
  };
}

export default { deriveWeeklyObjective };
