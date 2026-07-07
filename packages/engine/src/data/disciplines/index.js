// Discipline module registry — the three build disciplines (hypertrophy, powerlifting, olympic).
// Parallels data/sportKnowledge's registry shape. Validated against _schema.js on every read via
// disciplineErrors().
import { validateRegistry } from './_schema.js';
import { availableEquip } from '../strengthExercises.js';
import hypertrophy from './hypertrophy.js';
import powerlifting from './powerlifting.js';
import olympic from './olympic.js';

export const DISCIPLINES = [hypertrophy, powerlifting, olympic];
const BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]));
export function getDiscipline(id) { return BY_ID.get(id) || null; }
export function disciplineErrors() { return validateRegistry(DISCIPLINES).errors; }

// THE FLIP (WP-49 Plan 2 T6): the SINGLE source of truth for a build profile's discipline —
// used by BOTH resolveProgram (the plan) AND the athlete-model adapter (the diagnosis demand), so
// the program and its diagnosis always agree. The onboarding build goal maps to a discipline; an
// explicit profile.discipline wins; barbell-only disciplines (powerlifting/olympic) fall back to
// hypertrophy when the athlete has no barbell. Returns null for a sport profile (not a discipline).
const STYLE_TO_DISCIPLINE = { strength: 'powerlifting', bodybuilding: 'hypertrophy', functional: 'hypertrophy', olympic: 'olympic' };
const BARBELL_DISCIPLINES = new Set(['powerlifting', 'olympic']);
export function resolveBuildDisciplineId(profile = {}) {
  if (profile.goal_type === 'sport' || profile.sport) return null;
  let id = profile.discipline || STYLE_TO_DISCIPLINE[profile.strength_style] || 'hypertrophy';
  // Expand equipment presets ('full_gym' etc.) so a full-gym athlete counts as having a barbell.
  if (BARBELL_DISCIPLINES.has(id) && !availableEquip(profile.access || []).has('barbell')) id = 'hypertrophy';
  return getDiscipline(id) ? id : 'hypertrophy';
}

export default { DISCIPLINES, getDiscipline, disciplineErrors, resolveBuildDisciplineId };
