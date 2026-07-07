// The build-discipline demand seam (WP-49 Plan 2 T1). Reads the athlete model's discipline
// (either set directly via model.disciplineId, or inferred from the legacy goal outcome for
// back-compat until Plan 2 T6 makes discipline the primary field) and returns that discipline's
// raw demand vector from the Plan-1 knowledge (data/disciplines). derivePerformanceModel.js
// consumes this to feed the diagnosis; it is additive — a model with no discipline and no
// mapped goal outcome returns null, so existing behaviour is unchanged.
import { getDiscipline } from '../../data/disciplines/index.js';

// NOTE: an outcome->discipline back-compat map (e.g. get_stronger -> powerlifting) was drafted
// for Task 1 but deliberately dropped: it silently changed demandProfile.source from 'goal' to
// 'discipline' for every EXISTING legacy build profile (none of which set `discipline`), breaking
// byte-identical behaviour (apps/mobile/tests/goal-demand.js T1b, performance-demand.js T4,
// performance-for-profile.js). disciplineIdFor only resolves an EXPLICIT model.disciplineId —
// the discipline path is opt-in only. Task 6 (making discipline primary) should revisit whether
// any legacy-outcome mapping is still wanted, and update those tests deliberately if so.

/** Resolves the discipline id for a model: only an explicit, known model.disciplineId. Returns
 *  null otherwise (no discipline set, or an unrecognised id). */
export function disciplineIdFor(model) {
  if (model && model.disciplineId && getDiscipline(model.disciplineId)) return model.disciplineId;
  return null;
}

/** The discipline's raw demand vector ({qualityId: 0..1}), or null if the model carries no
 *  resolvable discipline. A copy — callers may not mutate the discipline module's own data. */
export function disciplineDemandFor(model) {
  const d = getDiscipline(disciplineIdFor(model));
  return d ? { ...d.demand } : null;
}

/** Transforms a raw {qualityId: weight} vector into the Performance-Model demand-profile shape
 *  (the same array-of-{qualityId, importance, source, evidence} shape goalDemandProfile and
 *  buildDemandProfile return) so the diagnosis reads a type-identical `dp`, whichever source
 *  produced it. discipline id is threaded through for evidence provenance. */
export function demandVectorToProfile(vec, disciplineId) {
  if (!vec) return [];
  return Object.entries(vec).map(([qualityId, importance]) => ({
    qualityId, importance, source: 'discipline', evidence: `discipline:${disciplineId}:${qualityId}`,
  }));
}

export default { disciplineDemandFor, disciplineIdFor, demandVectorToProfile };
